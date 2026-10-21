/**
 * Bounded Markdown fetching for the combined documentation book.
 *
 * Only the files the reader selected are fetched. Fetches run through a small
 * worker pool (bounded concurrency), every file is pinned to the resolved
 * commit, and both per-file and aggregate byte limits are enforced. A file
 * failure does not abort the whole build: it is returned in `failures` so the
 * UI can explain exactly what is missing and offer a retry.
 */
import { githubError, isAbortError, cancelledError } from '../errors.js';
import { buildRawUrl, dirOf } from './urls.js';

export const BOOK_FETCH_LIMITS = Object.freeze({
  maxFiles: 30,
  maxFileBytes: 750_000,
  maxTotalBytes: 6_000_000,
  concurrency: 4,
  timeoutMs: 20_000,
});

/**
 * Normalise a repository path and reject traversal / control characters.
 * Unicode, spaces, and other legal filename characters are preserved.
 */
export function assertSafeRepoPath(repoPath) {
  const raw = String(repoPath ?? '');
  if (!raw.trim()) {
    throw githubError('INVALID_PATH', 'A repository file path is required.');
  }
  if (raw.includes('\0')) {
    throw githubError('INVALID_PATH', 'The repository path contains an invalid null character.');
  }
  if (raw.includes('\\')) {
    throw githubError('INVALID_PATH', 'The repository path contains a backslash. Use forward slashes.');
  }
  const segments = [];
  for (const segment of raw.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      throw githubError('PATH_ESCAPE', 'The repository path tries to leave the repository root.');
    }
    segments.push(segment);
  }
  if (!segments.length) {
    throw githubError('INVALID_PATH', 'A repository file path is required.');
  }
  return segments.join('/');
}

function byteLength(text) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).byteLength;
  return unescape(encodeURIComponent(text)).length;
}

function failureFor(path, error) {
  return {
    path,
    code: error?.code ?? 'FILE_ERROR',
    message: error?.message ?? String(error ?? 'Could not read this file.'),
    retryable: error?.retryable !== false,
  };
}

/**
 * Run `mapper` over `items` with at most `limit` in flight, preserving input
 * order. The first uncaught mapper rejection stops new work; already-running
 * work is awaited so no promise is left behind.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} mapper
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, mapper, { signal } = {}) {
  const list = Array.from(items ?? []);
  if (!list.length) return [];
  if (typeof mapper !== 'function') {
    throw new TypeError('mapWithConcurrency requires a mapper function.');
  }
  const width = Math.max(1, Math.min(Math.floor(Number(limit) || 1), list.length));
  const results = new Array(list.length);
  let cursor = 0;
  let failure = null;

  async function worker() {
    for (;;) {
      if (signal?.aborted) {
        failure ??= cancelledError();
        return;
      }
      if (failure) return;
      const index = cursor;
      cursor += 1;
      if (index >= list.length) return;
      try {
        results[index] = await mapper(list[index], index);
      } catch (error) {
        failure ??= error;
        return;
      }
    }
  }

  await Promise.allSettled(Array.from({ length: width }, () => worker()));
  if (failure) throw failure;
  return results;
}

/**
 * Fetch selected Markdown files at a pinned commit.
 *
 * @param {{
 *   owner: string,
 *   repo: string,
 *   commitSha: string,
 *   files: Array<string|{path: string, sha?: string, size?: number}>,
 *   api: ReturnType<import('./api.js').createGitHubApi>,
 *   signal?: AbortSignal,
 *   limits?: Partial<typeof BOOK_FETCH_LIMITS>,
 * }} options
 */
export async function fetchMarkdownFiles({
  owner,
  repo,
  commitSha,
  files,
  api,
  signal,
  limits = {},
}) {
  if (!owner || !repo || !commitSha) {
    throw githubError('INTERNAL', 'Fetching a book requires a repository and a resolved commit.');
  }
  if (!api || typeof api.text !== 'function') {
    throw githubError('INTERNAL', 'GitHub client is not configured.');
  }
  if (signal?.aborted) throw cancelledError();

  const effective = { ...BOOK_FETCH_LIMITS, ...(limits || {}) };
  const requested = [];
  const seen = new Set();
  for (const entry of Array.from(files ?? [])) {
    const path = assertSafeRepoPath(typeof entry === 'string' ? entry : entry?.path);
    if (seen.has(path)) continue;
    seen.add(path);
    requested.push({
      path,
      sha: typeof entry === 'object' && entry ? entry.sha ?? null : null,
    });
  }

  if (!requested.length) {
    throw githubError('EMPTY_BOOK', 'Select at least one Markdown file to build a book.');
  }
  if (requested.length > effective.maxFiles) {
    throw githubError(
      'TOO_MANY_FILES',
      `This book has ${requested.length} files; the safe limit is ${effective.maxFiles}. Remove some files and try again.`,
      { maxFiles: effective.maxFiles },
    );
  }

  const startRequests = typeof api.stats === 'function' ? api.stats().requests : 0;

  const results = await mapWithConcurrency(
    requested,
    effective.concurrency,
    async (file) => {
      if (signal?.aborted) throw cancelledError();
      const rawUrl = buildRawUrl(owner, repo, commitSha, file.path);
      try {
        const markdown = await api.text(rawUrl, { signal });
        if (typeof markdown !== 'string') {
          throw githubError('INVALID_RESPONSE', `GitHub returned no text for "${file.path}".`, {
            retryable: true,
          });
        }
        const bytes = byteLength(markdown);
        if (bytes > effective.maxFileBytes) {
          return {
            path: file.path,
            failure: githubError(
              'FILE_TOO_LARGE',
              `"${file.path}" is ${Math.round(bytes / 1024)} KB; the per-file limit is ${Math.round(
                effective.maxFileBytes / 1024,
              )} KB.`,
              { bytes, maxFileBytes: effective.maxFileBytes, retryable: false },
            ),
          };
        }
        return {
          path: file.path,
          name: file.path.split('/').pop(),
          dir: dirOf(file.path),
          sha: file.sha,
          bytes,
          markdown,
        };
      } catch (error) {
        if (signal?.aborted || error?.code === 'CANCELLED' || isAbortError(error)) {
          throw cancelledError();
        }
        return { path: file.path, failure: error };
      }
    },
    { signal },
  );

  const documents = [];
  const failures = [];
  let totalBytes = 0;
  let aggregateExceeded = false;

  // Enforce the aggregate limit in selection order, so the same selection
  // always produces the same failure report.
  for (const result of results) {
    if (result.failure) {
      failures.push(failureFor(result.path, result.failure));
      continue;
    }
    if (aggregateExceeded) {
      failures.push({
        path: result.path,
        code: 'SKIPPED_BY_LIMIT',
        message: `"${result.path}" was skipped because the book exceeded its total size limit.`,
        retryable: false,
      });
      continue;
    }
    if (totalBytes + result.bytes > effective.maxTotalBytes) {
      aggregateExceeded = true;
      failures.push({
        path: result.path,
        code: 'BOOK_TOO_LARGE',
        message: `Adding "${result.path}" would exceed the ${Math.round(
          effective.maxTotalBytes / 1024,
        )} KB book limit. Remove some files and rebuild.`,
        retryable: false,
      });
      continue;
    }
    totalBytes += result.bytes;
    documents.push({
      path: result.path,
      name: result.name,
      dir: result.dir,
      sha: result.sha,
      bytes: result.bytes,
      markdown: result.markdown,
    });
  }

  return {
    owner,
    repo,
    commitSha,
    documents,
    failures,
    totalBytes,
    requested: requested.length,
    fetched: results.length,
    complete: failures.length === 0 && documents.length === requested.length,
    requests: (typeof api.stats === 'function' ? api.stats().requests : 0) - startRequests,
    warnings: aggregateExceeded
      ? ['The book total size limit was reached. Remove files before rebuilding.']
      : [],
  };
}

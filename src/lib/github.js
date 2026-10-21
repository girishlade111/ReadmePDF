/**
 * ReadmePDF — GitHub compatibility facade.
 *
 * URL parsing, path resolution, and URL rewriting live in ./github/urls.js.
 * Discovery, reference resolution, and multi-file fetching live alongside it.
 * `fetchReadme` remains here so the original single-document flow (and its
 * public error codes) keeps working unchanged.
 */

import {
  README_CANDIDATES,
  BRANCH_FALLBACKS,
  parseGitHubUrl,
  parseGitHubSource,
} from './github/urls.js';

export {
  README_CANDIDATES,
  BRANCH_FALLBACKS,
  parseGitHubUrl,
  parseGitHubSource,
  splitRefCandidates,
  isAbsoluteOrSpecial,
  splitPathSuffix,
  dirOf,
  resolveRepoPath,
  encodeRef,
  encodeRepoPath,
  buildRawUrl,
  buildBlobUrl,
  rewriteRelativeUrls,
  isReadmeName,
} from './github/urls.js';

export { createGitHubApi, API_BASE, encodeApiRef } from './github/api.js';
export { resolveRepositorySource, validateResolvedPath } from './github/references.js';
export {
  discoverMarkdownFiles,
  discoverFromResolvedSource,
  isMarkdownPath,
  DISCOVERY_LIMITS,
} from './github/discovery.js';
export {
  fetchMarkdownFiles,
  mapWithConcurrency,
  BOOK_FETCH_LIMITS,
  assertSafeRepoPath,
} from './github/content.js';

const OWNER_RE = /^[a-zA-Z0-9_.-]+$/;
const REPO_RE = /^[a-zA-Z0-9_.-]+$/;

/**
 * Fetch the README for a repo, trying README filename variants and main/master
 * branches. This is the original single-document importer; the explorer uses
 * discoverMarkdownFiles() instead.
 *
 * @param {string|{owner:string,repo:string}} input repo URL or {owner, repo}
 * @param {{ fetchFn?: typeof fetch, signal?: AbortSignal }} opts
 * @returns {{ owner, repo, branch, path, rawUrl, markdown }}
 */
export async function fetchReadme(input, { fetchFn = fetch, signal } = {}) {
  const { owner, repo } =
    typeof input === 'string' ? parseGitHubUrl(input) : validateOwnerRepo(input);

  let defaultBranch = null;
  try {
    const metaRes = await fetchFn(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: signal ?? timeoutSignal(15000),
    });
    if (metaRes.status === 404) {
      const err = new Error(
        `Repository "${owner}/${repo}" not found. It may be private (not supported in MVP) or the URL is wrong — paste Markdown manually instead.`,
      );
      err.code = 'PRIVATE_OR_NOT_FOUND';
      throw err;
    }
    // A 403 here (API rate limit) does NOT abort: raw.githubusercontent.com has
    // an independent quota, so we still try the raw branch fallbacks below.
    if (metaRes.ok) {
      const meta = await metaRes.json().catch(() => ({}));
      if (meta && typeof meta.default_branch === 'string') defaultBranch = meta.default_branch;
    }
  } catch (e) {
    if (e && e.code) throw e;
    const err = new Error(`Network error contacting GitHub: ${e?.message ?? e}`);
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  const branches = defaultBranch
    ? [defaultBranch, ...BRANCH_FALLBACKS.filter((b) => b !== defaultBranch)]
    : [...BRANCH_FALLBACKS];

  let sawRateLimit = false;
  for (const branch of branches) {
    for (const path of README_CANDIDATES) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      let res;
      try {
        res = await fetchFn(rawUrl, { signal: signal ?? timeoutSignal(15000) });
      } catch (e) {
        const err = new Error(`Network error fetching README: ${e?.message ?? e}`);
        err.code = e?.name === 'AbortError' ? 'CANCELLED' : 'NETWORK_ERROR';
        throw err;
      }
      if (res.ok) {
        const markdown = await res.text();
        return { owner, repo, branch, path, rawUrl, markdown };
      }
      if (res.status === 403 || res.status === 429) sawRateLimit = true;
      // 404 → try next candidate; other statuses → keep trying.
    }
  }
  if (sawRateLimit) {
    const err = new Error('GitHub rate limit reached while fetching README. Wait a minute and retry.');
    err.code = 'RATE_LIMITED';
    throw err;
  }
  const err = new Error(
    `No README found for "${owner}/${repo}" (tried ${branches.join('/')} branches). The repo may have no README or keep it in a non-standard location — upload the file manually instead.`,
  );
  err.code = 'NO_README';
  throw err;
}

function validateOwnerRepo(input) {
  const owner = input?.owner;
  const repo = String(input?.repo ?? '').replace(/\.git$/, '');
  if (!owner || !repo || !OWNER_RE.test(owner) || !REPO_RE.test(repo)) {
    const err = new Error('Invalid { owner, repo }.');
    err.code = 'INVALID_URL';
    throw err;
  }
  return { owner, repo };
}

function timeoutSignal(ms) {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

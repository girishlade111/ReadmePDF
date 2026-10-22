/**
 * Recursive Markdown discovery with hard safety limits.
 *
 * The Git Trees API returns a whole repository in one request, but it sets
 * `truncated: true` when the response is too large. In that case we fall back
 * to a bounded, non-recursive breadth-first scan. The result states plainly
 * whether the listing is complete — it never pretends a partial scan is whole.
 */
import { githubError } from '../errors.js';

export const DISCOVERY_LIMITS = Object.freeze({
  maxFiles: 500,
  maxDirs: 80,
  maxTreeRequests: 14,
  maxTreeEntries: 80000,
  timeoutMs: 25000,
});

const EXCLUDED_DIRS = new Set(['.git', 'node_modules']);
const MARKDOWN_RE = /\.(md|markdown|mdown)$/i;

export function isMarkdownPath(path) {
  const name = String(path ?? '').split('/').pop() || '';
  if (MARKDOWN_RE.test(name)) return true;
  return name.toLowerCase() === 'readme';
}

function isExcludedPath(path) {
  const dirs = String(path).split('/').slice(0, -1);
  return dirs.some((segment) => EXCLUDED_DIRS.has(segment));
}

function underBase(path, basePath) {
  if (!basePath) return true;
  return path === basePath || path.startsWith(`${basePath}/`);
}

function isRelevantForBase(path, basePath) {
  if (!basePath) return true;
  return underBase(path, basePath) || basePath.startsWith(`${path}/`);
}

/**
 * Emit a warning in the active locale when a translator is supplied, otherwise
 * keep the historical English diagnostic. Library callers and tests therefore
 * see stable English; the browser sees localized copy.
 */
function pushWarning(warnings, translate, key, fallback, vars) {
  warnings.push(translate ? translate(`book.warnings.${key}`, vars) : fallback);
}

function toFile(entry) {
  const path = String(entry.path);
  const slash = path.lastIndexOf('/');
  return {
    path,
    name: slash === -1 ? path : path.slice(slash + 1),
    dir: slash === -1 ? '' : path.slice(0, slash),
    size: Number.isFinite(entry.size) ? entry.size : null,
    sha: entry.sha ?? null,
    type: 'file',
  };
}

function sortFiles(files) {
  return files.sort((a, b) =>
    a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

async function boundedTreeScan({
  owner,
  repo,
  rootTreeSha,
  basePath,
  api,
  signal,
  limits,
  deadline,
  seedFiles,
  warnings,
  translate,
}) {
  const files = new Map(seedFiles.map((file) => [file.path, file]));
  const queue = [{ sha: rootTreeSha, prefix: '', depth: 0 }];
  const seen = new Set();
  let dirsFetched = 0;
  let treeRequests = 0;
  let complete = true;

  while (queue.length) {
    if (signal?.aborted) throw githubError('CANCELLED', 'Discovery cancelled.');
    if (files.size >= limits.maxFiles) {
      pushWarning(
        warnings,
        translate,
        'fileLimit',
        `Discovery stopped after the ${limits.maxFiles}-file safety limit. The list may be incomplete.`,
        { max: limits.maxFiles },
      );
      complete = false;
      break;
    }
    if (dirsFetched >= limits.maxDirs) {
      pushWarning(
        warnings,
        translate,
        'dirLimit',
        `Discovery stopped after scanning ${limits.maxDirs} folders. The list may be incomplete.`,
        { max: limits.maxDirs },
      );
      complete = false;
      break;
    }
    if (treeRequests >= limits.maxTreeRequests) {
      pushWarning(
        warnings,
        translate,
        'requestLimit',
        `Discovery stopped after ${limits.maxTreeRequests} tree requests. The list may be incomplete.`,
        { max: limits.maxTreeRequests },
      );
      complete = false;
      break;
    }
    if (Date.now() > deadline) {
      pushWarning(
        warnings,
        translate,
        'timeout',
        `Discovery timed out after ${Math.round(limits.timeoutMs / 1000)}s. The list may be incomplete.`,
        { seconds: Math.round(limits.timeoutMs / 1000) },
      );
      complete = false;
      break;
    }

    const dir = queue.shift();
    if (seen.has(dir.sha)) continue;
    seen.add(dir.sha);
    treeRequests += 1;

    const data = await api.getTree(owner, repo, dir.sha, { recursive: false, signal });
    if (!data || !Array.isArray(data.tree)) {
      pushWarning(
        warnings,
        translate,
        'folderUnreadable',
        `Could not read the folder "${dir.prefix || '/'}". Some files may be missing.`,
        { path: dir.prefix || '/' },
      );
      complete = false;
      continue;
    }
    dirsFetched += 1;
    if (data.truncated) {
      pushWarning(
        warnings,
        translate,
        'folderTruncated',
        `GitHub truncated the listing for "${dir.prefix || '/'}". Some files may be missing.`,
        { path: dir.prefix || '/' },
      );
      complete = false;
    }

    for (const entry of data.tree) {
      const name = String(entry.path ?? '');
      const fullPath = dir.prefix ? `${dir.prefix}/${name}` : name;
      if (!fullPath || isExcludedPath(fullPath)) continue;
      if (entry.type === 'blob') {
        if (underBase(fullPath, basePath) && isMarkdownPath(fullPath) && !files.has(fullPath)) {
          files.set(fullPath, toFile({ ...entry, path: fullPath }));
          if (files.size >= limits.maxFiles) break;
        }
      } else if (entry.type === 'tree') {
        if (EXCLUDED_DIRS.has(name)) continue;
        if (entry.sha && isRelevantForBase(fullPath, basePath)) {
          queue.push({ sha: entry.sha, prefix: fullPath, depth: dir.depth + 1 });
        }
      }
    }
  }

  return { files: [...files.values()], complete };
}

/**
 * @param {Awaited<ReturnType<import('./references.js').resolveRepositorySource>>} resolved
 * @param {ReturnType<import('./api.js').createGitHubApi>} api
 */
export async function discoverMarkdownFiles(resolved, api, options = {}) {
  if (!resolved || !resolved.owner || !resolved.repo || !resolved.commitSha) {
    throw githubError('INTERNAL', 'A resolved repository source is required for discovery.');
  }
  const limits = { ...DISCOVERY_LIMITS, ...(options.limits || {}) };
  const signal = options.signal;
  const translate = typeof options.translate === 'function' ? options.translate : null;
  const deadline = Date.now() + limits.timeoutMs;
  const warnings = [];
  const basePath = String(resolved.path ?? '');
  const startRequests = typeof api.stats === 'function' ? api.stats().requests : 0;

  if (signal?.aborted) throw githubError('CANCELLED', 'Discovery cancelled.');

  // A /blob/ or raw URL describes exactly one file, not a repository to explore.
  if (resolved.kind === 'blob' || resolved.kind === 'raw') {
    if (!isMarkdownPath(basePath)) {
      throw githubError(
        'NO_MARKDOWN',
        `"${basePath}" is not a Markdown file. Use a README, .md, .markdown, or .mdown file.`,
      );
    }
    const entry = resolved.entry && !Array.isArray(resolved.entry) ? resolved.entry : null;
    const file = {
      path: basePath,
      name: basePath.split('/').pop(),
      dir: basePath.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/')) : '',
      size: Number.isFinite(entry?.size) ? entry.size : null,
      sha: entry?.sha ?? null,
      type: 'file',
    };
    return {
      owner: resolved.owner,
      repo: resolved.repo,
      ref: resolved.ref,
      commitSha: resolved.commitSha,
      basePath,
      files: [file],
      complete: true,
      truncated: false,
      warnings,
      requests: (typeof api.stats === 'function' ? api.stats().requests : 0) - startRequests,
    };
  }

  let rootTreeSha = resolved.treeSha;
  if (!rootTreeSha) {
    rootTreeSha = await api.getCommitTree(resolved.owner, resolved.repo, resolved.commitSha, { signal });
  }

  const treeData = await api.getTree(resolved.owner, resolved.repo, rootTreeSha, {
    recursive: true,
    signal,
  });
  if (!treeData || !Array.isArray(treeData.tree)) {
    throw githubError(
      'TREE_UNAVAILABLE',
      'GitHub did not return a file tree for this repository. It may be empty or unavailable.',
    );
  }

  let entries = treeData.tree;
  let truncated = Boolean(treeData.truncated);
  if (entries.length > limits.maxTreeEntries) {
    truncated = true;
    pushWarning(
      warnings,
      translate,
      'treeEntries',
      `GitHub returned more than ${limits.maxTreeEntries} tree entries. A bounded folder-by-folder scan was used instead.`,
      { max: limits.maxTreeEntries },
    );
  }

  const found = new Map();
  for (const entry of entries) {
    if (entry.type !== 'blob') continue;
    const path = String(entry.path ?? '');
    if (!path || isExcludedPath(path)) continue;
    if (!underBase(path, basePath)) continue;
    if (!isMarkdownPath(path)) continue;
    found.set(path, toFile(entry));
    if (found.size >= limits.maxFiles) {
      truncated = true;
      pushWarning(
        warnings,
        translate,
        'fileLimit',
        `Discovery stopped after the ${limits.maxFiles}-file safety limit. The list may be incomplete.`,
        { max: limits.maxFiles },
      );
      break;
    }
  }

  let complete = !truncated;

  if (truncated) {
    if (!warnings.length) {
      pushWarning(
        warnings,
        translate,
        'treeTruncated',
        'GitHub truncated the recursive tree listing. A bounded folder-by-folder scan was used to fill the gaps.',
      );
    }
    const fallback = await boundedTreeScan({
      owner: resolved.owner,
      repo: resolved.repo,
      rootTreeSha,
      basePath,
      api,
      signal,
      limits,
      deadline,
      seedFiles: [...found.values()],
      warnings,
      translate,
    });
    for (const file of fallback.files) found.set(file.path, file);
    complete = fallback.complete;
  }

  const files = sortFiles([...found.values()]);
  if (files.length > limits.maxFiles) {
    files.length = limits.maxFiles;
    complete = false;
    pushWarning(
      warnings,
      translate,
      'firstFiles',
      `Only the first ${limits.maxFiles} Markdown files are listed. Narrow the URL to a folder for a complete list.`,
      { max: limits.maxFiles },
    );
  }

  return {
    owner: resolved.owner,
    repo: resolved.repo,
    ref: resolved.ref,
    commitSha: resolved.commitSha,
    basePath,
    files,
    complete,
    truncated: !complete || files.length >= limits.maxFiles,
    warnings: [...new Set(warnings)],
    requests: (typeof api.stats === 'function' ? api.stats().requests : 0) - startRequests,
  };
}

export const discoverFromResolvedSource = discoverMarkdownFiles;

/**
 * Minimal, tokenless GitHub REST client.
 *
 * - No authentication: only public repositories work.
 * - Every request is counted against a per-instance budget.
 * - Every request has a timeout and honours a caller AbortSignal.
 * - Errors carry stable `.code` values so the UI can explain what happened.
 *
 * `fetchFn` is injectable, which is how the test suite mocks GitHub without
 * network access.
 */
import { githubError, isAbortError, cancelledError } from '../errors.js';
import { encodeRef, encodeRepoPath } from './urls.js';

export const API_BASE = 'https://api.github.com';

export function encodeApiRef(ref) {
  return encodeRef(ref);
}

function timeoutSignal(ms) {
  if (!ms || ms <= 0) return undefined;
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

function combineSignals(signals) {
  const list = signals.filter(Boolean);
  if (!list.length) return undefined;
  if (list.length === 1) return list[0];
  if (typeof AbortSignal.any === 'function') {
    try {
      return AbortSignal.any(list);
    } catch {
      // Fall through to the manual implementation.
    }
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of list) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', abort, { once: true });
  }
  return controller.signal;
}

function getHeader(response, name) {
  const headers = response?.headers;
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return null;
}

function resetIso(response) {
  const raw = getHeader(response, 'x-ratelimit-reset');
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function statusError(response, fallbackMessage) {
  const status = Number(response?.status ?? 0);
  let code = 'HTTP_ERROR';
  let message = fallbackMessage;
  let retryable = status >= 500;
  if (status === 404) {
    code = 'NOT_FOUND';
    message = fallbackMessage || 'GitHub could not find that file or directory.';
  } else if (status === 401) {
    code = 'AUTH_REQUIRED';
    message = 'GitHub asked for authentication. Private repositories are not supported.';
  } else if (status === 403) {
    code = 'FORBIDDEN';
    message = 'GitHub refused the request. It may be rate limiting anonymous traffic.';
    retryable = true;
  } else if (status === 422) {
    code = 'INVALID_REF';
    message = 'GitHub could not resolve that branch, tag, commit, or path.';
  } else if (status === 429) {
    code = 'RATE_LIMITED';
    message = 'GitHub rate limit reached. Wait a minute and retry.';
    retryable = true;
  } else if (status >= 500) {
    code = 'GITHUB_UNAVAILABLE';
    message = 'GitHub is temporarily unavailable. Retry in a moment.';
  }
  return githubError(code, message, { status, retryable });
}

/**
 * @param {{
 *   fetchFn?: typeof fetch,
 *   signal?: AbortSignal,
 *   timeoutMs?: number,
 *   maxRequests?: number,
 *   headers?: Record<string,string>,
 * }} options
 */
export function createGitHubApi({
  fetchFn = globalThis.fetch,
  signal: outerSignal,
  timeoutMs = 15000,
  maxRequests = 60,
  headers = {},
} = {}) {
  if (typeof fetchFn !== 'function') {
    throw githubError('FETCH_UNAVAILABLE', 'This browser cannot fetch GitHub content.');
  }
  const budget = Math.max(1, Number(maxRequests) || 1);
  const cache = new Map();
  let requests = 0;
  let rateLimitReset = null;

  function stats() {
    return {
      requests,
      maxRequests: budget,
      remaining: Math.max(0, budget - requests),
      rateLimitReset,
    };
  }

  function assertCanRequest() {
    if (outerSignal?.aborted) throw cancelledError();
    if (requests >= budget) {
      throw githubError(
        'REQUEST_LIMIT',
        `This operation reached its ${budget}-request safety limit. Narrow the scan or retry with fewer files.`,
        { retryable: false },
      );
    }
  }

  /**
   * Low-level request. Returns the Response for every non-auth, non-rate-limit
   * status so callers can decide whether a 404 is fatal (README) or expected
   * (ref probing).
   */
  async function request(url, { accept = 'application/vnd.github+json', signal } = {}) {
    assertCanRequest();
    if (signal?.aborted) throw cancelledError();
    requests += 1;

    const requestTimeout = timeoutSignal(timeoutMs);
    const combined = combineSignals([outerSignal, signal, requestTimeout]);
    const requestHeaders = { ...headers, Accept: accept };
    if (accept === 'application/vnd.github+json') {
      requestHeaders['X-GitHub-Api-Version'] = '2022-11-28';
      requestHeaders['User-Agent'] = 'md2pdf';
    }

    let response;
    try {
      response = await fetchFn(url, { headers: requestHeaders, signal: combined });
    } catch (error) {
      if (isAbortError(error)) {
        if (outerSignal?.aborted || signal?.aborted) throw cancelledError();
        if (requestTimeout?.aborted) {
          throw githubError('TIMEOUT', `GitHub did not answer within ${timeoutMs / 1000}s.`, {
            retryable: true,
          });
        }
        throw cancelledError();
      }
      throw githubError('NETWORK_ERROR', `Network error contacting GitHub: ${error?.message ?? error}`, {
        retryable: true,
      });
    }

    if (response.status === 401) {
      throw githubError(
        'AUTH_REQUIRED',
        'GitHub asked for authentication. Private repositories and authenticated APIs are not supported.',
        { status: 401, retryable: false },
      );
    }
    if (response.status === 429 || response.status === 403) {
      const remaining = getHeader(response, 'x-ratelimit-remaining');
      const reset = resetIso(response);
      rateLimitReset = reset;
      if (response.status === 429 || remaining === '0' || remaining == null) {
        const wait = reset ? ` The limit resets at ${reset}.` : '';
        throw githubError(
          'RATE_LIMITED',
          `GitHub rate limit reached for anonymous requests.${wait} Wait a moment and retry.`,
          { status: response.status, retryable: true, resetAt: reset },
        );
      }
      throw githubError('FORBIDDEN', 'GitHub refused this request.', {
        status: 403,
        retryable: false,
        resetAt: reset,
      });
    }
    return response;
  }

  async function json(url, { allowNotFound = false, allowInvalidRef = false, signal } = {}) {
    const cacheKey = url;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const response = await request(url, { signal });
    if (response.status === 404) {
      if (allowNotFound) return null;
      throw statusError(response, 'GitHub could not find that resource.');
    }
    if (response.status === 422 && allowInvalidRef) return null;
    if (!response.ok) throw statusError(response, 'GitHub returned an unexpected response.');
    let data;
    try {
      data = await response.json();
    } catch {
      throw githubError('INVALID_RESPONSE', 'GitHub returned a response that was not valid JSON.', {
        retryable: true,
      });
    }
    cache.set(cacheKey, data);
    return data;
  }

  async function text(url, { signal, allowNotFound = false } = {}) {
    const response = await request(url, { accept: 'text/plain', signal });
    if (response.status === 404 && allowNotFound) return null;
    if (!response.ok) throw statusError(response, 'GitHub could not return that file.');
    try {
      return await response.text();
    } catch {
      throw githubError('INVALID_RESPONSE', 'GitHub returned a file that could not be read.', {
        retryable: true,
      });
    }
  }

  async function getRepo(owner, repo, { signal } = {}) {
    const data = await json(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { allowNotFound: true, signal },
    );
    if (!data) {
      throw githubError(
        'PRIVATE_OR_NOT_FOUND',
        `Repository "${owner}/${repo}" was not found. Private repositories are not supported.`,
        { retryable: false },
      );
    }
    return data;
  }

  async function getCommit(owner, repo, ref, { signal } = {}) {
    return json(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeApiRef(ref)}`,
      { allowNotFound: true, allowInvalidRef: true, signal },
    );
  }

  async function getCommitTree(owner, repo, commitSha, { signal } = {}) {
    const data = await json(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(commitSha)}`,
      { allowNotFound: true, signal },
    );
    if (!data?.tree?.sha) {
      throw githubError('TREE_UNAVAILABLE', 'GitHub did not return a file tree for that commit.', {
        retryable: true,
      });
    }
    return data.tree.sha;
  }

  async function getTree(owner, repo, treeSha, { recursive = false, signal } = {}) {
    const suffix = recursive ? '?recursive=1' : '';
    return json(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(treeSha)}${suffix}`,
      { allowNotFound: true, signal },
    );
  }

  async function getContents(owner, repo, repoPath, ref, { signal } = {}) {
    const encodedPath = encodeRepoPath(repoPath);
    const encodedRef = encodeURIComponent(ref);
    return json(
      `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodedRef}`,
      { allowNotFound: true, signal },
    );
  }

  return {
    stats,
    request,
    json,
    text,
    getRepo,
    getCommit,
    getCommitTree,
    getTree,
    getContents,
  };
}

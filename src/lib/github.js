/**
 * ReadmePDF — GitHub fetch + relative-path resolution (MVP core).
 *
 * Client-side, no secrets. All document content stays in the browser;
 * the only network calls are to github.com / raw.githubusercontent.com.
 *
 * Exports:
 * - parseGitHubUrl(url)
 * - resolveRepoPath(relativePath, readmeDir)
 * - buildRawUrl(owner, repo, branch, repoPath)
 * - buildBlobUrl(owner, repo, branch, repoPath)
 * - rewriteRelativeUrls(markdown, { owner, repo, branch, readmePath })
 * - fetchReadme(input, { fetchFn }?) — input is URL string or {owner, repo}
 */

export const README_CANDIDATES = [
  'README.md',
  'readme.md',
  'README.MD',
  'Readme.md',
  'README.markdown',
  'readme.markdown',
  'README',
  'readme',
  '.github/README.md',
  '.github/readme.md',
];

export const BRANCH_FALLBACKS = ['main', 'master'];

const OWNER_RE = /^[a-zA-Z0-9_.-]+$/;
const REPO_RE = /^[a-zA-Z0-9_.-]+$/;

/**
 * Parse a GitHub repository URL into { owner, repo }.
 * Accepts:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - github.com/owner/repo
 * - https://github.com/owner/repo/tree/main/docs (extra path ignored)
 * - https://github.com/owner/repo/blob/main/README.md (extra path ignored)
 * Throws Error with code 'INVALID_URL' on failure.
 */
export function parseGitHubUrl(input) {
  if (typeof input !== 'string') {
    const err = new Error('GitHub URL must be a string.');
    err.code = 'INVALID_URL';
    throw err;
  }
  let trimmed = input.trim();
  if (!trimmed) {
    const err = new Error('Empty GitHub URL. Paste a repo link like https://github.com/owner/repo');
    err.code = 'INVALID_URL';
    throw err;
  }
  // Allow bare "owner/repo" shorthand.
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    const [owner, repo] = trimmed.split('/');
    return { owner, repo: stripGitSuffix(repo) };
  }
  // Allow missing protocol.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    const err = new Error(`Could not parse GitHub URL: "${input.trim()}"`);
    err.code = 'INVALID_URL';
    throw err;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'github.com') {
    const err = new Error('Only github.com repository URLs are supported in MVP.');
    err.code = 'INVALID_URL';
    throw err;
  }
  const parts = url.pathname.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  if (parts.length < 2) {
    const err = new Error('URL must include owner and repo, e.g. https://github.com/owner/repo');
    err.code = 'INVALID_URL';
    throw err;
  }
  const [owner, repoRaw] = parts;
  const repo = stripGitSuffix(repoRaw);
  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) {
    const err = new Error(`Invalid owner/repo in URL: "${owner}/${repo}"`);
    err.code = 'INVALID_URL';
    throw err;
  }
  return { owner, repo };
}

function stripGitSuffix(repo) {
  return repo.endsWith('.git') ? repo.slice(0, -4) : repo;
}

/** Split a markdown URL into { path, suffix } where suffix is ?query and/or #hash. */
function splitPathSuffix(url) {
  const idx = url.search(/[?#]/);
  if (idx === -1) return { path: url, suffix: '' };
  return { path: url.slice(0, idx), suffix: url.slice(idx) };
}

/** True for URLs that must never be rewritten. */
export function isAbsoluteOrSpecial(url) {
  const u = url.trim();
  if (!u) return true;
  if (u.startsWith('#')) return true;
  if (/^(https?:)?\/\//i.test(u)) return true; // http(s):// and //host
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return true; // data:, mailto:, tel:, etc.
  return false;
}

/**
 * Resolve a relative path found in a README to a repo-root-relative path.
 * @param {string} relativePath e.g. "docs/img.png", "./a.png", "../b.png", "/root.png"
 * @param {string} readmeDir dir containing the README ("" for repo root, ".github" for .github/README.md)
 * @returns repo-root-relative posix path, e.g. "docs/img.png"
 */
export function resolveRepoPath(relativePath, readmeDir = '') {
  const { path, suffix } = splitPathSuffix(relativePath.trim());
  let combined;
  if (path.startsWith('/')) {
    combined = path.slice(1); // repo-root absolute
  } else {
    combined = readmeDir ? `${readmeDir}/${path}` : path;
  }
  const segments = [];
  for (const seg of combined.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (segments.length) segments.pop(); // clamp: never escape repo root
      continue;
    }
    segments.push(seg);
  }
  return segments.join('/') + suffix;
}

export function buildRawUrl(owner, repo, branch, repoPath) {
  const { path, suffix } = splitPathSuffix(repoPath);
  const encoded = path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encoded}${suffix}`;
}

export function buildBlobUrl(owner, repo, branch, repoPath) {
  const { path, suffix } = splitPathSuffix(repoPath);
  const encoded = path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `https://github.com/${owner}/${repo}/blob/${branch}/${encoded}${suffix}`;
}

function dirOf(readmePath) {
  if (!readmePath || !readmePath.includes('/')) return '';
  return readmePath.slice(0, readmePath.lastIndexOf('/'));
}

/**
 * Rewrite relative image/link URLs in markdown to absolute URLs.
 * - Markdown images + <img src> → raw.githubusercontent.com (so badges/pictures render in PDF)
 * - Markdown links + <a href> + reference definitions → github.com/.../blob/... (so doc links stay clickable)
 * - Leaves absolute URLs, anchors, data:/mailto: untouched.
 * - Skips fenced code blocks (``` / ~~~) and inline `code spans` so examples are not corrupted.
 */
export function rewriteRelativeUrls(markdown, { owner, repo, branch, readmePath = 'README.md' } = {}) {
  if (typeof markdown !== 'string') return '';
  if (!owner || !repo || !branch) throw new Error('rewriteRelativeUrls requires { owner, repo, branch }.');
  const readmeDir = dirOf(readmePath);

  const toRaw = (p) => buildRawUrl(owner, repo, branch, resolveRepoPath(p, readmeDir));
  const toBlob = (p) => buildBlobUrl(owner, repo, branch, resolveRepoPath(p, readmeDir));
  const rewrite = (url, kind) => {
    if (isAbsoluteOrSpecial(url)) return url;
    // Strip wrapping <...> used for paths with spaces: <my image.png>
    let inner = url;
    let wrapped = false;
    if (inner.startsWith('<') && inner.endsWith('>')) {
      inner = inner.slice(1, -1);
      wrapped = true;
    }
    const out = kind === 'image' ? toRaw(inner) : toBlob(inner);
    return wrapped ? `<${out}>` : out;
  };

  // Split out fenced code blocks so we never touch them.
  const parts = splitFencedBlocks(markdown);
  return parts
    .map((part) => {
      if (part.isCode) return part.text;
      return rewriteNonCodeSegment(part.text, rewrite);
    })
    .join('');
}

function splitFencedBlocks(md) {
  const lines = md.split('\n');
  const parts = [];
  let buf = [];
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  const flush = (isCode) => {
    if (buf.length) {
      parts.push({ text: buf.join('\n') + '\n', isCode });
      buf = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      const fence = m[1];
      if (!inFence) {
        flush(false);
        inFence = true;
        fenceChar = fence[0];
        fenceLen = fence.length;
        buf.push(line);
      } else if (fence[0] === fenceChar && fence.length >= fenceLen) {
        buf.push(line);
        flush(true);
        inFence = false;
        fenceChar = '';
        fenceLen = 0;
      } else {
        buf.push(line);
      }
    } else {
      buf.push(line);
    }
  }
  // Join remainder; drop the artificial trailing newline on the last chunk.
  if (buf.length) parts.push({ text: buf.join('\n'), isCode: inFence });
  else if (parts.length) {
    const last = parts[parts.length - 1];
    if (last.text.endsWith('\n')) last.text = last.text.slice(0, -1);
  }
  return parts;
}

function rewriteNonCodeSegment(text, rewrite) {
  // Protect inline `code spans` with placeholders.
  const spans = [];
  const protected_ = text.replace(/(`+)([\s\S]*?)\1/g, (m) => {
    spans.push(m);
    return `\u0000${spans.length - 1}\u0000`;
  });
  let out = protected_;

  // 1. Markdown images: ![alt](url "title")
  out = out.replace(/!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)([^\n)]*)\)/g, (m, alt, url, rest) => {
    return `![${alt}](${rewrite(url.trim(), 'image')}${rest})`;
  });
  // 1b. Linked images: [![alt](img)](url) — stash so the generic link pass
  // below can't trip over the inner brackets. Outer URL is a doc link (blob).
  const stashed = [];
  out = out.replace(
    /\[(!\[[^\]]*\]\([^\n)]*\))\]\(\s*(<[^>]+>|[^)\s]+)([^\n)]*)\)/g,
    (m, img, url, rest) => {
      stashed.push(`[${img}](${rewrite(url.trim(), 'link')}${rest})`);
      return `@@RPDF-STASH-${stashed.length - 1}@@`;
    },
  );
  // 2. Markdown links: [text](url) — negative lookbehind avoids matching ![...](...)
  out = out.replace(/(?<!!)\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)([^\n)]*)\)/g, (m, label, url, rest) => {
    return `[${label}](${rewrite(url.trim(), 'link')}${rest})`;
  });
  // 3. Reference-style definitions: [label]: url "title"
  // Definitions backing ![alt][label] usages are images (raw); the rest are links (blob).
  const imageRefs = new Set();
  for (const m of protected_.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) {
    imageRefs.add((m[2] || m[1]).toLowerCase());
  }
  out = out.replace(/^([ \t]*\[([^\]]+)\]:[ \t]*)(<[^>]+>|\S+)([ \t]+.*)?$/gm, (m, pre, label, url, title) => {
    const kind = imageRefs.has(label.toLowerCase()) ? 'image' : 'link';
    return `${pre}${rewrite(url.trim(), kind)}${title ?? ''}`;
  });
  // 4. Inline HTML <img src> → raw; <a href> → blob.
  out = out.replace(/<img\b[^>]*?\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (m, _g, dq, sq, bare) => {
    const url = dq ?? sq ?? bare ?? '';
    return m.replace(url, () => rewrite(url, 'image'));
  });
  out = out.replace(/<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (m, _g, dq, sq, bare) => {
    const url = dq ?? sq ?? bare ?? '';
    return m.replace(url, () => rewrite(url, 'link'));
  });

  // Restore stashed linked images (their outer URLs are already absolute).
  if (stashed.length) {
    out = out.replace(/@@RPDF-STASH-(\d+)@@/g, (_, i) => stashed[Number(i)]);
  }

  // Restore inline code spans.
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => spans[Number(i)]);
  return out;
}

/**
 * Fetch the README for a repo, trying README filename variants and main/master branches.
 * @param {string|{owner:string,repo:string}} input repo URL or {owner, repo}
 * @param {{ fetchFn?: typeof fetch }} opts injectable fetch for tests
 * @returns {{ owner, repo, branch, path, rawUrl, markdown }}
 * @throws Error with .code: INVALID_URL | PRIVATE_OR_NOT_FOUND |
 *   NO_README | RATE_LIMITED | NETWORK_ERROR
 */
export async function fetchReadme(input, { fetchFn = fetch } = {}) {
  const { owner, repo } =
    typeof input === 'string' ? parseGitHubUrl(input) : validateOwnerRepo(input);

  let defaultBranch = null;
  try {
    const metaRes = await fetchFn(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: timeoutSignal(15000),
    });
    if (metaRes.status === 404) {
      const err = new Error(
        `Repository "${owner}/${repo}" not found. It may be private (not supported in MVP) or the URL is wrong — paste Markdown manually instead.`,
      );
      err.code = 'PRIVATE_OR_NOT_FOUND';
      throw err;
    }
    // NOTE: a 403 here (API rate limit) does NOT abort: raw.githubusercontent.com
    // has an independent quota, so we still try the raw branch fallbacks below.
    if (metaRes.ok) {
      const meta = await metaRes.json().catch(() => ({}));
      if (meta && typeof meta.default_branch === 'string') defaultBranch = meta.default_branch;
    }
    // Other non-OK statuses (403/429/5xx): fall through to raw branch fallbacks.
  } catch (e) {
    if (e && e.code) throw e; // our own coded errors
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
        res = await fetchFn(rawUrl, { signal: timeoutSignal(15000) });
      } catch (e) {
        const err = new Error(`Network error fetching README: ${e?.message ?? e}`);
        err.code = 'NETWORK_ERROR';
        throw err;
      }
      if (res.ok) {
        const markdown = await res.text();
        return { owner, repo, branch, path, rawUrl, markdown };
      }
      if (res.status === 403 || res.status === 429) sawRateLimit = true;
      // 404 → try next candidate; other statuses → keep trying (resilience over precision).
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
  const repo = stripGitSuffix(String(input?.repo ?? ''));
  if (!owner || !repo || !OWNER_RE.test(owner) || !REPO_RE.test(repo)) {
    const err = new Error('Invalid { owner, repo }.');
    err.code = 'INVALID_URL';
    throw err;
  }
  return { owner, repo };
}

/** AbortSignal with a timeout, or undefined where unsupported (very old browsers). */
function timeoutSignal(ms) {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

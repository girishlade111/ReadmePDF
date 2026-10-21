/**
 * GitHub URL parsing and repository-path helpers.
 *
 * This module is deliberately dependency-free. It is shared by the browser
 * controller, the GitHub API client, and Node tests. It never performs I/O.
 */
import { githubError } from '../errors.js';

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

export const MAX_REF_CANDIDATES = 24;

const OWNER_RE = /^[a-zA-Z0-9_.-]+$/;
const REPO_RE = /^[a-zA-Z0-9_.-]+$/;
const README_NAMES = new Set([
  'readme',
  'readme.md',
  'readme.markdown',
  'readme.mdown',
  'readme.mdx',
]);

function stripGitSuffix(repo) {
  return repo.endsWith('.git') ? repo.slice(0, -4) : repo;
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw githubError('INVALID_URL', `Invalid URL encoding in path segment "${segment}".`);
  }
}

function normalizeInput(input) {
  if (typeof input !== 'string') {
    throw githubError('INVALID_URL', 'GitHub URL must be a string.');
  }
  let trimmed = input.trim();
  if (!trimmed) {
    throw githubError(
      'INVALID_URL',
      'Empty GitHub URL. Paste a repo link like https://github.com/owner/repo',
    );
  }

  // Bare "owner/repo" or "owner/repo/tree/main/docs" shorthand.
  const looksLikeShorthand =
    !trimmed.includes('://') &&
    !trimmed.startsWith('//') &&
    !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) &&
    !/^github\.com\//i.test(trimmed) &&
    !/^raw\.githubusercontent\.com\//i.test(trimmed) &&
    /^[^/\s]+\/[^/\s]+/.test(trimmed);
  if (looksLikeShorthand) trimmed = `https://github.com/${trimmed}`;

  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw githubError('INVALID_URL', `Could not parse GitHub URL: "${input.trim()}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw githubError('INVALID_URL', 'Only http(s) GitHub URLs are supported.');
  }
  if (url.username || url.password) {
    throw githubError('INVALID_URL', 'GitHub URLs with embedded credentials are not supported.');
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'github.com' && host !== 'raw.githubusercontent.com') {
    throw githubError(
      'INVALID_URL',
      'Only github.com repository URLs are supported. Public github.com and raw.githubusercontent.com links work.',
    );
  }
  return { url, host };
}

function validateOwnerRepo(owner, repoRaw) {
  const repo = stripGitSuffix(String(repoRaw ?? ''));
  if (!OWNER_RE.test(owner ?? '') || !REPO_RE.test(repo) || !repo) {
    throw githubError('INVALID_URL', `Invalid owner/repo in URL: "${owner}/${repo}".`);
  }
  return { owner, repo };
}

/**
 * Split the path after /tree|blob|raw/ into possible {ref, path} pairs.
 * A branch or tag can contain slashes, so every split is a candidate. The
 * resolver probes the longest ref first and walks backwards.
 */
export function splitRefCandidates(rest, { requirePath = false, max = MAX_REF_CANDIDATES } = {}) {
  const out = [];
  for (let n = rest.length; n >= 1; n -= 1) {
    const path = rest.slice(n).join('/');
    if (requirePath && !path) continue;
    out.push({ ref: rest.slice(0, n).join('/'), path });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Parse a GitHub repository, tree, blob, or raw URL and retain enough context
 * to resolve slash-containing refs. The public `parseGitHubUrl` helper keeps
 * its historical `{ owner, repo }` return shape.
 *
 * @returns {{
 *   owner: string, repo: string, kind: 'repo'|'tree'|'blob'|'raw',
 *   refCandidates: {ref: string, path: string}[],
 *   sourceUrl: string
 * }}
 */
export function parseGitHubSource(input) {
  const { url, host } = normalizeInput(input);
  const parts = url.pathname.split('/').filter(Boolean).map(decodeSegment);

  if (parts.length < 2) {
    throw githubError(
      'INVALID_URL',
      'URL must include owner and repo, e.g. https://github.com/owner/repo',
    );
  }

  const { owner, repo } = validateOwnerRepo(parts[0], parts[1]);
  let kind = 'repo';
  let rest = [];
  let refCandidates = [];

  if (host === 'raw.githubusercontent.com') {
    kind = 'raw';
    rest = parts.slice(2);
    if (rest.length < 2) {
      throw githubError(
        'INVALID_URL',
        'Raw GitHub URLs need a ref and a file path, e.g. https://raw.githubusercontent.com/owner/repo/main/README.md',
      );
    }
    refCandidates = splitRefCandidates(rest, { requirePath: true });
  } else if (parts.length > 2) {
    const action = parts[2].toLowerCase();
    if (!['tree', 'blob', 'raw'].includes(action)) {
      throw githubError(
        'INVALID_URL',
        'Unsupported GitHub URL path. Use a repository, /tree/<ref>/..., /blob/<ref>/..., or a raw URL.',
      );
    }
    kind = action;
    rest = parts.slice(3);
    if (!rest.length) {
      throw githubError('INVALID_URL', `The /${action}/ URL is missing a branch, tag, or commit.`);
    }
    refCandidates = splitRefCandidates(rest, {
      requirePath: action === 'blob' || action === 'raw',
    });
  }

  if (refCandidates.length === 0) {
    refCandidates = [];
  }

  return { owner, repo, kind, refCandidates, sourceUrl: url.href };
}

/**
 * Parse a GitHub repository URL into { owner, repo }.
 * Accepts full URLs, .git suffixes, shorthand, and tree/blob/raw links.
 * Throws Error with code 'INVALID_URL' on failure.
 */
export function parseGitHubUrl(input) {
  const { owner, repo } = parseGitHubSource(input);
  return { owner, repo };
}

/** True for URLs that must never be rewritten. */
export function isAbsoluteOrSpecial(url) {
  const u = String(url ?? '').trim();
  if (!u) return true;
  if (u.startsWith('#')) return true;
  if (/^(https?:)?\/\//i.test(u)) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return true;
  return false;
}

/** Split a Markdown URL into { path, suffix } where suffix is ?query and/or #hash. */
export function splitPathSuffix(url) {
  const idx = String(url).search(/[?#]/);
  if (idx === -1) return { path: String(url), suffix: '' };
  return { path: String(url).slice(0, idx), suffix: String(url).slice(idx) };
}

export function dirOf(repoPath) {
  const clean = String(repoPath ?? '');
  if (!clean || !clean.includes('/')) return '';
  return clean.slice(0, clean.lastIndexOf('/'));
}

/**
 * Resolve a relative path found in a README to a repo-root-relative path.
 * Traversal is clamped at the repository root.
 */
export function resolveRepoPath(relativePath, readmeDir = '') {
  const { path, suffix } = splitPathSuffix(String(relativePath ?? '').trim());
  let combined;
  if (path.startsWith('/')) {
    combined = path.slice(1);
  } else {
    combined = readmeDir ? `${readmeDir}/${path}` : path;
  }
  const segments = [];
  for (const seg of combined.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (segments.length) segments.pop();
      continue;
    }
    segments.push(seg);
  }
  return segments.join('/') + suffix;
}

/** Encode a branch, tag, or SHA for use in an API or raw URL path. */
export function encodeRef(ref) {
  return String(ref ?? '')
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
}

/** Encode each segment of a repository file path. */
export function encodeRepoPath(repoPath) {
  const { path, suffix } = splitPathSuffix(repoPath);
  const encoded = path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `${encoded}${suffix}`;
}

export function buildRawUrl(owner, repo, branch, repoPath) {
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/${encodeRef(branch)}/${encodeRepoPath(repoPath)}`;
}

export function buildBlobUrl(owner, repo, branch, repoPath) {
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/blob/${encodeRef(branch)}/${encodeRepoPath(repoPath)}`;
}

/**
 * Rewrite relative image/link URLs in Markdown to absolute URLs.
 *
 * Options:
 * - `linkResolver({ url, repoPath, suffix, wrapped, kind })` and
 *   `imageResolver(...)` may return a replacement string.
 * - `anchorResolver(anchor, { kind })` may rewrite in-document anchors.
 *
 * Without custom resolvers the historical behavior applies: images → raw,
 * links → blob. Fenced code blocks and inline code spans are never changed.
 */
export function rewriteRelativeUrls(
  markdown,
  {
    owner,
    repo,
    branch,
    readmePath = 'README.md',
    linkResolver,
    imageResolver,
    anchorResolver,
  } = {},
) {
  if (typeof markdown !== 'string') return '';
  if (!owner || !repo || !branch) throw new Error('rewriteRelativeUrls requires { owner, repo, branch }.');
  const readmeDir = dirOf(readmePath);

  const resolveCustom = (resolver, url, kind) => {
    if (typeof resolver !== 'function') return null;
    const resolvedPath = resolveRepoPath(url, readmeDir);
    const { path, suffix } = splitPathSuffix(resolvedPath);
    const result = resolver({
      url,
      kind,
      resolvedPath,
      repoPath: path,
      suffix,
    });
    return typeof result === 'string' ? result : null;
  };

  const rewrite = (url, kind) => {
    const trimmed = String(url ?? '').trim();
    let inner = trimmed;
    let wrapped = false;
    if (inner.startsWith('<') && inner.endsWith('>')) {
      inner = inner.slice(1, -1);
      wrapped = true;
    }
    const wrap = (value) => (wrapped ? `<${value}>` : value);

    if (inner.startsWith('#')) {
      if (typeof anchorResolver === 'function') {
        const result = anchorResolver(inner, { kind });
        if (typeof result === 'string') return wrap(result);
      }
      return url;
    }
    if (isAbsoluteOrSpecial(inner)) return url;

    const custom = resolveCustom(kind === 'image' ? imageResolver : linkResolver, inner, kind);
    if (custom !== null) return wrap(custom);

    const rawPath = resolveRepoPath(inner, readmeDir);
    return wrap(kind === 'image' ? buildRawUrl(owner, repo, branch, rawPath) : buildBlobUrl(owner, repo, branch, rawPath));
  };

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
  for (let i = 0; i < lines.length; i += 1) {
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
  if (buf.length) parts.push({ text: buf.join('\n'), isCode: inFence });
  else if (parts.length) {
    const last = parts[parts.length - 1];
    if (last.text.endsWith('\n')) last.text = last.text.slice(0, -1);
  }
  return parts;
}

function rewriteNonCodeSegment(text, rewrite) {
  const spans = [];
  const protected_ = text.replace(/(`+)([\s\S]*?)\1/g, (m) => {
    spans.push(m);
    return `\u0000${spans.length - 1}\u0000`;
  });
  let out = protected_;

  // Markdown images: ![alt](url "title")
  out = out.replace(/!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)([^\n)]*)\)/g, (m, alt, url, rest) => {
    return `![${alt}](${rewrite(url.trim(), 'image')}${rest})`;
  });
  // Linked images: [![alt](img)](url) — the outer URL is a document link.
  const stashed = [];
  out = out.replace(
    /\[(!\[[^\]]*\]\([^\n)]*\))\]\(\s*(<[^>]+>|[^)\s]+)([^\n)]*)\)/g,
    (m, img, url, rest) => {
      stashed.push(`[${img}](${rewrite(url.trim(), 'link')}${rest})`);
      return `@@RPDF-STASH-${stashed.length - 1}@@`;
    },
  );
  // Markdown links.
  out = out.replace(
    /(?<!!)\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)([^\n)]*)\)/g,
    (m, label, url, rest) => `[${label}](${rewrite(url.trim(), 'link')}${rest})`,
  );

  // Reference definitions. Definitions backing image references use raw.
  const imageRefs = new Set();
  for (const m of protected_.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) {
    imageRefs.add((m[2] || m[1]).toLowerCase());
  }
  out = out.replace(
    /^([ \t]*\[([^\]]+)\]:[ \t]*)(<[^>]+>|\S+)([ \t]+.*)?$/gm,
    (m, pre, label, url, title) => {
      const kind = imageRefs.has(label.toLowerCase()) ? 'image' : 'link';
      return `${pre}${rewrite(url.trim(), kind)}${title ?? ''}`;
    },
  );

  // Inline HTML <img src> and <a href>.
  out = out.replace(
    /<img\b[^>]*?\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (m, _g, dq, sq, bare) => {
      const url = dq ?? sq ?? bare ?? '';
      return m.replace(url, () => rewrite(url, 'image'));
    },
  );
  out = out.replace(
    /<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (m, _g, dq, sq, bare) => {
      const url = dq ?? sq ?? bare ?? '';
      return m.replace(url, () => rewrite(url, 'link'));
    },
  );

  if (stashed.length) {
    out = out.replace(/@@RPDF-STASH-(\d+)@@/g, (_, i) => stashed[Number(i)]);
  }
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => spans[Number(i)]);
  return out;
}

/** Annex-B style list of README names used by discovery. */
export function isReadmeName(name) {
  return README_NAMES.has(String(name).toLowerCase());
}

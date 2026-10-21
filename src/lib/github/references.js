/**
 * Resolve a parsed GitHub URL into a concrete commit and repository path.
 *
 * A URL can contain a branch, tag, or commit — and any of those can contain
 * slashes. The parser produces every possible ref/path split, longest ref
 * first. We probe them against the commits API and keep the first match.
 */
import { githubError, cancelledError } from '../errors.js';

const MAX_REF_PROBES = 10;

/**
 * Normalise a repository-relative path and reject traversal.
 * Unicode, spaces, and URL-decoded characters are preserved.
 */
export function validateResolvedPath(path) {
  const raw = String(path ?? '');
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
  return segments.join('/');
}

function candidateLabel(candidate) {
  return candidate.path ? `${candidate.ref}/${candidate.path}` : candidate.ref;
}

/**
 * @param {ReturnType<import('./urls.js').parseGitHubSource>} source
 * @param {ReturnType<import('./api.js').createGitHubApi>} api
 */
export async function resolveRepositorySource(source, api, { signal } = {}) {
  if (!source || !source.owner || !source.repo) {
    throw githubError('INVALID_URL', 'A GitHub repository URL is required.');
  }
  if (!api || typeof api.getRepo !== 'function') {
    throw githubError('INTERNAL', 'GitHub client is not configured.');
  }

  const repoMeta = await api.getRepo(source.owner, source.repo, { signal });
  const defaultBranch = String(repoMeta.default_branch || 'main');

  let candidates;
  if (source.kind === 'repo') {
    candidates = [{ ref: defaultBranch, path: '' }];
  } else {
    candidates = Array.isArray(source.refCandidates) ? source.refCandidates.slice(0, MAX_REF_PROBES) : [];
  }
  if (!candidates.length) {
    throw githubError('REF_NOT_FOUND', 'The URL does not contain a branch, tag, or commit to resolve.');
  }

  let match = null;
  let commit = null;
  for (const candidate of candidates) {
    if (signal?.aborted) throw cancelledError();
    if (!candidate.ref) continue;
    const found = await api.getCommit(source.owner, source.repo, candidate.ref, { signal });
    if (found?.sha) {
      match = candidate;
      commit = found;
      break;
    }
  }

  if (!match) {
    const tried = candidates.map(candidateLabel).join(', ');
    const hint =
      source.kind === 'repo'
        ? 'The repository may be empty, or its default branch could not be resolved.'
        : `Tried: ${tried}. Check the branch, tag, commit, and path in the URL.`;
    throw githubError('REF_NOT_FOUND', `Could not resolve a ref from that GitHub URL. ${hint}`, {
      candidates: candidates.map(candidateLabel),
    });
  }

  const path = validateResolvedPath(match.path);
  let entry = null;

  if (path) {
    entry = await api.getContents(source.owner, source.repo, path, commit.sha, { signal });
    if (!entry) {
      throw githubError('PATH_NOT_FOUND', `"${path}" does not exist at ${match.ref}.`, {
        path,
        ref: match.ref,
      });
    }
    if (source.kind === 'tree' && (!entry || Array.isArray(entry) === false)) {
      throw githubError(
        'PATH_NOT_FOLDER',
        `"${path}" is a file, not a folder. Use a /blob/ URL for a single Markdown file.`,
        { path },
      );
    }
    if (source.kind === 'blob' && (Array.isArray(entry) || !['file', 'symlink'].includes(entry.type))) {
      throw githubError('PATH_NOT_FILE', `"${path}" is not a file.`, { path });
    }
  }

  return {
    owner: source.owner,
    repo: source.repo,
    kind: source.kind,
    ref: match.ref,
    commitSha: commit.sha,
    treeSha: commit?.commit?.tree?.sha ?? null,
    path,
    entry,
    defaultBranch,
    sourceUrl: source.sourceUrl,
    repoMeta,
  };
}

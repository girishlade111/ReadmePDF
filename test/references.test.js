import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGitHubSource } from '../src/lib/github/urls.js';
import {
  resolveRepositorySource,
  validateResolvedPath,
} from '../src/lib/github/references.js';

function makeApi({ repo = { default_branch: 'main' }, commits = {}, contents = {} } = {}) {
  const calls = [];
  return {
    calls,
    async getRepo(owner, name) {
      calls.push({ type: 'repo', owner, name });
      return repo;
    },
    async getCommit(owner, name, ref) {
      calls.push({ type: 'commit', ref });
      return commits[ref] ?? null;
    },
    async getContents(owner, name, path, ref) {
      calls.push({ type: 'contents', path, ref });
      return Object.hasOwn(contents, path) ? contents[path] : null;
    },
    stats() {
      return { requests: calls.length };
    },
  };
}

describe('resolveRepositorySource', () => {
  it('resolves a repository URL to its default branch and commit', async () => {
    const api = makeApi({
      repo: { default_branch: 'trunk' },
      commits: { trunk: { sha: 'commit-sha', commit: { tree: { sha: 'tree-sha' } } } },
    });
    const resolved = await resolveRepositorySource(
      parseGitHubSource('https://github.com/o/r'),
      api,
    );

    assert.equal(resolved.kind, 'repo');
    assert.equal(resolved.ref, 'trunk');
    assert.equal(resolved.commitSha, 'commit-sha');
    assert.equal(resolved.treeSha, 'tree-sha');
    assert.equal(resolved.path, '');
    assert.equal(resolved.entry, null);
    assert.deepEqual(
      api.calls.map((call) => call.type),
      ['repo', 'commit'],
    );
  });

  it('probes slash-containing refs longest first and pins the folder to the commit', async () => {
    const api = makeApi({
      commits: {
        'feature/docs': { sha: 'commit-2', commit: { tree: { sha: 'tree-2' } } },
      },
      contents: { guide: [] },
    });
    const resolved = await resolveRepositorySource(
      parseGitHubSource('https://github.com/o/r/tree/feature/docs/guide'),
      api,
    );

    assert.equal(resolved.ref, 'feature/docs');
    assert.equal(resolved.path, 'guide');
    assert.equal(resolved.commitSha, 'commit-2');
    assert.equal(resolved.treeSha, 'tree-2');
    assert.ok(Array.isArray(resolved.entry));

    const commits = api.calls.filter((call) => call.type === 'commit').map((call) => call.ref);
    assert.deepEqual(commits, ['feature/docs/guide', 'feature/docs']);
    const contents = api.calls.find((call) => call.type === 'contents');
    assert.deepEqual(contents, { type: 'contents', path: 'guide', ref: 'commit-2' });
  });

  it('resolves a blob URL that uses a slash-containing ref', async () => {
    const api = makeApi({
      commits: {
        'release/2026': { sha: 'release-sha', commit: { tree: { sha: 'release-tree' } } },
      },
      contents: {
        'docs/setup.md': { type: 'file', size: 42, sha: 'blob-sha' },
      },
    });
    const resolved = await resolveRepositorySource(
      parseGitHubSource('https://github.com/o/r/blob/release/2026/docs/setup.md'),
      api,
    );

    assert.equal(resolved.kind, 'blob');
    assert.equal(resolved.ref, 'release/2026');
    assert.equal(resolved.path, 'docs/setup.md');
    assert.equal(resolved.entry.type, 'file');
    assert.equal(resolved.entry.size, 42);
  });

  it('treats raw URLs as single files', async () => {
    const api = makeApi({
      commits: { main: { sha: 'main-sha', commit: { tree: { sha: 'main-tree' } } } },
      contents: { 'README.md': { type: 'file', size: 12, sha: 'readme-sha' } },
    });
    const resolved = await resolveRepositorySource(
      parseGitHubSource('https://raw.githubusercontent.com/o/r/main/README.md'),
      api,
    );
    assert.equal(resolved.kind, 'raw');
    assert.equal(resolved.path, 'README.md');
    assert.equal(resolved.entry.sha, 'readme-sha');
  });

  it('rejects a tree URL that points at a file', async () => {
    const api = makeApi({
      commits: { main: { sha: 'c1' } },
      contents: { docs: { type: 'file' } },
    });
    await assert.rejects(
      resolveRepositorySource(
        parseGitHubSource('https://github.com/o/r/tree/main/docs'),
        api,
      ),
      (error) => {
        assert.equal(error.code, 'PATH_NOT_FOLDER');
        return true;
      },
    );
  });

  it('rejects a blob URL that points at a folder', async () => {
    const api = makeApi({
      commits: { main: { sha: 'c1' } },
      contents: { docs: [{ type: 'file', path: 'docs/a.md' }] },
    });
    await assert.rejects(
      resolveRepositorySource(
        parseGitHubSource('https://github.com/o/r/blob/main/docs'),
        api,
      ),
      (error) => {
        assert.equal(error.code, 'PATH_NOT_FILE');
        return true;
      },
    );
  });

  it('reports a missing path at a resolved ref', async () => {
    const api = makeApi({ commits: { main: { sha: 'c1' } } });
    await assert.rejects(
      resolveRepositorySource(
        parseGitHubSource('https://github.com/o/r/blob/main/missing.md'),
        api,
      ),
      (error) => {
        assert.equal(error.code, 'PATH_NOT_FOUND');
        assert.equal(error.path, 'missing.md');
        return true;
      },
    );
  });

  it('reports every attempted candidate when no ref resolves', async () => {
    const api = makeApi({ commits: {} });
    await assert.rejects(
      resolveRepositorySource(
        parseGitHubSource('https://github.com/o/r/tree/nope/docs'),
        api,
      ),
      (error) => {
        assert.equal(error.code, 'REF_NOT_FOUND');
        assert.deepEqual(error.candidates, ['nope/docs', 'nope']);
        return true;
      },
    );
  });

  it('honours cancellation before probing refs', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      resolveRepositorySource(
        parseGitHubSource('https://github.com/o/r/tree/main/docs'),
        makeApi(),
        { signal: controller.signal },
      ),
      (error) => {
        assert.equal(error.code, 'CANCELLED');
        return true;
      },
    );
  });

  it('requires a source and a configured client', async () => {
    await assert.rejects(resolveRepositorySource(null, makeApi()), /GitHub repository URL/);
    await assert.rejects(
      resolveRepositorySource(parseGitHubSource('o/r'), {}),
      /not configured/,
    );
  });
});

describe('validateResolvedPath', () => {
  it('normalises empty and dot segments', () => {
    assert.equal(validateResolvedPath(''), '');
    assert.equal(validateResolvedPath('docs//./guide.md'), 'docs/guide.md');
    assert.equal(validateResolvedPath('日本語/説明.md'), '日本語/説明.md');
  });

  it('rejects traversal, backslashes, and null bytes', () => {
    assert.throws(() => validateResolvedPath('docs/../secret.md'), (error) => {
      assert.equal(error.code, 'PATH_ESCAPE');
      return true;
    });
    assert.throws(() => validateResolvedPath('docs\\guide.md'), (error) => {
      assert.equal(error.code, 'INVALID_PATH');
      return true;
    });
    assert.throws(() => validateResolvedPath('docs/\0guide.md'), (error) => {
      assert.equal(error.code, 'INVALID_PATH');
      return true;
    });
  });
});

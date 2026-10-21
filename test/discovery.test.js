import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  discoverMarkdownFiles,
  isMarkdownPath,
  DISCOVERY_LIMITS,
} from '../src/lib/github/discovery.js';

function makeApi({ commitTree = 'root-sha', responses = {} } = {}) {
  const calls = { commitTree: [], tree: [] };
  return {
    calls,
    async getCommitTree(owner, repo, sha) {
      calls.commitTree.push(sha);
      return commitTree;
    },
    async getTree(owner, repo, sha, { recursive = false } = {}) {
      calls.tree.push({ sha, recursive });
      return responses[`${sha}${recursive ? ':recursive' : ''}`] ?? null;
    },
    stats() {
      return { requests: calls.commitTree.length + calls.tree.length };
    },
  };
}

function resolved(overrides = {}) {
  return {
    owner: 'o',
    repo: 'r',
    kind: 'tree',
    ref: 'main',
    commitSha: 'commit-1',
    treeSha: 'root',
    path: '',
    entry: null,
    ...overrides,
  };
}

const byPath = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

describe('isMarkdownPath', () => {
  it('accepts Markdown extensions and exact extensionless README only', () => {
    for (const path of ['README', 'readme', 'a.md', 'b.MD', 'c.markdown', 'd.mdown', 'x/README']) {
      assert.equal(isMarkdownPath(path), true, path);
    }
    for (const path of ['a.mdx', 'README.mdx', 'README.txt', 'image.png', '']) {
      assert.equal(isMarkdownPath(path), false, path);
    }
  });
});

describe('discoverMarkdownFiles', () => {
  it('lists Markdown recursively, excludes generated folders, and sorts paths', async () => {
    const tree = [
      { type: 'blob', path: 'README.md', size: 100, sha: 'readme' },
      { type: 'blob', path: 'docs/Guide.MD', size: 10, sha: 'guide' },
      { type: 'blob', path: 'docs/notes.markdown' },
      { type: 'blob', path: 'docs/legacy.mdown' },
      { type: 'blob', path: 'docs/README' },
      { type: 'blob', path: 'docs/page.mdx' },
      { type: 'blob', path: 'node_modules/pkg/readme.md' },
      { type: 'blob', path: '.git/README.md' },
      { type: 'blob', path: 'assets/logo.png' },
      { type: 'tree', path: 'docs' },
    ];
    const api = makeApi({ responses: { 'root:recursive': { truncated: false, tree } } });
    const result = await discoverMarkdownFiles(resolved(), api);

    assert.deepEqual(
      result.files.map((file) => file.path).sort(byPath),
      ['README.md', 'docs/Guide.MD', 'docs/README', 'docs/legacy.mdown', 'docs/notes.markdown'],
    );
    assert.equal(result.complete, true);
    assert.equal(result.truncated, false);
    assert.deepEqual(result.warnings, []);
    assert.equal(result.requests, 1);
    assert.equal(result.owner, 'o');
    assert.equal(result.repo, 'r');
    assert.equal(result.ref, 'main');
    assert.equal(result.commitSha, 'commit-1');

    const readme = result.files.find((file) => file.path === 'README.md');
    assert.deepEqual(readme, {
      path: 'README.md',
      name: 'README.md',
      dir: '',
      size: 100,
      sha: 'readme',
      type: 'file',
    });
    const guide = result.files.find((file) => file.path === 'docs/Guide.MD');
    assert.equal(guide.dir, 'docs');
    assert.equal(guide.name, 'Guide.MD');
    assert.deepEqual(api.calls.tree, [{ sha: 'root', recursive: true }]);
  });

  it('scopes a folder URL to that folder', async () => {
    const api = makeApi({
      responses: {
        'root:recursive': {
          truncated: false,
          tree: [
            { type: 'blob', path: 'README.md' },
            { type: 'blob', path: 'docs/a.md' },
            { type: 'blob', path: 'docs/sub/b.md' },
            { type: 'blob', path: 'docsx/c.md' },
          ],
        },
      },
    });
    const result = await discoverMarkdownFiles(resolved({ path: 'docs' }), api);
    assert.deepEqual(result.files.map((file) => file.path).sort(byPath), [
      'docs/a.md',
      'docs/sub/b.md',
    ]);
    assert.equal(result.basePath, 'docs');
  });

  it('returns exactly one file for blob and raw sources without listing the repository', async () => {
    const api = makeApi();
    const blob = await discoverMarkdownFiles(
      resolved({
        kind: 'blob',
        path: 'guides/start.md',
        entry: { size: 123, sha: 'blob-sha' },
      }),
      api,
    );
    assert.equal(blob.files.length, 1);
    assert.deepEqual(blob.files[0], {
      path: 'guides/start.md',
      name: 'start.md',
      dir: 'guides',
      size: 123,
      sha: 'blob-sha',
      type: 'file',
    });
    assert.equal(blob.complete, true);
    assert.equal(api.calls.tree.length, 0);

    const raw = await discoverMarkdownFiles(
      resolved({ kind: 'raw', path: 'README', entry: null }),
      api,
    );
    assert.deepEqual(raw.files.map((file) => file.path), ['README']);
  });

  it('rejects a single-file URL that is not Markdown', async () => {
    await assert.rejects(
      discoverMarkdownFiles(
        resolved({ kind: 'blob', path: 'assets/logo.png', entry: { size: 1 } }),
        makeApi(),
      ),
      (error) => {
        assert.equal(error.code, 'NO_MARKDOWN');
        return true;
      },
    );
  });

  it('falls back to a bounded folder scan when GitHub truncates the tree', async () => {
    const api = makeApi({
      responses: {
        'root:recursive': {
          truncated: true,
          tree: [{ type: 'blob', path: 'README.md', size: 5 }],
        },
        root: {
          truncated: false,
          tree: [
            { type: 'blob', path: 'README.md' },
            { type: 'tree', path: 'docs', sha: 'docs-sha' },
            { type: 'tree', path: 'node_modules', sha: 'nm-sha' },
            { type: 'tree', path: '.git', sha: 'git-sha' },
          ],
        },
        'docs-sha': {
          truncated: false,
          tree: [
            { type: 'blob', path: 'install.md', size: 7 },
            { type: 'blob', path: 'notes.txt' },
            { type: 'tree', path: 'deep', sha: 'deep-sha' },
          ],
        },
        'deep-sha': { truncated: false, tree: [] },
      },
    });
    const result = await discoverMarkdownFiles(resolved(), api);

    assert.deepEqual(result.files.map((file) => file.path).sort(byPath), [
      'README.md',
      'docs/install.md',
    ]);
    assert.equal(result.complete, true);
    assert.equal(result.truncated, false);
    assert.match(result.warnings.join(' '), /truncated/i);
    assert.deepEqual(api.calls.tree, [
      { sha: 'root', recursive: true },
      { sha: 'root', recursive: false },
      { sha: 'docs-sha', recursive: false },
      { sha: 'deep-sha', recursive: false },
    ]);
  });

  it('reports an incomplete listing when the fallback hits a folder limit', async () => {
    const api = makeApi({
      responses: {
        'root:recursive': {
          truncated: true,
          tree: [{ type: 'blob', path: 'README.md' }],
        },
        root: {
          truncated: false,
          tree: [
            { type: 'tree', path: 'docs', sha: 'docs-sha' },
            { type: 'tree', path: 'more', sha: 'more-sha' },
          ],
        },
      },
    });
    const result = await discoverMarkdownFiles(resolved(), api, {
      limits: { maxDirs: 1 },
    });

    assert.equal(result.complete, false);
    assert.equal(result.truncated, true);
    assert.match(result.warnings.join(' '), /scanning 1 folders/i);
    assert.deepEqual(result.files.map((file) => file.path), ['README.md']);
    assert.equal(api.calls.tree.length, 2);
  });

  it('reports an incomplete listing when the fallback hits a tree-request limit', async () => {
    const api = makeApi({
      responses: {
        'root:recursive': {
          truncated: true,
          tree: [{ type: 'blob', path: 'README.md' }],
        },
        root: {
          truncated: false,
          tree: [{ type: 'tree', path: 'docs', sha: 'docs-sha' }],
        },
      },
    });
    const result = await discoverMarkdownFiles(resolved(), api, {
      limits: { maxTreeRequests: 1 },
    });
    assert.equal(result.complete, false);
    assert.match(result.warnings.join(' '), /1 tree requests/i);
  });

  it('caps recursive results at maxFiles and reports truncation', async () => {
    const api = makeApi({
      responses: {
        'root:recursive': {
          truncated: false,
          tree: [
            { type: 'blob', path: 'a.md' },
            { type: 'blob', path: 'b.md' },
            { type: 'blob', path: 'c.md' },
          ],
        },
        root: { truncated: false, tree: [] },
      },
    });
    const result = await discoverMarkdownFiles(resolved(), api, {
      limits: { maxFiles: 2 },
    });
    assert.equal(result.files.length, 2);
    assert.equal(result.complete, false);
    assert.equal(result.truncated, true);
    assert.match(result.warnings.join(' '), /2-file safety limit/i);
  });

  it('resolves the commit tree when the source did not include one', async () => {
    const api = makeApi({
      commitTree: 'resolved-root',
      responses: {
        'resolved-root:recursive': {
          truncated: false,
          tree: [{ type: 'blob', path: 'README.md' }],
        },
      },
    });
    const result = await discoverMarkdownFiles(resolved({ treeSha: null }), api);
    assert.equal(result.files.length, 1);
    assert.equal(result.requests, 2);
    assert.deepEqual(api.calls.commitTree, ['commit-1']);
  });

  it('throws explicit errors for missing trees, cancellation, and bad input', async () => {
    await assert.rejects(
      discoverMarkdownFiles(resolved(), makeApi()),
      (error) => {
        assert.equal(error.code, 'TREE_UNAVAILABLE');
        return true;
      },
    );

    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      discoverMarkdownFiles(resolved(), makeApi(), { signal: controller.signal }),
      (error) => {
        assert.equal(error.code, 'CANCELLED');
        return true;
      },
    );

    await assert.rejects(discoverMarkdownFiles({ owner: 'o' }, makeApi()), (error) => {
      assert.equal(error.code, 'INTERNAL');
      return true;
    });
  });

  it('exposes frozen default limits', () => {
    assert.ok(Object.isFrozen(DISCOVERY_LIMITS));
    assert.equal(DISCOVERY_LIMITS.maxFiles, 500);
    assert.equal(DISCOVERY_LIMITS.maxDirs, 80);
  });
});

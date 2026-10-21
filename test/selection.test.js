import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFileTree,
  collectFilePaths,
  collectFolderPaths,
  findFolder,
  folderSelectionState,
  applyFolderSelection,
  toggleChapter,
  moveChapter,
  removeChapter,
  filterFileList,
  filterTree,
  computeSelectAllState,
  selectionCounts,
} from '../src/lib/selection.js';

const files = [
  { path: 'README.md', size: 100, sha: 'readme' },
  { path: 'docs/setup.md', size: 20, sha: 'setup' },
  { path: 'docs/guide/install.md', size: 30, sha: 'install' },
  { path: 'docs/guide/usage.md', size: 40, sha: 'usage' },
  { path: 'assets/README', size: 5, sha: 'assets-readme' },
];

describe('buildFileTree', () => {
  it('builds a sorted hierarchy with folders before files', () => {
    const tree = buildFileTree(files);
    assert.deepEqual(
      tree.children.map((child) => `${child.type}:${child.name}`),
      ['folder:assets', 'folder:docs', 'file:README.md'],
    );
    const docs = findFolder(tree, 'docs');
    assert.ok(docs);
    assert.deepEqual(
      docs.children.map((child) => child.name),
      ['guide', 'setup.md'],
    );
    const setup = docs.children.find((child) => child.name === 'setup.md');
    assert.equal(setup.path, 'docs/setup.md');
    assert.equal(setup.size, 20);
    assert.equal(setup.sha, 'setup');
    assert.deepEqual(setup.children, []);
  });

  it('ignores empty paths and duplicate files, and accepts string input', () => {
    const tree = buildFileTree(['a.md', 'a.md', '', '/']);
    assert.deepEqual(collectFilePaths(tree), ['a.md']);
    const stringTree = buildFileTree(['日本語/説明.md']);
    assert.deepEqual(collectFilePaths(stringTree), ['日本語/説明.md']);
  });
});

describe('tree traversal', () => {
  const tree = buildFileTree(files);

  it('collects files and folders in tree order', () => {
    assert.deepEqual(collectFilePaths(tree), [
      'assets/README',
      'docs/guide/install.md',
      'docs/guide/usage.md',
      'docs/setup.md',
      'README.md',
    ]);
    assert.deepEqual(collectFolderPaths(tree), ['assets', 'docs', 'docs/guide']);
  });

  it('finds folders by path and returns null for files or unknown paths', () => {
    assert.equal(findFolder(tree, 'docs/guide').path, 'docs/guide');
    assert.equal(findFolder(tree, ''), tree);
    assert.equal(findFolder(tree, 'docs/setup.md'), null);
    assert.equal(findFolder(tree, 'missing'), null);
  });
});

describe('tri-state selection', () => {
  const tree = buildFileTree(files);
  const docs = findFolder(tree, 'docs');
  const allDocs = ['docs/guide/install.md', 'docs/guide/usage.md', 'docs/setup.md'];

  it('reports none, some, and all for folders', () => {
    assert.equal(folderSelectionState(docs, new Set()), 'none');
    assert.equal(folderSelectionState(docs, new Set([allDocs[0]])), 'some');
    assert.equal(folderSelectionState(docs, new Set(allDocs)), 'all');
    assert.equal(folderSelectionState({ children: [] }, new Set()), 'none');
    assert.equal(folderSelectionState(docs, allDocs), 'all');
  });

  it('adds and removes descendants without touching unrelated selections', () => {
    const initial = new Set(['README.md', 'docs/guide/install.md']);
    const added = applyFolderSelection(docs, initial, true);
    assert.deepEqual([...added].sort(), [...new Set(['README.md', ...allDocs])].sort());
    assert.ok(initial.has('docs/setup.md') === false, 'the original set is not mutated');

    const removed = applyFolderSelection(docs, added, false);
    assert.deepEqual([...removed], ['README.md']);
  });
});

describe('chapter ordering', () => {
  it('appends new chapters without reordering existing ones', () => {
    assert.deepEqual(toggleChapter(['a.md'], 'b.md', true), ['a.md', 'b.md']);
    assert.deepEqual(toggleChapter(['a.md', 'b.md'], 'a.md', true), ['a.md', 'b.md']);
    assert.deepEqual(toggleChapter(['a.md', 'b.md'], 'a.md', false), ['b.md']);
  });

  it('moves chapters within bounds and never mutates the input', () => {
    const input = ['a.md', 'b.md', 'c.md'];
    assert.deepEqual(moveChapter(input, 0, 1), ['b.md', 'a.md', 'c.md']);
    assert.deepEqual(moveChapter(input, 2, -1), ['a.md', 'c.md', 'b.md']);
    assert.deepEqual(moveChapter(input, 0, -1), input);
    assert.deepEqual(moveChapter(input, 2, 1), input);
    assert.deepEqual(moveChapter(input, 9, 1), input);
    assert.deepEqual(input, ['a.md', 'b.md', 'c.md']);
  });

  it('removes a chapter by path', () => {
    assert.deepEqual(removeChapter(['a.md', 'b.md', 'a.md'], 'a.md'), ['b.md']);
    assert.deepEqual(removeChapter(['a.md'], 'missing.md'), ['a.md']);
  });
});

describe('search and aggregate state', () => {
  const tree = buildFileTree(files);

  it('filters a flat file list case-insensitively', () => {
    assert.deepEqual(filterFileList(files, 'GUIDE'), [
      files[2],
      files[3],
    ]);
    assert.deepEqual(filterFileList(files, '  '), files);
    assert.deepEqual(filterFileList(files, 'readme').map((file) => file.path), [
      'README.md',
      'assets/README',
    ]);
  });

  it('filters a tree while retaining matching ancestors', () => {
    const filtered = filterTree(tree, 'install');
    assert.deepEqual(collectFilePaths(filtered), ['docs/guide/install.md']);
    assert.deepEqual(collectFolderPaths(filtered), ['docs', 'docs/guide']);

    const readme = filterTree(tree, 'readme');
    assert.deepEqual(collectFilePaths(readme), ['assets/README', 'README.md']);
    assert.deepEqual(collectFolderPaths(readme), ['assets']);
  });

  it('computes select-all state and selected counts', () => {
    const all = collectFilePaths(tree);
    assert.equal(computeSelectAllState(all, new Set()), 'none');
    assert.equal(computeSelectAllState(all, new Set([all[0]])), 'some');
    assert.equal(computeSelectAllState(all, new Set(all)), 'all');
    assert.equal(computeSelectAllState([], new Set()), 'none');
    assert.deepEqual(selectionCounts(all, new Set([all[0], all[2]])), {
      selected: 2,
      total: 5,
    });
    assert.deepEqual(selectionCounts([], null), { selected: 0, total: 0 });
  });
});

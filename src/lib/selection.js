/**
 * Pure helpers for the documentation explorer.
 *
 * Keeping tree building, tri-state folder selection, search, and chapter
 * ordering here makes the UI controller small and lets the behaviour be
 * tested without a browser.
 */

function compareName(a, b) {
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function fileNode(file) {
  const path = typeof file === 'string' ? file : String(file?.path ?? '');
  const name = path.split('/').pop() || path;
  return {
    type: 'file',
    name,
    path,
    size: Number.isFinite(file?.size) ? file.size : null,
    sha: file?.sha ?? null,
    children: [],
  };
}

function sortChildren(node) {
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return compareName(a.name, b.name);
  });
  for (const child of node.children) {
    if (child.type === 'folder') sortChildren(child);
  }
}

/**
 * Build a sorted folder/file tree from a flat list of repository paths.
 * @param {Array<string|{path:string,size?:number,sha?:string}>} files
 */
export function buildFileTree(files) {
  const root = { type: 'folder', name: '', path: '', children: [] };
  const folders = new Map([['', root]]);
  for (const entry of Array.from(files ?? [])) {
    const path = typeof entry === 'string' ? entry : String(entry?.path ?? '');
    const segments = path.split('/').filter(Boolean);
    if (!segments.length) continue;
    let current = root;
    let prefix = '';
    for (let i = 0; i < segments.length - 1; i += 1) {
      prefix = prefix ? `${prefix}/${segments[i]}` : segments[i];
      let folder = folders.get(prefix);
      if (!folder) {
        folder = { type: 'folder', name: segments[i], path: prefix, children: [] };
        folders.set(prefix, folder);
        current.children.push(folder);
      }
      current = folder;
    }
    const leaf = fileNode(entry);
    if (!current.children.some((child) => child.type === 'file' && child.path === leaf.path)) {
      current.children.push(leaf);
    }
  }
  sortChildren(root);
  return root;
}

/** All descendant file paths of a node, in tree order. */
export function collectFilePaths(node) {
  const out = [];
  (function walk(current) {
    for (const child of current?.children ?? []) {
      if (child.type === 'file') out.push(child.path);
      else walk(child);
    }
  })(node);
  return out;
}

/** All folder paths in a tree, in tree order. */
export function collectFolderPaths(node) {
  const out = [];
  (function walk(current) {
    for (const child of current?.children ?? []) {
      if (child.type === 'folder') {
        out.push(child.path);
        walk(child);
      }
    }
  })(node);
  return out;
}

/** Find a folder node by repository path. */
export function findFolder(node, path) {
  if (!path) return node;
  for (const child of node?.children ?? []) {
    if (child.type !== 'folder') continue;
    if (child.path === path) return child;
    const found = findFolder(child, path);
    if (found) return found;
  }
  return null;
}

/**
 * Tri-state for a folder checkbox: 'all' when every descendant file is
 * selected, 'some' when at least one is, otherwise 'none'.
 */
export function folderSelectionState(node, selected) {
  const paths = collectFilePaths(node);
  if (!paths.length) return 'none';
  const set = selected instanceof Set ? selected : new Set(selected ?? []);
  let count = 0;
  for (const path of paths) if (set.has(path)) count += 1;
  if (count === paths.length) return 'all';
  return count > 0 ? 'some' : 'none';
}

/**
 * Return a new selection set with every descendant file of a folder added or
 * removed. Existing non-descendant selections are preserved.
 */
export function applyFolderSelection(node, selected, checked) {
  const next = new Set(selected ?? []);
  for (const path of collectFilePaths(node)) {
    if (checked) next.add(path);
    else next.delete(path);
  }
  return next;
}

/** Add/remove one file while preserving the order of existing chapters. */
export function toggleChapter(chapters, path, checked) {
  const list = Array.from(chapters ?? []);
  if (checked) return list.includes(path) ? list : [...list, path];
  return list.filter((item) => item !== path);
}

/** Move a chapter by `delta`, clamped to the ends. Returns a new array. */
export function moveChapter(chapters, index, delta) {
  const list = Array.from(chapters ?? []);
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

/** Remove a chapter by path. Returns a new array. */
export function removeChapter(chapters, path) {
  return Array.from(chapters ?? []).filter((item) => item !== path);
}

/** Case-insensitive path search. Empty query returns the original list. */
export function filterFileList(files, query) {
  const q = String(query ?? '').trim().toLowerCase();
  const list = Array.from(files ?? []);
  if (!q) return list;
  return list.filter((file) => {
    const path = typeof file === 'string' ? file : file?.path;
    return String(path ?? '').toLowerCase().includes(q);
  });
}

/** Filter a tree to matching files while retaining their ancestor folders. */
export function filterTree(node, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return node;
  const children = [];
  for (const child of node?.children ?? []) {
    if (child.type === 'file') {
      if (child.path.toLowerCase().includes(q)) children.push(child);
    } else {
      const filtered = filterTree(child, q);
      if (filtered.children.length) children.push(filtered);
    }
  }
  return { ...node, children };
}

/** 'all' | 'some' | 'none' for the select-all control. */
export function computeSelectAllState(allPaths, selected) {
  const list = Array.from(allPaths ?? []);
  if (!list.length) return 'none';
  const set = selected instanceof Set ? selected : new Set(selected ?? []);
  let count = 0;
  for (const path of list) if (set.has(path)) count += 1;
  if (count === list.length) return 'all';
  return count > 0 ? 'some' : 'none';
}

/** { selected, total } counts for labels. */
export function selectionCounts(allPaths, selected) {
  const list = Array.from(allPaths ?? []);
  const set = selected instanceof Set ? selected : new Set(selected ?? []);
  let count = 0;
  for (const path of list) if (set.has(path)) count += 1;
  return { selected: count, total: list.length };
}

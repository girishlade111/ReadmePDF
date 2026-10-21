/**
 * Documentation-book controller.
 *
 * This module owns the repository explorer, the chapter selection, the
 * ordering controls, single-file previews, the bounded build/retry flow, and
 * the book print hand-off. All network access goes through the shared GitHub
 * client; nothing is uploaded.
 *
 * Async work is protected by monotonically increasing request tokens and an
 * AbortController per operation, so a slow response from an old scan can never
 * overwrite a newer one.
 */
import {
  BOOK_FETCH_LIMITS,
  createGitHubApi,
  discoverMarkdownFiles,
  fetchMarkdownFiles,
  isReadmeName,
  parseGitHubSource,
  resolveRepositorySource,
  sanitizeHtml,
} from '../lib/github.js';
import {
  applyFolderSelection,
  buildFileTree,
  collectFilePaths,
  collectFolderPaths,
  computeSelectAllState,
  filterTree,
  findFolder,
  folderSelectionState,
  moveChapter,
  removeChapter,
  selectionCounts,
  toggleChapter,
} from '../lib/selection.js';
import { assembleBook, renderDocumentPreview } from '../lib/pdf/assembly.js';
import { printDocument } from '../lib/print.js';

export const MAX_BOOK_FILES = BOOK_FETCH_LIMITS.maxFiles;

/** Human-readable byte count for file sizes and book totals. */
export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return '';
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}

/**
 * Actionable, non-technical copy for every failure the explorer can surface.
 * Pure function — covered by tests.
 */
export function bookErrorMessage(error) {
  const code = error?.code;
  const message = typeof error?.message === 'string' ? error.message : '';
  switch (code) {
    case 'INVALID_URL':
      return message || 'That is not a GitHub repository URL. Paste one like https://github.com/owner/repo';
    case 'PRIVATE_OR_NOT_FOUND':
      return 'Repository not found, or it is private. ReadmePDF reads public repositories only — paste Markdown in the converter instead.';
    case 'REF_NOT_FOUND':
      return `${message || 'Could not resolve that branch, tag, or commit.'} Branch names containing slashes are supported when GitHub can resolve them.`;
    case 'PATH_NOT_FOUND':
      return message || 'That folder or file does not exist at the selected branch.';
    case 'PATH_NOT_FOLDER':
      return message || 'That URL points at a file. Use a /blob/ link for a single file or the repository URL to browse.';
    case 'PATH_NOT_FILE':
      return message || 'That URL points at a folder. Open the repository or a /tree/ URL to browse its files.';
    case 'INVALID_PATH':
    case 'PATH_ESCAPE':
      return message || 'That repository path is not valid.';
    case 'NO_MARKDOWN':
      return `${message || 'No Markdown file was found at that URL.'} The explorer lists README, .md, .markdown, and .mdown files.`;
    case 'TREE_UNAVAILABLE':
      return `${message || 'GitHub did not return a file tree.'} Try a /tree/<branch>/<folder> URL to narrow the scan, then retry.`;
    case 'RATE_LIMITED':
      return `GitHub's anonymous rate limit was reached. Wait about a minute and retry.${error?.resetAt ? ` The limit resets at ${error.resetAt}.` : ''}`;
    case 'REQUEST_LIMIT':
      return message || 'This scan reached its request safety limit. Narrow the URL to a folder and try again.';
    case 'TOO_MANY_FILES':
      return message || `A book can contain at most ${MAX_BOOK_FILES} files. Remove some chapters and rebuild.`;
    case 'EMPTY_BOOK':
      return message || 'Select at least one Markdown file to build a book.';
    case 'BOOK_INCOMPLETE':
      return message || 'The book is incomplete, so it was not printed. Reload the failed files and rebuild.';
    case 'FILE_TOO_LARGE':
    case 'BOOK_TOO_LARGE':
    case 'SKIPPED_BY_LIMIT':
      return message || 'The selection exceeds the safe book size. Remove some files and rebuild.';
    case 'CANCELLED':
      return 'Cancelled. Nothing was printed.';
    case 'SANITIZE_UNAVAILABLE':
      return `${message || 'The HTML safety filter could not load.'} The book was not rendered. Reload the page and try again.`;
    case 'PRINT_UNAVAILABLE':
      return message || 'This browser could not open the print dialog. Use your browser menu to print instead.';
    case 'TIMEOUT':
      return `${message || 'GitHub did not answer in time.'} Check your connection and retry.`;
    case 'NETWORK_ERROR':
      return `${message || 'GitHub could not be reached.'} Check your connection and retry.`;
    case 'AUTH_REQUIRED':
    case 'FORBIDDEN':
      return message || 'GitHub refused the request. Private repositories and authenticated access are not supported.';
    case 'GITHUB_UNAVAILABLE':
      return message || 'GitHub is temporarily unavailable. Retry in a moment.';
    default:
      return message || 'Something went wrong. Check the URL and try again.';
  }
}

/**
 * Sensible starting selection: everything when the repository is small, and
 * README-like files when it is large (the book limit is 30 chapters).
 * @param {Array<string|{path:string}>} files
 */
export function defaultBookSelection(files, maxFiles = MAX_BOOK_FILES) {
  const paths = Array.from(files ?? [])
    .map((file) => (typeof file === 'string' ? file : String(file?.path ?? '')))
    .filter(Boolean);
  if (paths.length <= maxFiles) return paths;
  const readmes = paths.filter((path) => isReadmeName(path.split('/').pop() || ''));
  if (readmes.length) return readmes.slice(0, maxFiles);
  return paths.slice(0, maxFiles);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

export function initBookExplorer() {
  if (typeof document === 'undefined') return null;
  if (document.body.dataset.bookInit) return null;

  const $ = (id) => document.getElementById(id);
  const urlInput = $('book-url');
  const scanBtn = $('book-scan-btn');
  const cancelScanBtn = $('book-cancel-scan-btn');
  const statusEl = $('book-status');
  const metaEl = $('book-meta');
  const warningsEl = $('book-warnings');
  const warningList = $('book-warning-list');
  const workspaceEl = $('book-workspace');
  const searchInput = $('book-search');
  const selectAllBtn = $('book-select-all');
  const clearBtn = $('book-clear-selection');
  const summaryEl = $('book-file-summary');
  const treeEl = $('book-tree');
  const treeEmpty = $('book-tree-empty');
  const chaptersEl = $('book-chapters');
  const chaptersEmpty = $('book-chapters-empty');
  const titleInput = $('book-title');
  const subtitleInput = $('book-subtitle');
  const coverToggle = $('book-cover-toggle');
  const tocToggle = $('book-toc-toggle');
  const buildBtn = $('book-build-btn');
  const cancelBuildBtn = $('book-build-cancel-btn');
  const buildStatus = $('book-build-status');
  const failuresEl = $('book-failures');
  const failureList = $('book-failure-list');
  const retryBtn = $('book-retry-btn');
  const dropFailuresBtn = $('book-drop-failures-btn');
  const printBtn = $('book-print-btn');
  const previewBar = $('book-preview-bar');
  const previewLabel = $('book-preview-label');
  const previewBack = $('book-preview-back');
  const bookSheet = $('book-sheet');
  const bookOutput = $('book-output');
  const previewEl = $('book-preview');

  if (!urlInput || !scanBtn || !treeEl || !bookOutput) return null;
  document.body.dataset.bookInit = '1';

  const themeInputs = [...document.querySelectorAll('input[name="book-theme"]')];

  let scanController = null;
  let scanToken = 0;
  let discovery = null;
  let tree = null;
  let selected = new Set();
  let chapters = [];
  let expanded = new Set();
  let searchTimer = 0;
  let previewController = null;
  let previewToken = 0;
  let buildController = null;
  let buildToken = 0;
  let builtBook = null;
  let lastFailures = [];

  resetOutput('Scan a repository above to find its Markdown files.');
  updateSelectionUi();
  renderChapters();

  scanBtn.addEventListener('click', onScan);
  urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onScan();
  });
  cancelScanBtn?.addEventListener('click', cancelScan);
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderTree, 120);
  });
  selectAllBtn?.addEventListener('click', () => {
    if (!tree) return;
    setSelection(new Set(collectFilePaths(tree)));
  });
  clearBtn?.addEventListener('click', () => setSelection(new Set()));
  buildBtn?.addEventListener('click', () => onBuild());
  cancelBuildBtn?.addEventListener('click', cancelBuild);
  retryBtn?.addEventListener('click', () => onBuild());
  dropFailuresBtn?.addEventListener('click', dropFailedFiles);
  printBtn?.addEventListener('click', onPrintBook);
  previewBack?.addEventListener('click', closePreview);
  titleInput?.addEventListener('input', markStale);
  subtitleInput?.addEventListener('input', markStale);
  coverToggle?.addEventListener('change', markStale);
  tocToggle?.addEventListener('change', markStale);
  themeInputs.forEach((input) =>
    input.addEventListener('change', () => {
      applyTheme();
      markStale();
    }),
  );

  // Broken images must never fail a build; thumbnails in chapters degrade in
  // the same way as the single-document preview.
  bookSheet?.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (target && target.tagName === 'IMG') {
        target.classList.add('broken');
        target.title = 'Image failed to load (missing or private). Export continues.';
        target.alt = `${target.alt || 'image'} [unavailable]`;
      }
    },
    true,
  );

  async function onScan() {
    const url = urlInput.value.trim();
    if (!url) {
      setStatus('Paste a GitHub repository URL first, e.g. https://github.com/owner/repo', 'error');
      urlInput.focus();
      return;
    }

    cancelScan({ silent: true });
    cancelPreview();
    const token = ++scanToken;
    const controller = new AbortController();
    scanController = controller;
    resetState();
    setScanBusy(true);
    setStatus('Resolving repository, branch, and commit…', '');

    try {
      const source = parseGitHubSource(url);
      const api = createGitHubApi({ signal: controller.signal, maxRequests: 60 });
      const resolved = await resolveRepositorySource(source, api, { signal: controller.signal });
      if (token !== scanToken) return;

      setStatus('Finding Markdown files…', '');
      const result = await discoverMarkdownFiles(resolved, api, { signal: controller.signal });
      if (token !== scanToken) return;

      discovery = result;
      tree = buildFileTree(result.files);
      expanded = new Set(collectFolderPaths(tree));
      selected = new Set(defaultBookSelection(result.files));
      chapters = collectFilePaths(tree).filter((path) => selected.has(path));

      if (titleInput && titleInput.dataset.auto !== '0') {
        titleInput.value = `${result.owner}/${result.repo} documentation`;
        titleInput.dataset.auto = '1';
      }

      renderMeta(result);
      renderWarnings(result.warnings ?? []);
      renderTree();
      updateSelectionUi();
      renderChapters();
      resetOutput(
        result.files.length
          ? 'Select chapters, then build the book to preview and print it.'
          : 'No Markdown files were found. Try a folder URL or the single-document converter.',
      );
      setBuildStatus('', '');
      failuresEl.hidden = true;
      lastFailures = [];

      if (result.files.length) {
        setStatus(
          `Found ${plural(result.files.length, 'Markdown file')} at ${result.ref}. ${
            result.complete ? 'The list is complete.' : 'The list may be incomplete — see the notice below.'
          }`,
          result.complete ? '' : 'error',
        );
      } else {
        setStatus('No Markdown files found at that URL. Try narrowing to a folder.', 'error');
      }
    } catch (error) {
      if (token !== scanToken) return;
      if (error?.code === 'CANCELLED') {
        setStatus('Scan cancelled.', '');
        return;
      }
      setStatus(bookErrorMessage(error), 'error');
      renderMeta(null);
    } finally {
      if (token === scanToken) {
        scanController = null;
        setScanBusy(false);
      }
    }
  }

  function cancelScan({ silent = false } = {}) {
    if (!scanController) return;
    scanController.abort();
    scanController = null;
    scanToken += 1;
    setScanBusy(false);
    if (!silent) setStatus('Scan cancelled.', '');
  }

  function resetState() {
    discovery = null;
    tree = null;
    selected = new Set();
    chapters = [];
    expanded = new Set();
    builtBook = null;
    lastFailures = [];
    treeEl.textContent = '';
    treeEmpty.hidden = false;
    treeEmpty.textContent = 'Scanning…';
    warningsEl.hidden = true;
    warningList.textContent = '';
    failuresEl.hidden = true;
    failureList.textContent = '';
    retryBtn.hidden = true;
    dropFailuresBtn.hidden = true;
    printBtn.disabled = true;
    buildBtn.disabled = true;
    closePreview();
    updateSelectionUi();
    renderChapters();
    applyTheme();
  }

  function renderMeta(result) {
    metaEl.textContent = '';
    if (!result) return;
    const shortSha = String(result.commitSha ?? '').slice(0, 8);
    const bits = [
      `${result.owner}/${result.repo}`,
      `@ ${result.ref}`,
      shortSha ? `commit ${shortSha}` : '',
      plural(result.files.length, 'Markdown file'),
      result.complete ? 'complete listing' : 'possibly incomplete listing',
    ].filter(Boolean);
    metaEl.textContent = bits.join(' · ');
  }

  function renderWarnings(warnings) {
    warningList.textContent = '';
    if (!warnings.length) {
      warningsEl.hidden = true;
      return;
    }
    for (const warning of warnings) {
      warningList.append(element('li', '', warning));
    }
    warningsEl.hidden = false;
  }

  function renderTree() {
    treeEl.textContent = '';
    if (!tree || !tree.children.length) {
      treeEmpty.hidden = false;
      treeEmpty.textContent = discovery ? 'No Markdown files found.' : 'No repository scanned yet.';
      return;
    }
    const query = searchInput?.value ?? '';
    const filtered = filterTree(tree, query);
    if (!filtered.children.length) {
      treeEmpty.hidden = false;
      treeEmpty.textContent = 'No files match that search.';
      return;
    }
    treeEmpty.hidden = true;

    let counter = 0;
    const nextId = () => `book-tree-node-${++counter}`;
    const searching = query.trim().length > 0;

    function renderBranch(node, depth) {
      const list = element('ul', depth === 0 ? 'book-tree' : 'book-tree__children');
      for (const child of node.children) {
        list.append(child.type === 'folder' ? folderItem(child, depth, searching) : fileItem(child));
      }
      return list;
    }

    function folderItem(folder, depth, searching) {
      const item = element('li', 'book-tree__folder');
      const row = element('div', 'book-tree__row');
      const checkbox = element('input', 'book-tree__checkbox');
      checkbox.type = 'checkbox';
      checkbox.dataset.folder = folder.path;
      checkbox.setAttribute('aria-label', `Select every file in ${folder.path}`);
      const state = folderSelectionState(folder, selected);
      checkbox.checked = state === 'all';
      checkbox.indeterminate = state === 'some';
      checkbox.addEventListener('change', () => onFolderToggle(folder, checkbox.checked));

      const toggle = element('button', 'book-tree__toggle');
      toggle.type = 'button';
      const childList = renderBranch(folder, depth + 1);
      childList.id = nextId();
      const open = searching || expanded.has(folder.path);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-controls', childList.id);
      toggle.append(element('span', 'book-tree__chevron', '›'));
      toggle.append(element('span', 'book-tree__name', folder.name));
      toggle.addEventListener('click', () => {
        const nowOpen = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
        childList.hidden = !nowOpen;
        if (nowOpen) expanded.add(folder.path);
        else expanded.delete(folder.path);
      });

      const count = collectFilePaths(folder).length;
      row.append(checkbox, toggle, element('span', 'book-tree__count', String(count)));
      item.append(row, childList);
      childList.hidden = !open;
      return item;
    }

    function fileItem(file) {
      const item = element('li', 'book-tree__file');
      const row = element('div', 'book-tree__row');
      const checkbox = element('input', 'book-tree__checkbox');
      checkbox.type = 'checkbox';
      checkbox.dataset.file = file.path;
      checkbox.setAttribute('aria-label', `Include ${file.path} in the book`);
      checkbox.checked = selected.has(file.path);
      checkbox.addEventListener('change', () => onFileToggle(file.path, checkbox.checked));

      const preview = element('button', 'book-tree__file-btn');
      preview.type = 'button';
      preview.dataset.preview = file.path;
      preview.setAttribute('aria-label', `Preview ${file.path}`);
      preview.append(element('span', 'book-tree__name', file.name));
      const dir = file.path.includes('/')
        ? file.path.slice(0, file.path.lastIndexOf('/') + 1)
        : '';
      if (dir) preview.append(element('span', 'book-tree__dir', dir));
      preview.addEventListener('click', () => onPreview(file.path));

      row.append(checkbox, preview);
      if (file.size != null) row.append(element('span', 'book-tree__size', formatBytes(file.size)));
      item.append(row);
      return item;
    }

    treeEl.append(renderBranch(filtered, 0));
  }

  function onFileToggle(path, checked) {
    const next = new Set(selected);
    if (checked) next.add(path);
    else next.delete(path);
    setSelection(next);
  }

  function onFolderToggle(folder, checked) {
    setSelection(applyFolderSelection(folder, selected, checked));
  }

  /**
   * Apply a selection with the 30-file book limit and keep chapter order.
   * Newly selected files append in tree order, so select-all is predictable.
   */
  function setSelection(next) {
    const all = tree ? collectFilePaths(tree) : [];
    const wanted = all.filter((path) => next.has(path));
    let capped = wanted;
    if (wanted.length > MAX_BOOK_FILES) {
      capped = wanted.slice(0, MAX_BOOK_FILES);
      setStatus(
        `A book holds at most ${MAX_BOOK_FILES} files, so the first ${MAX_BOOK_FILES} were selected. Narrow the URL to a folder for a different set.`,
        'error',
      );
    }
    selected = new Set(capped);
    chapters = chapters.filter((path) => selected.has(path));
    for (const path of capped) {
      if (!chapters.includes(path)) chapters.push(path);
    }
    syncTreeState();
    updateSelectionUi();
    renderChapters();
    markStale();
  }

  function syncTreeState() {
    if (!tree) return;
    treeEl.querySelectorAll('input[data-file]').forEach((checkbox) => {
      checkbox.checked = selected.has(checkbox.dataset.file);
    });
    treeEl.querySelectorAll('input[data-folder]').forEach((checkbox) => {
      const folder = findFolder(tree, checkbox.dataset.folder);
      const state = folder ? folderSelectionState(folder, selected) : 'none';
      checkbox.checked = state === 'all';
      checkbox.indeterminate = state === 'some';
    });
  }

  function updateSelectionUi() {
    const all = tree ? collectFilePaths(tree) : [];
    const counts = selectionCounts(all, selected);
    if (summaryEl) {
      summaryEl.textContent = all.length
        ? `${counts.selected} of ${counts.total} selected · ${plural(
            chapters.length,
            'chapter',
          )} · max ${MAX_BOOK_FILES}`
        : 'No files selected.';
    }
    const allState = computeSelectAllState(all, selected);
    if (selectAllBtn) {
      selectAllBtn.disabled = !all.length || allState === 'all';
      selectAllBtn.textContent =
        allState === 'all' ? 'All files selected' : allState === 'some' ? 'Select all files' : 'Select all files';
    }
    if (clearBtn) clearBtn.disabled = !counts.selected;
    if (buildBtn) buildBtn.disabled = !discovery || !chapters.length;
    if (titleInput && titleInput.value && titleInput.dataset.auto !== '0') {
      titleInput.dataset.auto = '1';
    }
  }

  function renderChapters(focus = null) {
    chaptersEl.textContent = '';
    if (!chapters.length) {
      chaptersEmpty.hidden = false;
      chaptersEmpty.textContent = discovery
        ? 'No chapters yet. Tick files in the explorer.'
        : 'Chapters appear here after a scan.';
      return;
    }
    chaptersEmpty.hidden = true;

    chapters.forEach((path, index) => {
      const item = element('li', 'book-chapter-row');
      item.dataset.chapterPath = path;
      item.append(element('span', 'book-chapter-row__number', String(index + 1)));
      item.append(element('span', 'book-chapter-row__path', path));

      const controls = element('div', 'book-chapter-row__controls');
      const up = chapterButton('↑', `Move ${path} up`, 'up', index === 0);
      const down = chapterButton('↓', `Move ${path} down`, 'down', index === chapters.length - 1);
      const remove = chapterButton('×', `Remove ${path} from the book`, 'remove', false);
      up.addEventListener('click', () => {
        chapters = moveChapter(chapters, index, -1);
        renderChapters({ path, action: 'up' });
        markStale();
      });
      down.addEventListener('click', () => {
        chapters = moveChapter(chapters, index, 1);
        renderChapters({ path, action: 'down' });
        markStale();
      });
      remove.addEventListener('click', () => {
        chapters = removeChapter(chapters, path);
        selected.delete(path);
        syncTreeState();
        updateSelectionUi();
        renderChapters({ path, action: 'remove' });
        markStale();
      });
      controls.append(up, down, remove);
      item.append(controls);
      chaptersEl.append(item);
    });

    if (focus) {
      const row = [...chaptersEl.querySelectorAll('[data-chapter-path]')].find(
        (node) => node.dataset.chapterPath === focus.path,
      );
      const target =
        focus.action === 'remove'
          ? chaptersEl.querySelector('[data-chapter-path] button')
          : row?.querySelector(`button[data-action="${focus.action}"]`);
      target?.focus();
    }
  }

  function chapterButton(text, label, action, disabled) {
    const button = element('button', 'book-chapter-row__btn', text);
    button.type = 'button';
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.disabled = disabled;
    return button;
  }

  function activateChapter(path) {
    if (!selected.has(path)) {
      const next = new Set(selected);
      next.add(path);
      setSelection(next);
    }
  }

  async function onPreview(path) {
    if (!discovery) return;
    if (buildController) {
      setBuildStatus('Wait for the build to finish, or cancel it, before previewing a file.', 'error');
      return;
    }
    cancelPreview();
    const token = ++previewToken;
    const controller = new AbortController();
    previewController = controller;

    previewEl.hidden = false;
    bookOutput.hidden = true;
    previewBar.hidden = false;
    previewLabel.textContent = `Preview · ${path}`;
    previewEl.textContent = '';
    previewEl.append(element('p', 'hint', 'Loading file preview…'));

    try {
      const api = createGitHubApi({ signal: controller.signal, maxRequests: 5 });
      const report = await fetchMarkdownFiles({
        owner: discovery.owner,
        repo: discovery.repo,
        commitSha: discovery.commitSha,
        files: [path],
        api,
        signal: controller.signal,
        limits: { maxFiles: 1 },
      });
      if (token !== previewToken) return;
      if (!report.complete || !report.documents.length) {
        const failure = report.failures[0];
        throw Object.assign(new Error(failure?.message ?? 'Could not load that file.'), {
          code: failure?.code,
        });
      }
      const preview = await renderDocumentPreview({
        document: report.documents[0],
        owner: discovery.owner,
        repo: discovery.repo,
        commitSha: discovery.commitSha,
        sanitize: sanitizeHtml,
      });
      if (token !== previewToken) return;
      previewEl.innerHTML = preview.html;
      previewEl.querySelectorAll('a[href^="http"]').forEach((anchor) => {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      });
      activateChapter(path);
      preview.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      if (token !== previewToken) return;
      previewEl.textContent = '';
      previewEl.append(element('p', 'status error', bookErrorMessage(error)));
      previewEl.append(
        element('p', 'hint', 'The file was not added to the book. Use “Back” to return to the builder.'),
      );
    } finally {
      if (token === previewToken) previewController = null;
    }
  }

  function cancelPreview() {
    if (previewController) {
      previewController.abort();
      previewController = null;
    }
    previewToken += 1;
  }

  function closePreview() {
    cancelPreview();
    previewEl.hidden = true;
    previewBar.hidden = true;
    bookOutput.hidden = false;
    previewLabel.textContent = '';
  }

  function markStale() {
    if (!builtBook) return;
    builtBook = null;
    printBtn.disabled = true;
    resetOutput('Selection or options changed. Build the book again to refresh the preview.');
    setBuildStatus('The previous book is out of date. Build again before printing.', '');
  }

  function resetOutput(message) {
    bookOutput.textContent = '';
    bookOutput.append(element('p', 'hint', message));
    bookOutput.hidden = false;
    previewEl.hidden = true;
    previewBar.hidden = true;
  }

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.className = `status${kind ? ` ${kind}` : ''}`;
  }

  function setBuildStatus(message, kind) {
    buildStatus.textContent = message;
    buildStatus.className = `status${kind ? ` ${kind}` : ''}`;
  }

  function setScanBusy(busy) {
    scanBtn.disabled = busy;
    scanBtn.textContent = busy ? 'Scanning…' : 'Scan repository';
    if (cancelScanBtn) cancelScanBtn.hidden = !busy;
  }

  function setBuildBusy(busy) {
    buildBtn.disabled = busy || !discovery || !chapters.length;
    buildBtn.textContent = busy ? 'Building…' : 'Build book';
    if (cancelBuildBtn) cancelBuildBtn.hidden = !busy;
    urlInput.disabled = busy;
    if (busy) retryBtn.hidden = true;
  }

  async function onBuild() {
    if (!discovery) {
      setBuildStatus('Scan a repository first.', 'error');
      return;
    }
    if (!chapters.length) {
      setBuildStatus('Select at least one Markdown file to build a book.', 'error');
      return;
    }
    if (chapters.length > MAX_BOOK_FILES) {
      setBuildStatus(
        `A book holds at most ${MAX_BOOK_FILES} files. Remove ${chapters.length - MAX_BOOK_FILES} chapter(s) first.`,
        'error',
      );
      return;
    }

    cancelBuild({ silent: true });
    cancelPreview();
    const token = ++buildToken;
    const controller = new AbortController();
    buildController = controller;

    builtBook = null;
    printBtn.disabled = true;
    failuresEl.hidden = true;
    failureList.textContent = '';
    lastFailures = [];
    resetOutput('Fetching chapters…');
    setBuildBusy(true);
    setBuildStatus(`Fetching ${plural(chapters.length, 'chapter')} at ${discovery.ref}…`, '');

    const order = [...chapters];
    try {
      const api = createGitHubApi({
        signal: controller.signal,
        maxRequests: Math.max(30, order.length * 2),
      });
      const files = order.map((path) => {
        const found = discovery.files.find((file) => file.path === path);
        return found ? { path, sha: found.sha } : path;
      });
      const report = await fetchMarkdownFiles({
        owner: discovery.owner,
        repo: discovery.repo,
        commitSha: discovery.commitSha,
        files,
        api,
        signal: controller.signal,
      });
      if (token !== buildToken) return;

      if (!report.complete) {
        showFailures(report.failures);
        setBuildStatus(
          `Book incomplete — ${plural(report.failures.length, 'file')} failed. Nothing will print until every chapter loads.`,
          'error',
        );
        resetOutput('The book was not rendered because some chapters are missing.');
        return;
      }

      setBuildStatus('Rendering chapters and sanitising HTML…', '');
      const book = await assembleBook(
        { ...report, ref: discovery.ref },
        {
          title: titleInput?.value.trim(),
          subtitle: subtitleInput?.value.trim(),
          includeCover: coverToggle ? coverToggle.checked : true,
          includeToc: tocToggle ? tocToggle.checked : true,
          sanitize: sanitizeHtml,
        },
      );
      if (token !== buildToken) return;

      builtBook = book;
      applyTheme();
      bookOutput.textContent = '';
      bookOutput.innerHTML = book.html;
      bookOutput.hidden = false;
      previewEl.hidden = true;
      previewBar.hidden = true;
      bookOutput.querySelectorAll('a[href^="http"]').forEach((anchor) => {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      });
      printBtn.disabled = false;
      failuresEl.hidden = true;
      setBuildStatus(
        `Book ready — ${plural(book.chapterCount, 'chapter')}, ${formatBytes(
          report.totalBytes,
        )}. Review it, then print or save as PDF.`,
        '',
      );
    } catch (error) {
      if (token !== buildToken) return;
      if (error?.code === 'CANCELLED') {
        setBuildStatus('Build cancelled. Nothing was printed.', '');
        resetOutput('Build cancelled. Nothing was printed.');
        return;
      }
      setBuildStatus(bookErrorMessage(error), 'error');
      resetOutput('The book could not be built. Fix the issue above and retry.');
      if (Array.isArray(error?.failures) && error.failures.length) {
        showFailures(error.failures);
      }
    } finally {
      if (token === buildToken) {
        buildController = null;
        setBuildBusy(false);
        updateSelectionUi();
      }
    }
  }

  function cancelBuild({ silent = false } = {}) {
    if (!buildController) return;
    buildController.abort();
    buildController = null;
    buildToken += 1;
    setBuildBusy(false);
    builtBook = null;
    printBtn.disabled = true;
    if (!silent) {
      setBuildStatus('Build cancelled. Nothing was printed.', '');
      resetOutput('Build cancelled. Nothing was printed.');
    }
  }

  function showFailures(failures) {
    lastFailures = Array.isArray(failures) ? failures : [];
    failureList.textContent = '';
    for (const failure of lastFailures) {
      const item = element('li', 'book-failures__item');
      item.append(element('span', 'book-failures__path', failure.path ?? 'Unknown file'));
      item.append(element('span', 'book-failures__message', failure.message ?? 'Could not load.'));
      if (failure.retryable === false) {
        item.append(element('span', 'book-failures__flag', 'Not retryable'));
      }
      failureList.append(item);
    }
    failuresEl.hidden = !lastFailures.length;
    const canRetry = lastFailures.some((failure) => failure.retryable !== false);
    retryBtn.hidden = !canRetry;
    dropFailuresBtn.hidden = !lastFailures.length;
  }

  function dropFailedFiles() {
    if (!lastFailures.length) return;
    const failed = new Set(lastFailures.map((failure) => failure.path));
    chapters = chapters.filter((path) => !failed.has(path));
    for (const path of failed) selected.delete(path);
    lastFailures = [];
    failuresEl.hidden = true;
    failureList.textContent = '';
    retryBtn.hidden = true;
    dropFailuresBtn.hidden = true;
    syncTreeState();
    updateSelectionUi();
    renderChapters();
    setBuildStatus(
      `Removed ${plural(failed.size, 'failed file')}. Build again to create a complete book.`,
      '',
    );
    markStale();
  }

  function applyTheme() {
    if (!bookSheet) return;
    const checked = document.querySelector('input[name="book-theme"]:checked');
    const theme = checked?.value ?? 'clean';
    bookSheet.classList.remove('theme-clean', 'theme-business', 'theme-academic', 'theme-dark');
    bookSheet.classList.add(`theme-${theme}`);
  }

  function onPrintBook() {
    if (!builtBook) {
      setBuildStatus('Build a complete book before printing.', 'error');
      return;
    }
    try {
      printDocument({ mode: 'book', book: builtBook });
      setBuildStatus('Print dialog opened. Choose “Save as PDF” for a file.', '');
    } catch (error) {
      setBuildStatus(bookErrorMessage(error), 'error');
    }
  }

  // Expose a tiny read-only surface for debugging and for future integration
  // without letting external code mutate selection state.
  return {
    get state() {
      return {
        owner: discovery?.owner ?? null,
        repo: discovery?.repo ?? null,
        ref: discovery?.ref ?? null,
        commitSha: discovery?.commitSha ?? null,
        files: discovery?.files.length ?? 0,
        selected: selected.size,
        chapters: [...chapters],
        built: Boolean(builtBook),
        failures: [...lastFailures],
      };
    },
    cancelScan,
    cancelBuild,
    closePreview,
  };
}

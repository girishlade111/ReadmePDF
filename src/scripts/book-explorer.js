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
} from '../lib/selection.js';
import { assembleBook, renderDocumentPreview } from '../lib/pdf/assembly.js';
import { printDocument } from '../lib/print.js';
import { sanitizeHtml } from '../lib/sanitize.js';
import { initClientI18n, t, tn, clientBookLabels, clientLocale } from '../i18n/client.js';
import { addHistoryEntry, addExportRecord } from '../lib/history/index.js';

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
 * True when at least one exported PDF reported a non-fatal warning (skipped
 * image, unsupported glyph, or similar). Kept as a pure function so the
 * regression is covered without simulating a multi-megabyte export in JSDOM.
 *
 * @param {Array<{ warnings?: unknown }>|null|undefined} files
 */
export function hasExportWarnings(files) {
  return (
    Array.isArray(files) &&
    files.some((file) => Array.isArray(file?.warnings) && file.warnings.length > 0)
  );
}

/**
 * Actionable, non-technical copy for every failure the explorer can surface.
 * Pure function — covered by tests. The optional translator lets the browser
 * use the active locale while library callers keep English defaults.
 *
 * @param {any} error
 * @param {(key: string, vars?: Record<string, unknown>) => string} [translate]
 */
export function bookErrorMessage(error, translate) {
  const code = error?.code;
  const message = typeof error?.message === 'string' ? error.message : '';
  const tr = translate ?? t;
  // With a translator, always render localized first-party copy. Raw library
  // messages are English diagnostics and must never replace UI text on a
  // localized page. The only exception is REF_NOT_FOUND, whose localized
  // sentence embeds the technical detail.
  const localized = typeof translate === 'function';
  const detail = (key, vars) => (localized ? tr(key, vars) : message || tr(key, vars));
  switch (code) {
    case 'INVALID_URL':
      return detail('book.errors.invalidUrl');
    case 'PRIVATE_OR_NOT_FOUND':
      return tr('book.errors.privateOrNotFound');
    case 'REF_NOT_FOUND':
      return tr('book.errors.refNotFound', {
        message: message || tr('book.errors.refNotFoundFallback'),
      });
    case 'PATH_NOT_FOUND':
      return detail('book.errors.pathNotFound');
    case 'PATH_NOT_FOLDER':
      return detail('book.errors.pathNotFolder');
    case 'PATH_NOT_FILE':
      return detail('book.errors.pathNotFile');
    case 'INVALID_PATH':
    case 'PATH_ESCAPE':
      return detail('book.errors.invalidPath');
    case 'NO_MARKDOWN':
      return detail('book.errors.noMarkdown');
    case 'TREE_UNAVAILABLE':
      return detail('book.errors.treeUnavailable');
    case 'RATE_LIMITED':
      return error?.resetAt
        ? tr('book.errors.rateLimitedReset', { resetAt: error.resetAt })
        : tr('book.errors.rateLimited');
    case 'REQUEST_LIMIT':
      return detail('book.errors.requestLimit');
    case 'TOO_MANY_FILES':
      return detail('book.errors.tooManyFiles', { max: MAX_BOOK_FILES });
    case 'EMPTY_BOOK':
      return detail('book.errors.emptyBook');
    case 'BOOK_INCOMPLETE':
      return detail('book.errors.incomplete');
    case 'FILE_TOO_LARGE':
    case 'BOOK_TOO_LARGE':
    case 'SKIPPED_BY_LIMIT':
      return detail('book.errors.tooLarge');
    case 'CANCELLED':
      return tr('book.errors.cancelled');
    case 'SANITIZE_UNAVAILABLE':
      return detail('book.errors.sanitizeUnavailable');
    case 'PRINT_UNAVAILABLE':
      return detail('book.errors.printUnavailable');
    case 'TIMEOUT':
      return detail('book.errors.timeout');
    case 'NETWORK_ERROR':
      return detail('book.errors.network');
    case 'AUTH_REQUIRED':
    case 'FORBIDDEN':
      return detail('book.errors.forbidden');
    case 'GITHUB_UNAVAILABLE':
      return detail('book.errors.unavailable');
    default:
      return localized ? tr('book.errors.unknown') : message || tr('book.errors.unknown');
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

export function initBookExplorer() {
  if (typeof document === 'undefined') return null;
  if (document.body.dataset.bookInit) return null;
  initClientI18n();

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
  const exportPanel = $('book-export');
  const exportBtn = $('book-export-btn');
  const exportCancelBtn = $('book-export-cancel-btn');
  const exportDownload = $('book-export-download');
  const exportRetryBtn = $('book-export-retry-btn');
  const exportCloseBtn = $('book-export-close-btn');
  const exportProgressWrap = $('book-export-progress-wrap');
  const exportProgress = $('book-export-progress');
  const exportProgressLabel = $('book-export-progress-label');
  const exportStatus = $('book-export-status');
  const exportWarning = $('book-export-warning');
  const exportReadyHint = $('book-export-ready-hint');
  const exportFailuresEl = $('book-export-failures');
  const exportFailureList = $('book-export-failure-list');

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
  let exportController = null;
  let exportToken = 0;
  let exportObjectUrl = null;

  resetOutput(t('book.initialOutput'));
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
  exportBtn?.addEventListener('click', onExport);
  exportCancelBtn?.addEventListener('click', () => cancelExport());
  exportRetryBtn?.addEventListener('click', onExport);
  exportCloseBtn?.addEventListener('click', closeExportResult);
  printBtn?.addEventListener('click', onPrintBook);
  previewBack?.addEventListener('click', closePreview);
  titleInput?.addEventListener('input', () => {
    titleInput.dataset.auto = '0';
    markStale();
  });
  subtitleInput?.addEventListener('input', markStale);
  coverToggle?.addEventListener('change', markStale);
  tocToggle?.addEventListener('change', markStale);
  // A theme is a stylesheet on the existing sheet, not book content, so it
  // never invalidates an assembled preview.
  themeInputs.forEach((input) => input.addEventListener('change', applyTheme));

  // Broken images must never fail a build; thumbnails in chapters degrade in
  // the same way as the single-document preview.
  bookSheet?.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (target && target.tagName === 'IMG') {
        target.classList.add('broken');
        target.title = t('converter.image.failedTitle');
        target.alt = t('converter.image.unavailable', {
          alt: target.alt || t('converter.image.altFallback'),
        });
      }
    },
    true,
  );

  // A downloadable Blob URL lives only as long as this document. Revoke it on
  // navigation so a long export session cannot pin the archive in memory.
  window.addEventListener('pagehide', revokeExportObjectUrl);

  async function onScan() {
    const url = urlInput.value.trim();
    if (!url) {
      setStatus(t('book.status.emptyUrl'), 'error');
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
    setStatus(t('book.status.resolving'), '');

    try {
      const source = parseGitHubSource(url);
      const api = createGitHubApi({ signal: controller.signal, maxRequests: 60 });
      const resolved = await resolveRepositorySource(source, api, { signal: controller.signal });
      if (token !== scanToken) return;

      setStatus(t('book.status.finding'), '');
      const result = await discoverMarkdownFiles(resolved, api, {
        signal: controller.signal,
        translate: t,
      });
      if (token !== scanToken) return;

      discovery = result;
      tree = buildFileTree(result.files);
      expanded = new Set(collectFolderPaths(tree));
      selected = new Set(defaultBookSelection(result.files));
      chapters = collectFilePaths(tree).filter((path) => selected.has(path));

      if (titleInput && titleInput.dataset.auto !== '0') {
        titleInput.value = t('book.defaultTitle', {
          repo: `${result.owner}/${result.repo}`,
        });
        titleInput.dataset.auto = '1';
      }

      renderMeta(result);
      renderWarnings(result.warnings ?? []);
      renderTree();
      updateSelectionUi();
      renderChapters();
      resetOutput(
        result.files.length
          ? t('book.status.selectAndBuild')
          : t('book.status.noMarkdown'),
      );
      setBuildStatus('', '');
      failuresEl.hidden = true;
      lastFailures = [];

      if (result.files.length) {
        setStatus(
          t('book.status.found', {
            files: tn('common.markdownFiles', result.files.length),
            ref: result.ref,
            completeness: result.complete
              ? t('book.status.complete')
              : t('book.status.incomplete'),
          }),
          result.complete ? '' : 'error',
        );
      } else {
        setStatus(t('book.status.noFilesFound'), 'error');
      }
    } catch (error) {
      if (token !== scanToken) return;
      if (error?.code === 'CANCELLED') {
        setStatus(t('book.status.scanCancelled'), '');
        return;
      }
      setStatus(bookErrorMessage(error, t), 'error');
      renderMeta(null);
      treeEmpty.hidden = false;
      treeEmpty.textContent = t('book.status.scanFailedTree');
      resetOutput(t('book.status.scanFailedOutput'));
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
    if (!silent) setStatus(t('book.status.scanCancelled'), '');
  }

  function resetState() {
    // A new scan replaces the repository the in-flight build was reading from.
    // Abort it before clearing state so its completion can never render into
    // the new scan's workspace.
    cancelBuild({ silent: true });
    invalidateExport({ silent: true });
    setBuildStatus('', '');
    discovery = null;
    tree = null;
    selected = new Set();
    chapters = [];
    expanded = new Set();
    builtBook = null;
    lastFailures = [];
    treeEl.textContent = '';
    treeEmpty.hidden = false;
    treeEmpty.textContent = t('book.tree.scanning');
    warningsEl.hidden = true;
    warningList.textContent = '';
    failuresEl.hidden = true;
    failureList.textContent = '';
    retryBtn.hidden = true;
    dropFailuresBtn.hidden = true;
    printBtn.disabled = true;
    buildBtn.disabled = true;
    syncExportButton();
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
      shortSha ? t('book.meta.commit', { sha: shortSha }) : '',
      tn('common.markdownFiles', result.files.length),
      result.complete ? t('book.meta.complete') : t('book.meta.incomplete'),
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
      treeEmpty.textContent = discovery ? t('book.tree.empty') : t('book.tree.noScan');
      return;
    }
    const query = searchInput?.value ?? '';
    const filtered = filterTree(tree, query);
    if (!filtered.children.length) {
      treeEmpty.hidden = false;
      treeEmpty.textContent = t('book.tree.noMatch');
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
      checkbox.setAttribute('aria-label', t('book.a11y.selectFolder', { path: folder.path }));
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
      checkbox.setAttribute('aria-label', t('book.a11y.includeFile', { path: file.path }));
      checkbox.checked = selected.has(file.path);
      checkbox.addEventListener('change', () => onFileToggle(file.path, checkbox.checked));

      const preview = element('button', 'book-tree__file-btn');
      preview.type = 'button';
      preview.dataset.preview = file.path;
      preview.setAttribute('aria-label', t('book.a11y.previewFile', { path: file.path }));
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
      setStatus(t('book.status.capped', { max: MAX_BOOK_FILES }), 'error');
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
        ? t('book.selection.summary', {
            selected: counts.selected,
            total: counts.total,
            chapters: tn('common.chapters', chapters.length),
            max: MAX_BOOK_FILES,
          })
        : t('book.selection.noFiles');
    }
    const allState = computeSelectAllState(all, selected);
    if (selectAllBtn) {
      selectAllBtn.disabled = !all.length || allState === 'all';
      selectAllBtn.textContent =
        allState === 'all' ? t('book.selection.allSelected') : t('book.selection.selectAll');
    }
    if (clearBtn) clearBtn.disabled = !counts.selected;
    if (buildBtn) buildBtn.disabled = !discovery || !chapters.length;
  }

  function renderChapters(focus = null) {
    chaptersEl.textContent = '';
    if (!chapters.length) {
      chaptersEmpty.hidden = false;
      chaptersEmpty.textContent = discovery
        ? t('book.chapters.emptyLoaded')
        : t('book.chapters.emptyInitial');
      return;
    }
    chaptersEmpty.hidden = true;

    chapters.forEach((path, index) => {
      const item = element('li', 'book-chapter-row');
      item.dataset.chapterPath = path;
      item.append(element('span', 'book-chapter-row__number', String(index + 1)));
      item.append(element('span', 'book-chapter-row__path', path));

      const controls = element('div', 'book-chapter-row__controls');
      const up = chapterButton('↑', t('book.a11y.moveUp', { path }), 'up', index === 0);
      const down = chapterButton(
        '↓',
        t('book.a11y.moveDown', { path }),
        'down',
        index === chapters.length - 1,
      );
      const remove = chapterButton('×', t('book.a11y.remove', { path }), 'remove', false);
      up.addEventListener('click', () => {
        chapters = moveChapter(chapters, index, -1);
        renderChapters({ path, action: 'up', index: index - 1 });
        markStale();
      });
      down.addEventListener('click', () => {
        chapters = moveChapter(chapters, index, 1);
        renderChapters({ path, action: 'down', index: index + 1 });
        markStale();
      });
      remove.addEventListener('click', () => {
        chapters = removeChapter(chapters, path);
        selected = new Set([...selected].filter((item) => item !== path));
        syncTreeState();
        updateSelectionUi();
        renderChapters({ path, action: 'remove', index });
        markStale();
      });
      controls.append(up, down, remove);
      item.append(controls);
      chaptersEl.append(item);
    });

    if (focus) {
      const rows = [...chaptersEl.querySelectorAll('[data-chapter-path]')];
      const row =
        focus.action === 'remove'
          ? rows[Math.min(focus.index, rows.length - 1)]
          : rows.find((node) => node.dataset.chapterPath === focus.path);
      const preferred = row?.querySelector(`button[data-action="${focus.action}"]`);
      const target =
        preferred && !preferred.disabled
          ? preferred
          : row?.querySelector('button:not([disabled])') ??
            chaptersEl.querySelector('button:not([disabled])');
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

  async function onPreview(path) {
    if (!discovery) return;
    if (buildController) {
      setBuildStatus(t('book.preview.waitBuild'), 'error');
      return;
    }
    cancelPreview();
    const token = ++previewToken;
    const controller = new AbortController();
    previewController = controller;

    previewEl.hidden = false;
    bookOutput.hidden = true;
    previewBar.hidden = false;
    previewLabel.textContent = t('book.preview.label', { path });
    previewEl.textContent = '';
    previewEl.append(element('p', 'hint', t('book.status.loadingPreview')));
    // A preview replaces the built book on screen; printing that book now
    // would not match what the reader sees.
    printBtn.disabled = true;

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
        throw Object.assign(new Error(failure?.message ?? t('book.failure.load')), {
          code: failure?.code,
        });
      }
      const preview = await renderDocumentPreview({
        document: report.documents[0],
        owner: discovery.owner,
        repo: discovery.repo,
        commitSha: discovery.commitSha,
        sanitize: sanitizeHtml,
        labels: clientBookLabels(),
      });
      if (token !== previewToken) return;
      previewEl.innerHTML = preview.html;
      previewEl.querySelectorAll('a[href^="http"]').forEach((anchor) => {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      });
      preview.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      if (token !== previewToken) return;
      previewEl.textContent = '';
      previewEl.append(element('p', 'status error', bookErrorMessage(error, t)));
      previewEl.append(element('p', 'hint', t('book.preview.notAdded')));
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
    printBtn.disabled = !builtBook;
  }

  function markStale() {
    // Changing the selection or book options while chapters are still being
    // fetched invalidates the snapshot that build started with. Cancel it;
    // otherwise it would finish later and render a book that no longer
    // matches the controls (and enable printing it).
    if (buildController) {
      cancelBuild({ silent: true });
      invalidateExport({ silent: true });
      resetOutput(t('book.stale.changed'));
      setBuildStatus(t('book.stale.cancelledStatus'), 'error');
      syncExportButton();
      return;
    }
    if (!builtBook) {
      syncExportButton();
      return;
    }
    builtBook = null;
    invalidateExport({ silent: true });
    setExportStatus(t('home.book.exportStale'), '');
    printBtn.disabled = true;
    resetOutput(t('book.stale.outdated'));
    setBuildStatus(t('book.stale.outdatedStatus'), '');
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
    scanBtn.textContent = busy ? t('book.scanning') : t('book.scan');
    if (cancelScanBtn) cancelScanBtn.hidden = !busy;
  }

  function setBuildBusy(busy) {
    buildBtn.disabled = busy || !discovery || !chapters.length;
    buildBtn.textContent = busy ? t('book.building') : t('book.build');
    if (cancelBuildBtn) cancelBuildBtn.hidden = !busy;
    urlInput.disabled = busy;
    if (busy) retryBtn.hidden = true;
  }

  async function onBuild() {
    if (!discovery) {
      setBuildStatus(t('book.build.scanFirst'), 'error');
      return;
    }
    if (!chapters.length) {
      setBuildStatus(t('book.build.selectOne'), 'error');
      return;
    }
    if (chapters.length > MAX_BOOK_FILES) {
      setBuildStatus(
        t('book.build.tooMany', {
          max: MAX_BOOK_FILES,
          extra: chapters.length - MAX_BOOK_FILES,
        }),
        'error',
      );
      return;
    }

    cancelBuild({ silent: true });
    cancelPreview();
    invalidateExport({ silent: true });
    const token = ++buildToken;
    const controller = new AbortController();
    buildController = controller;

    builtBook = null;
    printBtn.disabled = true;
    failuresEl.hidden = true;
    failureList.textContent = '';
    lastFailures = [];
    resetOutput(t('book.status.fetchingChapters'));
    setBuildBusy(true);
    setBuildStatus(
      t('book.build.fetching', {
        chapters: tn('common.chapters', chapters.length),
        ref: discovery.ref,
      }),
      '',
    );

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
          t('book.build.incomplete', {
            files: tn('common.failedFiles', report.failures.length),
          }),
          'error',
        );
        resetOutput(t('book.build.notRendered'));
        return;
      }

      setBuildStatus(t('book.build.rendering'), '');
      const book = await assembleBook(
        { ...report, ref: discovery.ref },
        {
          title: titleInput?.value.trim(),
          subtitle: subtitleInput?.value.trim(),
          includeCover: coverToggle ? coverToggle.checked : true,
          includeToc: tocToggle ? tocToggle.checked : true,
          sanitize: sanitizeHtml,
          labels: clientBookLabels(),
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
      syncExportButton();
      setBuildStatus(
        t('book.build.ready', {
          chapters: tn('common.chapters', book.chapterCount),
          size: formatBytes(report.totalBytes),
        }),
        '',
      );
    } catch (error) {
      if (token !== buildToken) return;
      if (error?.code === 'CANCELLED') {
        setBuildStatus(t('book.build.cancelled'), '');
        resetOutput(t('book.build.cancelled'));
        return;
      }
      setBuildStatus(bookErrorMessage(error, t), 'error');
      resetOutput(t('book.build.failedOutput'));
      if (Array.isArray(error?.failures) && error.failures.length) {
        showFailures(error.failures);
      }
    } finally {
      if (token === buildToken) {
        buildController = null;
        setBuildBusy(false);
        updateSelectionUi();
        syncExportButton();
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
    syncExportButton();
    if (!silent) {
      setBuildStatus(t('book.build.cancelled'), '');
      resetOutput(t('book.build.cancelled'));
    }
  }

  function showFailures(failures) {
    lastFailures = Array.isArray(failures) ? failures : [];
    failureList.textContent = '';
    for (const failure of lastFailures) {
      const item = element('li', 'book-failures__item');
      item.append(
        element('span', 'book-failures__path', failure.path ?? t('book.failure.unknownFile')),
      );
      item.append(
        element('span', 'book-failures__message', failure.message ?? t('book.failure.load')),
      );
      if (failure.retryable === false) {
        item.append(element('span', 'book-failures__flag', t('book.failure.notRetryable')));
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
    // markStale() writes its own "previous book is out of date" status, so it
    // must run before the specific confirmation message.
    markStale();
    setBuildStatus(
      t('book.build.removed', { files: tn('common.failedFiles', failed.size) }),
      '',
    );
  }

  function selectedTheme() {
    const checked = document.querySelector('input[name="book-theme"]:checked');
    return checked?.value ?? 'clean';
  }

  function syncExportButton() {
    if (!exportBtn) return;
    exportBtn.disabled = !builtBook || Boolean(buildController) || Boolean(exportController);
  }

  function setExportStatus(message, kind = '') {
    if (!exportStatus) return;
    exportStatus.textContent = message ?? '';
    exportStatus.className = `status${kind ? ` ${kind}` : ''}`;
  }

  /**
   * `value === null` renders an indeterminate bar, which is the honest state
   * while the font files are downloading because their count is not tied to
   * the number of documents.
   */
  function setExportProgress(value, label = '') {
    if (exportProgressWrap) exportProgressWrap.hidden = !label;
    if (exportProgress) {
      if (value == null) exportProgress.removeAttribute('value');
      else exportProgress.value = String(Math.max(0, Math.min(100, Math.round(value))));
    }
    if (exportProgressLabel) exportProgressLabel.textContent = label;
  }

  function revokeExportObjectUrl() {
    if (!exportObjectUrl) return;
    try {
      URL.revokeObjectURL(exportObjectUrl);
    } catch {
      // Nothing else can be done if the browser refuses to revoke it.
    }
    exportObjectUrl = null;
  }

  function clearExportResult() {
    revokeExportObjectUrl();
    if (exportDownload) {
      exportDownload.hidden = true;
      exportDownload.removeAttribute('href');
      exportDownload.removeAttribute('download');
    }
    if (exportFailuresEl) exportFailuresEl.hidden = true;
    if (exportFailureList) exportFailureList.textContent = '';
    if (exportWarning) exportWarning.hidden = true;
    if (exportReadyHint) exportReadyHint.hidden = true;
    setExportProgress(0, '');
  }

  function cancelExport({ silent = false } = {}) {
    if (!exportController) return;
    exportController.abort();
    exportController = null;
    exportToken += 1;
    if (exportCancelBtn) exportCancelBtn.hidden = true;
    exportPanel?.removeAttribute('aria-busy');
    setExportProgress(0, '');
    if (!silent) {
      setExportStatus(t('home.book.exportCancelled'), '');
      if (exportRetryBtn) exportRetryBtn.hidden = false;
      if (exportCloseBtn) exportCloseBtn.hidden = false;
    }
    syncExportButton();
  }

  /** Drop an in-flight export and any finished download. */
  function invalidateExport({ silent = false } = {}) {
    cancelExport({ silent: true });
    clearExportResult();
    if (exportRetryBtn) exportRetryBtn.hidden = true;
    if (exportCloseBtn) exportCloseBtn.hidden = true;
    if (!silent) setExportStatus(t('home.book.exportCancelled'), '');
    syncExportButton();
  }

  function closeExportResult() {
    invalidateExport({ silent: true });
    setExportStatus('', '');
  }

  function renderExportFailures(failures) {
    if (!exportFailuresEl || !exportFailureList) return;
    const list = Array.isArray(failures) ? failures : [];
    exportFailureList.textContent = '';
    for (const failure of list) {
      const item = element('li', 'book-failures__item');
      item.append(
        element(
          'span',
          'book-failures__path',
          failure?.path || t('book.failure.unknownFile'),
        ),
      );
      exportFailureList.append(item);
    }
    exportFailuresEl.hidden = !list.length;
  }

  function showExportProgress(event) {
    const phase = event?.phase;
    const done = Number(event?.done) || 0;
    const total = Number(event?.total) || 0;
    if (phase === 'fonts') {
      setExportProgress(null, t('home.book.exportFonts'));
      return;
    }
    if (phase === 'document') {
      setExportProgress(
        total ? (done / total) * 100 : 0,
        t('home.book.exportProgress', {
          done: Math.min(done + 1, total || done + 1),
          total,
        }),
      );
      return;
    }
    if (phase === 'document-done' || phase === 'document-failed') {
      setExportProgress(
        total ? (done / total) * 100 : 0,
        t('home.book.exportProgress', { done, total }),
      );
      return;
    }
    if (phase === 'packing') setExportProgress(100, t('home.book.exportPacking'));
  }

  async function onExport() {
    if (exportController) return;
    if (!builtBook) {
      setExportStatus(t('home.book.exportBuildFirst'), 'error');
      return;
    }

    const snapshot = builtBook;
    const token = ++exportToken;
    const controller = new AbortController();
    exportController = controller;
    clearExportResult();
    setExportStatus(t('home.book.exportPreparing'), '');
    setExportProgress(null, t('home.book.exportFonts'));
    exportPanel?.setAttribute('aria-busy', 'true');
    if (exportBtn) exportBtn.disabled = true;
    if (exportCancelBtn) exportCancelBtn.hidden = false;
    if (exportRetryBtn) exportRetryBtn.hidden = true;
    if (exportCloseBtn) exportCloseBtn.hidden = true;
    if (exportFailuresEl) exportFailuresEl.hidden = true;

    try {
      // pdf-lib, fontkit, and JSZip are intentionally absent from the initial
      // page bundle. A reader who never exports pays nothing for them.
      const { exportBookToZip } = await import('../lib/pdf/export.js');
      if (token !== exportToken) return;

      const result = await exportBookToZip(snapshot, {
        sanitize: sanitizeHtml,
        labels: clientBookLabels(),
        locale: clientLocale(),
        theme: selectedTheme(),
        signal: controller.signal,
        onProgress: (event) => {
          if (token === exportToken) showExportProgress(event);
        },
      });
      if (token !== exportToken) return;

      const blob = new Blob([result.zipBytes], { type: 'application/zip' });
      exportObjectUrl = URL.createObjectURL(blob);
      if (exportDownload) {
        exportDownload.href = exportObjectUrl;
        exportDownload.download = result.zipName;
        exportDownload.hidden = false;
      }
      if (exportReadyHint) exportReadyHint.hidden = false;
      if (exportCancelBtn) exportCancelBtn.hidden = true;
      if (exportCloseBtn) exportCloseBtn.hidden = false;
      if (exportRetryBtn) exportRetryBtn.hidden = true;
      setExportProgress(100, '100%');
      addExportRecord({
        type: 'individual-pdf-zip',
        format: 'zip',
        title: snapshot?.repo?.full_name || (repoSource ? `${repoSource.owner}/${repoSource.repo}` : 'Book Export'),
        fileCount: result.files.length,
        totalBytes: result.totalBytes,
        status: result.failures.length ? 'partial' : 'success',
        metadata: {
          zipName: result.zipName,
          theme: selectedTheme(),
          failures: result.failures.map((f) => f.path),
        },
      }).catch(() => {});

      const summary = t('home.book.exportDone', {
        files: tn('common.files', result.files.length),
        size: formatBytes(result.totalBytes),
      });
      if (result.failures.length) {
        setExportStatus(
          `${summary} ${t('home.book.exportPartial', {
            files: tn('common.failedFiles', result.failures.length),
          })}`,
          'error',
        );
        renderExportFailures(result.failures);
      } else {
        setExportStatus(summary, '');
      }
      if (hasExportWarnings(result.files) && exportWarning) {
        exportWarning.hidden = false;
      }
    } catch (error) {
      if (token !== exportToken) return;
      if (error?.code === 'CANCELLED' || controller.signal.aborted) {
        setExportStatus(t('home.book.exportCancelled'), '');
      } else if (error?.code === 'EXPORT_FONTS') {
        setExportStatus(t('home.book.exportFontsFailed'), 'error');
      } else if (
        error?.code === 'EXPORT_TOO_LARGE' ||
        error?.code === 'EXPORT_PDF_TOO_LARGE' ||
        error?.code === 'EXPORT_TOO_MANY'
      ) {
        setExportStatus(t('home.book.exportTooLarge'), 'error');
      } else {
        setExportStatus(t('home.book.exportFailed'), 'error');
        if (Array.isArray(error?.failures) && error.failures.length) {
          renderExportFailures(error.failures);
        }
      }
      setExportProgress(0, '');
      if (error?.code !== 'CANCELLED' && !controller.signal.aborted) {
        addExportRecord({
          type: 'individual-pdf-zip',
          format: 'zip',
          title: snapshot?.repo?.full_name || (repoSource ? `${repoSource.owner}/${repoSource.repo}` : 'Book Export'),
          status: 'failed',
          metadata: {
            error: error?.message || 'Export failed',
          },
        }).catch(() => {});
      }
      if (exportRetryBtn) exportRetryBtn.hidden = false;
      if (exportCloseBtn) exportCloseBtn.hidden = false;
    } finally {
      if (token === exportToken) {
        exportController = null;
        exportPanel?.removeAttribute('aria-busy');
        if (exportCancelBtn) exportCancelBtn.hidden = true;
        syncExportButton();
      }
    }
  }

  function applyTheme() {
    if (!bookSheet) return;
    const theme = selectedTheme();
    bookSheet.classList.remove('theme-clean', 'theme-business', 'theme-academic', 'theme-dark');
    bookSheet.classList.add(`theme-${theme}`);
  }

  function onPrintBook() {
    if (!previewEl.hidden) {
      setBuildStatus(t('book.preview.closeFirst'), 'error');
      return;
    }
    if (!builtBook) {
      setBuildStatus(t('book.build.completeFirst'), 'error');
      return;
    }
    try {
      printDocument({ mode: 'book', book: builtBook });
      setBuildStatus(t('book.print.opened'), '');
      addExportRecord({
        type: 'combined-book-print',
        format: 'pdf',
        title: repoSource ? `${repoSource.owner}/${repoSource.repo} Book` : 'Documentation Book',
        fileCount: orderedPaths.length,
        status: 'success',
        metadata: {
          theme: selectedTheme(),
          chapters: [...orderedPaths],
        },
      }).catch(() => {});
    } catch (error) {
      setBuildStatus(bookErrorMessage(error, t), 'error');
    }
  }

  // Expose a tiny read-only surface for debugging and for future integration
  // without letting external code mutate selection state.
  async function restoreBookSnapshot(entry) {
    if (!entry) return;
    const bookUrlInput = $('book-url');
    if (entry.metadata?.repoSource && bookUrlInput) {
      bookUrlInput.value = `https://github.com/${entry.metadata.repoSource.owner}/${entry.metadata.repoSource.repo}`;
    }
    if (entry.metadata?.theme) {
      const r = document.querySelector(`input[name="book-theme"][value="${entry.metadata.theme}"]`);
      if (r) {
        r.checked = true;
        applyTheme();
      }
    }
    if (entry.metadata?.masterToc !== undefined && masterTocToggle) {
      masterTocToggle.checked = Boolean(entry.metadata.masterToc);
    }
    const paths = entry.metadata?.orderedPaths || (Array.isArray(entry.chapters) ? entry.chapters.map(c => c.path) : []);
    if (paths.length) {
      orderedPaths.length = 0;
      paths.forEach((p) => orderedPaths.push(p));
      renderChapterList();
      syncBuildButton();
      syncExportButton();
    }
    setBuildStatus(t('history.restoredNotice') || 'Book snapshot restored', 'ok');
    const bookSec = document.getElementById('book');
    if (bookSec) {
      bookSec.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return {
    restoreBookSnapshot,
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

/**
 * md2pdf — Client-Side History Drawer & Management Controller
 *
 * Manages the accessible History drawer, interactive card actions
 * (restore, rename, pin, delete), filtering, search, backup
 * export/import, storage quota monitoring, and keyboard navigation.
 */

import {
  clearAllHistory,
  deleteExportRecord,
  deleteHistoryEntry,
  downloadBackupFile,
  exportHistoryBackup,
  getHistoryEntry,
  getPreference,
  getStorageEstimate,
  importHistoryBackup,
  isStoragePersisted,
  listExportRecords,
  listHistoryEntries,
  pinHistoryEntry,
  renameHistoryEntry,
  requestPersistentStorage,
  setPreference,
} from '../lib/history/index.js';
import { t } from '../i18n/client.js';

/**
 * Formats a relative timestamp (e.g. "Just now", "5m ago", "2h ago").
 *
 * @param {string | number | Date} dateInput
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.round((now.getTime() - date.getTime()) / 1000);

  if (Number.isNaN(diffSec) || diffSec < 0) return 'Just now';
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  // Fallback to formatted date string
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Initializes the History UI controller.
 *
 * @param {{
 *   onRestoreConverter?: (entry: any) => Promise<void> | void;
 *   onRestoreBook?: (entry: any) => Promise<void> | void;
 *   onAutoSaveToggle?: (enabled: boolean) => void;
 *   hasUnsavedConverterWork?: () => boolean;
 * }} [callbacks]
 */
export function initHistoryUi(callbacks = {}) {
  if (typeof document === 'undefined') return;

  const drawer = document.getElementById('history-drawer');
  const backdrop = document.getElementById('history-backdrop');
  if (!drawer) return;

  const closeBtn = document.getElementById('history-close-btn');
  const searchInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('history-search')
  );
  const sortSelect = /** @type {HTMLSelectElement | null} */ (
    document.getElementById('history-sort')
  );
  const listEl = document.getElementById('history-list');
  const emptyEl = document.getElementById('history-empty');
  const clearBtn = document.getElementById('history-clear-all-btn');
  const exportBackupBtn = document.getElementById('history-export-backup-btn');
  const importBackupBtn = document.getElementById('history-import-backup-btn');
  const importFileInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('history-import-file')
  );
  const autoSaveToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('history-autosave-toggle')
  );
  const storageText = document.getElementById('history-storage-text');
  const storageBar = document.getElementById('history-storage-bar');
  const persistBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('history-persist-btn')
  );
  const persistStatus = document.getElementById('history-persist-status');
  const confirmModal = document.getElementById('history-confirm-modal');
  const confirmTitle = document.getElementById('history-confirm-title');
  const confirmDesc = document.getElementById('history-confirm-desc');
  const confirmOkBtn = document.getElementById('history-confirm-ok');
  const confirmCancelBtn = document.getElementById('history-confirm-cancel');

  let currentFilter = 'all';
  let currentSort = 'newest';
  let searchQuery = '';
  let searchTimer = null;
  let lastActiveElement = null;
  let confirmCallback = null;

  // 1. Persistence reliability handler
  async function checkPersistenceState() {
    if (!persistBtn) return;
    try {
      const persisted = await isStoragePersisted();
      if (persisted) {
        persistBtn.textContent = t('history.storage.persistedActive') || 'Storage persistence active';
        persistBtn.disabled = true;
      } else {
        persistBtn.textContent = t('history.storage.reliabilityBtn') || 'Improve local history reliability';
        persistBtn.disabled = false;
      }
    } catch {
      // Non-fatal
    }
  }

  if (persistBtn) {
    persistBtn.addEventListener('click', async () => {
      persistBtn.disabled = true;
      try {
        const res = await requestPersistentStorage();
        if (persistStatus) {
          persistStatus.hidden = false;
          if (res.status === 'already-granted' || res.granted) {
            persistStatus.textContent = t('history.storage.persistedGranted') ||
              'Persistence granted: browser will avoid clearing history under storage pressure. (Note: clearing site data still removes history).';
          } else if (res.status === 'denied') {
            persistStatus.textContent = t('history.storage.persistedDenied') ||
              'Browser denied persistence. History remains saved locally, subject to browser storage limits.';
          } else {
            persistStatus.textContent = res.message;
          }
        }
        await checkPersistenceState();
      } catch (err) {
        if (persistStatus) {
          persistStatus.hidden = false;
          persistStatus.textContent = 'Failed to request persistence: ' + (err?.message || err);
        }
        persistBtn.disabled = false;
      }
    });
  }

  // 2. Drawer open & close handlers
  function openDrawer() {
    lastActiveElement = document.activeElement;
    drawer.hidden = false;
    if (backdrop) backdrop.hidden = false;
    drawer.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
    document.body.classList.add('history-drawer-open');

    refreshStorageInfo();
    checkPersistenceState();
    loadEntries();

    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    document.body.classList.remove('history-drawer-open');

    setTimeout(() => {
      drawer.hidden = true;
      if (backdrop) backdrop.hidden = true;
      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        lastActiveElement.focus();
      }
    }, 200);
  }

  // Hook all trigger buttons with data-open-history
  document.querySelectorAll('[data-open-history]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openDrawer();
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Keyboard trap & escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && !drawer.hidden) {
      if (confirmModal && !confirmModal.hidden) {
        closeConfirm();
      } else {
        closeDrawer();
      }
    }
  });

  // 2. Filter buttons
  document.querySelectorAll('[data-history-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document
        .querySelectorAll('[data-history-filter]')
        .forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentFilter = btn.getAttribute('data-history-filter') || 'all';
      loadEntries();
    });
  });

  // 3. Search input (debounced)
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = searchInput.value;
        loadEntries();
      }, 250);
    });
  }

  // 4. Sort select
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      loadEntries();
    });
  }

  // 5. Auto-save preference toggle
  if (autoSaveToggle) {
    getPreference('autoSaveEnabled', true).then((enabled) => {
      autoSaveToggle.checked = Boolean(enabled);
    });

    autoSaveToggle.addEventListener('change', async () => {
      const enabled = autoSaveToggle.checked;
      await setPreference('autoSaveEnabled', enabled);
      if (callbacks.onAutoSaveToggle) {
        callbacks.onAutoSaveToggle(enabled);
      }
    });
  }

  // 6. Backup Export
  if (exportBackupBtn) {
    exportBackupBtn.addEventListener('click', async () => {
      exportBackupBtn.disabled = true;
      try {
        const backupData = await exportHistoryBackup();
        downloadBackupFile(backupData);
      } catch (err) {
        alert(t('history.status.failed') + ': ' + (err?.message || err));
      } finally {
        exportBackupBtn.disabled = false;
      }
    });
  }

  // 7. Backup Import
  if (importBackupBtn && importFileInput) {
    importBackupBtn.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', async () => {
      const file = importFileInput.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const res = await importHistoryBackup(text, {
          mode: 'merge',
          conflictStrategy: 'keep-existing',
        });
        loadEntries();
        refreshStorageInfo();

        const message = res.conflicts > 0
          ? `Import complete: ${res.importedEntries} entries, ${res.importedExports} exports imported (${res.conflicts} existing records preserved without overwrite).`
          : `Import complete: ${res.importedEntries} entries, ${res.importedExports} exports imported.`;
        alert(message);
      } catch (err) {
        alert('Import failed: ' + (err?.message || err));
      } finally {
        importFileInput.value = '';
      }
    });
  }

  // 8. Clear All
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      showConfirm(
        t('history.confirm.clearTitle'),
        t('history.confirm.clearDesc'),
        async () => {
          if (callbacks.onClearAll) {
            try {
              callbacks.onClearAll();
            } catch {}
          }
          await clearAllHistory();
          loadEntries();
          refreshStorageInfo();
        },
      );
    });
  }

  // 9. Modal Confirm helper
  function showConfirm(title, desc, onOk) {
    if (!confirmModal) {
      if (confirm(desc)) onOk();
      return;
    }
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmDesc) confirmDesc.textContent = desc;
    confirmCallback = onOk;
    confirmModal.hidden = false;
    if (confirmOkBtn) confirmOkBtn.focus();
  }

  function closeConfirm() {
    if (confirmModal) confirmModal.hidden = true;
    confirmCallback = null;
  }

  if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', () => {
      const cb = confirmCallback;
      closeConfirm();
      if (cb) cb();
    });
  }
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', closeConfirm);
  }

  // 10. Load and render entries
  async function loadEntries() {
    if (!listEl) return;

    try {
      let entries = [];
      let exports = [];

      if (currentFilter === 'exports') {
        exports = await listExportRecords({ limit: 50 });
      } else {
        const res = await listHistoryEntries({
          filter: currentFilter,
          sort: currentSort,
          search: searchQuery,
          limit: 100,
          excludeContent: true,
        });
        entries = res.entries;

        // If 'all', also mix in export records
        if (currentFilter === 'all' && !searchQuery) {
          exports = await listExportRecords({ limit: 15 });
        }
      }

      renderList(entries, exports);
    } catch (err) {
      listEl.innerHTML = `<p class="history-error">${t('history.status.unavailable')}</p>`;
    }
  }

  function renderList(entries, exports) {
    if (!listEl) return;
    listEl.innerHTML = '';

    const totalCount = entries.length + exports.length;
    if (totalCount === 0) {
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = searchQuery
          ? t('history.emptyFilter')
          : t('history.empty');
      }
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    // Render regular history snapshots
    entries.forEach((item) => {
      const card = createEntryCard(item);
      listEl.appendChild(card);
    });

    // Render export records
    exports.forEach((item) => {
      const card = createExportCard(item);
      listEl.appendChild(card);
    });
  }

  function createEntryCard(item) {
    const card = document.createElement('article');
    card.className = `history-card${item.pinned ? ' is-pinned' : ''}`;
    card.setAttribute('data-id', item.id);

    const typeLabel = t(`history.type.${getTypeKey(item.recordType)}`) || item.recordType;
    const timeFormatted = formatRelativeTime(item.updatedAt || item.createdAt);
    const sizeFormatted = item.contentSize ? `${Math.round(item.contentSize / 1024 * 10) / 10} KB` : '';

    card.innerHTML = `
      <div class="history-card__header">
        <span class="history-card__badge history-card__badge--${item.sourceType || 'converter'}">${typeLabel}</span>
        <span class="history-card__time">${timeFormatted}</span>
      </div>
      <div class="history-card__body">
        <h4 class="history-card__title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h4>
        ${item.metadata?.repo ? `<p class="history-card__meta">${escapeHtml(item.metadata.owner || '')}/${escapeHtml(item.metadata.repo)} @ ${escapeHtml(item.metadata.branch || 'main')}</p>` : ''}
        ${item.metadata?.fileName ? `<p class="history-card__meta">${escapeHtml(item.metadata.fileName)}</p>` : ''}
        ${sizeFormatted ? `<span class="history-card__size">${sizeFormatted}</span>` : ''}
      </div>
      <div class="history-card__actions">
        <button type="button" class="btn btn--xs btn--primary history-act-restore">
          ${item.sourceType === 'book' ? t('history.action.restore') : t('history.action.open')}
        </button>
        <button type="button" class="btn btn--xs btn--tertiary history-act-rename" title="${t('history.action.rename')}">
          ${t('history.action.rename')}
        </button>
        <button type="button" class="btn btn--xs btn--tertiary history-act-pin" title="${item.pinned ? t('history.action.unpin') : t('history.action.pin')}">
          ${item.pinned ? t('history.action.unpin') : t('history.action.pin')}
        </button>
        <button type="button" class="btn btn--xs btn--tertiary history-act-delete" title="${t('history.action.delete')}">
          ${t('history.action.delete')}
        </button>
      </div>
    `;

    // Action: Restore / Open
    card.querySelector('.history-act-restore')?.addEventListener('click', async () => {
      const fullEntry = await getHistoryEntry(item.id);
      if (!fullEntry) return;

      if (callbacks.hasUnsavedConverterWork && callbacks.hasUnsavedConverterWork()) {
        showConfirm(
          t('history.confirm.restoreTitle'),
          t('history.confirm.restoreDesc'),
          () => {
            performRestore(fullEntry);
          },
        );
      } else {
        performRestore(fullEntry);
      }
    });

    // Action: Rename
    card.querySelector('.history-act-rename')?.addEventListener('click', () => {
      const newTitle = prompt(t('history.action.rename'), item.title);
      if (newTitle && newTitle.trim() && newTitle.trim() !== item.title) {
        renameHistoryEntry(item.id, newTitle.trim()).then(() => loadEntries());
      }
    });

    // Action: Pin / Unpin
    card.querySelector('.history-act-pin')?.addEventListener('click', () => {
      pinHistoryEntry(item.id, !item.pinned).then(() => loadEntries());
    });

    // Action: Delete
    card.querySelector('.history-act-delete')?.addEventListener('click', () => {
      showConfirm(
        t('history.confirm.deleteTitle'),
        t('history.confirm.deleteDesc'),
        () => {
          deleteHistoryEntry(item.id).then(() => {
            loadEntries();
            refreshStorageInfo();
          });
        },
      );
    });

    return card;
  }

  function createExportCard(item) {
    const card = document.createElement('article');
    card.className = 'history-card history-card--export';
    card.setAttribute('data-id', item.id);

    const isPrintDialog = item.status === 'print-dialog-requested' || item.generationStatus === 'print-dialog-requested';
    const isCancelled = item.status === 'cancelled' || item.generationStatus === 'cancelled';
    const typeLabel = isPrintDialog
      ? (t('history.type.printDialog') || 'Print Dialog')
      : (isCancelled ? (t('history.type.cancelled') || 'Cancelled') : (t('history.type.export') || 'Export'));
    const timeFormatted = formatRelativeTime(item.generatedAt);
    const sizeFormatted = item.fileSize ? `${Math.round(item.fileSize / 1024 * 10) / 10} KB` : '';
    const metaText = isPrintDialog
      ? (t('history.printDialogDesc') || 'Native print dialog requested')
      : (item.suggestedFilename || item.exportType);

    card.innerHTML = `
      <div class="history-card__header">
        <span class="history-card__badge history-card__badge--export${isPrintDialog ? ' history-card__badge--print' : ''}">${escapeHtml(typeLabel)}</span>
        <span class="history-card__time">${timeFormatted}</span>
      </div>
      <div class="history-card__body">
        <h4 class="history-card__title">${escapeHtml(item.documentTitle)}</h4>
        <p class="history-card__meta">${escapeHtml(metaText)}</p>
        ${sizeFormatted ? `<span class="history-card__size">${sizeFormatted} (${item.chapterCount || 1} doc)</span>` : ''}
      </div>
      <div class="history-card__actions">
        ${item.sourceWorkspaceId ? `<button type="button" class="btn btn--xs btn--secondary history-act-view-source">${t('history.action.viewSource')}</button>` : ''}
        <button type="button" class="btn btn--xs btn--tertiary history-act-delete" title="${t('history.action.delete')}">${t('history.action.delete')}</button>
      </div>
    `;

    // Action: View source
    if (item.sourceWorkspaceId) {
      card.querySelector('.history-act-view-source')?.addEventListener('click', async () => {
        const entry = await getHistoryEntry(item.sourceWorkspaceId);
        if (entry) performRestore(entry);
      });
    }

    // Action: Delete
    card.querySelector('.history-act-delete')?.addEventListener('click', () => {
      showConfirm(
        t('history.confirm.deleteTitle'),
        t('history.confirm.deleteDesc'),
        () => {
          deleteExportRecord(item.id).then(() => {
            loadEntries();
            refreshStorageInfo();
          });
        },
      );
    });

    return card;
  }

  function performRestore(entry) {
    closeDrawer();
    if (entry.sourceType === 'book' || entry.recordType === 'book-builder') {
      if (callbacks.onRestoreBook) {
        callbacks.onRestoreBook(entry);
      }
    } else {
      if (callbacks.onRestoreConverter) {
        callbacks.onRestoreConverter(entry);
      }
    }
  }

  function getTypeKey(recordType) {
    if (recordType === 'local-file') return 'upload';
    if (recordType === 'github-readme' || recordType === 'github-repository') return 'github';
    if (recordType === 'book-builder') return 'book';
    if (recordType === 'pdf-export' || recordType === 'zip-export') return 'export';
    return 'manual';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function refreshStorageInfo() {
    if (!storageText && !storageBar) return;
    const est = await getStorageEstimate();
    if (est.supported) {
      if (storageText) {
        storageText.textContent = t('history.storage.usage', {
          used: est.usageFormatted,
          total: est.quotaFormatted,
          percent: est.percent,
        });
      }
      if (storageBar) {
        storageBar.style.width = `${Math.max(2, est.percent)}%`;
      }
    } else {
      if (storageText) storageText.textContent = t('history.status.saved');
      if (storageBar) storageBar.style.width = '0%';
    }
  }

  // Expose API for external callers (e.g. converter opening drawer or auto-save indicator click)
  return {
    open: openDrawer,
    close: closeDrawer,
    refresh: loadEntries,
  };
}

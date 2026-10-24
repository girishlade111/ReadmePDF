/**
 * md2pdf — IndexedDB History Schema & Validation
 *
 * Defines stores, indexes, schema versioning, and validation guards
 * for client-side local document history and auto-save.
 */

export const DB_NAME = 'md2pdf-history-db';
export const DB_VERSION = 1;

export const STORES = Object.freeze({
  WORKSPACES: 'workspaces',
  ENTRIES: 'historyEntries',
  EXPORTS: 'exportRecords',
  PREFERENCES: 'preferences',
});

export const RECORD_TYPES = Object.freeze([
  'manual',
  'auto-save',
  'paste',
  'local-file',
  'github-readme',
  'github-repository',
  'book-builder',
]);

export const SOURCE_TYPES = Object.freeze([
  'converter',
  'book',
  'github',
  'upload',
  'paste',
]);

export const EXPORT_TYPES = Object.freeze([
  'single-pdf',
  'combined-book-print',
  'individual-pdf-zip',
]);

export const EXPORT_STATUSES = Object.freeze([
  'completed',
  'success',
  'download-initiated',
  'failed',
  'cancelled',
  'print-dialog-requested',
]);

export const DEFAULT_PREFERENCES = Object.freeze({
  autoSaveEnabled: true,
  autoSaveDelay: 1000,
  maxEntries: null, // Durable retention: never silently prune entries based on numeric limits
  retentionPolicy: 'durable-manual-cleanup',
  privacyNoticeDismissed: false,
});

/**
 * Executes schema creation/upgrade on an IDBDatabase instance.
 *
 * @param {IDBDatabase} db
 * @param {number} oldVersion
 * @param {number} newVersion
 */
export function upgradeDatabase(db, oldVersion, newVersion) {
  if (oldVersion < 1) {
    // 1. Workspaces store (for active drafts)
    if (!db.objectStoreNames.contains(STORES.WORKSPACES)) {
      const workspaceStore = db.createObjectStore(STORES.WORKSPACES, { keyPath: 'workspaceId' });
      workspaceStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      workspaceStore.createIndex('recordType', 'recordType', { unique: false });
    }

    // 2. History entries store (versioned snapshots)
    if (!db.objectStoreNames.contains(STORES.ENTRIES)) {
      const entryStore = db.createObjectStore(STORES.ENTRIES, { keyPath: 'id' });
      entryStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      entryStore.createIndex('createdAt', 'createdAt', { unique: false });
      entryStore.createIndex('recordType', 'recordType', { unique: false });
      entryStore.createIndex('sourceType', 'sourceType', { unique: false });
      entryStore.createIndex('pinned', 'pinned', { unique: false });
      entryStore.createIndex('workspaceId', 'workspaceId', { unique: false });
    }

    // 3. Export records store (PDF and ZIP output metadata)
    if (!db.objectStoreNames.contains(STORES.EXPORTS)) {
      const exportStore = db.createObjectStore(STORES.EXPORTS, { keyPath: 'id' });
      exportStore.createIndex('generatedAt', 'generatedAt', { unique: false });
      exportStore.createIndex('exportType', 'exportType', { unique: false });
      exportStore.createIndex('sourceWorkspaceId', 'sourceWorkspaceId', { unique: false });
    }

    // 4. Preferences store
    if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
      db.createObjectStore(STORES.PREFERENCES, { keyPath: 'key' });
    }
  }
}

/**
 * Validates a history entry object before persistence.
 *
 * @param {unknown} value
 * @returns {asserts value is import('./types').HistoryEntry}
 */
export function validateHistoryEntry(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('History entry must be a non-null object.');
  }
  const entry = /** @type {Record<string, any>} */ (value);
  if (!entry.id || typeof entry.id !== 'string' || !entry.id.trim() || typeof entry.title !== 'string') {
    throw new Error('History entry missing required fields: id and title must be strings.');
  }
  if (typeof entry.createdAt !== 'string' || Number.isNaN(Date.parse(entry.createdAt))) {
    throw new Error('History entry createdAt must be a valid ISO date string.');
  }
  if (typeof entry.updatedAt !== 'string' || Number.isNaN(Date.parse(entry.updatedAt))) {
    throw new Error('History entry updatedAt must be a valid ISO date string.');
  }
}

/**
 * Validates a workspace draft object before persistence.
 *
 * @param {unknown} value
 */
export function validateWorkspace(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Workspace must be an object.');
  }
  const ws = /** @type {Record<string, any>} */ (value);
  const wsId = ws.workspaceId || ws.id;
  if (typeof wsId !== 'string' || !wsId.trim()) {
    throw new Error('Workspace missing workspaceId or id.');
  }
  if (ws.recordType !== undefined && typeof ws.recordType !== 'string') {
    throw new Error('Workspace recordType must be a string.');
  }
  if (ws.revision !== undefined && (!Number.isInteger(ws.revision) || ws.revision < 0)) {
    throw new Error('Workspace revision must be a non-negative integer.');
  }
}

/**
 * Validates an export record before persistence.
 *
 * @param {unknown} value
 */
export function validateExportRecord(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Export record must be a non-null object.');
  }
  const rec = /** @type {Record<string, any>} */ (value);
  if (typeof rec.id !== 'string' || !rec.id.trim()) {
    throw new Error('Export record id must be a non-empty string.');
  }
  if (typeof rec.exportType !== 'string' || !EXPORT_TYPES.includes(rec.exportType)) {
    throw new Error(`Export record exportType must be one of: ${EXPORT_TYPES.join(', ')}.`);
  }
  if (typeof rec.generatedAt !== 'string' || Number.isNaN(Date.parse(rec.generatedAt))) {
    throw new Error('Export record generatedAt must be a valid ISO date string.');
  }
  const status = rec.generationStatus || rec.status;
  if (status !== undefined && typeof status === 'string' && !EXPORT_STATUSES.includes(status)) {
    throw new Error(`Export record status must be one of: ${EXPORT_STATUSES.join(', ')}.`);
  }
}

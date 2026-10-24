/**
 * md2pdf — Local History & Workspace Repository
 *
 * Provides transactional CRUD, searching, filtering, sorting,
 * deduplication, and retention management for local storage records.
 */

import { openDatabase, runTransaction } from './db.js';
import {
  DEFAULT_PREFERENCES,
  STORES,
  validateExportRecord,
  validateHistoryEntry,
  validateWorkspace,
} from './schema.js';

/**
 * Helper to acquire DB connection from explicit instance or default open.
 *
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<IDBDatabase>}
 */
async function resolveDb(options = {}) {
  if (options.db) return options.db;
  return openDatabase({ factory: options.factory });
}

// ---------------------------------------------------------------------------
// 1. WORKSPACES (Active Drafts)
// ---------------------------------------------------------------------------

/**
 * Saves the current active workspace draft (e.g. single document editor)
 * with optimistic concurrency and revision verification.
 *
 * @param {{
 *   id?: string;
 *   workspaceId?: string;
 *   recordType: 'converter' | 'book';
 *   title?: string;
 *   content?: string;
 *   markdown?: string;
 *   metadata?: Record<string, any>;
 *   updatedAt?: string;
 *   revision?: number;
 * }} workspace
 * @param {{
 *   expectedRevision?: number;
 *   rejectIfMissing?: boolean;
 *   db?: IDBDatabase;
 *   factory?: IDBFactory;
 * }} [options]
 * @returns {Promise<any>} The committed workspace record.
 */
export async function saveActiveWorkspace(workspace, options = {}) {
  validateWorkspace(workspace);
  const db = await resolveDb(options);
  const now = new Date().toISOString();

  const wsId = workspace.workspaceId || workspace.id;
  const content = workspace.content ?? workspace.markdown ?? '';

  let committedRecord = null;

  await runTransaction(db, STORES.WORKSPACES, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      const store = stores[STORES.WORKSPACES];
      const getReq = store.get(wsId);

      getReq.onsuccess = () => {
        const existing = getReq.result;

        // Concurrency revision validation
        if (options.expectedRevision !== undefined && existing) {
          if (existing.revision !== options.expectedRevision) {
            const conflictErr = new Error(
              `Concurrency conflict: workspace "${wsId}" has revision ${existing.revision}, expected ${options.expectedRevision}.`,
            );
            /** @type {any} */ (conflictErr).code = 'REVISION_CONFLICT';
            /** @type {any} */ (conflictErr).currentRevision = existing.revision;
            /** @type {any} */ (conflictErr).expectedRevision = options.expectedRevision;
            /** @type {any} */ (conflictErr).currentRecord = existing;
            return reject(conflictErr);
          }
        }

        if (options.rejectIfMissing && !existing) {
          const missingErr = new Error(
            `Workspace "${wsId}" has been deleted in another session.`,
          );
          /** @type {any} */ (missingErr).code = 'WORKSPACE_DELETED';
          return reject(missingErr);
        }

        const nextRevision = (existing?.revision ?? workspace.revision ?? 0) + 1;
        const record = {
          ...workspace,
          id: wsId,
          workspaceId: wsId,
          title: workspace.title || 'Untitled Draft',
          content,
          markdown: content,
          metadata: workspace.metadata || {},
          updatedAt: now,
          revision: nextRevision,
        };

        validateWorkspace(record);

        const putReq = store.put(record);
        putReq.onsuccess = () => {
          committedRecord = record;
          resolve(record);
        };
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  });

  return committedRecord;
}

/**
 * Retrieves an active workspace draft.
 *
 * @param {string} id
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<any | null>}
 */
export async function getActiveWorkspace(id, options = {}) {
  const db = await resolveDb(options);
  return runTransaction(db, STORES.WORKSPACES, 'readonly', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.WORKSPACES].get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Deletes an active workspace draft.
 *
 * @param {string} id
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<void>}
 */
export async function clearActiveWorkspace(id, options = {}) {
  const db = await resolveDb(options);
  await runTransaction(db, STORES.WORKSPACES, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.WORKSPACES].delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

// ---------------------------------------------------------------------------
// 2. HISTORY ENTRIES (Versioned Snapshots)
// ---------------------------------------------------------------------------

/**
 * Adds a new history snapshot with automatic deduplication.
 *
 * @param {{
 *   id?: string;
 *   title: string;
 *   recordType: string;
 *   sourceType: string;
 *   content?: string;
 *   metadata?: Record<string, any>;
 *   pinned?: boolean;
 *   createdAt?: string;
 *   updatedAt?: string;
 *   contentSize?: number;
 * }} entry
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<string>} The entry ID.
 */
export async function addHistoryEntry(entry, options = {}) {
  const db = await resolveDb(options);
  const now = new Date().toISOString();

  const id =
    entry.id && entry.id.trim()
      ? entry.id
      : `hist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const content = entry.content ?? entry.markdown ?? '';
  const contentSize = entry.contentSize ?? new Blob([content]).size;

  const record = {
    id,
    schemaVersion: 1,
    title: (entry.title || 'Untitled Document').trim(),
    recordType: entry.recordType || 'manual',
    sourceType: entry.sourceType || 'manual',
    content,
    markdown: content,
    contentSize,
    chapters: entry.chapters || [],
    metadata: entry.metadata || {},
    pinned: Boolean(entry.pinned),
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
    lastOpenedAt: now,
  };

  validateHistoryEntry(record);
  let savedRecord = record;

  await runTransaction(db, STORES.ENTRIES, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      // Deduplication check: inspect recent entries of same recordType and content
      const index = stores[STORES.ENTRIES].index('updatedAt');
      const range = typeof IDBKeyRange !== 'undefined' ? IDBKeyRange.upperBound(now) : null;
      const cursorReq = index.openCursor(range, 'prev');

      let duplicateFound = null;

      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const item = cursor.value;
          // If within the last 60 seconds with identical title, recordType, and content:
          const diffMs = Math.abs(new Date(now).getTime() - new Date(item.updatedAt).getTime());
          if (
            diffMs < 60000 &&
            item.title === record.title &&
            item.recordType === record.recordType &&
            item.content === record.content
          ) {
            duplicateFound = item;
          }
        }

        if (duplicateFound) {
          duplicateFound.updatedAt = now;
          duplicateFound.lastOpenedAt = now;
          savedRecord = duplicateFound;
          const updateReq = cursor.update(duplicateFound);
          updateReq.onsuccess = () => resolve(duplicateFound.id);
          updateReq.onerror = () => reject(updateReq.error);
        } else {
          // Durable storage: never prune user entries or snapshots based on numeric limits
          const putReq = stores[STORES.ENTRIES].put(record);
          putReq.onsuccess = () => resolve(record);
          putReq.onerror = () => reject(putReq.error);
        }
      };

      cursorReq.onerror = () => {
        // Fallback to normal insert if cursor fails
        const putReq = stores[STORES.ENTRIES].put(record);
        putReq.onsuccess = () => resolve(record);
        putReq.onerror = () => reject(putReq.error);
      };
    });
  });

  return savedRecord;
}

/**
 * Retrieves a history snapshot by ID.
 *
 * @param {string} id
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<any | null>}
 */
export async function getHistoryEntry(id, options = {}) {
  const db = await resolveDb(options);
  return runTransaction(db, STORES.ENTRIES, 'readonly', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.ENTRIES].get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Lists history snapshots with filtering, searching, and sorting.
 *
 * @param {{
 *   filter?: 'all' | 'markdown' | 'github' | 'books' | 'exports';
 *   sort?: 'newest' | 'oldest' | 'opened' | 'pinned';
 *   search?: string;
 *   limit?: number;
 *   offset?: number;
 *   db?: IDBDatabase;
 *   factory?: IDBFactory;
 * }} [params]
 * @returns {Promise<{ entries: any[]; total: number }>}
 */
export async function listHistoryEntries(params = {}) {
  const db = await resolveDb(params);
  const {
    filter = 'all',
    sort = 'newest',
    search = '',
    limit = 50,
    offset = 0,
    pinnedFirst = Boolean(params.pinnedFirst),
  } = params;

  return runTransaction(db, STORES.ENTRIES, 'readonly', (stores) => {
    return new Promise((resolve, reject) => {
      const store = stores[STORES.ENTRIES];
      const req = store.getAll();

      req.onsuccess = () => {
        let items = req.result || [];

        // 1. Filter by category
        if (filter !== 'all') {
          items = items.filter((item) => {
            if (filter === 'markdown') {
              return (
                item.recordType === 'manual' ||
                item.recordType === 'local-file' ||
                item.recordType === 'paste' ||
                item.sourceType === 'converter'
              );
            }
            if (filter === 'github') {
              return (
                item.recordType === 'github-readme' ||
                item.recordType === 'github-repository' ||
                item.sourceType === 'github'
              );
            }
            if (filter === 'books') {
              return (
                item.recordType === 'book-builder' ||
                item.sourceType === 'book'
              );
            }
            if (filter === 'exports') {
              return (
                item.recordType === 'pdf-export' ||
                item.recordType === 'zip-export'
              );
            }
            return true;
          });
        }

        // 2. Search query filter
        const query = (search || '').trim().slice(0, 100).toLowerCase();
        if (query) {
          items = items.filter((item) => {
            const titleMatch = item.title?.toLowerCase().includes(query);
            const repoMatch = item.metadata?.repo?.toLowerCase().includes(query);
            const ownerMatch = item.metadata?.owner?.toLowerCase().includes(query);
            const fileMatch = item.metadata?.fileName?.toLowerCase().includes(query);
            if (titleMatch || repoMatch || ownerMatch || fileMatch) return true;
            // Bound search within document body to prevent memory lockups on large books
            const contentSample = typeof item.content === 'string' ? item.content.slice(0, 50000).toLowerCase() : '';
            return contentSample.includes(query);
          });
        }

        const total = items.length;

        // 3. Sorting
        items.sort((a, b) => {
          if (pinnedFirst || sort === 'pinned') {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          }
          if (sort === 'oldest') {
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          }
          if (sort === 'opened') {
            return (
              new Date(b.lastOpenedAt || b.updatedAt).getTime() -
              new Date(a.lastOpenedAt || a.updatedAt).getTime()
            );
          }
          // Default: 'newest'
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        // 4. Pagination
        const paginated = items.slice(offset, offset + limit);

        // 5. Lazy content projection if requested to minimize memory overhead
        const resultEntries = params.excludeContent
          ? paginated.map((item) => {
              const { content, markdown, chapters, ...summary } = item;
              return {
                ...summary,
                contentPreview: typeof content === 'string' ? content.slice(0, 160) : '',
              };
            })
          : paginated;

        resolve({ entries: resultEntries, total });
      };

      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Updates an existing history snapshot.
 *
 * @param {string} id
 * @param {Record<string, any>} updates
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<void>}
 */
export async function updateHistoryEntry(id, updates, options = {}) {
  const db = await resolveDb(options);
  await runTransaction(db, STORES.ENTRIES, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      const getReq = stores[STORES.ENTRIES].get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) return reject(new Error(`History entry not found: ${id}`));

        const updated = {
          ...item,
          ...updates,
          id, // ensure ID cannot be mutated
          updatedAt: updates.updatedAt || new Date().toISOString(),
        };

        if (updates.content !== undefined) {
          updated.contentSize = new Blob([updates.content]).size;
        }

        validateHistoryEntry(updated);

        const putReq = stores[STORES.ENTRIES].put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  });
}

/**
 * Renames a history snapshot.
 *
 * @param {string} id
 * @param {string} newTitle
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<void>}
 */
export async function renameHistoryEntry(id, newTitle, options = {}) {
  const title = (newTitle || '').trim();
  if (!title) throw new Error('Title cannot be empty.');
  return updateHistoryEntry(id, { title }, options);
}

/**
 * Pins or unpins a history snapshot.
 *
 * @param {string} id
 * @param {boolean} pinned
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<void>}
 */
export async function pinHistoryEntry(id, pinned, options = {}) {
  return updateHistoryEntry(id, { pinned: Boolean(pinned) }, options);
}

/**
 * Deletes a single history snapshot by ID.
 *
 * @param {string} id
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<void>}
 */
export async function deleteHistoryEntry(id, options = {}) {
  const db = await resolveDb(options);
  await runTransaction(db, STORES.ENTRIES, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.ENTRIES].delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Clears all history snapshots, with optional preservation of pinned entries.
 *
 * @param {{ preservePinned?: boolean; db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<number>} Number of deleted entries.
 */
export async function clearAllHistory(options = {}) {
  const db = await resolveDb(options);
  const preservePinned = Boolean(options.preservePinned);

  return runTransaction(db, [STORES.ENTRIES, STORES.EXPORTS], 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      stores[STORES.EXPORTS].clear();
      if (!preservePinned) {
        const countReq = stores[STORES.ENTRIES].count();
        countReq.onsuccess = () => {
          const count = countReq.result;
          const clearReq = stores[STORES.ENTRIES].clear();
          clearReq.onsuccess = () => resolve(count);
          clearReq.onerror = () => reject(clearReq.error);
        };
        countReq.onerror = () => reject(countReq.error);
      } else {
        const req = stores[STORES.ENTRIES].openCursor();
        let deleted = 0;
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (!cursor.value.pinned) {
              cursor.delete();
              deleted++;
            }
            cursor.continue();
          } else {
            resolve(deleted);
          }
        };
        req.onerror = () => reject(req.error);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// 3. EXPORT RECORDS (PDF and ZIP outputs)
// ---------------------------------------------------------------------------

/**
 * Records a successful PDF or ZIP export.
 *
 * @param {{
 *   id?: string;
 *   sourceWorkspaceId?: string;
 *   documentTitle: string;
 *   exportType: 'single-pdf' | 'combined-book-print' | 'individual-pdf-zip';
 *   suggestedFilename?: string;
 *   fileSize?: number;
 *   chapterCount?: number;
 *   pageCount?: number;
 *   sourceType?: string;
 *   generationStatus?: 'completed' | 'download-initiated' | 'failed';
 *   generatedAt?: string;
 *   metadata?: Record<string, any>;
 * }} record
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<string>}
 */
export async function addExportRecord(record, options = {}) {
  const db = await resolveDb(options);
  const now = new Date().toISOString();

  const id =
    record.id && record.id.trim()
      ? record.id
      : `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  let normalizedStatus = record.status || record.generationStatus || 'completed';
  if (normalizedStatus === 'print' || normalizedStatus === 'print-dialog') normalizedStatus = 'print-dialog-requested';
  if (!['completed', 'success', 'download-initiated', 'failed', 'cancelled', 'print-dialog-requested'].includes(normalizedStatus)) {
    normalizedStatus = 'completed';
  }

  // Sanitize metadata to never store binary payloads in export logs
  const cleanMetadata = { ...(record.metadata || {}) };
  delete cleanMetadata.pdfBinary;
  delete cleanMetadata.zipBinary;
  delete cleanMetadata.binary;
  delete cleanMetadata.data;

  const item = {
    id,
    sourceWorkspaceId: record.sourceWorkspaceId || '',
    title: (record.title || record.documentTitle || 'Exported Document').trim(),
    documentTitle: (record.title || record.documentTitle || 'Exported Document').trim(),
    exportType: (record.exportType === 'book-zip' || record.type === 'book-zip') ? 'individual-pdf-zip' : (record.exportType || record.type || 'single-pdf'),
    format: record.format || (normalizedStatus === 'print-dialog-requested' ? 'print' : 'pdf'),
    status: normalizedStatus,
    fileCount: Number(record.fileCount ?? record.chapterCount ?? 1),
    totalBytes: Number(record.totalBytes ?? record.fileSize ?? 0),
    suggestedFilename: record.suggestedFilename || '',
    fileSize: Number(record.totalBytes ?? record.fileSize ?? 0),
    chapterCount: Number(record.fileCount ?? record.chapterCount ?? 1),
    pageCount: Number(record.pageCount) || 0,
    sourceType: record.sourceType || 'converter',
    generationStatus: normalizedStatus,
    generatedAt: record.generatedAt || now,
    metadata: cleanMetadata,
  };

  validateExportRecord(item);

  await runTransaction(db, STORES.EXPORTS, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.EXPORTS].put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });

  return item;
}

/**
 * Lists recent export records.
 *
 * @param {{ limit?: number; db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<any[]>}
 */
export async function listExportRecords(options = {}) {
  const db = await resolveDb(options);
  const limit = options.limit ?? 50;

  return runTransaction(db, STORES.EXPORTS, 'readonly', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.EXPORTS].getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort(
          (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
        );
        const sliced = items.slice(0, limit);
        sliced.records = sliced;
        resolve(sliced);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Deletes an export record.
 *
 * @param {string} id
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<void>}
 */
export async function deleteExportRecord(id, options = {}) {
  const db = await resolveDb(options);
  await runTransaction(db, STORES.EXPORTS, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.EXPORTS].delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

// ---------------------------------------------------------------------------
// 4. PREFERENCES (Settings)
// ---------------------------------------------------------------------------

/**
 * Retrieves a user preference.
 *
 * @param {string} key
 * @param {any} [defaultValue]
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<any>}
 */
export async function getPreference(key, defaultValue = undefined, options = {}) {
  try {
    const db = await resolveDb(options);
    return await runTransaction(db, STORES.PREFERENCES, 'readonly', (stores) => {
      return new Promise((resolve, reject) => {
        const req = stores[STORES.PREFERENCES].get(key);
        req.onsuccess = () => {
          if (req.result !== undefined && req.result !== null) {
            resolve(req.result.value);
          } else {
            resolve(
              defaultValue !== undefined
                ? defaultValue
                : DEFAULT_PREFERENCES[key],
            );
          }
        };
        req.onerror = () => reject(req.error);
      });
    });
  } catch {
    return defaultValue !== undefined ? defaultValue : DEFAULT_PREFERENCES[key];
  }
}

/**
 * Persists a user preference.
 *
 * @param {string} key
 * @param {any} value
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<void>}
 */
export async function setPreference(key, value, options = {}) {
  const db = await resolveDb(options);
  await runTransaction(db, STORES.PREFERENCES, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.PREFERENCES].put({ key, value, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

// ---------------------------------------------------------------------------
// 5. STORAGE MONITORING & NON-DESTRUCTIVE CLEANUP
// ---------------------------------------------------------------------------

/**
 * Non-destructive storage pressure assessment.
 * Reports counts and estimated storage without deleting any user records.
 *
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<{
 *   totalEntries: number;
 *   pinnedCount: number;
 *   manualCount: number;
 *   importCount: number;
 *   bookCount: number;
 *   approxBytes: number;
 * }>}
 */
export async function checkStoragePressure(options = {}) {
  const db = await resolveDb(options);
  return runTransaction(db, STORES.ENTRIES, 'readonly', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.ENTRIES].getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        let pinnedCount = 0;
        let manualCount = 0;
        let importCount = 0;
        let bookCount = 0;
        let approxBytes = 0;

        for (const item of items) {
          if (item.pinned) pinnedCount++;
          if (item.recordType === 'manual') manualCount++;
          if (item.recordType === 'local-file' || item.recordType === 'github-readme' || item.recordType === 'github-repository') importCount++;
          if (item.recordType === 'book-builder' || item.sourceType === 'book') bookCount++;
          approxBytes += Number(item.contentSize || (item.content ? item.content.length : 0));
        }

        resolve({
          totalEntries: items.length,
          pinnedCount,
          manualCount,
          importCount,
          bookCount,
          approxBytes,
        });
      };
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Optional user-initiated cleanup of stale temporary auto-saves.
 * NEVER deletes user manual versions, imported files, book snapshots, or pinned items.
 * Requires explicit options.confirm === true.
 *
 * @param {{
 *   olderThanMs?: number;
 *   confirm?: boolean;
 *   db?: IDBDatabase;
 *   factory?: IDBFactory;
 * }} [options]
 * @returns {Promise<{ deleted: number }>}
 */
export async function cleanupTemporaryDrafts(options = {}) {
  if (!options.confirm) {
    throw new Error('Cleanup requires explicit user confirmation (confirm: true).');
  }

  const db = await resolveDb(options);
  const cutoffTime = options.olderThanMs ? Date.now() - options.olderThanMs : Date.now() - (7 * 24 * 60 * 60 * 1000);

  return runTransaction(db, STORES.ENTRIES, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.ENTRIES].openCursor();
      let deleted = 0;

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const item = cursor.value;
          // ONLY ever delete unpinned auto-saves older than cutoff.
          // NEVER touch manual versions, imports, or book snapshots!
          const isTemporary = item.recordType === 'auto-save' || item.sourceType === 'auto-save';
          const isOld = new Date(item.updatedAt || item.createdAt).getTime() < cutoffTime;

          if (isTemporary && !item.pinned && isOld) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        } else {
          resolve({ deleted });
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

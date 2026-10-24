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
 * Saves the current active workspace draft (e.g. single document editor).
 *
 * @param {{
 *   id: string;
 *   recordType: 'converter' | 'book';
 *   title?: string;
 *   content?: string;
 *   metadata?: Record<string, any>;
 *   updatedAt?: string;
 *   revision?: number;
 * }} workspace
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<void>}
 */
export async function saveActiveWorkspace(workspace, options = {}) {
  validateWorkspace(workspace);
  const db = await resolveDb(options);
  const now = new Date().toISOString();

  const wsId = workspace.workspaceId || workspace.id;
  const record = {
    ...workspace,
    id: wsId,
    workspaceId: wsId,
    title: workspace.title || 'Untitled Draft',
    content: workspace.content ?? '',
    metadata: workspace.metadata || {},
    updatedAt: now,
    revision: (workspace.revision ?? 0) + 1,
  };

  await runTransaction(db, STORES.WORKSPACES, 'readwrite', (stores) => {
    return new Promise((resolve, reject) => {
      const req = stores[STORES.WORKSPACES].put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
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

  const content = entry.content ?? '';
  const contentSize = entry.contentSize ?? new Blob([content]).size;

  const record = {
    id,
    schemaVersion: 1,
    title: (entry.title || 'Untitled Document').trim(),
    recordType: entry.recordType || 'manual',
    sourceType: entry.sourceType || 'manual',
    content,
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
          const putReq = stores[STORES.ENTRIES].put(record);
          putReq.onsuccess = () => {
            if (options.maxEntries && typeof options.maxEntries === 'number') {
              const allReq = stores[STORES.ENTRIES].getAll();
              allReq.onsuccess = () => {
                const all = allReq.result || [];
                if (all.length > options.maxEntries) {
                  all.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
                  const toDelete = all.slice(0, all.length - options.maxEntries);
                  toDelete.forEach((item) => {
                    if (!item.pinned) stores[STORES.ENTRIES].delete(item.id);
                  });
                }
                resolve(record);
              };
              allReq.onerror = () => resolve(record);
            } else {
              resolve(record);
            }
          };
          putReq.onerror = () => reject(putReq.error);
        }
      };

      cursorReq.onerror = () => {
        // Fallback to normal insert if cursor fails
        const putReq = stores[STORES.ENTRIES].put(record);
        putReq.onsuccess = () => resolve(record.id);
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
        const query = search.trim().toLowerCase();
        if (query) {
          items = items.filter((item) => {
            const titleMatch = item.title?.toLowerCase().includes(query);
            const contentMatch = item.content?.toLowerCase().includes(query);
            const repoMatch = item.metadata?.repo?.toLowerCase().includes(query);
            const ownerMatch = item.metadata?.owner?.toLowerCase().includes(query);
            const fileMatch = item.metadata?.fileName?.toLowerCase().includes(query);
            return titleMatch || contentMatch || repoMatch || ownerMatch || fileMatch;
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

        resolve({ entries: paginated, total });
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

  const item = {
    id,
    sourceWorkspaceId: record.sourceWorkspaceId || '',
    title: (record.title || record.documentTitle || 'Exported Document').trim(),
    documentTitle: (record.title || record.documentTitle || 'Exported Document').trim(),
    exportType: (record.exportType === 'book-zip' || record.type === 'book-zip') ? 'individual-pdf-zip' : (record.exportType || record.type || 'single-pdf'),
    format: record.format || 'pdf',
    status: record.status || record.generationStatus || 'success',
    fileCount: Number(record.fileCount ?? record.chapterCount ?? 1),
    totalBytes: Number(record.totalBytes ?? record.fileSize ?? 0),
    suggestedFilename: record.suggestedFilename || '',
    fileSize: Number(record.totalBytes ?? record.fileSize ?? 0),
    chapterCount: Number(record.fileCount ?? record.chapterCount ?? 1),
    pageCount: Number(record.pageCount) || 0,
    sourceType: record.sourceType || 'converter',
    generationStatus: record.status || record.generationStatus || 'success',
    generatedAt: record.generatedAt || now,
    metadata: record.metadata || {},
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

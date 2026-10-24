/**
 * md2pdf — Backup Export & Import Serialization
 *
 * Implements hardened JSON backup serialization and strict schema
 * validation with guards against prototype pollution, code injection,
 * malicious data structures, duplicate ID collisions, and silent overwrites.
 */

import {
  openDatabase,
  runTransaction,
} from './db.js';
import {
  STORES,
  validateExportRecord,
  validateHistoryEntry,
  validateWorkspace,
} from './schema.js';

export const BACKUP_FORMAT_ID = 'md2pdf-history-backup';
export const BACKUP_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024; // 25 MB max import size

/**
 * Checks for prototype pollution patterns recursively.
 * Rejects objects with custom prototype chains or dangerous property names.
 *
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {boolean} True if clean, false if polluted.
 */
export function isSafeStructure(value, depth = 0) {
  if (depth > 20) return false; // Prevent deep nesting attacks
  if (!value || typeof value !== 'object') return true;

  if (Array.isArray(value)) {
    return value.every((item) => isSafeStructure(item, depth + 1));
  }

  // Guard against custom prototype injection
  const proto = Object.getPrototypeOf(value);
  if (proto !== null && proto !== Object.prototype) {
    return false;
  }

  for (const key of Object.getOwnPropertyNames(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return false;
    }
    const val = /** @type {Record<string, any>} */ (value)[key];
    if (!isSafeStructure(val, depth + 1)) return false;
  }
  return true;
}

/**
 * Exports all local history, workspaces, exports, and safe preferences to a JSON object.
 *
 * @param {{ db?: IDBDatabase; factory?: IDBFactory }} [options]
 * @returns {Promise<{
 *   format: string;
 *   version: number;
 *   schemaVersion: number;
 *   exportedAt: string;
 *   entries: any[];
 *   workspaces: any[];
 *   exports: any[];
 *   preferences: Record<string, any>;
 * }>}
 */
export async function exportHistoryBackup(options = {}) {
  const db = options.db || (await openDatabase({ factory: options.factory }));

  return runTransaction(
    db,
    [STORES.ENTRIES, STORES.WORKSPACES, STORES.EXPORTS, STORES.PREFERENCES],
    'readonly',
    (stores) => {
      return new Promise((resolve, reject) => {
        const entriesReq = stores[STORES.ENTRIES].getAll();
        const workspacesReq = stores[STORES.WORKSPACES].getAll();
        const exportsReq = stores[STORES.EXPORTS].getAll();
        const prefsReq = stores[STORES.PREFERENCES].getAll();

        let pending = 4;
        const check = () => {
          if (--pending === 0) {
            const rawPrefs = prefsReq.result || [];
            const safePrefs = {};
            for (const item of rawPrefs) {
              // Exclude any sensitive tokens if ever introduced
              if (item.key && !item.key.includes('token') && !item.key.includes('auth')) {
                safePrefs[item.key] = item.value;
              }
            }

            resolve({
              format: BACKUP_FORMAT_ID,
              version: BACKUP_SCHEMA_VERSION,
              schemaVersion: BACKUP_SCHEMA_VERSION,
              exportedAt: new Date().toISOString(),
              entries: entriesReq.result || [],
              workspaces: workspacesReq.result || [],
              exports: exportsReq.result || [],
              preferences: safePrefs,
            });
          }
        };

        entriesReq.onsuccess = check;
        workspacesReq.onsuccess = check;
        exportsReq.onsuccess = check;
        prefsReq.onsuccess = check;

        entriesReq.onerror = () => reject(entriesReq.error);
        workspacesReq.onerror = () => reject(workspacesReq.error);
        exportsReq.onerror = () => reject(exportsReq.error);
        prefsReq.onerror = () => reject(prefsReq.error);
      });
    },
  );
}

/**
 * Triggers a browser download of the backup file.
 *
 * @param {object} backupData
 * @param {string} [filename]
 */
export function downloadBackupFile(backupData, filename = 'md2pdf-history-backup.json') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Validates and imports a history backup JSON string or object with conflict safety.
 *
 * @param {string | object} input
 * @param {{
 *   mode?: 'merge' | 'replace';
 *   conflictStrategy?: 'keep-existing' | 'create-copy' | 'replace';
 *   confirmed?: boolean;
 *   db?: IDBDatabase;
 *   factory?: IDBFactory;
 * }} [options]
 * @returns {Promise<{
 *   success: boolean;
 *   importedEntries: number;
 *   importedExports: number;
 *   importedWorkspaces: number;
 *   conflicts: number;
 *   skipped: number;
 *   errors: string[];
 * }>}
 */
export async function importHistoryBackup(input, options = {}) {
  const mode = options.mode || 'merge';
  const conflictStrategy = options.conflictStrategy || (mode === 'replace' ? 'replace' : 'keep-existing');
  const errors = [];

  if (mode === 'replace' && options.confirmed !== true) {
    throw new Error('Destructive Replace All mode requires explicit confirmation (confirmed: true).');
  }

  let data;
  if (typeof input === 'string') {
    const byteSize = typeof Blob !== 'undefined'
      ? new Blob([input]).size
      : (typeof Buffer !== 'undefined' ? Buffer.byteLength(input, 'utf8') : input.length);

    if (byteSize > MAX_BACKUP_BYTES) {
      throw new Error(`Backup file exceeds maximum allowed size of ${MAX_BACKUP_BYTES / (1024 * 1024)} MB.`);
    }
    try {
      data = JSON.parse(input);
    } catch {
      throw new Error('Failed to parse backup JSON: invalid syntax.');
    }
  } else if (input && typeof input === 'object') {
    data = input;
  } else {
    throw new Error('Invalid input: expected JSON string or backup object.');
  }

  // Security guard: Prototype pollution check
  if (!isSafeStructure(data)) {
    throw new Error('Security rejection: input contains prohibited prototype properties.');
  }

  // Header validation
  if (data.format !== BACKUP_FORMAT_ID) {
    throw new Error(`Invalid backup format: expected "${BACKUP_FORMAT_ID}", got "${data.format}".`);
  }
  const ver = data.schemaVersion ?? data.version;
  if (!Number.isInteger(ver) || ver > BACKUP_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version: ${ver}. Current supported version is ${BACKUP_SCHEMA_VERSION}.`);
  }

  const entriesToImport = Array.isArray(data.entries) ? data.entries : [];
  const exportsToImport = Array.isArray(data.exports) ? data.exports : [];
  const workspacesToImport = Array.isArray(data.workspaces) ? data.workspaces : [];

  // Pre-validate entries and exports before touching database
  const validEntries = [];
  for (const rawEntry of entriesToImport) {
    try {
      validateHistoryEntry(rawEntry);
      validEntries.push({ ...rawEntry });
    } catch (err) {
      errors.push(`Entry validation failed (${rawEntry?.id || 'unknown'}): ${err?.message || err}`);
    }
  }

  const validExports = [];
  for (const rawExport of exportsToImport) {
    try {
      validateExportRecord(rawExport);
      validExports.push({ ...rawExport });
    } catch (err) {
      errors.push(`Export validation failed (${rawExport?.id || 'unknown'}): ${err?.message || err}`);
    }
  }

  const validWorkspaces = [];
  for (const rawWs of workspacesToImport) {
    try {
      validateWorkspace(rawWs);
      validWorkspaces.push({ ...rawWs });
    } catch (err) {
      errors.push(`Workspace validation failed (${rawWs?.workspaceId || rawWs?.id || 'unknown'}): ${err?.message || err}`);
    }
  }

  let importedEntries = 0;
  let importedExports = 0;
  let importedWorkspaces = 0;
  let conflicts = 0;
  let skipped = 0;

  const db = options.db || (await openDatabase({ factory: options.factory }));

  await runTransaction(
    db,
    [STORES.ENTRIES, STORES.WORKSPACES, STORES.EXPORTS, STORES.PREFERENCES],
    'readwrite',
    (stores) => {
      return new Promise((resolve, reject) => {
        // If replace mode, clear old stores first
        if (mode === 'replace') {
          stores[STORES.ENTRIES].clear();
          stores[STORES.EXPORTS].clear();
          stores[STORES.WORKSPACES].clear();
        }

        // Fetch existing entry IDs to detect collisions accurately
        const getEntriesReq = stores[STORES.ENTRIES].getAll();
        const getExportsReq = stores[STORES.EXPORTS].getAll();
        const getWorkspacesReq = stores[STORES.WORKSPACES].getAll();

        let loads = 3;
        const onLoaded = () => {
          if (--loads !== 0) return;

          const existingEntryIds = new Set((getEntriesReq.result || []).map((e) => e.id));
          const existingExportIds = new Set((getExportsReq.result || []).map((e) => e.id));
          const existingWorkspaceIds = new Set((getWorkspacesReq.result || []).map((w) => w.workspaceId || w.id));

          // 1. Process History Entries
          for (const entry of validEntries) {
            const hasConflict = existingEntryIds.has(entry.id);

            if (hasConflict) {
              conflicts++;
              if (conflictStrategy === 'keep-existing') {
                skipped++;
                continue; // Preserve existing data without overwrite
              } else if (conflictStrategy === 'create-copy') {
                const copyEntry = {
                  ...entry,
                  id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                  title: `${entry.title} (Imported Copy)`,
                };
                stores[STORES.ENTRIES].put(copyEntry);
                existingEntryIds.add(copyEntry.id);
                importedEntries++;
              } else if (conflictStrategy === 'replace') {
                stores[STORES.ENTRIES].put(entry);
                importedEntries++;
              }
            } else {
              stores[STORES.ENTRIES].put(entry);
              existingEntryIds.add(entry.id);
              importedEntries++;
            }
          }

          // 2. Process Export Records
          for (const exp of validExports) {
            const hasConflict = existingExportIds.has(exp.id);
            if (hasConflict) {
              conflicts++;
              if (conflictStrategy === 'keep-existing') {
                skipped++;
                continue;
              } else if (conflictStrategy === 'create-copy') {
                const copyExp = {
                  ...exp,
                  id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                  title: `${exp.title || exp.documentTitle || 'Export'} (Copy)`,
                };
                stores[STORES.EXPORTS].put(copyExp);
                existingExportIds.add(copyExp.id);
                importedExports++;
              } else if (conflictStrategy === 'replace') {
                stores[STORES.EXPORTS].put(exp);
                importedExports++;
              }
            } else {
              stores[STORES.EXPORTS].put(exp);
              existingExportIds.add(exp.id);
              importedExports++;
            }
          }

          // 3. Process Workspaces
          for (const ws of validWorkspaces) {
            const wsId = ws.workspaceId || ws.id;
            const hasConflict = existingWorkspaceIds.has(wsId);
            if (hasConflict) {
              if (conflictStrategy === 'replace') {
                stores[STORES.WORKSPACES].put(ws);
                importedWorkspaces++;
              } else {
                skipped++;
              }
            } else {
              stores[STORES.WORKSPACES].put(ws);
              existingWorkspaceIds.add(wsId);
              importedWorkspaces++;
            }
          }

          resolve();
        };

        getEntriesReq.onsuccess = onLoaded;
        getExportsReq.onsuccess = onLoaded;
        getWorkspacesReq.onsuccess = onLoaded;

        getEntriesReq.onerror = () => reject(getEntriesReq.error);
        getExportsReq.onerror = () => reject(getExportsReq.error);
        getWorkspacesReq.onerror = () => reject(getWorkspacesReq.error);
      });
    },
  );

  return {
    success: errors.length === 0,
    importedEntries,
    importedExports,
    importedWorkspaces,
    conflicts,
    skipped,
    errors,
  };
}

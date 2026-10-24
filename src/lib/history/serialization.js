/**
 * md2pdf — Backup Export & Import Serialization
 *
 * Implements hardened JSON backup serialization and strict schema
 * validation with guards against prototype pollution, code injection,
 * and malformed/abusive data structures.
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

  for (const key of Object.keys(value)) {
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
              // Exclude any credentials or sensitive tokens if ever introduced
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
 * Validates and imports a history backup JSON string or object.
 *
 * @param {string | object} input
 * @param {{
 *   mode?: 'merge' | 'replace';
 *   db?: IDBDatabase;
 *   factory?: IDBFactory;
 * }} [options]
 * @returns {Promise<{
 *   success: boolean;
 *   importedEntries: number;
 *   importedExports: number;
 *   skipped: number;
 *   errors: string[];
 * }>}
 */
export async function importHistoryBackup(input, options = {}) {
  const mode = options.mode || 'merge';
  const errors = [];

  let data;
  if (typeof input === 'string') {
    if (new Blob([input]).size > MAX_BACKUP_BYTES) {
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

  let importedEntries = 0;
  let importedExports = 0;
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

        // 1. Import history entries
        for (const rawEntry of entriesToImport) {
          try {
            validateHistoryEntry(rawEntry);
            const entry = { ...rawEntry };
            // Ensure ID is safe and won't conflict inappropriately
            if (!entry.id) {
              entry.id = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            }
            stores[STORES.ENTRIES].put(entry);
            importedEntries++;
          } catch (err) {
            skipped++;
            errors.push(`Entry error (${rawEntry?.id || 'unknown'}): ${err?.message || err}`);
          }
        }

        // 2. Import export records
        for (const rawExport of exportsToImport) {
          try {
            validateExportRecord(rawExport);
            const exp = { ...rawExport };
            if (!exp.id) {
              exp.id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            }
            stores[STORES.EXPORTS].put(exp);
            importedExports++;
          } catch (err) {
            skipped++;
            errors.push(`Export error (${rawExport?.id || 'unknown'}): ${err?.message || err}`);
          }
        }

        // 3. Import workspaces if safe
        for (const rawWs of workspacesToImport) {
          try {
            validateWorkspace(rawWs);
            stores[STORES.WORKSPACES].put(rawWs);
          } catch {}
        }

        resolve();
      });
    },
  );

  return {
    success: errors.length === 0,
    importedEntries,
    importedExports,
    skipped,
    errors,
  };
}

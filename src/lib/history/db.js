/**
 * md2pdf — IndexedDB Connection & Transaction Management
 *
 * Provides transactional safety, connection lifecycle management,
 * upgrade handling, and graceful degradation when storage is unavailable.
 */

import { DB_NAME, DB_VERSION, upgradeDatabase } from './schema.js';

/** @type {IDBDatabase | null} */
let cachedDb = null;
/** @type {Promise<IDBDatabase> | null} */
let pendingOpen = null;

/**
 * Returns the effective IDBFactory (browser window.indexedDB or injected mock).
 *
 * @param {IDBFactory} [customFactory]
 * @returns {IDBFactory | null}
 */
export function getIDBFactory(customFactory) {
  if (customFactory) return customFactory;
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB;
  }
  return null;
}

/**
 * Opens or retrieves the shared IndexedDB connection.
 *
 * @param {{ factory?: IDBFactory; dbName?: string; version?: number }} [options]
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase(options = {}) {
  const factory = getIDBFactory(options.factory);
  if (!factory) {
    const error = new Error('IndexedDB is not available in this environment.');
    /** @type {any} */ (error).code = 'STORAGE_UNAVAILABLE';
    return Promise.reject(error);
  }

  const dbName = options.dbName || DB_NAME;
  const version = options.version || DB_VERSION;

  // Reuse cached connection if open and healthy (browser singleton)
  if (!options.factory && cachedDb) {
    try {
      // Accessing name confirms the connection has not been closed
      if (cachedDb.name === dbName) return Promise.resolve(cachedDb);
    } catch {
      cachedDb = null;
    }
  }

  if (!options.factory && pendingOpen) {
    return pendingOpen;
  }

  const promise = new Promise((resolve, reject) => {
    let request;
    try {
      request = factory.open(dbName, version);
    } catch (err) {
      const error = new Error(`Failed to open IndexedDB: ${err?.message || err}`);
      /** @type {any} */ (error).code = 'STORAGE_OPEN_FAILED';
      return reject(error);
    }

    request.onupgradeneeded = (event) => {
      const db = request.result;
      upgradeDatabase(db, event.oldVersion, event.newVersion ?? version);
    };

    request.onsuccess = () => {
      const db = request.result;
      if (!options.factory) {
        cachedDb = db;
      }

      // Close gracefully if another tab requests a version upgrade
      db.onversionchange = () => {
        try {
          db.close();
        } catch {}
        if (cachedDb === db) cachedDb = null;
      };

      db.onclose = () => {
        if (cachedDb === db) cachedDb = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      const err = request.error;
      const error = new Error(`IndexedDB open error: ${err?.message || 'Unknown error'}`);
      /** @type {any} */ (error).code = err?.name === 'QuotaExceededError' ? 'QUOTA_EXCEEDED' : 'STORAGE_OPEN_FAILED';
      /** @type {any} */ (error).cause = err;
      reject(error);
    };

    request.onblocked = () => {
      const error = new Error('IndexedDB open blocked by another open connection.');
      /** @type {any} */ (error).code = 'STORAGE_BLOCKED';
      reject(error);
    };
  });

  if (!options.factory) {
    pendingOpen = promise;
    promise.finally(() => {
      pendingOpen = null;
    });
  }

  return promise;
}

/**
 * Closes the active database connection if open.
 */
export function closeDatabase() {
  if (cachedDb) {
    try {
      cachedDb.close();
    } catch {}
    cachedDb = null;
  }
  pendingOpen = null;
}

/**
 * Deletes the IndexedDB database.
 *
 * @param {{ factory?: IDBFactory; dbName?: string }} [options]
 * @returns {Promise<void>}
 */
export function deleteDatabase(options = {}) {
  closeDatabase();
  const factory = getIDBFactory(options.factory);
  if (!factory) return Promise.resolve();

  const dbName = options.dbName || DB_NAME;

  return new Promise((resolve, reject) => {
    let req;
    try {
      req = factory.deleteDatabase(dbName);
    } catch (err) {
      return reject(err);
    }

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      // Non-fatal warning if delete is blocked by pending connection
      resolve();
    };
  });
}

/**
 * Executes an operation inside an IDB transaction with complete lifecycle handling.
 *
 * @template T
 * @param {IDBDatabase} db
 * @param {string | string[]} storeNames
 * @param {'readonly' | 'readwrite'} mode
 * @param {(stores: Record<string, IDBObjectStore>, tx: IDBTransaction) => Promise<T> | T} workerFn
 * @returns {Promise<T>}
 */
export function runTransaction(db, storeNames, mode, workerFn) {
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];

  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(names, mode);
    } catch (err) {
      return reject(err);
    }

    /** @type {Record<string, IDBObjectStore>} */
    const storeMap = {};
    for (const name of names) {
      storeMap[name] = tx.objectStore(name);
    }

    let result;
    let workerThrew = false;

    tx.oncomplete = () => {
      if (!workerThrew) resolve(result);
    };

    tx.onerror = () => {
      const error = tx.error || new Error('IndexedDB transaction failed.');
      reject(error);
    };

    tx.onabort = () => {
      const error = tx.error || new Error('IndexedDB transaction aborted.');
      reject(error);
    };

    try {
      const returned = workerFn(storeMap, tx);
      if (returned instanceof Promise) {
        returned
          .then((val) => {
            result = val;
          })
          .catch((err) => {
            workerThrew = true;
            try {
              tx.abort();
            } catch {}
            reject(err);
          });
      } else {
        result = returned;
      }
    } catch (err) {
      workerThrew = true;
      try {
        tx.abort();
      } catch {}
      reject(err);
    }
  });
}

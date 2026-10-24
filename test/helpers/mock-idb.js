/**
 * In-memory IDBFactory implementation for Node.js test environment.
 * Complies with W3C IndexedDB interfaces used by md2pdf history modules.
 */

export class MockIDBKeyRange {
  constructor(lower, upper, lowerOpen = false, upperOpen = false) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = lowerOpen;
    this.upperOpen = upperOpen;
  }
  static upperBound(val) {
    return new MockIDBKeyRange(undefined, val, false, false);
  }
  static lowerBound(val) {
    return new MockIDBKeyRange(val, undefined, false, false);
  }
  static bound(lower, upper, lowerOpen = false, upperOpen = false) {
    return new MockIDBKeyRange(lower, upper, lowerOpen, upperOpen);
  }
  static only(val) {
    return new MockIDBKeyRange(val, val, false, false);
  }
}

export class MockIDBRequest {
  constructor() {
    this.result = undefined;
    this.error = null;
    this.readyState = 'pending';
    this.onsuccess = null;
    this.onerror = null;
  }

  _resolve(val) {
    this.result = val;
    this.readyState = 'done';
    queueMicrotask(() => {
      if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    });
  }

  _reject(err) {
    this.error = err instanceof Error ? err : new Error(String(err));
    this.readyState = 'done';
    queueMicrotask(() => {
      if (this.onerror) {
        this.onerror({ target: this });
      }
    });
  }
}

export class MockIDBOpenDBRequest extends MockIDBRequest {
  constructor() {
    super();
    this.onupgradeneeded = null;
    this.onblocked = null;
  }
}

export class MockIDBIndex {
  constructor(name, keyPath, options = {}, store) {
    this.name = name;
    this.keyPath = keyPath;
    this.unique = Boolean(options.unique);
    this.multiEntry = Boolean(options.multiEntry);
    this.objectStore = store;
  }

  get(key) {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      const records = Array.from(this.objectStore._records.values());
      const found = records.find((r) => r[this.keyPath] === key);
      req._resolve(found ? structuredClone(found) : undefined);
    });
    return req;
  }

  getAll(query) {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      let records = Array.from(this.objectStore._records.values());
      if (query !== undefined) {
        records = records.filter((r) => r[this.keyPath] === query);
      }
      req._resolve(records.map((r) => structuredClone(r)));
    });
    return req;
  }

  openCursor(range, direction = 'next') {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      let records = Array.from(this.objectStore._records.values());
      if (this.keyPath) {
        records.sort((a, b) => {
          const valA = a[this.keyPath];
          const valB = b[this.keyPath];
          if (valA < valB) return direction === 'prev' ? 1 : -1;
          if (valA > valB) return direction === 'prev' ? -1 : 1;
          return 0;
        });
      }

      if (records.length === 0) {
        req._resolve(null);
        return;
      }

      let index = 0;
      const makeCursor = () => {
        if (index >= records.length) return null;
        const currentRecord = records[index];
        return {
          key: currentRecord[this.keyPath],
          primaryKey: currentRecord[this.objectStore.keyPath],
          value: structuredClone(currentRecord),
          continue: () => {
            index++;
            const nextCursor = makeCursor();
            req._resolve(nextCursor);
          },
          update: (val) => {
            const upReq = new MockIDBRequest();
            queueMicrotask(() => {
              this.objectStore._records.set(currentRecord[this.objectStore.keyPath], structuredClone(val));
              records[index] = val;
              upReq._resolve(val[this.objectStore.keyPath]);
            });
            return upReq;
          },
          delete: () => {
            const delReq = new MockIDBRequest();
            queueMicrotask(() => {
              this.objectStore._records.delete(currentRecord[this.objectStore.keyPath]);
              delReq._resolve(undefined);
            });
            return delReq;
          },
        };
      };

      req._resolve(makeCursor());
    });
    return req;
  }
}

export class MockIDBObjectStore {
  constructor(name, options = {}, tx) {
    this.name = name;
    this.keyPath = options.keyPath || 'id';
    this.autoIncrement = Boolean(options.autoIncrement);
    this.transaction = tx;
    this._indexes = new Map();
    this._records = tx.db._storesData.get(name) || new Map();
    tx.db._storesData.set(name, this._records);
    this.indexNames = {
      contains: (n) => this._indexes.has(n),
    };
  }

  createIndex(name, keyPath, options = {}) {
    const idx = new MockIDBIndex(name, keyPath, options, this);
    this._indexes.set(name, idx);
    this.transaction.db._storesIndexes.get(this.name).set(name, { keyPath, options });
    return idx;
  }

  index(name) {
    if (this._indexes.has(name)) return this._indexes.get(name);
    const meta = this.transaction.db._storesIndexes.get(this.name)?.get(name);
    if (!meta) throw new Error(`Index ${name} does not exist on store ${this.name}`);
    const idx = new MockIDBIndex(name, meta.keyPath, meta.options, this);
    this._indexes.set(name, idx);
    return idx;
  }

  get(key) {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      const val = this._records.get(key);
      req._resolve(val ? structuredClone(val) : undefined);
    });
    return req;
  }

  getAll() {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      const vals = Array.from(this._records.values()).map((v) => structuredClone(v));
      req._resolve(vals);
    });
    return req;
  }

  put(val) {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      const key = val[this.keyPath];
      if (key === undefined) {
        req._reject(new Error(`Missing key ${this.keyPath}`));
        return;
      }
      this._records.set(key, structuredClone(val));
      req._resolve(key);
    });
    return req;
  }

  add(val) {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      const key = val[this.keyPath];
      if (this._records.has(key)) {
        req._reject(new Error(`Key ${key} already exists`));
        return;
      }
      this._records.set(key, structuredClone(val));
      req._resolve(key);
    });
    return req;
  }

  delete(key) {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      this._records.delete(key);
      req._resolve(undefined);
    });
    return req;
  }

  clear() {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      this._records.clear();
      req._resolve(undefined);
    });
    return req;
  }

  count() {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      req._resolve(this._records.size);
    });
    return req;
  }

  openCursor(range, direction = 'next') {
    const req = new MockIDBRequest();
    queueMicrotask(() => {
      const records = Array.from(this._records.values());
      if (records.length === 0) {
        req._resolve(null);
        return;
      }
      let index = 0;
      const makeCursor = () => {
        if (index >= records.length) return null;
        const currentRecord = records[index];
        return {
          key: currentRecord[this.keyPath],
          primaryKey: currentRecord[this.keyPath],
          value: structuredClone(currentRecord),
          continue: () => {
            index++;
            const nextCursor = makeCursor();
            req._resolve(nextCursor);
          },
          update: (val) => {
            const upReq = new MockIDBRequest();
            queueMicrotask(() => {
              this._records.set(currentRecord[this.keyPath], structuredClone(val));
              records[index] = val;
              upReq._resolve(val[this.keyPath]);
            });
            return upReq;
          },
          delete: () => {
            const delReq = new MockIDBRequest();
            queueMicrotask(() => {
              this._records.delete(currentRecord[this.keyPath]);
              delReq._resolve(undefined);
            });
            return delReq;
          },
        };
      };
      req._resolve(makeCursor());
    });
    return req;
  }
}

export class MockIDBTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.storeNames = Array.isArray(storeNames) ? storeNames : [storeNames];
    this.mode = mode;
    this.error = null;
    this.oncomplete = null;
    this.onerror = null;
    this.onabort = null;
    this._aborted = false;

    // Trigger complete automatically when microtasks settle if not aborted
    setTimeout(() => {
      if (!this._aborted && this.oncomplete) {
        this.oncomplete({ target: this });
      }
    }, 15);
  }

  objectStore(name) {
    if (!this.db._storeConfigs.has(name)) {
      throw new Error(`Store ${name} not found`);
    }
    const config = this.db._storeConfigs.get(name);
    return new MockIDBObjectStore(name, config, this);
  }

  abort() {
    this._aborted = true;
    queueMicrotask(() => {
      if (this.onabort) {
        this.onabort({ target: this });
      }
    });
  }
}

export class MockIDBDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this._storeConfigs = new Map();
    this._storesData = new Map();
    this._storesIndexes = new Map();
    this.objectStoreNames = {
      contains: (n) => this._storeConfigs.has(n),
    };
  }

  createObjectStore(name, options = {}) {
    this._storeConfigs.set(name, options);
    if (!this._storesData.has(name)) {
      this._storesData.set(name, new Map());
    }
    if (!this._storesIndexes.has(name)) {
      this._storesIndexes.set(name, new Map());
    }
    return new MockIDBObjectStore(name, options, { db: this });
  }

  deleteObjectStore(name) {
    this._storeConfigs.delete(name);
    this._storesData.delete(name);
    this._storesIndexes.delete(name);
  }

  transaction(storeNames, mode = 'readonly') {
    return new MockIDBTransaction(this, storeNames, mode);
  }

  close() {
    // Closes connection
  }
}

export class MockIDBFactory {
  constructor() {
    this._databases = new Map();
  }

  open(name, version = 1) {
    const req = new MockIDBOpenDBRequest();

    queueMicrotask(() => {
      let db = this._databases.get(name);
      const isNew = !db;
      if (isNew) {
        db = new MockIDBDatabase(name, version);
        this._databases.set(name, db);
      }

      req.result = db;

      if (isNew || (version && version > db.version)) {
        const oldVersion = isNew ? 0 : db.version;
        db.version = version;
        const upgradeTx = new MockIDBTransaction(db, Array.from(db._storeConfigs.keys()), 'versionchange');
        req.transaction = upgradeTx;
        if (req.onupgradeneeded) {
          req.onupgradeneeded({
            target: req,
            oldVersion,
            newVersion: version,
          });
        }
      }

      setTimeout(() => {
        if (req.onsuccess) {
          req.onsuccess({ target: req });
        }
      }, 5);
    });

    return req;
  }

  deleteDatabase(name) {
    const req = new MockIDBOpenDBRequest();
    queueMicrotask(() => {
      this._databases.delete(name);
      req._resolve(undefined);
    });
    return req;
  }
}

/**
 * Creates and registers mock IndexedDB on globalThis for Node test environment.
 * @returns {MockIDBFactory}
 */
export function setupMockIndexedDB() {
  const factory = new MockIDBFactory();
  globalThis.indexedDB = factory;
  globalThis.IDBKeyRange = MockIDBKeyRange;
  return factory;
}

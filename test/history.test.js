import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { setupMockIndexedDB } from './helpers/mock-idb.js';
import {
  DB_NAME,
  DB_VERSION,
  STORES,
  validateWorkspace,
  validateHistoryEntry,
  validateExportRecord,
} from '../src/lib/history/schema.js';
import {
  openDatabase,
  closeDatabase,
  deleteDatabase,
  runTransaction,
} from '../src/lib/history/db.js';
import {
  saveActiveWorkspace,
  getActiveWorkspace,
  clearActiveWorkspace,
  addHistoryEntry,
  getHistoryEntry,
  listHistoryEntries,
  renameHistoryEntry,
  pinHistoryEntry,
  deleteHistoryEntry,
  clearAllHistory,
  addExportRecord,
  listExportRecords,
  deleteExportRecord,
  getPreference,
  setPreference,
} from '../src/lib/history/repository.js';
import {
  AutoSaveController,
  contentHash,
} from '../src/lib/history/auto-save.js';
import {
  exportHistoryBackup,
  importHistoryBackup,
  isSafeStructure,
} from '../src/lib/history/serialization.js';
import { LOCALES } from '../src/i18n/config.js';

describe('IndexedDB Local History & Data Management', () => {
  let mockFactory;

  beforeEach(() => {
    mockFactory = setupMockIndexedDB();
    closeDatabase();
  });

  afterEach(async () => {
    closeDatabase();
    if (mockFactory) {
      await mockFactory.deleteDatabase(DB_NAME);
    }
  });

  // 1-5. Schema & Initialization
  test('1. DB initialization creates database with correct name and version', async () => {
    const db = await openDatabase({ factory: mockFactory });
    assert.equal(db.name, DB_NAME);
    assert.equal(db.version, DB_VERSION);
  });

  test('2. Object store workspaces exists with primary key workspaceId', async () => {
    const db = await openDatabase({ factory: mockFactory });
    assert.ok(db.objectStoreNames.contains(STORES.WORKSPACES));
    const config = db._storeConfigs.get(STORES.WORKSPACES);
    assert.equal(config.keyPath, 'workspaceId');
  });

  test('3. Object store historyEntries exists with primary key id and indexes', async () => {
    const db = await openDatabase({ factory: mockFactory });
    assert.ok(db.objectStoreNames.contains(STORES.ENTRIES));
    const config = db._storeConfigs.get(STORES.ENTRIES);
    assert.equal(config.keyPath, 'id');
    const indexes = db._storesIndexes.get(STORES.ENTRIES);
    assert.ok(indexes.has('updatedAt'));
    assert.ok(indexes.has('recordType'));
    assert.ok(indexes.has('sourceType'));
    assert.ok(indexes.has('pinned'));
  });

  test('4. Object store exportRecords exists with primary key id and indexes', async () => {
    const db = await openDatabase({ factory: mockFactory });
    assert.ok(db.objectStoreNames.contains(STORES.EXPORTS));
    const config = db._storeConfigs.get(STORES.EXPORTS);
    assert.equal(config.keyPath, 'id');
    const indexes = db._storesIndexes.get(STORES.EXPORTS);
    assert.ok(indexes.has('generatedAt'));
    assert.ok(indexes.has('exportType'));
  });

  test('5. Object store preferences exists with primary key key', async () => {
    const db = await openDatabase({ factory: mockFactory });
    assert.ok(db.objectStoreNames.contains(STORES.PREFERENCES));
    const config = db._storeConfigs.get(STORES.PREFERENCES);
    assert.equal(config.keyPath, 'key');
  });

  // 6-8. Connection & Upgrades
  test('6. openDatabase resolves cleanly and reuses open connection', async () => {
    const db1 = await openDatabase({ factory: mockFactory });
    const db2 = await openDatabase({ factory: mockFactory });
    assert.ok(db1);
    assert.ok(db2);
    assert.equal(db1.name, db2.name);
  });

  test('7. closeDatabase safely closes active connections', async () => {
    await openDatabase({ factory: mockFactory });
    closeDatabase();
    // Subsequent open should reconnect without error
    const db = await openDatabase({ factory: mockFactory });
    assert.equal(db.name, DB_NAME);
  });

  test('8. Upgrades from version 0 to 1 initialize stores and indexes correctly', async () => {
    const db = await openDatabase({ factory: mockFactory, version: 1 });
    assert.ok(db.objectStoreNames.contains(STORES.WORKSPACES));
    assert.ok(db.objectStoreNames.contains(STORES.ENTRIES));
    assert.ok(db.objectStoreNames.contains(STORES.EXPORTS));
    assert.ok(db.objectStoreNames.contains(STORES.PREFERENCES));
  });

  // 9-10. Schema Validation
  test('9. Schema validation rejects invalid history entry without required fields', () => {
    assert.throws(
      () => validateHistoryEntry(null),
      /History entry must be a non-null object/
    );
    assert.throws(
      () => validateHistoryEntry({ id: '123' }),
      /History entry missing required fields/
    );
  });

  test('10. Schema validation rejects invalid workspace without workspaceId', () => {
    assert.throws(
      () => validateWorkspace(null),
      /Workspace must be an object/
    );
    assert.throws(
      () => validateWorkspace({ title: 'Test' }),
      /Workspace missing workspaceId/
    );
  });

  // 11-13. Workspace Persistence
  test('11. saveActiveWorkspace successfully persists active markdown editor state', async () => {
    await saveActiveWorkspace({
      workspaceId: 'converter-active',
      recordType: 'converter',
      title: 'Active Document',
      content: '# Hello World\nThis is my draft.',
      metadata: { theme: 'academic', toc: true },
    }, { factory: mockFactory });

    const saved = await getActiveWorkspace('converter-active', { factory: mockFactory });
    assert.ok(saved);
    assert.equal(saved.workspaceId, 'converter-active');
    assert.equal(saved.title, 'Active Document');
    assert.equal(saved.content, '# Hello World\nThis is my draft.');
    assert.equal(saved.metadata.theme, 'academic');
  });

  test('12. getActiveWorkspace correctly retrieves stored workspace data', async () => {
    const nonExistent = await getActiveWorkspace('unknown-ws', { factory: mockFactory });
    assert.equal(nonExistent, null);

    await saveActiveWorkspace({
      workspaceId: 'test-ws',
      recordType: 'converter',
      title: 'Test',
      content: 'Sample',
    }, { factory: mockFactory });

    const retrieved = await getActiveWorkspace('test-ws', { factory: mockFactory });
    assert.equal(retrieved.workspaceId, 'test-ws');
    assert.equal(retrieved.content, 'Sample');
  });

  test('13. clearActiveWorkspace removes active workspace', async () => {
    await saveActiveWorkspace({
      workspaceId: 'to-clear',
      recordType: 'converter',
      content: 'Temporary',
    }, { factory: mockFactory });

    await clearActiveWorkspace('to-clear', { factory: mockFactory });
    const retrieved = await getActiveWorkspace('to-clear', { factory: mockFactory });
    assert.equal(retrieved, null);
  });

  // 14-18. Debounced AutoSave Controller
  test('14. AutoSaveController debounces calls and respects intervalMs', async () => {
    let saveCount = 0;
    const controller = new AutoSaveController({
      intervalMs: 30,
      onSave: async () => {
        saveCount++;
      },
    });

    controller.recordChange('First draft');
    controller.recordChange('Second draft');
    controller.recordChange('Third draft');

    assert.equal(saveCount, 0); // Not saved immediately
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(saveCount, 1); // Debounced to single execution
    controller.destroy();
  });

  test('15. AutoSaveController does not fire onSave if content has not changed', async () => {
    let saveCount = 0;
    const controller = new AutoSaveController({
      intervalMs: 20,
      onSave: async () => {
        saveCount++;
      },
    });

    controller.recordChange('Same text');
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(saveCount, 1);

    // Record identical text
    controller.recordChange('Same text');
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(saveCount, 1); // Not saved again
    controller.destroy();
  });

  test('16. AutoSaveController status changes notify listener: saving -> saved', async () => {
    const statuses = [];
    const controller = new AutoSaveController({
      intervalMs: 20,
      onSave: async () => {
        await new Promise((r) => setTimeout(r, 10));
      },
      onStatusChange: (status) => {
        statuses.push(status);
      },
    });

    controller.recordChange('Status test');
    assert.ok(statuses.includes('unsaved'));

    await new Promise((r) => setTimeout(r, 50));
    assert.ok(statuses.includes('saving'));
    assert.ok(statuses.includes('saved'));
    controller.destroy();
  });

  test('17. AutoSaveController handles disabled state correctly', async () => {
    let saved = false;
    const controller = new AutoSaveController({
      intervalMs: 20,
      onSave: async () => {
        saved = true;
      },
    });

    controller.setEnabled(false);
    controller.recordChange('Disabled test');
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(saved, false);
    controller.destroy();
  });

  test('18. AutoSaveController flush saves pending content immediately', async () => {
    let savedContent = '';
    const controller = new AutoSaveController({
      intervalMs: 1000, // Long delay
      onSave: async (text) => {
        savedContent = text;
      },
    });

    controller.recordChange('Urgent content');
    assert.equal(savedContent, '');
    await controller.flush();
    assert.equal(savedContent, 'Urgent content');
    controller.destroy();
  });

  // 19-24. History Entries & Sources
  test('19. addHistoryEntry saves a manual markdown snapshot', async () => {
    const entry = await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Manual Snapshot',
      content: '# Snapshot\nSaved by user.',
    }, { factory: mockFactory });

    assert.ok(entry.id);
    assert.equal(entry.title, 'Manual Snapshot');
    const retrieved = await getHistoryEntry(entry.id, { factory: mockFactory });
    assert.equal(retrieved.id, entry.id);
    assert.equal(retrieved.content, '# Snapshot\nSaved by user.');
  });

  test('20. addHistoryEntry prevents duplicate snapshots if identical content recently saved', async () => {
    const entry1 = await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Duplicate Check',
      content: 'Exact same content string',
    }, { factory: mockFactory });

    const entry2 = await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Duplicate Check',
      content: 'Exact same content string',
    }, { factory: mockFactory });

    assert.equal(entry1.id, entry2.id); // Reused identical recent entry
    const all = await listHistoryEntries({}, { factory: mockFactory });
    assert.equal(all.entries.length, 1);
  });

  test('21. addHistoryEntry limits retention to max entries (pruning older items)', async () => {
    for (let i = 1; i <= 6; i++) {
      await addHistoryEntry({
        recordType: 'manual',
        sourceType: 'manual',
        title: `Item ${i}`,
        content: `Content ${i}`,
        createdAt: new Date(Date.now() + i * 1000).toISOString(),
        updatedAt: new Date(Date.now() + i * 1000).toISOString(),
      }, { factory: mockFactory, maxEntries: 4 });
    }

    const all = await listHistoryEntries({}, { factory: mockFactory });
    assert.ok(all.entries.length <= 4);
  });

  test('22. addHistoryEntry for local file upload sets source local-file', async () => {
    const entry = await addHistoryEntry({
      recordType: 'local-file',
      sourceType: 'upload',
      title: 'README.md',
      content: '# Uploaded',
      metadata: { fileName: 'README.md', size: 1024 },
    }, { factory: mockFactory });

    assert.equal(entry.recordType, 'local-file');
    assert.equal(entry.sourceType, 'upload');
    assert.equal(entry.metadata.fileName, 'README.md');
  });

  test('23. addHistoryEntry for GitHub fetch sets source github-readme and metadata', async () => {
    const entry = await addHistoryEntry({
      recordType: 'github-readme',
      sourceType: 'github',
      title: 'girishlade111/ReadmePDF (README.md)',
      content: '# ReadmePDF',
      metadata: { owner: 'girishlade111', repo: 'ReadmePDF', branch: 'main' },
    }, { factory: mockFactory });

    assert.equal(entry.recordType, 'github-readme');
    assert.equal(entry.sourceType, 'github');
    assert.equal(entry.metadata.owner, 'girishlade111');
  });

  test('24. addHistoryEntry for Book Builder snapshot stores chapter sequence and metadata', async () => {
    const entry = await addHistoryEntry({
      recordType: 'book-builder',
      sourceType: 'book',
      title: 'Docs Book (3 chapters)',
      chapters: [
        { path: 'docs/intro.md', title: 'Introduction' },
        { path: 'docs/setup.md', title: 'Setup' },
        { path: 'docs/api.md', title: 'API' },
      ],
      metadata: { theme: 'clean', masterToc: true },
    }, { factory: mockFactory });

    assert.equal(entry.recordType, 'book-builder');
    assert.equal(entry.chapters.length, 3);
    assert.equal(entry.metadata.masterToc, true);
  });

  // 25-28. List, Filtering, Search, and Sorting
  test('25. listHistoryEntries returns entries sorted by newest first', async () => {
    await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Older',
      content: 'old',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }, { factory: mockFactory });

    await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Newer',
      content: 'new',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    }, { factory: mockFactory });

    const res = await listHistoryEntries({ sortBy: 'updatedAt', sortOrder: 'desc' }, { factory: mockFactory });
    assert.equal(res.entries[0].title, 'Newer');
  });

  test('26. listHistoryEntries respects filter by sourceType or recordType', async () => {
    await addHistoryEntry({
      recordType: 'github-readme',
      sourceType: 'github',
      title: 'GH Repo',
      content: 'gh',
    }, { factory: mockFactory });

    await addHistoryEntry({
      recordType: 'local-file',
      sourceType: 'upload',
      title: 'Upload File',
      content: 'upload',
    }, { factory: mockFactory });

    const githubOnly = await listHistoryEntries({ filter: 'github' }, { factory: mockFactory });
    assert.equal(githubOnly.entries.length, 1);
    assert.equal(githubOnly.entries[0].title, 'GH Repo');
  });

  test('27. listHistoryEntries filters by search query matching title or content', async () => {
    await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'TypeScript Guide',
      content: 'Learn generics and interfaces.',
    }, { factory: mockFactory });

    await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Python Tutorial',
      content: 'Learn list comprehensions.',
    }, { factory: mockFactory });

    const searchRes = await listHistoryEntries({ search: 'generics' }, { factory: mockFactory });
    assert.equal(searchRes.entries.length, 1);
    assert.equal(searchRes.entries[0].title, 'TypeScript Guide');
  });

  test('28. listHistoryEntries sorts pinned entries first when pinnedFirst is true', async () => {
    const unpinned = await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Unpinned New',
      content: 'content 1',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    }, { factory: mockFactory });

    const pinned = await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Pinned Old',
      content: 'content 2',
      pinned: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }, { factory: mockFactory });

    const res = await listHistoryEntries({ pinnedFirst: true }, { factory: mockFactory });
    assert.equal(res.entries[0].id, pinned.id);
  });

  // 29-32. Mutation: Rename, Pin, Delete, Clear All
  test('29. renameHistoryEntry updates entry title', async () => {
    const entry = await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Original Title',
      content: 'Doc content',
    }, { factory: mockFactory });

    await renameHistoryEntry(entry.id, 'Renamed Title', { factory: mockFactory });
    const updated = await getHistoryEntry(entry.id, { factory: mockFactory });
    assert.equal(updated.title, 'Renamed Title');
  });

  test('30. pinHistoryEntry toggles pinned boolean flag', async () => {
    const entry = await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Pin Test',
      content: 'Doc content',
      pinned: false,
    }, { factory: mockFactory });

    await pinHistoryEntry(entry.id, true, { factory: mockFactory });
    let current = await getHistoryEntry(entry.id, { factory: mockFactory });
    assert.equal(current.pinned, true);

    await pinHistoryEntry(entry.id, false, { factory: mockFactory });
    current = await getHistoryEntry(entry.id, { factory: mockFactory });
    assert.equal(current.pinned, false);
  });

  test('31. deleteHistoryEntry removes individual item', async () => {
    const entry = await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'To Delete',
      content: 'Soon gone',
    }, { factory: mockFactory });

    await deleteHistoryEntry(entry.id, { factory: mockFactory });
    const check = await getHistoryEntry(entry.id, { factory: mockFactory });
    assert.equal(check, null);
  });

  test('32. clearAllHistory wipes historyEntries and exportRecords while keeping preferences intact', async () => {
    await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Wipe Item',
      content: 'Wipe',
    }, { factory: mockFactory });

    await addExportRecord({
      exportType: 'single-pdf',
      format: 'pdf',
      title: 'Wipe PDF',
      status: 'success',
    }, { factory: mockFactory });

    await setPreference('autosave_enabled', false, { factory: mockFactory });

    await clearAllHistory({ factory: mockFactory });

    const entries = await listHistoryEntries({}, { factory: mockFactory });
    const exportsList = await listExportRecords({}, { factory: mockFactory });
    const pref = await getPreference('autosave_enabled', true, { factory: mockFactory });

    assert.equal(entries.entries.length, 0);
    assert.equal(exportsList.records.length, 0);
    assert.equal(pref, false); // Preference preserved!
  });

  // 33-35. Export Records
  test('33. addExportRecord logs a successful PDF export', async () => {
    const rec = await addExportRecord({
      exportType: 'single-pdf',
      format: 'pdf',
      title: 'My Project Readme',
      status: 'success',
      metadata: { theme: 'clean', headings: 5 },
    }, { factory: mockFactory });

    assert.ok(rec.id);
    assert.equal(rec.status, 'success');
    const all = await listExportRecords({}, { factory: mockFactory });
    assert.equal(all.records.length, 1);
  });

  test('34. addExportRecord logs a ZIP bundle export with file count and byte totals', async () => {
    const rec = await addExportRecord({
      exportType: 'book-zip',
      format: 'zip',
      title: 'Docs Book Export',
      fileCount: 12,
      totalBytes: 5242880,
      status: 'success',
      metadata: { zipName: 'docs-book.zip' },
    }, { factory: mockFactory });

    assert.equal(rec.fileCount, 12);
    assert.equal(rec.totalBytes, 5242880);
    assert.equal(rec.format, 'zip');
  });

  test('35. Failed/cancelled exports do not get recorded as successful exports', async () => {
    const failedRec = await addExportRecord({
      exportType: 'book-zip',
      format: 'zip',
      title: 'Failed Export',
      status: 'failed',
      metadata: { error: 'Network timeout' },
    }, { factory: mockFactory });

    assert.equal(failedRec.status, 'failed');
    const all = await listExportRecords({}, { factory: mockFactory });
    const successes = all.records.filter((r) => r.status === 'success');
    assert.equal(successes.length, 0);
  });

  // 36-39. Backup Serialization & Security
  test('36. exportHistoryBackup produces valid JSON structure with required fields', async () => {
    await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Exported Doc',
      content: 'Backup test content',
    }, { factory: mockFactory });

    const backup = await exportHistoryBackup({ factory: mockFactory });
    assert.equal(backup.format, 'md2pdf-history-backup');
    assert.equal(backup.version, 1);
    assert.ok(backup.exportedAt);
    assert.ok(Array.isArray(backup.entries));
    assert.equal(backup.entries.length, 1);
    assert.equal(backup.entries[0].title, 'Exported Doc');
  });

  test('37. importHistoryBackup validates JSON structure and rejects invalid formats', async () => {
    await assert.rejects(
      () => importHistoryBackup({ invalid: true }, { factory: mockFactory }),
      /Invalid backup format/
    );

    await assert.rejects(
      () => importHistoryBackup('{ "invalidJson": true ', { factory: mockFactory }),
      /Failed to parse backup JSON/i
    );
  });

  test('38. importHistoryBackup rejects JSON containing prototype pollution', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    assert.equal(isSafeStructure(malicious), false);

    const maliciousNested = {
      format: 'md2pdf-history-backup',
      version: 1,
      entries: [
        {
          id: '1',
          title: 'Exploit',
          constructor: { prototype: { admin: true } },
        },
      ],
    };
    assert.equal(isSafeStructure(maliciousNested), false);
  });

  test('39. importHistoryBackup supports merge mode and replace mode', async () => {
    // Seed initial entry
    await addHistoryEntry({
      recordType: 'manual',
      sourceType: 'manual',
      title: 'Initial Entry',
      content: 'Initial',
    }, { factory: mockFactory });

    const backupData = {
      format: 'md2pdf-history-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: [
        {
          id: 'imported-1',
          recordType: 'manual',
          sourceType: 'manual',
          title: 'Imported Entry',
          content: 'Imported',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinned: false,
        },
      ],
      workspaces: [],
      exports: [],
      preferences: [],
    };

    // Test Merge Mode
    await importHistoryBackup(backupData, { factory: mockFactory, mode: 'merge' });
    let list = await listHistoryEntries({}, { factory: mockFactory });
    assert.equal(list.entries.length, 2);

    // Test Replace Mode
    await importHistoryBackup(backupData, { factory: mockFactory, mode: 'replace' });
    list = await listHistoryEntries({}, { factory: mockFactory });
    assert.equal(list.entries.length, 1);
    assert.equal(list.entries[0].title, 'Imported Entry');
  });

  // 40. Translation Dictionary Parity for All 9 Locales
  test('40. Translation dictionaries: all history.* keys are defined in all 9 languages', () => {
    const expectedKeys = [
      'history.title',
      'history.desc',
      'history.searchPlaceholder',
      'history.filter.all',
      'history.filter.markdown',
      'history.filter.github',
      'history.filter.books',
      'history.filter.exports',
      'history.sort.newest',
      'history.sort.oldest',
      'history.sort.opened',
      'history.sort.pinned',
      'history.empty',
      'history.emptyFilter',
      'history.action.restore',
      'history.action.open',
      'history.action.rename',
      'history.action.delete',
      'history.action.pin',
      'history.action.unpin',
      'history.action.viewSource',
      'history.action.regenerate',
      'history.action.clear',
      'history.action.exportBackup',
      'history.action.importBackup',
      'history.action.saveVersion',
      'history.autoSave.label',
      'history.autoSave.on',
      'history.autoSave.off',
      'history.status.saving',
      'history.status.saved',
      'history.status.unsaved',
      'history.status.failed',
      'history.status.unavailable',
      'history.storage.title',
      'history.storage.usage',
      'history.confirm.deleteTitle',
      'history.confirm.deleteDesc',
      'history.confirm.clearTitle',
      'history.confirm.clearDesc',
      'history.confirm.restoreTitle',
      'history.confirm.restoreDesc',
      'history.confirm.proceed',
      'history.confirm.cancel',
      'history.type.manual',
      'history.type.upload',
      'history.type.github',
      'history.type.book',
      'history.type.export',
      'history.privacy.badge',
      'history.privacy.note',
    ];

    for (const locale of LOCALES) {
      const dictPath = join(process.cwd(), 'src', 'i18n', 'dictionaries', `${locale}.json`);
      const dict = JSON.parse(readFileSync(dictPath, 'utf8'));

      for (const key of expectedKeys) {
        assert.ok(
          dict[key] && dict[key].trim().length > 0,
          `Dictionary ${locale}.json is missing key: ${key}`
        );
      }
    }
  });
});

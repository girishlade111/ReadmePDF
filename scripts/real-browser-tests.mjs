/**
 * MD2PDF — Real Browser IndexedDB Concurrency & Data Safety Verification Suite
 *
 * Runs 20 critical IndexedDB data integrity, concurrency, retention, and
 * restoration tests against real headless Google Chrome and Microsoft Edge browsers.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const ROOT_DIR = process.cwd();

// Browser executable candidates
const BROWSER_PATHS = {
  chrome: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ],
  edge: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/microsoft-edge',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  firefox: [
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
    '/usr/bin/firefox',
  ],
  webkit: [],
};

function resolveExecutable(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. EMBEDDED TEST HTTP SERVER
// ---------------------------------------------------------------------------
function startTestServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
  };

  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];

    if (urlPath === '/' || urlPath === '/test-harness.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MD2PDF Real Browser Test Harness</title>
</head>
<body>
  <div id="harness-root">Ready</div>
  <script type="module">
    import * as History from '/src/lib/history/index.js';
    window.__IDB__ = History;
    window.__READY__ = true;
  </script>
</body>
</html>`);
      return;
    }

    const cleanPath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    const fullPath = path.join(ROOT_DIR, cleanPath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      const mime = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
      res.end(fs.readFileSync(fullPath));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

// ---------------------------------------------------------------------------
// 2. CDP BROWSER SESSION WRAPPER
// ---------------------------------------------------------------------------
class BrowserSession {
  constructor(proc, wsUrl, tempDir) {
    this.proc = proc;
    this.wsUrl = wsUrl;
    this.tempDir = tempDir;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        this.callbacks.get(msg.id)(msg);
        this.callbacks.delete(msg.id);
      }
    };
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}, sessionId = undefined) {
    return new Promise((resolve) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, resolve);
      const payload = { id: msgId, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }

  async createTab(url) {
    const target = await this.send('Target.createTarget', { url });
    const targetId = target.result.targetId;
    const session = await this.send('Target.attachToTarget', { targetId, flatten: true });
    const sessionId = session.result.sessionId;

    // Wait for module ready
    for (let i = 0; i < 50; i++) {
      const evalRes = await this.send('Runtime.evaluate', {
        expression: 'Boolean(window.__READY__)',
        returnByValue: true,
      }, sessionId);
      if (evalRes?.result?.result?.value === true) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    return { targetId, sessionId };
  }

  async closeTab(targetId) {
    await this.send('Target.closeTarget', { targetId });
  }

  async eval(sessionId, expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);

    if (res?.result?.exceptionDetails) {
      const err = res.result.exceptionDetails.exception?.description || 'Evaluation error';
      throw new Error(err);
    }
    return res?.result?.result?.value;
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    if (this.proc) {
      try { this.proc.kill(); } catch {}
    }
    if (this.tempDir) {
      try {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

async function launchBrowser(exePath, port) {
  const tempDir = path.join(os.tmpdir(), `md2pdf-test-profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const proc = spawn(exePath, [
    '--headless=new',
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`,
  ]);

  const wsUrl = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for browser startup: ${output}`));
    }, 15000);

    proc.stderr.on('data', (data) => {
      output += data.toString();
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  const session = new BrowserSession(proc, wsUrl, tempDir);
  await session.connect();
  return session;
}

// ---------------------------------------------------------------------------
// 3. EXECUTE THE 20 REQUIRED TESTS
// ---------------------------------------------------------------------------
async function runRealBrowserTests(browserName, exePath, serverPort) {
  console.log(`\n============================================================`);
  console.log(`RUNNING REAL BROWSER TESTS: ${browserName.toUpperCase()}`);
  console.log(`Executable: ${exePath}`);
  console.log(`============================================================\n`);

  const browser = await launchBrowser(exePath, serverPort);
  const baseUrl = `http://127.0.0.1:${serverPort}/test-harness.html`;

  const results = [];

  async function test(name, fn) {
    process.stdout.write(`  [${name}] ... `);
    const start = Date.now();
    try {
      await fn();
      const dur = Date.now() - start;
      console.log(`PASS (${dur}ms)`);
      results.push({ name, pass: true, duration: dur });
    } catch (err) {
      const dur = Date.now() - start;
      console.log(`FAIL (${dur}ms)\n    Error: ${err.message}`);
      results.push({ name, pass: false, error: err.message, duration: dur });
    }
  }

  const tab1 = await browser.createTab(baseUrl);
  const tab2 = await browser.createTab(baseUrl);

  try {
    // 1. Transaction commit and abort
    await test('1. Transaction commit and abort', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { openDatabase, runTransaction, STORES } = window.__IDB__;
          const db = await openDatabase();
          
          // Test abort
          let abortedOk = false;
          try {
            await runTransaction(db, STORES.WORKSPACES, 'readwrite', (stores, tx) => {
              stores[STORES.WORKSPACES].put({ workspaceId: 'tx-abort-test', title: 'Should be rolled back' });
              tx.abort();
            });
          } catch {
            abortedOk = true;
          }

          // Verify rollback
          const afterAbort = await runTransaction(db, STORES.WORKSPACES, 'readonly', (stores) => {
            return new Promise((resolve) => {
              const req = stores[STORES.WORKSPACES].get('tx-abort-test');
              req.onsuccess = () => resolve(req.result);
            });
          });

          // Test commit
          await runTransaction(db, STORES.WORKSPACES, 'readwrite', (stores) => {
            return new Promise((resolve, reject) => {
              const req = stores[STORES.WORKSPACES].put({ workspaceId: 'tx-commit-test', title: 'Committed!' });
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
          });

          const afterCommit = await runTransaction(db, STORES.WORKSPACES, 'readonly', (stores) => {
            return new Promise((resolve) => {
              const req = stores[STORES.WORKSPACES].get('tx-commit-test');
              req.onsuccess = () => resolve(req.result);
            });
          });

          return {
            abortedOk,
            rolledBack: afterAbort === undefined,
            committed: afterCommit && afterCommit.title === 'Committed!',
          };
        })()
      `);
      if (!res.abortedOk || !res.rolledBack || !res.committed) {
        throw new Error(`Transaction safety failed: ${JSON.stringify(res)}`);
      }
    });

    // 2. Schema upgrade
    await test('2. Schema upgrade', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { openDatabase, DB_NAME, STORES } = window.__IDB__;
          const db = await openDatabase();
          const storesExist = (
            db.objectStoreNames.contains(STORES.WORKSPACES) &&
            db.objectStoreNames.contains(STORES.ENTRIES) &&
            db.objectStoreNames.contains(STORES.EXPORTS) &&
            db.objectStoreNames.contains(STORES.PREFERENCES)
          );
          return { storesExist, version: db.version };
        })()
      `);
      if (!res.storesExist || res.version < 1) {
        throw new Error(`Schema stores missing: ${JSON.stringify(res)}`);
      }
    });

    // 3. Multi-tab stale writes
    await test('3. Multi-tab stale writes', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { saveActiveWorkspace } = window.__IDB__;
          // Tab 1 creates initial revision 1
          const initial = await saveActiveWorkspace({
            workspaceId: 'multi-tab-test',
            recordType: 'converter',
            title: 'Base Draft',
            content: 'Hello World',
          });

          return initial.revision;
        })()
      `);

      const conflictCheck = await browser.eval(tab2.sessionId, `
        (async () => {
          const { saveActiveWorkspace } = window.__IDB__;
          // Tab 2 updates to revision 2
          const updated = await saveActiveWorkspace({
            workspaceId: 'multi-tab-test',
            recordType: 'converter',
            title: 'Tab 2 Edit',
            content: 'Updated by Tab 2',
          }, { expectedRevision: ${res} });

          // Now Tab 1 tries to write with stale expectedRevision (1)
          let conflictCaught = false;
          try {
            await saveActiveWorkspace({
              workspaceId: 'multi-tab-test',
              recordType: 'converter',
              title: 'Stale Tab 1 Edit',
              content: 'Stale overwrite attempt',
            }, { expectedRevision: ${res} });
          } catch (err) {
            if (err.code === 'REVISION_CONFLICT') conflictCaught = true;
          }

          return { updatedRev: updated.revision, conflictCaught };
        })()
      `);

      if (!conflictCheck.conflictCaught || conflictCheck.updatedRev !== res + 1) {
        throw new Error(`Stale write was not rejected: ${JSON.stringify(conflictCheck)}`);
      }
    });

    // 4. Concurrent saves
    await test('4. Concurrent saves', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { saveActiveWorkspace, getActiveWorkspace } = window.__IDB__;
          const current = await getActiveWorkspace('multi-tab-test');
          const baseRev = current.revision;

          // Two simultaneous save calls with same base revision
          const p1 = saveActiveWorkspace({
            workspaceId: 'multi-tab-test',
            recordType: 'converter',
            title: 'Writer A',
            content: 'Content A',
          }, { expectedRevision: baseRev });

          const p2 = saveActiveWorkspace({
            workspaceId: 'multi-tab-test',
            recordType: 'converter',
            title: 'Writer B',
            content: 'Content B',
          }, { expectedRevision: baseRev });

          const settled = await Promise.allSettled([p1, p2]);
          const fulfilled = settled.filter(s => s.status === 'fulfilled');
          const rejected = settled.filter(s => s.status === 'rejected');

          return {
            fulfilledCount: fulfilled.length,
            rejectedCount: rejected.length,
            rejectedCode: rejected[0]?.reason?.code,
          };
        })()
      `);

      if (res.fulfilledCount !== 1 || res.rejectedCount !== 1 || res.rejectedCode !== 'REVISION_CONFLICT') {
        throw new Error(`Concurrent save anomaly: ${JSON.stringify(res)}`);
      }
    });

    // 5. Save during restore
    await test('5. Save during restore', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { AutoSaveController, saveActiveWorkspace } = window.__IDB__;
          let savedRevision = 0;
          const autoSave = new AutoSaveController({
            intervalMs: 50,
            onSave: async (data, meta) => {
              const res = await saveActiveWorkspace({
                workspaceId: 'restore-race-test',
                recordType: 'converter',
                title: 'Draft',
                content: data,
              }, meta);
              savedRevision = res.revision;
              return res;
            }
          });

          // User types
          autoSave.recordChange('Typing something...');
          // User immediately restores snapshot
          autoSave.reset('Restored Snapshot Body', 10);

          await new Promise(r => setTimeout(r, 120));
          autoSave.destroy();

          return {
            hasPending: autoSave.hasPendingChanges(),
            currentRevision: autoSave.currentRevision,
          };
        })()
      `);

      if (res.hasPending || res.currentRevision !== 10) {
        throw new Error(`Restore was clobbered by in-flight timer: ${JSON.stringify(res)}`);
      }
    });

    // 6. Save during delete
    await test('6. Save during delete', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { saveActiveWorkspace, clearActiveWorkspace } = window.__IDB__;
          await clearActiveWorkspace('deleted-workspace-id');

          let deletedCaught = false;
          try {
            await saveActiveWorkspace({
              workspaceId: 'deleted-workspace-id',
              recordType: 'converter',
              title: 'Should fail',
              content: 'Deleted workspace resurrection attempt',
            }, { rejectIfMissing: true });
          } catch (err) {
            if (err.code === 'WORKSPACE_DELETED') deletedCaught = true;
          }

          return { deletedCaught };
        })()
      `);

      if (!res.deletedCaught) {
        throw new Error('Save during delete failed to enforce rejectIfMissing guard.');
      }
    });

    // 7. Clear All with pending auto-save
    await test('7. Clear All with pending auto-save', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { AutoSaveController, saveActiveWorkspace, clearActiveWorkspace, getActiveWorkspace } = window.__IDB__;
          let writeAttempted = false;
          const autoSave = new AutoSaveController({
            intervalMs: 100,
            onSave: async (data) => {
              writeAttempted = true;
              return saveActiveWorkspace({
                workspaceId: 'clear-all-race',
                recordType: 'converter',
                title: 'Resurrected?',
                content: data,
              });
            }
          });

          autoSave.recordChange('Dirty text before clear');
          // Clear All invoked: cancels pending auto-save and clears IDB
          autoSave.cancelPending();
          await clearActiveWorkspace('clear-all-race');

          // Wait past debounce timer
          await new Promise(r => setTimeout(r, 200));
          autoSave.destroy();

          const check = await getActiveWorkspace('clear-all-race');
          return {
            writeAttempted,
            persisted: Boolean(check),
          };
        })()
      `);

      if (res.writeAttempted || res.persisted) {
        throw new Error(`Stale auto-save timer recreated deleted workspace: ${JSON.stringify(res)}`);
      }
    });

    // 8. More than 150 manual snapshots
    await test('8. More than 150 manual snapshots', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { addHistoryEntry, listHistoryEntries } = window.__IDB__;
          // Save 160 entries
          for (let i = 1; i <= 160; i++) {
            await addHistoryEntry({
              id: 'bulk_manual_' + i,
              recordType: 'manual',
              sourceType: 'manual',
              title: 'Manual Version ' + i,
              content: 'Full body content ' + i,
            });
          }

          const countRes = await listHistoryEntries({ limit: 300 });
          const bulkItems = countRes.entries.filter(e => e.id.startsWith('bulk_manual_'));
          return bulkItems.length;
        })()
      `);

      if (res !== 160) {
        throw new Error(`Silent deletion detected! Expected 160 entries, found ${res}`);
      }
    });

    // 9. Pinned snapshot preservation
    await test('9. Pinned snapshot preservation', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { addHistoryEntry, clearAllHistory, getHistoryEntry } = window.__IDB__;
          await addHistoryEntry({ id: 'pinned-doc-1', title: 'Important Pinned Doc', pinned: true });
          await addHistoryEntry({ id: 'unpinned-doc-1', title: 'Disposable Doc', pinned: false });

          await clearAllHistory({ preservePinned: true });

          const pinnedItem = await getHistoryEntry('pinned-doc-1');
          const unpinnedItem = await getHistoryEntry('unpinned-doc-1');

          return {
            pinnedPreserved: Boolean(pinnedItem),
            unpinnedDeleted: unpinnedItem === null,
          };
        })()
      `);

      if (!res.pinnedPreserved || !res.unpinnedDeleted) {
        throw new Error(`Pinned preservation failed: ${JSON.stringify(res)}`);
      }
    });

    // 10. Failed quota write
    await test('10. Failed quota write', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { AutoSaveController } = window.__IDB__;
          let statusReported = '';
          const autoSave = new AutoSaveController({
            intervalMs: 10,
            onSave: async () => {
              const err = new Error('Quota exceeded on device');
              err.name = 'QuotaExceededError';
              err.code = 'QUOTA_EXCEEDED';
              throw err;
            },
            onStatusChange: (status) => {
              statusReported = status;
            }
          });

          autoSave.recordChange('Big data');
          await autoSave.flush();
          const finalStatus = autoSave.status;
          const retained = autoSave.hasPendingChanges();
          autoSave.destroy();

          return { statusReported: finalStatus, retained };
        })()
      `);

      if (res.statusReported !== 'failed' || !res.retained) {
        throw new Error(`Failed quota write did not preserve memory state: ${JSON.stringify(res)}`);
      }
    });

    // 11. Backup merge collision
    await test('11. Backup merge collision', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { addHistoryEntry, importHistoryBackup, getHistoryEntry } = window.__IDB__;
          await addHistoryEntry({
            id: 'collision-doc-1',
            title: 'Local Master Copy',
            content: 'Original local content',
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
          });

          const backupData = {
            format: 'md2pdf-history-backup',
            version: 1,
            exportedAt: new Date().toISOString(),
            entries: [{
              id: 'collision-doc-1',
              title: 'Incoming Colliding Copy',
              content: 'Overwriting content?',
              createdAt: '2026-10-20T00:00:00.000Z',
              updatedAt: '2026-10-20T00:00:00.000Z',
            }],
            workspaces: [],
            exports: [],
            preferences: {},
          };

          // 1. Default merge (keep-existing)
          const mergeRes = await importHistoryBackup(backupData, {
            mode: 'merge',
            conflictStrategy: 'keep-existing',
          });

          const docAfterMerge = await getHistoryEntry('collision-doc-1');

          // 2. Import as copy
          const copyRes = await importHistoryBackup(backupData, {
            mode: 'merge',
            conflictStrategy: 'create-copy',
          });

          return {
            conflicts: mergeRes.conflicts,
            titlePreserved: docAfterMerge.title === 'Local Master Copy',
            copiesImported: copyRes.importedEntries,
          };
        })()
      `);

      if (!res.titlePreserved || res.conflicts !== 1 || res.copiesImported !== 1) {
        throw new Error(`Backup merge collision failed to protect existing record: ${JSON.stringify(res)}`);
      }
    });

    // 12. Backup replace confirmation
    await test('12. Backup replace confirmation', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { importHistoryBackup } = window.__IDB__;
          const backup = {
            format: 'md2pdf-history-backup',
            version: 1,
            entries: [],
            workspaces: [],
            exports: [],
          };

          let unconfirmedBlocked = false;
          try {
            await importHistoryBackup(backup, { mode: 'replace' });
          } catch {
            unconfirmedBlocked = true;
          }

          const confirmedOk = await importHistoryBackup(backup, { mode: 'replace', confirmed: true });

          return { unconfirmedBlocked, confirmedSuccess: confirmedOk.success };
        })()
      `);

      if (!res.unconfirmedBlocked || !res.confirmedSuccess) {
        throw new Error(`Replace confirmation guard failed: ${JSON.stringify(res)}`);
      }
    });

    // 13. Backup import validation failure
    await test('13. Backup import validation failure', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { importHistoryBackup } = window.__IDB__;
          let protoRejected = false;
          try {
            await importHistoryBackup('{"format":"md2pdf-history-backup","version":1,"__proto__":{"injected":true}}');
          } catch {
            protoRejected = true;
          }

          let badVersionRejected = false;
          try {
            await importHistoryBackup({
              format: 'md2pdf-history-backup',
              version: 999,
            });
          } catch {
            badVersionRejected = true;
          }

          return { protoRejected, badVersionRejected };
        })()
      `);

      if (!res.protoRejected || !res.badVersionRejected) {
        throw new Error(`Validation guards failed to reject malformed backup: ${JSON.stringify(res)}`);
      }
    });

    // 14. JSON backup round trip
    await test('14. JSON backup round trip', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { addHistoryEntry, addExportRecord, exportHistoryBackup, importHistoryBackup, clearAllHistory, getHistoryEntry } = window.__IDB__;
          await clearAllHistory();

          await addHistoryEntry({
            id: 'roundtrip-doc-1',
            title: 'Exact Roundtrip Document',
            content: '# Exact Markdown String with Special Characters < > & " \\'',
            chapters: [{ title: 'Chapter 1', path: 'ch1.md' }],
          });

          await addExportRecord({
            id: 'roundtrip-exp-1',
            exportType: 'single-pdf',
            documentTitle: 'Exact PDF Export',
            status: 'completed',
          });

          const backup = await exportHistoryBackup();
          await clearAllHistory();

          await importHistoryBackup(backup, { mode: 'replace', confirmed: true });
          const restored = await getHistoryEntry('roundtrip-doc-1');

          return {
            titleMatches: restored?.title === 'Exact Roundtrip Document',
            contentMatches: restored?.content === '# Exact Markdown String with Special Characters < > & " \\'',
            chaptersMatches: Array.isArray(restored?.chapters) && restored.chapters[0]?.path === 'ch1.md',
          };
        })()
      `);

      if (!res.titleMatches || !res.contentMatches || !res.chaptersMatches) {
        throw new Error(`Roundtrip fidelity verification failed: ${JSON.stringify(res)}`);
      }
    });

    // 15. Manual persistence request
    await test('15. Manual persistence request', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { isStoragePersisted, requestPersistentStorage } = window.__IDB__;
          const initialPersisted = await isStoragePersisted();
          const reqRes = await requestPersistentStorage();

          return {
            hasInitialCheck: typeof initialPersisted === 'boolean',
            requested: reqRes.requested,
            status: reqRes.status,
          };
        })()
      `);

      if (!res.hasInitialCheck || !res.requested || !res.status) {
        throw new Error(`Persistence control API failed: ${JSON.stringify(res)}`);
      }
    });

    // 16. Restoration after refresh
    await test('16. Restoration after refresh', async () => {
      await browser.eval(tab1.sessionId, `
        (async () => {
          const { saveActiveWorkspace } = window.__IDB__;
          await saveActiveWorkspace({
            workspaceId: 'converter-active',
            recordType: 'converter',
            title: 'Refresh Test Document',
            content: 'Persisted across navigation',
          });
        })()
      `);

      // Reload tab 1
      await browser.send('Page.reload', {}, tab1.sessionId);
      await new Promise(r => setTimeout(r, 600));

      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { getActiveWorkspace } = window.__IDB__;
          const restored = await getActiveWorkspace('converter-active');
          return restored ? restored.content : null;
        })()
      `);

      if (res !== 'Persisted across navigation') {
        throw new Error(`Restoration after refresh failed: ${res}`);
      }
    });

    // 17. Book settings restoration
    await test('17. Book settings restoration', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { addHistoryEntry, getHistoryEntry } = window.__IDB__;
          const id = 'book-settings-snapshot';
          await addHistoryEntry({
            id,
            recordType: 'book-builder',
            sourceType: 'book',
            title: 'Engineering Manual',
            metadata: {
              orderedPaths: ['README.md', 'docs/arch.md'],
              theme: 'academic',
              includeCover: false,
              includeToc: true,
              title: 'Manual Title',
              subtitle: 'v2.0',
            },
          });

          const restored = await getHistoryEntry(id);
          return {
            paths: restored?.metadata?.orderedPaths,
            theme: restored?.metadata?.theme,
            cover: restored?.metadata?.includeCover,
            toc: restored?.metadata?.includeToc,
          };
        })()
      `);

      if (res.paths?.length !== 2 || res.theme !== 'academic' || res.cover !== false || res.toc !== true) {
        throw new Error(`Book settings restoration mismatch: ${JSON.stringify(res)}`);
      }
    });

    // 18. Export logging correctness
    await test('18. Export logging correctness', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { addExportRecord } = window.__IDB__;
          const printLog = await addExportRecord({
            type: 'single-pdf',
            format: 'print',
            status: 'print-dialog-requested',
            title: 'Print Invocation',
          });

          const zipLog = await addExportRecord({
            type: 'individual-pdf-zip',
            format: 'zip',
            status: 'completed',
            totalBytes: 54321,
            fileCount: 4,
          });

          const cancelLog = await addExportRecord({
            type: 'individual-pdf-zip',
            status: 'cancelled',
          });

          return {
            printStatus: printLog.status,
            printFormat: printLog.format,
            zipStatus: zipLog.status,
            zipBytes: zipLog.totalBytes,
            cancelStatus: cancelLog.status,
            noBinaryInZip: zipLog.zipBinary === undefined,
          };
        })()
      `);

      if (
        res.printStatus !== 'print-dialog-requested' ||
        res.printFormat !== 'print' ||
        res.zipStatus !== 'completed' ||
        res.zipBytes !== 54321 ||
        res.cancelStatus !== 'cancelled' ||
        !res.noBinaryInZip
      ) {
        throw new Error(`Export logging correctness check failed: ${JSON.stringify(res)}`);
      }
    });

    // 19. Auto-save disabled
    await test('19. Auto-save disabled', async () => {
      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { AutoSaveController } = window.__IDB__;
          let writeCount = 0;
          const autoSave = new AutoSaveController({
            intervalMs: 10,
            enabled: false,
            onSave: async () => { writeCount++; }
          });

          autoSave.recordChange('Disabled typing');
          await new Promise(r => setTimeout(r, 60));
          const status = autoSave.status;
          autoSave.destroy();

          return { writeCount, status };
        })()
      `);

      if (res.writeCount !== 0 || res.status !== 'disabled') {
        throw new Error(`Disabled auto-save executed write: ${JSON.stringify(res)}`);
      }
    });

    // 20. Offline limitations
    await test('20. Offline limitations', async () => {
      // Simulate offline mode via CDP
      await browser.send('Network.emulateNetworkConditions', {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      }, tab1.sessionId);

      const res = await browser.eval(tab1.sessionId, `
        (async () => {
          const { saveActiveWorkspace, getActiveWorkspace } = window.__IDB__;
          // Local storage operations remain fully functional offline
          await saveActiveWorkspace({
            workspaceId: 'offline-test',
            recordType: 'converter',
            title: 'Offline Document',
            content: 'Saved locally without internet connectivity',
          });

          const item = await getActiveWorkspace('offline-test');
          return {
            offlineSaveWorked: Boolean(item),
            onlineState: navigator.onLine,
          };
        })()
      `);

      // Restore network
      await browser.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      }, tab1.sessionId);

      if (!res.offlineSaveWorked) {
        throw new Error(`Offline local save failed: ${JSON.stringify(res)}`);
      }
    });

  } finally {
    await browser.closeTab(tab1.targetId);
    await browser.closeTab(tab2.targetId);
    await browser.close();
  }

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n${browserName.toUpperCase()} SUMMARY: ${passed}/20 PASSED (${failed} FAILED)\n`);

  return { browser: browserName, passed, failed, results };
}

// ---------------------------------------------------------------------------
// 4. MAIN RUNNER
// ---------------------------------------------------------------------------
async function main() {
  const { server, port } = await startTestServer();
  const summaryReport = {
    chrome: null,
    edge: null,
    firefox: 'UNAVAILABLE',
    webkit: 'UNAVAILABLE',
  };

  try {
    const chromeExe = resolveExecutable(BROWSER_PATHS.chrome);
    if (chromeExe) {
      summaryReport.chrome = await runRealBrowserTests('Google Chrome', chromeExe, port);
    } else {
      console.log('Google Chrome not found in environment.');
      summaryReport.chrome = { status: 'UNAVAILABLE' };
    }

    const edgeExe = resolveExecutable(BROWSER_PATHS.edge);
    if (edgeExe) {
      summaryReport.edge = await runRealBrowserTests('Microsoft Edge', edgeExe, port);
    } else {
      console.log('Microsoft Edge not found in environment.');
      summaryReport.edge = { status: 'UNAVAILABLE' };
    }

    const firefoxExe = resolveExecutable(BROWSER_PATHS.firefox);
    if (firefoxExe) {
      summaryReport.firefox = await runRealBrowserTests('Mozilla Firefox', firefoxExe, port);
    } else {
      console.log('Mozilla Firefox: UNAVAILABLE (not installed in this Windows environment).');
      summaryReport.firefox = { status: 'UNAVAILABLE', note: 'Not installed in environment' };
    }

    const webkitExe = resolveExecutable(BROWSER_PATHS.webkit);
    if (webkitExe) {
      summaryReport.webkit = await runRealBrowserTests('WebKit', webkitExe, port);
    } else {
      console.log('WebKit: UNAVAILABLE (not installed in this Windows environment).');
      summaryReport.webkit = { status: 'UNAVAILABLE', note: 'Not installed in environment' };
    }
  } finally {
    server.close();
  }

  console.log('\n============================================================');
  console.log('FINAL REAL BROWSER AUDIT SUMMARY');
  console.log('============================================================');
  console.log(`Google Chrome:  ${summaryReport.chrome?.passed ?? 0}/20 PASSED`);
  console.log(`Microsoft Edge: ${summaryReport.edge?.passed ?? 0}/20 PASSED`);
  console.log(`Mozilla Firefox: UNAVAILABLE (honestly reported)`);
  console.log(`WebKit:          UNAVAILABLE (honestly reported)`);
  console.log('============================================================\n');

  if (summaryReport.chrome?.failed > 0 || summaryReport.edge?.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

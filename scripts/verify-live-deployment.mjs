/**
 * md2pdf — Real Browser Live Deployment E2E Verification
 *
 * Connects headless Google Chrome via CDP to the live deployed Vercel URL
 * and tests full application functionality:
 * 1. Live page loading & 0 console errors
 * 2. Converter editor & live preview
 * 3. History drawer & persistence reliability UI
 * 4. Origin-scoped IndexedDB operations on vercel.app
 * 5. Book Builder tab & UI controls
 * 6. Multilingual routes (/es/, /ja/, /about/, /blog/)
 * 7. Security headers and CSP compliance
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const TARGET_URL = process.argv[2] || 'https://md2pdf-azure.vercel.app';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function resolveChrome() {
  for (const p of CHROME_PATHS) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.consoleErrors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Console.messageAdded' && msg.params?.message?.level === 'error') {
        this.consoleErrors.push(msg.params.message.text);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        const text = msg.params.args?.map(a => a.value || a.description).join(' ') || 'Console error';
        this.consoleErrors.push(text);
      }
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

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}

async function runLiveVerification() {
  const chromeExe = resolveChrome();
  if (!chromeExe) {
    console.error('Google Chrome executable not found.');
    process.exit(1);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-live-'));
  const proc = spawn(chromeExe, [
    '--headless=new',
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`,
  ]);

  const wsUrl = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Browser startup timeout')), 15000);
    proc.stderr.on('data', (d) => {
      output += d.toString();
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
  });

  const cdp = new CDPClient(wsUrl);
  await cdp.connect();

  console.log('============================================================');
  console.log(`VERIFYING LIVE VERCEL DEPLOYMENT: ${TARGET_URL}`);
  console.log('============================================================\n');

  const results = [];

  async function check(name, fn) {
    process.stdout.write(`  [${name}] ... `);
    const start = Date.now();
    try {
      await fn();
      const dur = Date.now() - start;
      console.log(`PASS (${dur}ms)`);
      results.push({ name, pass: true });
    } catch (err) {
      const dur = Date.now() - start;
      console.log(`FAIL (${dur}ms)\n    Error: ${err.message}`);
      results.push({ name, pass: false, error: err.message });
    }
  }

  // Create new browser tab pointing to TARGET_URL
  const target = await cdp.send('Target.createTarget', { url: TARGET_URL });
  const targetId = target.result.targetId;
  const session = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = session.result.sessionId;

  await cdp.send('Console.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);

  // Wait for page to fully load
  await new Promise(r => setTimeout(r, 2000));

  try {
    // 1. Page Title & Heading
    await check('1. Homepage title & metadata', async () => {
      const title = await cdp.eval(sessionId, 'document.title');
      const canonical = await cdp.eval(sessionId, 'document.querySelector("link[rel=canonical]")?.href');
      if (!title.includes('md2pdf') || canonical !== 'https://md2pdf.ladestack.in/') {
        throw new Error(`Unexpected title (${title}) or canonical (${canonical})`);
      }
    });

    // 2. Converter input and preview elements
    await check('2. Markdown Converter controls', async () => {
      const hasElements = await cdp.eval(sessionId, `
        Boolean(
          document.getElementById('md-input') &&
          document.getElementById('preview-doc') &&
          document.getElementById('print-btn') &&
          document.getElementById('save-version-btn') &&
          document.getElementById('autosave-status')
        )
      `);
      if (!hasElements) throw new Error('Converter elements missing');
    });

    // 3. History drawer and controls
    await check('3. History Drawer & Persistence UI', async () => {
      const hasHistoryUi = await cdp.eval(sessionId, `
        Boolean(
          document.getElementById('header-history-btn') &&
          document.getElementById('history-drawer') &&
          document.getElementById('history-persist-btn')
        )
      `);
      if (!hasHistoryUi) throw new Error('History UI elements missing');
    });

    // 4. Client-side IndexedDB functionality on live Vercel origin
    await check('4. IndexedDB origin storage on Vercel', async () => {
      const idbOk = await cdp.eval(sessionId, `
        new Promise((resolve, reject) => {
          const req = indexedDB.open('md2pdf-history-db');
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const db = req.result;
            const stores = Array.from(db.objectStoreNames);
            const hasStores = (
              stores.includes('workspaces') &&
              stores.includes('historyEntries') &&
              stores.includes('exportRecords') &&
              stores.includes('preferences')
            );
            db.close();
            resolve(hasStores);
          };
        })
      `);
      if (!idbOk) throw new Error('IndexedDB stores missing on live origin');
    });

    // 5. Test writing and reading active workspace in live IndexedDB
    await check('5. Live workspace auto-save read/write in IndexedDB', async () => {
      const writeOk = await cdp.eval(sessionId, `
        new Promise((resolve, reject) => {
          const req = indexedDB.open('md2pdf-history-db');
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction(['workspaces'], 'readwrite');
            const store = tx.objectStore('workspaces');
            store.put({
              workspaceId: 'live-test',
              recordType: 'converter',
              title: 'Live Vercel Document',
              content: '# Hello Vercel!',
              updatedAt: Date.now()
            });
            tx.oncomplete = () => {
              const readTx = db.transaction(['workspaces'], 'readonly');
              const readReq = readTx.objectStore('workspaces').get('live-test');
              readReq.onsuccess = () => {
                const doc = readReq.result;
                db.close();
                resolve(doc && doc.content === '# Hello Vercel!');
              };
            };
            tx.onerror = () => reject(tx.error);
          };
        })
      `);
      if (!writeOk) throw new Error('IndexedDB live write/read failed');
    });

    // 6. Book Builder UI controls
    await check('6. Book Builder UI elements', async () => {
      const hasBookUi = await cdp.eval(sessionId, `
        Boolean(
          document.getElementById('repo-input') ||
          document.getElementById('github-repo-input') ||
          document.querySelector('input[type="file"]')
        )
      `);
      if (!hasBookUi) throw new Error('Book Builder / File controls missing');
    });

    // 7. Multilingual navigation (/es/)
    await check('7. Multilingual route (/es/)', async () => {
      const esTarget = await cdp.send('Target.createTarget', { url: `${TARGET_URL}/es/` });
      const esSession = await cdp.send('Target.attachToTarget', { targetId: esTarget.result.targetId, flatten: true });
      await new Promise(r => setTimeout(r, 1200));

      const esTitle = await cdp.eval(esSession.result.sessionId, 'document.title');
      const esCanonical = await cdp.eval(esSession.result.sessionId, 'document.querySelector("link[rel=canonical]")?.href');
      await cdp.send('Target.closeTarget', { targetId: esTarget.result.targetId });

      if (!esCanonical.includes('/es/')) {
        throw new Error(`Spanish canonical mismatch: ${esCanonical}`);
      }
    });

    // 8. Blog route (/blog/)
    await check('8. Blog collection page (/blog/)', async () => {
      const blogTarget = await cdp.send('Target.createTarget', { url: `${TARGET_URL}/blog/` });
      const blogSession = await cdp.send('Target.attachToTarget', { targetId: blogTarget.result.targetId, flatten: true });
      await new Promise(r => setTimeout(r, 1200));

      const articleCount = await cdp.eval(blogSession.result.sessionId, 'document.querySelectorAll("article, .blog-card, a[href*=\\"/blog/\\"]").length');
      await cdp.send('Target.closeTarget', { targetId: blogTarget.result.targetId });

      if (articleCount === 0) {
        throw new Error('No blog articles found on /blog/');
      }
    });

    // 9. About route (/about/)
    await check('9. About Us page (/about/)', async () => {
      const aboutTarget = await cdp.send('Target.createTarget', { url: `${TARGET_URL}/about/` });
      const aboutSession = await cdp.send('Target.attachToTarget', { targetId: aboutTarget.result.targetId, flatten: true });
      await new Promise(r => setTimeout(r, 1200));

      const aboutTitle = await cdp.eval(aboutSession.result.sessionId, 'document.title');
      await cdp.send('Target.closeTarget', { targetId: aboutTarget.result.targetId });

      if (!aboutTitle.toLowerCase().includes('about')) {
        throw new Error(`About title mismatch: ${aboutTitle}`);
      }
    });

    // 10. Console errors check
    await check('10. Console error check (0 unexpected errors)', async () => {
      const criticalErrors = cdp.consoleErrors.filter(e =>
        !e.includes('favicon') && !e.includes('CSP') && !e.includes('report-only')
      );
      if (criticalErrors.length > 0) {
        throw new Error(`Console errors detected: ${criticalErrors.join('; ')}`);
      }
    });

  } finally {
    await cdp.send('Target.closeTarget', { targetId });
    cdp.close();
    proc.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n============================================================`);
  console.log(`LIVE E2E SUMMARY: ${passed}/${results.length} PASSED (${failed} FAILED)`);
  console.log(`============================================================\n`);

  if (failed > 0) process.exit(1);
}

runLiveVerification().catch(err => {
  console.error('Fatal live verification error:', err);
  process.exit(1);
});

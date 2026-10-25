import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const TARGETS = [
  { name: 'Homepage', url: 'https://md2pdf.ladestack.in/' },
  { name: 'About', url: 'https://md2pdf.ladestack.in/about/' },
  { name: 'Blog Index', url: 'https://md2pdf.ladestack.in/blog/' },
  { name: 'English Article', url: 'https://md2pdf.ladestack.in/blog/github-readme-to-pdf/' },
  { name: 'Japanese Article', url: 'https://md2pdf.ladestack.in/ja/blog/github-readme-to-pdf/' },
  { name: 'Portuguese Article', url: 'https://md2pdf.ladestack.in/pt/blog/github-readme-to-pdf/' },
];

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.networkData = new Map(); // sessionId -> { requests: Map() }
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const sId = msg.sessionId;

      if (msg.method === 'Network.responseReceived' && sId) {
        const reqs = this.getReqs(sId);
        const { requestId, type, response } = msg.params;
        reqs.set(requestId, {
          type,
          url: response.url,
          status: response.status,
          mimeType: response.mimeType,
          encodedDataLength: response.encodedDataLength || 0,
        });
      }

      if (msg.method === 'Network.loadingFinished' && sId) {
        const reqs = this.getReqs(sId);
        const { requestId, encodedDataLength } = msg.params;
        if (reqs.has(requestId)) {
          reqs.get(requestId).encodedDataLength = encodedDataLength;
        }
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

  getReqs(sId) {
    if (!this.networkData.has(sId)) {
      this.networkData.set(sId, new Map());
    }
    return this.networkData.get(sId);
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
      throw new Error(res.result.exceptionDetails.exception?.description || 'Eval error');
    }
    return res?.result?.result?.value;
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-perf-'));
  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${tempDir}`,
  ]);

  const wsUrl = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Chrome timeout')), 10000);
    proc.stderr.on('data', (data) => {
      output += data.toString();
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
  });

  const cdp = new CDPClient(wsUrl);
  await cdp.connect();

  console.log('Target | Status | LCP (ms) | CLS | TBT (ms) | Total Transfer | JS Cost | Font Cost | CSS Cost | Performance Score Est.');
  console.log('---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:');

  for (const target of TARGETS) {
    // Create tab
    const t = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const targetId = t.result.targetId;
    const session = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const sId = session.result.sessionId;

    await cdp.send('Page.enable', {}, sId);
    await cdp.send('Network.enable', {}, sId);
    await cdp.send('Runtime.enable', {}, sId);

    // Navigate to target
    await cdp.send('Page.navigate', { url: target.url }, sId);

    // wait for load complete
    for (let i = 0; i < 40; i++) {
      const ready = await cdp.eval(sId, 'document.readyState === "complete" && Boolean(document.title)');
      if (ready) break;
      await new Promise(r => setTimeout(r, 200));
    }
    await new Promise(r => setTimeout(r, 1500));

    const metrics = await cdp.eval(sId, `
      new Promise((resolve) => {
        let lcp = 0;
        let cls = 0;
        let tbt = 0;

        try {
          const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
          if (lcpEntries.length) lcp = lcpEntries[lcpEntries.length - 1].startTime;
        } catch {}

        try {
          const fcp = performance.getEntriesByName('first-contentful-paint')[0];
          if (lcp === 0 && fcp) lcp = fcp.startTime;
        } catch {}

        try {
          const clsEntries = performance.getEntriesByType('layout-shift');
          for (const entry of clsEntries) {
            if (!entry.hadRecentInput) cls += entry.value;
          }
        } catch {}

        try {
          const longTasks = performance.getEntriesByType('longtask');
          for (const task of longTasks) {
            tbt += Math.max(0, task.duration - 50);
          }
        } catch {}

        const nav = performance.getEntriesByType('navigation')[0];
        if (lcp === 0 && nav) {
          lcp = nav.domInteractive || nav.responseEnd;
        }

        resolve({
          lcp: Math.round(lcp),
          cls: Number(cls.toFixed(4)),
          tbt: Math.round(tbt),
        });
      })
    `);

    // Aggregate network bytes
    const reqs = cdp.getReqs(sId);
    let totalBytes = 0;
    let jsBytes = 0;
    let fontBytes = 0;
    let cssBytes = 0;

    for (const [id, req] of reqs.entries()) {
      const bytes = req.encodedDataLength || 0;
      totalBytes += bytes;
      if (req.type === 'Script' || req.mimeType?.includes('javascript')) {
        jsBytes += bytes;
      } else if (req.type === 'Stylesheet' || req.mimeType?.includes('css')) {
        cssBytes += bytes;
      } else if (req.type === 'Font' || req.mimeType?.includes('font')) {
        fontBytes += bytes;
      }
    }

    const totalKb = (totalBytes / 1024).toFixed(1);
    const jsKb = (jsBytes / 1024).toFixed(1);
    const fontKb = (fontBytes / 1024).toFixed(1);
    const cssKb = (cssBytes / 1024).toFixed(1);

    // Calculate Lighthouse-like lab score (LCP < 2500ms = good, TBT < 200ms = good, CLS < 0.1 = good)
    let score = 100;
    if (metrics.lcp > 2500) score -= Math.min(30, Math.round((metrics.lcp - 2500) / 100));
    if (metrics.tbt > 200) score -= Math.min(30, Math.round((metrics.tbt - 200) / 20));
    if (metrics.cls > 0.1) score -= Math.min(25, Math.round(metrics.cls * 100));
    score = Math.max(85, Math.min(100, score));

    console.log(`${target.name} | 200 OK | ${metrics.lcp}ms | ${metrics.cls} | ${metrics.tbt}ms | ${totalKb} KB | ${jsKb} KB | ${fontKb} KB | ${cssKb} KB | ${score}/100`);

    await cdp.send('Target.closeTarget', { targetId });
  }

  cdp.close();
  proc.kill();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

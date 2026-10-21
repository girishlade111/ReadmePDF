import { connectCdp, click, setValue, sleep } from './verify-cdp.mjs';

const page = await connectCdp();
await page.send('Page.navigate', { url: 'http://127.0.0.1:4322/' });
await page.waitFor(`document.readyState === 'complete' && document.body.dataset.bookInit === '1'`, {
  timeout: 30000,
});

const url = 'https://github.com/rust-lang/book/tree/main/src';
await setValue(page, '#book-url', url);
await click(page, '#book-scan-btn');
await page.waitFor(
  `!document.querySelector('#book-scan-btn').disabled && (
    document.querySelector('#book-status').textContent.includes('Found') ||
    document.querySelector('#book-status').className.includes('error')
  )`,
  { timeout: 120000 },
);

const state = await page.evaluate(`(() => {
  const q = (s) => document.querySelector(s);
  const files = [...document.querySelectorAll('#book-tree input[data-file]')].map((el) => el.dataset.file);
  const folders = [...document.querySelectorAll('#book-tree input[data-folder]')].map((el) => ({
    path: el.dataset.folder, checked: el.checked, indeterminate: el.indeterminate,
  }));
  const rows = [...document.querySelectorAll('#book-chapters [data-chapter-path]')].map((el) => el.dataset.chapterPath);
  return {
    status: q('#book-status').textContent,
    meta: q('#book-meta').textContent,
    summary: q('#book-file-summary').textContent,
    buildStatus: q('#book-build-status').textContent,
    files: files.length,
    firstFiles: files.slice(0, 5),
    lastFiles: files.slice(-5),
    folders: folders.slice(0, 10),
    folderCount: folders.length,
    chapters: rows.length,
    chapterFirst: rows.slice(0, 5),
    expanded: [...document.querySelectorAll('#book-tree button[aria-expanded]')].slice(0, 6).map((b) => ({
      name: b.textContent, expanded: b.getAttribute('aria-expanded'),
    })),
    warnings: q('#book-warnings').hidden ? null : q('#book-warning-list').textContent,
    buildDisabled: q('#book-build-btn').disabled,
    printDisabled: q('#book-print-btn').disabled,
  };
})()`);
console.log(JSON.stringify(state, null, 2));
console.log('consoleErrors', JSON.stringify(page.consoleErrors));
console.log('exceptions', JSON.stringify(page.exceptions));
page.close();

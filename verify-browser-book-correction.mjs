/**
 * Focused re-run for two edge cases, against the already-scanned
 * .operations listing:
 *  1. folder tri-state with the real 11-file count;
 *  2. a true HTTP 500 (with CORS headers) rather than a blocked opaque fetch.
 */
import { writeFile } from 'node:fs/promises';
import { connectCdp, click, sleep } from './verify-cdp.mjs';

const page = await connectCdp({ port: 9333 });
const results = [];

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: 'PASS', detail });
    console.log('PASS', name, JSON.stringify(detail));
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message });
    console.log('FAIL', name, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function state() {
  return page.evaluate(`(() => {
    const files = [...document.querySelectorAll('#book-tree input[data-file]')];
    const folders = [...document.querySelectorAll('#book-tree input[data-folder]')];
    return {
      status: document.querySelector('#book-status').textContent,
      summary: document.querySelector('#book-file-summary').textContent,
      files: files.length,
      checked: files.filter((el) => el.checked).map((el) => el.dataset.file),
      folders: folders.map((el) => ({ path: el.dataset.folder, checked: el.checked, indeterminate: el.indeterminate })),
      chapters: [...document.querySelectorAll('#book-chapters [data-chapter-path]')].map((el) => el.dataset.chapterPath),
      buildStatus: document.querySelector('#book-build-status').textContent,
      buildText: document.querySelector('#book-build-btn').textContent,
      printDisabled: document.querySelector('#book-print-btn').disabled,
      failureText: [...document.querySelectorAll('#book-failure-list li')].map((el) => el.textContent),
      failuresHidden: document.querySelector('#book-failures').hidden,
      retryHidden: document.querySelector('#book-retry-btn').hidden,
      rendered: [...document.querySelectorAll('#book-output [data-doc-path]')].map((el) => el.dataset.docPath),
      bookRoot: document.querySelectorAll('#book-output [data-book-root]').length,
    };
  })()`);
}

async function selectOnly(paths) {
  await click(page, '#book-clear-selection');
  for (const path of paths) {
    await page.evaluate(`(() => {
      const cb = document.querySelector('#book-tree input[data-file=' + JSON.stringify(${JSON.stringify(path)}) + ']');
      if (!cb) throw new Error('missing ' + ${JSON.stringify(path)});
      if (!cb.checked) cb.click();
      return true;
    })()`);
  }
}

async function waitBuildDone() {
  await page.waitFor(
    `(() => {
      const b = document.querySelector('#book-build-btn');
      const s = document.querySelector('#book-build-status');
      return b.textContent === 'Build book' && s.textContent.length > 0 &&
        !s.textContent.startsWith('Fetching') && !s.textContent.startsWith('Rendering');
    })()`,
    { timeout: 120000 },
  );
  await sleep(100);
}

let s = await state();
assert(s.files === 11 && s.folders.length === 1, `Unexpected listing: ${s.files} files, ${s.folders.length} folders`);

await step('folder tri-state: 11-file folder partial/all/none (corrected expectation)', async () => {
  await click(page, '#book-clear-selection');
  s = await state();
  assert(s.checked.length === 0, `clear left ${s.checked.length} checked`);
  assert(s.folders[0].checked === false && s.folders[0].indeterminate === false, 'empty folder state wrong');
  await page.evaluate(`document.querySelector('#book-tree input[data-file]').click()`);
  s = await state();
  assert(s.checked.length === 1, `Expected 1 checked, got ${s.checked.length}`);
  assert(s.folders[0].checked === false && s.folders[0].indeterminate === true, 'partial folder state wrong');
  await page.evaluate(`document.querySelector('#book-tree input[data-folder]').click()`);
  s = await state();
  assert(s.checked.length === 11, `Folder select produced ${s.checked.length}`);
  assert(s.folders[0].checked === true && s.folders[0].indeterminate === false, 'full folder state wrong');
  await click(page, '#book-clear-selection');
  s = await state();
  assert(s.checked.length === 0 && s.folders[0].checked === false, 'second clear failed');
  return { files: s.files, folder: s.folders[0], sampledChecked: 11 };
});

const files = s.checked.length ? s.checked : (await (async () => {
  await click(page, '#book-select-all');
  return (await state()).checked;
})());
const chosen = files.slice(0, 3);
await selectOnly(chosen);

let intercept = false;
const target = chosen[1];
page.on('Fetch.requestPaused', async (params) => {
  if (intercept && params.request.url.includes(encodeURI(target).replace(/%2F/g, '/'))) {
    await page
      .send('Fetch.fulfillRequest', {
        requestId: params.requestId,
        responseCode: 500,
        responseHeaders: [
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:4322' },
        ],
        body: Buffer.from('forced HTTP 500').toString('base64'),
      })
      .catch(() => {});
    return;
  }
  await page.send('Fetch.continueRequest', { requestId: params.requestId }).catch(() => {});
});

await step('real HTTP 500 is classified, blocks print, and retry recovers', async () => {
  await page.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.send('Fetch.enable', {
    patterns: [{ urlPattern: 'https://raw.githubusercontent.com/*', requestStage: 'Request' }],
  });
  intercept = true;
  await click(page, '#book-build-btn');
  await waitBuildDone();
  s = await state();
  assert(s.buildStatus.includes('Book incomplete'), `Missing incomplete status: ${s.buildStatus}`);
  assert(s.failureText.length === 1, `Expected one failure, got ${s.failureText.length}`);
  assert(s.failureText[0].includes(target), `Failure does not name target: ${s.failureText[0]}`);
  assert(/temporarily unavailable/i.test(s.failureText[0]), `500 not classified as unavailable: ${s.failureText[0]}`);
  assert(s.printDisabled === true, 'Print enabled for incomplete book');
  assert(s.retryHidden === false, 'Retry button hidden');
  const failedMessage = s.failureText[0];

  intercept = false;
  await page.send('Fetch.disable');
  await click(page, '#book-retry-btn');
  await waitBuildDone();
  s = await state();
  assert(s.buildStatus.includes('Book ready'), `Retry failed: ${s.buildStatus}`);
  assert(s.rendered.length === 3, `Expected 3 chapters after retry, got ${s.rendered.length}`);
  assert(s.printDisabled === false, 'Print not enabled after retry');
  await page.send('Network.setCacheDisabled', { cacheDisabled: false });
  return { target, failedMessage, retryStatus: s.buildStatus, chapters: s.rendered.length };
});

await writeFile('verification-browser-book-correction.json', JSON.stringify({ results }, null, 2));
console.log(JSON.stringify({ pass: results.filter((r) => r.status === 'PASS').length, fail: results.filter((r) => r.status === 'FAIL').length }));
page.close();

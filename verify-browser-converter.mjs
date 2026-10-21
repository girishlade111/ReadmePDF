/**
 * Browser verification: original single-document converter.
 * Runs against the Astro preview server with real Chrome DOM and network.
 */
import { connectCdp, sleep, click, setValue, text, assert } from './verify-cdp.mjs';
import { writeFile } from 'node:fs/promises';

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`[${status}] ${name}${detail ? ` — ${detail}` : ''}`);
}

const page = await connectCdp();
try {
  await page.evaluate('location.reload()');
  await sleep(1200);
  await page.waitFor(`document.body.dataset.readmepdfInit === '1'`);

  // --- Sample + rendering -------------------------------------------------
  await click(page, '#sample-btn');
  await page.waitFor(`document.querySelectorAll('#preview-doc h2').length >= 4`);
  const rendered = await page.evaluate(`(() => {
    const doc = document.getElementById('preview-doc');
    return {
      h1: doc.querySelectorAll('h1').length,
      h2: doc.querySelectorAll('h2').length,
      h3: doc.querySelectorAll('h3').length,
      h4: doc.querySelectorAll('h4').length,
      tocLinks: doc.querySelectorAll('nav.toc a').length,
      tocTitle: doc.querySelector('.toc-title')?.textContent ?? '',
      tableRows: doc.querySelectorAll('table tbody tr').length,
      taskChecked: doc.querySelectorAll('input[type=checkbox][checked]').length,
      codeBlocks: doc.querySelectorAll('pre code').length,
      status: document.getElementById('status').textContent,
      headingIds: [...doc.querySelectorAll('h1,h2,h3,h4')].map(h => h.id),
    };
  })()`);
  assert(rendered.h1 === 1 && rendered.h2 >= 4, 'sample headings missing');
  assert(rendered.tocLinks >= 6, 'sample TOC missing');
  assert(rendered.tableRows === 2, 'sample table missing');
  assert(rendered.codeBlocks >= 1, 'sample code block missing');
  assert(new Set(rendered.headingIds).size === rendered.headingIds.length, 'duplicate heading ids');
  record('sample render (headings/TOC/table/tasks/code/unique ids)', 'PASS', JSON.stringify(rendered));

  // --- TOC toggle ---------------------------------------------------------
  await click(page, '#toc-toggle');
  await sleep(400);
  const tocOff = await page.evaluate(
    `({ toc: document.querySelectorAll('#preview-doc nav.toc').length, headings: document.querySelectorAll('#preview-doc h2').length })`,
  );
  assert(tocOff.toc === 0 && tocOff.headings >= 4, 'TOC toggle did not remove TOC only');
  record('TOC toggle off removes TOC and keeps document', 'PASS', JSON.stringify(tocOff));
  await click(page, '#toc-toggle');
  await sleep(400);

  // --- Edit updates preview ----------------------------------------------
  await setValue(page, '#md-input', '# Edited title\n\n## Edited section\n\nBody changed by test.');
  await page.waitFor(`document.querySelector('#preview-doc h1')?.textContent === 'Edited title'`);
  const edited = await page.evaluate(
    `({ h1: document.querySelector('#preview-doc h1').textContent, body: document.querySelector('#preview-doc p').textContent, meta: document.getElementById('meta').textContent })`,
  );
  assert(edited.body.includes('Body changed'), 'edited body not rendered');
  record('paste/edit re-renders preview', 'PASS', JSON.stringify(edited));

  // --- Upload via real File/DataTransfer ----------------------------------
  await page.evaluate(`(() => {
    const f = new File(['# Uploaded file\\n\\n## From disk\\n\\nUploaded body.'], 'uploaded.md', { type: 'text/markdown' });
    const dt = new DataTransfer();
    dt.items.add(f);
    const input = document.getElementById('file-input');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await page.waitFor(`document.querySelector('#preview-doc h1')?.textContent === 'Uploaded file'`);
  const uploaded = await page.evaluate(
    `({ h1: document.querySelector('#preview-doc h1').textContent, status: document.getElementById('status').textContent, inputCleared: document.getElementById('file-input').value === '' })`,
  );
  assert(uploaded.status.includes('Loaded uploaded.md'), 'upload status missing');
  record('file upload via File API', 'PASS', JSON.stringify(uploaded));

  // --- 2 MB upload limit --------------------------------------------------
  await page.evaluate(`(() => {
    const big = new File(['x'.repeat(2 * 1024 * 1024 + 100)], 'big.md', { type: 'text/markdown' });
    const dt = new DataTransfer();
    dt.items.add(big);
    const input = document.getElementById('file-input');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await page.waitFor(`document.getElementById('status').textContent.includes('2 MB')`);
  const big = await page.evaluate(
    `({ status: document.getElementById('status').textContent, h1: document.querySelector('#preview-doc h1')?.textContent })`,
  );
  assert(big.h1 === 'Uploaded file', 'oversized upload replaced preview');
  record('2 MB upload limit rejects oversized file', 'PASS', JSON.stringify(big));

  // --- Real GitHub README fetch ------------------------------------------
  await setValue(page, '#gh-url', 'https://github.com/octocat/Hello-World');
  await click(page, '#fetch-btn');
  await page.waitFor(
    `document.getElementById('status').textContent.includes('Loaded octocat/Hello-World')`,
    { timeout: 45000 },
  );
  const fetched = await page.evaluate(`(() => ({
    status: document.getElementById('status').textContent,
    meta: document.getElementById('meta').textContent,
    h1: document.querySelector('#preview-doc h1')?.textContent ?? null,
    textLength: document.getElementById('md-input').value.length,
    linkTargets: [...document.querySelectorAll('#preview-doc a[href^="http"]')].every(a => a.target === '_blank'),
  }))()`);
  assert(fetched.textLength > 20, 'fetched README empty');
  record('live GitHub README fetch (octocat/Hello-World)', 'PASS', JSON.stringify(fetched));

  // --- Invalid URL error --------------------------------------------------
  await setValue(page, '#gh-url', 'not a github url');
  await click(page, '#fetch-btn');
  await page.waitFor(`document.getElementById('status').className.includes('error')`);
  const invalid = await page.evaluate(
    `({ status: document.getElementById('status').textContent, meta: document.getElementById('meta').textContent })`,
  );
  assert(invalid.meta.includes('Local mode'), 'invalid fetch did not clear repo context');
  record('invalid URL error path', 'PASS', JSON.stringify(invalid));

  // --- Themes -------------------------------------------------------------
  const themes = {};
  for (const theme of ['business', 'academic', 'dark', 'clean']) {
    await page.evaluate(
      `document.querySelector('input[name="theme"][value="${theme}"]').click()`,
    );
    await sleep(80);
    themes[theme] = await page.evaluate(`(() => ({
      sheetClass: document.getElementById('sheet').className,
      darkWarnHidden: document.getElementById('dark-warn').hidden,
    }))()`);
    assert(themes[theme].sheetClass.includes(`theme-${theme}`), `theme ${theme} not applied`);
    assert(themes[theme].darkWarnHidden === (theme !== 'dark'), `dark warning wrong for ${theme}`);
  }
  record('four print themes + dark warning', 'PASS', JSON.stringify(themes));

  // --- Print mode (single) ------------------------------------------------
  await page.evaluate(`(() => {
    window.__printCalls = [];
    window.print = () => { window.__printCalls.push(document.body.dataset.printMode ?? 'none'); };
    return true;
  })()`);
  await click(page, '#print-btn');
  const printed = await page.evaluate(`(() => ({
    calls: window.__printCalls,
    mode: document.body.dataset.printMode ?? null,
    status: document.getElementById('status').textContent,
  }))()`);
  assert(printed.calls.length === 1 && printed.calls[0] === 'single', 'print mode was not single');
  assert(printed.mode === 'single', 'body print mode missing');
  record('print single sets data-print-mode=single', 'PASS', JSON.stringify(printed));

  // Restore print mode through the real afterprint listener.
  await page.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
  const restored = await page.evaluate(`document.body.dataset.printMode ?? null`);
  assert(restored === null, 'print mode was not cleared after afterprint');
  record('afterprint restores screen layout', 'PASS', 'no data-print-mode');

  // --- Clear --------------------------------------------------------------
  await click(page, '#clear-btn');
  await page.waitFor(`document.getElementById('preview-doc').textContent.includes('Nothing to preview')`);
  const cleared = await page.evaluate(`(() => ({
    meta: document.getElementById('meta').textContent,
    status: document.getElementById('status').textContent,
    input: document.getElementById('md-input').value,
  }))()`);
  assert(cleared.input === '' && cleared.meta.includes('Local mode'), 'clear did not reset');
  record('clear resets document and repo context', 'PASS', JSON.stringify(cleared));

  // --- Console health -----------------------------------------------------
  record('converter console errors', page.consoleErrors.length ? 'FAIL' : 'PASS', JSON.stringify(page.consoleErrors));
  record('converter uncaught exceptions', page.exceptions.length ? 'FAIL' : 'PASS', JSON.stringify(page.exceptions));

  await page.screenshot('verification-converter.png');
  console.log('SCREENSHOT verification-converter.png');
} catch (error) {
  record('converter scenario aborted', 'FAIL', error.stack ?? String(error));
  process.exitCode = 1;
} finally {
  await writeFile('verification-browser-converter.json', JSON.stringify(results, null, 2));
  page.close();
}

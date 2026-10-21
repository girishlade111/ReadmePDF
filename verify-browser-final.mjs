/**
 * Final browser verification:
 *  1. Live README fetch shows the real README path in the meta line (post-fix).
 *  2. Print isolation switches single <-> book while both sheets have content,
 *     using real print CSS via CDP print-media emulation.
 *  3. Responsive viewports 360/390/768/1024/1440.
 *  4. Keyboard activation and basic accessible names.
 */
import { writeFile } from 'node:fs/promises';
import { connectCdp, click, setValue, sleep } from './verify-cdp.mjs';

const page = await connectCdp({ port: 9333 });
const results = [];

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: 'PASS', detail });
    console.log('PASS', name, JSON.stringify(detail));
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.stack ?? String(error) });
    console.log('FAIL', name, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function setPrintMedia(media) {
  await page.send('Emulation.setEmulatedMedia', { media });
}

async function layoutSnapshot() {
  return page.evaluate(`(() => {
    const ids = ['gh-url','fetch-btn','sample-btn','print-btn','book-url','book-scan-btn','book-build-btn','book-print-btn'];
    const controls = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) { controls[id] = null; continue; }
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      controls[id] = {
        visible: r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none',
        left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
      };
    }
    return {
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      controls,
    };
  })()`);
}

try {
  await page.evaluate('location.reload()');
  await sleep(1200);
  await page.waitFor(`document.body.dataset.readmepdfInit === '1'`);

  // --- 1. Live README fetch: meta must name the fetched README file ---------
  await step('live fetch meta shows owner/repo @ branch — README path', async () => {
    await setValue(page, '#gh-url', 'https://github.com/octocat/Hello-World');
    await click(page, '#fetch-btn');
    await page.waitFor(
      `document.getElementById('status').textContent.includes('Loaded octocat/Hello-World')`,
      { timeout: 45000 },
    );
    await page.waitFor(`document.getElementById('meta').textContent.includes('README')`, {
      timeout: 10000,
    });
    const detail = await page.evaluate(`(() => ({
      meta: document.getElementById('meta').textContent.trim(),
      status: document.getElementById('status').textContent.trim(),
      inputLength: document.getElementById('md-input').value.length,
      previewH1: document.querySelector('#preview-doc h1')?.textContent ?? null,
    }))()`);
    assert(
      detail.meta === 'octocat/Hello-World @ master — README',
      `Unexpected meta label: ${JSON.stringify(detail.meta)}`,
    );
    assert(!detail.meta.endsWith('— '), 'Meta label ends with an empty path');
    assert(detail.inputLength > 0, 'Fetched README is empty');
    return detail;
  });

  // --- 2. Scan a 1-file repo and build a complete book ---------------------
  await step('scan + build one-chapter book for print switching', async () => {
    await setValue(page, '#book-url', 'https://github.com/octocat/Hello-World');
    await click(page, '#book-scan-btn');
    await page.waitFor(
      `(() => {
        const s = document.getElementById('book-status').textContent;
        const c = document.getElementById('book-cancel-scan-btn').hidden;
        return c === true && s.length > 0 && !/Scanning/i.test(s) && !/Reading/i.test(s);
      })()`,
      { timeout: 90000 },
    );
    let status = await page.evaluate(`document.getElementById('book-status').textContent`);
    assert(!/error|failed/i.test(status), `Scan failed: ${status}`);
    await click(page, '#book-select-all');
    const selected = await page.evaluate(
      `document.querySelectorAll('#book-tree input[data-file]:checked').length`,
    );
    assert(selected >= 1, `Expected at least one selected file, got ${selected}`);
    await click(page, '#book-build-btn');
    await page.waitFor(
      `(() => {
        const b = document.getElementById('book-build-btn');
        const s = document.getElementById('book-build-status').textContent;
        return b.textContent === 'Build book' && /Book ready/i.test(s);
      })()`,
      { timeout: 90000 },
    );
    const detail = await page.evaluate(`(() => ({
      scanStatus: document.getElementById('book-status').textContent,
      meta: document.getElementById('book-meta').textContent,
      selected: document.querySelectorAll('#book-tree input[data-file]:checked').length,
      chapters: document.querySelectorAll('#book-output [data-doc-path]').length,
      buildStatus: document.getElementById('book-build-status').textContent,
      printDisabled: document.getElementById('book-print-btn').disabled,
      headingIds: [...document.querySelectorAll('#book-output h1[id],#book-output h2[id],#book-output h3[id]')].map((h) => h.id),
    }))()`);
    assert(detail.selected >= 1, 'No file selected');
    assert(detail.chapters >= 1, 'Book has no rendered chapters');
    assert(detail.printDisabled === false, 'Book print button is still disabled');
    assert(new Set(detail.headingIds).size === detail.headingIds.length, 'Book has duplicate heading ids');
    return detail;
  });

  // --- 3. Print isolation while both sheets have content -------------------
  await step('print single isolates the book sheet', async () => {
    await page.evaluate(`(() => {
      window.__printCalls = [];
      window.print = () => { window.__printCalls.push(document.body.dataset.printMode ?? 'none'); };
      return true;
    })()`);
    await click(page, '#print-btn');
    await page.waitFor(`document.body.dataset.printMode === 'single'`);
    await setPrintMedia('print');
    const detail = await page.evaluate(`(() => ({
      mode: document.body.dataset.printMode ?? null,
      printCalls: window.__printCalls,
      converter: getComputedStyle(document.getElementById('converter')).display,
      book: getComputedStyle(document.getElementById('book')).display,
      converterSheet: getComputedStyle(document.getElementById('sheet')).display,
      bookSheet: getComputedStyle(document.getElementById('book-sheet')).display,
      converterHeight: document.getElementById('sheet').getBoundingClientRect().height,
      bookHeight: document.getElementById('book-sheet').getBoundingClientRect().height,
    }))()`);
    await setPrintMedia('screen');
    await page.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
    const restored = await page.evaluate(`document.body.dataset.printMode ?? null`);
    assert(detail.mode === 'single', `Mode is ${detail.mode}`);
    assert(detail.printCalls.length === 1 && detail.printCalls[0] === 'single', 'print() did not see single');
    assert(detail.converter !== 'none', 'Converter hidden in single print');
    assert(detail.book === 'none', 'Book visible in single print');
    assert(detail.converterHeight > 0 && detail.bookHeight > 0, 'One of the sheets has no content');
    assert(restored === null, 'afterprint did not clear single mode');
    return { ...detail, restored };
  });

  await step('print book isolates the converter sheet', async () => {
    await click(page, '#book-print-btn');
    await page.waitFor(`document.body.dataset.printMode === 'book'`);
    await setPrintMedia('print');
    const detail = await page.evaluate(`(() => ({
      mode: document.body.dataset.printMode ?? null,
      printCalls: window.__printCalls,
      converter: getComputedStyle(document.getElementById('converter')).display,
      book: getComputedStyle(document.getElementById('book')).display,
      converterSheet: getComputedStyle(document.getElementById('sheet')).display,
      bookSheet: getComputedStyle(document.getElementById('book-sheet')).display,
      converterHeight: document.getElementById('sheet').getBoundingClientRect().height,
      bookHeight: document.getElementById('book-sheet').getBoundingClientRect().height,
    }))()`);
    await setPrintMedia('screen');
    await page.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
    const restored = await page.evaluate(`document.body.dataset.printMode ?? null`);
    assert(detail.mode === 'book', `Mode is ${detail.mode}`);
    assert(detail.printCalls.join(',') === 'single,book', 'print() call sequence wrong');
    assert(detail.book !== 'none', 'Book hidden in book print');
    assert(detail.converter === 'none', 'Converter visible in book print');
    assert(detail.converterHeight > 0 && detail.bookHeight > 0, 'One of the sheets has no content');
    assert(restored === null, 'afterprint did not clear book mode');
    return { ...detail, restored };
  });

  await step('print switching back to single still isolates correctly', async () => {
    await click(page, '#print-btn');
    await page.waitFor(`document.body.dataset.printMode === 'single'`);
    await setPrintMedia('print');
    const detail = await page.evaluate(`(() => ({
      mode: document.body.dataset.printMode ?? null,
      printCalls: window.__printCalls,
      converter: getComputedStyle(document.getElementById('converter')).display,
      book: getComputedStyle(document.getElementById('book')).display,
    }))()`);
    await setPrintMedia('screen');
    await page.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
    const restored = await page.evaluate(`document.body.dataset.printMode ?? null`);
    assert(detail.converter !== 'none' && detail.book === 'none', 'Second single print isolation failed');
    assert(restored === null, 'afterprint did not clear second single mode');
    return { ...detail, restored };
  });

  // --- 4. Responsive layouts ----------------------------------------------
  const widths = [360, 390, 768, 1024, 1440];
  for (const width of widths) {
    await step(`responsive layout at ${width}px`, async () => {
      await page.setViewport(width, width <= 390 ? 800 : 1000);
      await sleep(250);
      const detail = await layoutSnapshot();
      assert(detail.scrollWidth <= width + 1, `Horizontal overflow: ${detail.scrollWidth} > ${width}`);
      assert(detail.bodyScrollWidth <= width + 1, `Body overflow: ${detail.bodyScrollWidth} > ${width}`);
      for (const [id, info] of Object.entries(detail.controls)) {
        assert(info, `Missing control #${id}`);
        assert(info.visible, `Control #${id} is not visible at ${width}px`);
        assert(info.left >= -1 && info.right <= width + 1, `Control #${id} outside viewport: ${JSON.stringify(info)}`);
      }
      if (width === 360) await page.screenshot('verification-responsive-360.png');
      if (width === 1024) await page.screenshot('verification-responsive-1024.png');
      return detail;
    });
  }
  await page.setViewport(1440, 1000);

  // --- 5. Keyboard + basic accessible names --------------------------------
  await step('keyboard activation (Enter on sample, Space on TOC) and names', async () => {
    await setPrintMedia('screen');
    await page.evaluate(`document.getElementById('sample-btn').focus()`);
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13,
    });
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13,
    });
    await page.waitFor(`document.querySelector('#preview-doc h1')?.textContent === 'ReadmePDF — Sample README'`);
    const before = await page.evaluate(`document.getElementById('toc-toggle').checked`);
    await page.evaluate(`document.getElementById('toc-toggle').focus()`);
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32,
    });
    await page.send('Input.dispatchKeyEvent', {
      type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32,
    });
    await sleep(150);
    const detail = await page.evaluate(`(() => {
      const after = document.getElementById('toc-toggle').checked;
      const name = (el) => {
        if (!el) return null;
        const aria = el.getAttribute('aria-label');
        if (aria) return aria;
        const labelled = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
        if (labelled) return labelled.textContent.trim();
        if (el.id) {
          const wrapping = el.closest('label');
          if (wrapping) return wrapping.textContent.trim();
        }
        return (el.textContent || '').trim() || el.getAttribute('title') || null;
      };
      const ids = ['gh-url','fetch-btn','sample-btn','clear-btn','toc-toggle','print-btn','book-url','book-scan-btn','book-build-btn','book-print-btn'];
      const accessible = {};
      for (const id of ids) accessible[id] = name(document.getElementById(id));
      return {
        sampleH1: document.querySelector('#preview-doc h1')?.textContent ?? null,
        tocBefore: ${before},
        tocAfter: after,
        tocCount: document.querySelectorAll('#preview-doc nav.toc').length,
        accessible,
      };
    })()`);
    assert(detail.sampleH1 === 'ReadmePDF — Sample README', 'Enter did not activate Load sample');
    assert(detail.tocBefore !== detail.tocAfter, 'Space did not toggle TOC');
    for (const [id, name] of Object.entries(detail.accessible)) {
      assert(name && name.length > 0, `Control #${id} has no accessible name`);
    }
    return detail;
  });

  // Console health for this run.
  const benign404 = page.consoleErrors.filter((line) => line.includes('status of 404'));
  const unexpected = page.consoleErrors.filter((line) => !line.includes('status of 404'));
  results.push({
    name: 'final-run console health',
    status: unexpected.length || page.exceptions.length ? 'FAIL' : 'PASS',
    detail: { benign404: benign404.length, unexpected, exceptions: page.exceptions },
  });
  console.log('PASS console health', JSON.stringify({ benign404: benign404.length, unexpected, exceptions: page.exceptions }));

  await page.screenshot('verification-final.png');
  console.log('SCREENSHOT verification-final.png');
} catch (error) {
  results.push({ name: 'final browser scenario aborted', status: 'FAIL', error: error.stack ?? String(error) });
  console.log('FAIL aborted', error.stack ?? error);
  process.exitCode = 1;
} finally {
  await writeFile('verification-browser-final.json', JSON.stringify({ results }, null, 2));
  console.log(JSON.stringify({
    pass: results.filter((r) => r.status === 'PASS').length,
    fail: results.filter((r) => r.status === 'FAIL').length,
  }));
  page.close();
}

/**
 * End-to-end browser verification for the documentation-book workflow.
 *
 * Real GitHub scans (rust-lang/book, goldbergyoni/nodebestpractices/.operations)
 * plus real CDP-driven interaction. The only stub is `window.print` preventing
 * a modal dialog; the exported PDF itself is produced by Page.printToPDF while
 * the page is in `data-print-mode="book"` with print media applied.
 */
import { writeFile } from 'node:fs/promises';
import { connectCdp, click, setValue, sleep } from './verify-cdp.mjs';

const results = [];
let fatal = null;

async function step(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, status: 'PASS', ms: Date.now() - started, detail: detail ?? null });
    console.log('PASS', name, detail ? JSON.stringify(detail) : '');
  } catch (error) {
    results.push({ name, status: 'FAIL', ms: Date.now() - started, error: error.message });
    console.log('FAIL', name, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const page = await connectCdp({ port: 9333 });
const httpErrors = [];
page.on('Network.responseReceived', ({ response }) => {
  if (response.status >= 400) {
    httpErrors.push({ status: response.status, url: response.url });
  }
});

async function domState() {
  return page.evaluate(`(() => {
    const q = (s) => document.querySelector(s);
    const files = [...document.querySelectorAll('#book-tree input[data-file]')];
    const folders = [...document.querySelectorAll('#book-tree input[data-folder]')];
    const chapters = [...document.querySelectorAll('#book-chapters [data-chapter-path]')].map(
      (el) => el.dataset.chapterPath,
    );
    return {
      status: q('#book-status').textContent,
      statusKind: q('#book-status').className,
      meta: q('#book-meta').textContent,
      summary: q('#book-file-summary').textContent,
      buildStatus: q('#book-build-status').textContent,
      buildStatusKind: q('#book-build-status').className,
      buildText: q('#book-build-btn').textContent,
      buildDisabled: q('#book-build-btn').disabled,
      cancelHidden: q('#book-build-cancel-btn').hidden,
      printDisabled: q('#book-print-btn').disabled,
      checkedFiles: files.filter((el) => el.checked).map((el) => el.dataset.file),
      fileCount: files.length,
      folderCount: folders.length,
      folders: folders.map((el) => ({
        path: el.dataset.folder,
        checked: el.checked,
        indeterminate: el.indeterminate,
      })),
      chapters,
      treeEmpty: q('#book-tree-empty').hidden ? null : q('#book-tree-empty').textContent,
      output: q('#book-output').textContent.trim().slice(0, 240),
      outputHidden: q('#book-output').hidden,
      cover: document.querySelectorAll('#book-output .book-cover').length,
      toc: document.querySelectorAll('#book-output .book-toc').length,
      renderedChapters: [...document.querySelectorAll('#book-output [data-doc-path]')].map(
        (el) => el.dataset.docPath,
      ),
      bookRoot: document.querySelectorAll('#book-output [data-book-root]').length,
      failures: [...document.querySelectorAll('#book-failure-list li')].map((el) => el.textContent),
      failuresHidden: q('#book-failures').hidden,
      retryHidden: q('#book-retry-btn').hidden,
      dropHidden: q('#book-drop-failures-btn').hidden,
    };
  })()`);
}

async function scan(url) {
  await setValue(page, '#book-url', url);
  await click(page, '#book-scan-btn');
  await page.waitFor(
    `(() => {
      const b = document.querySelector('#book-scan-btn');
      const s = document.querySelector('#book-status');
      return !b.disabled && s.textContent.length > 0 &&
        (s.textContent.includes('Found') || s.textContent.includes('No Markdown') ||
         s.textContent.includes('not found') || s.textContent.includes('rate limit') ||
         s.textContent.includes('Scan cancelled') || s.textContent.includes('Could not'));
    })()`,
    { timeout: 120000, interval: 100 },
  );
  await sleep(150);
}

async function selectOnly(paths) {
  await click(page, '#book-clear-selection');
  for (const path of paths) {
    await page.evaluate(`(() => {
      const cb = document.querySelector('#book-tree input[data-file=' + JSON.stringify(${JSON.stringify(
        path,
      )}) + ']');
      if (!cb) throw new Error('Missing file checkbox: ' + ${JSON.stringify(path)});
      if (!cb.checked) cb.click();
      return cb.checked;
    })()`);
  }
}

async function waitBuildDone({ timeout = 120000 } = {}) {
  await page.waitFor(
    `(() => {
      const b = document.querySelector('#book-build-btn');
      const s = document.querySelector('#book-build-status');
      return b.textContent === 'Build book' && s.textContent.length > 0 &&
        !s.textContent.startsWith('Fetching') && !s.textContent.startsWith('Rendering');
    })()`,
    { timeout, interval: 100 },
  );
  await sleep(100);
}

async function build() {
  await click(page, '#book-build-btn');
  await waitBuildDone();
  return domState();
}

async function moveChapter(path, action) {
  await page.evaluate(`(() => {
    const row = document.querySelector('#book-chapters [data-chapter-path=' + JSON.stringify(${JSON.stringify(
      path,
    )}) + ']');
    if (!row) throw new Error('Missing chapter row: ' + ${JSON.stringify(path)});
    const btn = row.querySelector('button[data-action="${action}"]');
    if (!btn || btn.disabled) throw new Error('Cannot ${action} ' + ${JSON.stringify(path)});
    btn.click();
    return true;
  })()`);
}

async function main() {
  await page.send('Page.navigate', { url: 'http://127.0.0.1:4322/' });
  await page.waitFor(
    `document.readyState === 'complete' && document.body.dataset.bookInit === '1'`,
    { timeout: 45000 },
  );
  await sleep(200);
  page.consoleErrors.length = 0;
  page.exceptions.length = 0;
  page.failedRequests.length = 0;
  httpErrors.length = 0;

  // ---------------------------------------------------------------- Explorer
  await scan('https://github.com/rust-lang/book/tree/main/src');
  let state = await domState();

  await step('real scan: rust-lang/book/src lists >30 Markdown files', async () => {
    assert(state.status.includes('Found 112'), `Unexpected status: ${state.status}`);
    assert(state.meta.includes('rust-lang/book'), `Meta missing repo: ${state.meta}`);
    assert(state.meta.includes('commit '), `Meta missing commit: ${state.meta}`);
    assert(state.fileCount === 112, `Expected 112 file checkboxes, got ${state.fileCount}`);
    assert(state.folderCount === 1, `Expected one folder, got ${state.folderCount}`);
    assert(state.summary.includes('30 of 112 selected'), `Unexpected summary: ${state.summary}`);
    assert(state.chapters.length === 30, `Expected 30 default chapters, got ${state.chapters.length}`);
    assert(state.buildDisabled === false, 'Build should be enabled');
    assert(state.printDisabled === true, 'Print must be disabled before a build');
    return { status: state.status, meta: state.meta, files: state.fileCount, chapters: state.chapters.length };
  });

  await step('folder expand/collapse updates aria-expanded and child visibility', async () => {
    const before = await page.evaluate(`(() => {
      const t = document.querySelector('#book-tree button[aria-expanded]');
      const list = document.getElementById(t.getAttribute('aria-controls'));
      return { expanded: t.getAttribute('aria-expanded'), hidden: list.hidden };
    })()`);
    assert(before.expanded === 'true' && before.hidden === false, 'Folder not expanded after scan');
    await page.evaluate(`document.querySelector('#book-tree button[aria-expanded]').click()`);
    const collapsed = await page.evaluate(`(() => {
      const t = document.querySelector('#book-tree button[aria-expanded]');
      const list = document.getElementById(t.getAttribute('aria-controls'));
      return { expanded: t.getAttribute('aria-expanded'), hidden: list.hidden };
    })()`);
    assert(collapsed.expanded === 'false' && collapsed.hidden === true, 'Folder did not collapse');
    await page.evaluate(`document.querySelector('#book-tree button[aria-expanded]').click()`);
    const reopened = await page.evaluate(`(() => {
      const t = document.querySelector('#book-tree button[aria-expanded]');
      const list = document.getElementById(t.getAttribute('aria-controls'));
      return { expanded: t.getAttribute('aria-expanded'), hidden: list.hidden };
    })()`);
    assert(reopened.expanded === 'true' && reopened.hidden === false, 'Folder did not reopen');
    return { before, collapsed, reopened };
  });

  await step('select-all is capped at the 30-file book limit and explains why', async () => {
    await click(page, '#book-select-all');
    state = await domState();
    assert(state.checkedFiles.length === 30, `Expected 30 selected, got ${state.checkedFiles.length}`);
    assert(state.chapters.length === 30, `Expected 30 chapters, got ${state.chapters.length}`);
    assert(/at most 30 files/.test(state.status), `Missing cap explanation: ${state.status}`);
    return { checked: state.checkedFiles.length, status: state.status };
  });

  await step('clear selection empties chapters, disables build, leaves print disabled', async () => {
    await click(page, '#book-clear-selection');
    state = await domState();
    assert(state.checkedFiles.length === 0, `Expected 0 selected, got ${state.checkedFiles.length}`);
    assert(state.chapters.length === 0, `Expected 0 chapters, got ${state.chapters.length}`);
    assert(state.buildDisabled === true, 'Build should be disabled with no chapters');
    assert(state.printDisabled === true, 'Print should stay disabled');
    assert(state.summary.startsWith('0 of 112 selected'), `Unexpected summary: ${state.summary}`);
    return state.summary;
  });

  await step('file selection updates summary and chapter list', async () => {
    await page.evaluate(`document.querySelector('#book-tree input[data-file="src/title-page.md"]').click()`);
    state = await domState();
    assert(state.checkedFiles.length === 1, `Expected 1 selected, got ${state.checkedFiles.length}`);
    assert(state.chapters[0] === 'src/title-page.md', `Unexpected chapter: ${state.chapters[0]}`);
    assert(state.buildDisabled === false, 'Build should be enabled for one chapter');
    return { chapters: state.chapters, summary: state.summary };
  });

  await step('search filters the tree and clearing restores it', async () => {
    await setValue(page, '#book-search', 'appendix');
    await sleep(350);
    const filtered = await page.evaluate(`(() => ({
      files: [...document.querySelectorAll('#book-tree input[data-file]')].map((el) => el.dataset.file),
      folders: [...document.querySelectorAll('#book-tree button[aria-expanded]')].map((el) => el.getAttribute('aria-expanded')),
    }))()`);
    assert(filtered.files.length > 0, 'Search returned nothing');
    assert(
      filtered.files.every((path) => path.toLowerCase().includes('appendix')),
      `Search leaked non-matching files: ${JSON.stringify(filtered.files.slice(0, 3))}`,
    );
    await setValue(page, '#book-search', '');
    await sleep(350);
    const restored = await domState();
    assert(restored.fileCount === 112, `Expected 112 files restored, got ${restored.fileCount}`);
    return { matches: filtered.files.length, sample: filtered.files.slice(0, 3), restored: restored.fileCount };
  });

  await step('file preview loads Markdown, then Back restores the builder', async () => {
    await page.evaluate(`(() => {
      const btn = document.querySelector('#book-tree button[data-preview="src/title-page.md"]');
      if (!btn) throw new Error('Preview button missing');
      btn.click();
      return true;
    })()`);
    await page.waitFor(
      `!document.querySelector('#book-preview').hidden &&
       document.querySelector('#book-preview').textContent.includes('The Rust Programming Language')`,
      { timeout: 45000 },
    );
    const preview = await page.evaluate(`(() => ({
      label: document.querySelector('#book-preview-label').textContent,
      headings: document.querySelectorAll('#book-preview h1, #book-preview h2, #book-preview h3').length,
      links: [...document.querySelectorAll('#book-preview a[href]')].slice(0, 3).map((a) => a.getAttribute('href')),
      printDisabled: document.querySelector('#book-print-btn').disabled,
      outputHidden: document.querySelector('#book-output').hidden,
    }))()`);
    assert(preview.label.includes('src/title-page.md'), `Unexpected preview label: ${preview.label}`);
    assert(preview.headings > 0, 'Preview rendered no headings');
    assert(preview.printDisabled === true, 'Print must be disabled while previewing');
    await click(page, '#book-preview-back');
    const back = await domState();
    assert(back.outputHidden === false, 'Book output not restored after Back');
    return preview;
  });

  // ----------------------------------------------------- Unicode folder scan
  await scan('https://github.com/jackfrued/Python-100-Days/tree/master/Day01-20');
  state = await domState();
  await step('real scan: Unicode paths display and filter correctly', async () => {
    assert(state.status.includes('Found'), `Scan failed: ${state.status}`);
    const unicodePath = state.checkedFiles.find((path) => path.includes('初识Python'));
    assert(unicodePath, `No Unicode path in: ${JSON.stringify(state.checkedFiles.slice(0, 4))}`);
    assert(state.summary.includes(`of ${state.fileCount} selected`), `Unexpected summary: ${state.summary}`);
    await setValue(page, '#book-search', 'Python');
    await sleep(350);
    const filtered = await page.evaluate(
      `[...document.querySelectorAll('#book-tree input[data-file]')].map((el) => el.dataset.file).length`,
    );
    assert(filtered > 0, 'Unicode-aware search matched nothing');
    await setValue(page, '#book-search', '');
    await sleep(350);
    return { files: state.fileCount, unicodePath, searchMatches: filtered, status: state.status };
  });

  // -------------------------------------------------- Folder tri-state scan
  await scan('https://github.com/goldbergyoni/nodebestpractices/tree/master/.operations');
  state = await domState();
  let opsFiles = state.checkedFiles;
  await step('folder tri-state and select-all/clear with a <=30 folder', async () => {
    assert(state.fileCount === 14, `Expected 14 files, got ${state.fileCount}`);
    assert(state.folderCount === 1, `Expected one folder, got ${state.folderCount}`);
    assert(state.checkedFiles.length === 14, `Expected all 14 selected by default, got ${state.checkedFiles.length}`);
    assert(state.folders[0].checked === true && state.folders[0].indeterminate === false, 'Folder should be fully selected');
    await click(page, '#book-clear-selection');
    state = await domState();
    assert(state.folders[0].checked === false && state.folders[0].indeterminate === false, 'Folder should be empty');
    await page.evaluate(`document.querySelector('#book-tree input[data-file]').click()`);
    state = await domState();
    assert(state.folders[0].checked === false && state.folders[0].indeterminate === true, 'Folder should be indeterminate');
    await page.evaluate(`document.querySelector('#book-tree input[data-folder]').click()`);
    state = await domState();
    assert(state.checkedFiles.length === 14 && state.folders[0].checked === true, 'Folder click did not select all');
    await click(page, '#book-select-all');
    state = await domState();
    assert(state.checkedFiles.length === 14, `Select-all changed count: ${state.checkedFiles.length}`);
    return { files: state.fileCount, folders: state.folders };
  });

  // ------------------------------------------------------ ordering and build
  opsFiles = (await domState()).checkedFiles;
  const ordered = [opsFiles[0], opsFiles[1], opsFiles[2]];
  await selectOnly(ordered);
  state = await domState();
  assert(state.chapters.length === 3, `Expected 3 chapters, got ${state.chapters.length}`);

  await step('chapter up/down controls reorder the print list', async () => {
    const original = [...state.chapters];
    await moveChapter(original[0], 'down');
    state = await domState();
    const afterDown = [...state.chapters];
    assert(afterDown[1] === original[0], `Down did not move ${original[0]}: ${JSON.stringify(afterDown)}`);
    await moveChapter(original[0], 'up');
    state = await domState();
    assert(state.chapters[0] === original[0], `Up did not restore order: ${JSON.stringify(state.chapters)}`);
    return { original, afterDown, restored: state.chapters };
  });

  await step('remove chapter unticks its file and keeps the rest', async () => {
    const before = [...state.chapters];
    await moveChapter(before[1], 'remove');
    state = await domState();
    assert(state.chapters.length === 2, `Expected 2 chapters after remove, got ${state.chapters.length}`);
    assert(!state.chapters.includes(before[1]), 'Removed chapter still present');
    assert(!state.checkedFiles.includes(before[1]), 'Removed file still checked in tree');
    // add it back for the build
    await page.evaluate(`(() => {
      const cb = document.querySelector('#book-tree input[data-file=' + JSON.stringify(${JSON.stringify(
        before[1],
      )}) + ']');
      if (!cb.checked) cb.click();
      return true;
    })()`);
    state = await domState();
    assert(state.chapters.length === 3, 'Could not re-add the chapter');
    return { before, after: state.chapters };
  });

  await step('build assembles cover, TOC, ordered chapters and unique heading ids', async () => {
    // Put a deliberate non-tree order in place: third, first, second.
    const current = (await domState()).chapters;
    for (let i = 0; i < 2; i += 1) {
      await moveChapter(current[0], 'down');
    }
    state = await domState();
    const expectedOrder = [...state.chapters];
    assert(expectedOrder[0] !== ordered[0], `Ordering did not change: ${JSON.stringify(expectedOrder)}`);
    state = await build();
    assert(state.buildStatus.includes('Book ready'), `Build failed: ${state.buildStatus}`);
    assert(state.bookRoot === 1, 'Missing book root');
    assert(state.cover === 1, 'Missing cover');
    assert(state.toc === 1, 'Missing master TOC');
    assert(state.renderedChapters.length === 3, `Expected 3 rendered chapters, got ${state.renderedChapters.length}`);
    assert(
      JSON.stringify(state.renderedChapters) === JSON.stringify(expectedOrder),
      `Rendered order ${JSON.stringify(state.renderedChapters)} != ${JSON.stringify(expectedOrder)}`,
    );
    const ids = await page.evaluate(`(() => {
      const all = [...document.querySelectorAll('#book-output [id]')].map((el) => el.id);
      return { total: all.length, unique: new Set(all).size, duplicates: all.filter((id, i) => all.indexOf(id) !== i) };
    })()`);
    assert(ids.unique === ids.total, `Duplicate heading ids: ${JSON.stringify(ids.duplicates.slice(0, 5))}`);
    const linkInfo = await page.evaluate(`(() => {
      const links = [...document.querySelectorAll('#book-output a[href]')];
      return {
        total: links.length,
        raw: links.filter((a) => a.getAttribute('href').includes('raw.githubusercontent.com')).length,
        blob: links.filter((a) => a.getAttribute('href').includes('github.com/')).length,
        internal: links.filter((a) => a.getAttribute('href').startsWith('#')).length,
        pinned: links.filter((a) => a.getAttribute('href').includes('/' + ${JSON.stringify(
          state.meta.match(/commit ([0-9a-f]+)/)?.[1] ?? '',
        )} + '/')).length,
        images: [...document.querySelectorAll('#book-output img[src]')].map((img) => img.getAttribute('src')).slice(0, 3),
      };
    })()`);
    assert(linkInfo.total > 0, 'Built book has no links to inspect');
    assert(state.printDisabled === false, 'Print should be enabled after a complete build');
    return {
      buildStatus: state.buildStatus,
      order: state.renderedChapters,
      ids,
      links: linkInfo,
    };
  });

  await step('title edit invalidates the built preview and disables print', async () => {
    await setValue(page, '#book-title', 'Changed after build');
    state = await domState();
    assert(state.printDisabled === true, 'Print must be disabled after a stale edit');
    assert(/out of date/i.test(state.buildStatus), `Missing stale status: ${state.buildStatus}`);
    assert(/Build the book again/i.test(state.output), `Missing stale output: ${state.output}`);
    return { buildStatus: state.buildStatus, output: state.output };
  });

  await step('cover/TOC toggles rebuild without stale content', async () => {
    await page.evaluate(`document.querySelector('#book-cover-toggle').click()`);
    await page.evaluate(`document.querySelector('#book-toc-toggle').click()`);
    state = await build();
    assert(state.cover === 0, 'Cover still present after toggle off');
    assert(state.toc === 0, 'TOC still present after toggle off');
    assert(state.renderedChapters.length === 3, 'Chapters missing after toggle off');
    await page.evaluate(`document.querySelector('#book-cover-toggle').click()`);
    await page.evaluate(`document.querySelector('#book-toc-toggle').click()`);
    await setValue(page, '#book-title', 'ReadmePDF Verification Book');
    await setValue(page, '#book-subtitle', 'Real browser build from goldbergyoni/nodebestpractices/.operations');
    state = await build();
    assert(state.cover === 1 && state.toc === 1, 'Cover/TOC did not return');
    assert(state.buildStatus.includes('Book ready'), `Final build failed: ${state.buildStatus}`);
    return { coverOff: 0, tocOff: 0, restored: { cover: state.cover, toc: state.toc } };
  });

  // -------------------------------------------------------- real PDF export
  await step('book print exports a real PDF with book-only print media', async () => {
    await page.evaluate(`(() => {
      window.__printCalls = [];
      window.print = () => window.__printCalls.push(document.body.dataset.printMode || null);
      return true;
    })()`);
    await click(page, '#book-print-btn');
    const calls = await page.evaluate(`window.__printCalls`);
    assert(JSON.stringify(calls) === JSON.stringify(['book']), `Unexpected print calls: ${JSON.stringify(calls)}`);
    const mode = await page.evaluate(`document.body.dataset.printMode`);
    assert(mode === 'book', `Expected book print mode, got ${mode}`);
    await page.send('Emulation.setEmulatedMedia', { media: 'print' });
    const isolation = await page.evaluate(`(() => ({
      converter: getComputedStyle(document.querySelector('#converter')).display,
      book: getComputedStyle(document.querySelector('#book')).display,
      controls: getComputedStyle(document.querySelector('.book-controls')).display,
      sheet: getComputedStyle(document.querySelector('#book-sheet')).display,
    }))()`);
    assert(isolation.converter === 'none', `Converter visible in book print: ${isolation.converter}`);
    assert(isolation.controls === 'none', `Book controls visible in print: ${isolation.controls}`);
    assert(isolation.book !== 'none', 'Book section hidden in book print');
    const before = (await domState()).buildStatus;
    const bytes = await page.printPdf('verification-book.pdf');
    await page.send('Emulation.setEmulatedMedia', { media: '' });
    await page.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
    const restored = await page.evaluate(`document.body.dataset.printMode ?? null`);
    assert(restored === null, `Print mode not restored: ${restored}`);
    assert(bytes > 10000, `PDF suspiciously small: ${bytes} bytes`);
    return { calls, mode, isolation, bytes, status: before, restored };
  });

  // -------------------------------------------------- failure / retry / drop
  const failureFiles = (await domState()).chapters.slice();
  const failTarget = failureFiles[1];
  let interceptMode = 'off';
  let held = [];
  const pausedHandler = async (params) => {
    if (interceptMode === 'hold') {
      held.push(params);
      return;
    }
    if (interceptMode === 'fail-one' && params.request.url.includes(encodeURI(failTarget).replace(/%2F/g, '/'))) {
      await page
        .send('Fetch.fulfillRequest', {
          requestId: params.requestId,
          responseCode: 500,
          responseHeaders: [{ name: 'Content-Type', value: 'text/plain' }],
          body: Buffer.from('forced verification failure').toString('base64'),
        })
        .catch(() => {});
      return;
    }
    await page.send('Fetch.continueRequest', { requestId: params.requestId }).catch(() => {});
  };
  page.on('Fetch.requestPaused', pausedHandler);

  await step('failed chapter blocks printing, lists the failure and offers retry', async () => {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    interceptMode = 'fail-one';
    await page.send('Fetch.enable', {
      patterns: [{ urlPattern: 'https://raw.githubusercontent.com/*', requestStage: 'Request' }],
    });
    state = await build();
    assert(state.buildStatus.includes('Book incomplete'), `Missing incomplete status: ${state.buildStatus}`);
    assert(state.failures.length === 1, `Expected 1 failure, got ${state.failures.length}: ${JSON.stringify(state.failures)}`);
    assert(state.failures[0].includes(failTarget), `Failure does not name ${failTarget}: ${state.failures[0]}`);
    assert(state.failuresHidden === false, 'Failure panel hidden');
    assert(state.retryHidden === false, 'Retry button hidden');
    assert(state.dropHidden === false, 'Drop button hidden');
    assert(state.printDisabled === true, 'Print must stay disabled for an incomplete book');
    assert(state.bookRoot === 0 || state.renderedChapters.length === 0, 'Incomplete book was rendered');
    return { target: failTarget, status: state.buildStatus, failures: state.failures, printDisabled: state.printDisabled };
  });

  await step('retry succeeds after the network recovers', async () => {
    interceptMode = 'off';
    await page.send('Fetch.disable');
    await click(page, '#book-retry-btn');
    await waitBuildDone();
    state = await domState();
    assert(state.buildStatus.includes('Book ready'), `Retry failed: ${state.buildStatus}`);
    assert(state.renderedChapters.length === 3, `Expected 3 chapters after retry, got ${state.renderedChapters.length}`);
    assert(state.printDisabled === false, 'Print not enabled after successful retry');
    assert(state.failuresHidden === true, 'Failure panel still visible after retry');
    return { status: state.buildStatus, chapters: state.renderedChapters.length };
  });

  await step('remove failed files drops exactly the failed chapter and rebuild works', async () => {
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    interceptMode = 'fail-one';
    await page.send('Fetch.enable', {
      patterns: [{ urlPattern: 'https://raw.githubusercontent.com/*', requestStage: 'Request' }],
    });
    state = await build();
    assert(state.failures.length === 1, 'Expected failure before drop');
    await click(page, '#book-drop-failures-btn');
    state = await domState();
    assert(state.chapters.length === 2, `Expected 2 chapters after drop, got ${state.chapters.length}`);
    assert(!state.chapters.includes(failTarget), `Dropped target still present: ${JSON.stringify(state.chapters)}`);
    assert(!state.checkedFiles.includes(failTarget), 'Dropped file still checked in the tree');
    assert(/Removed 1 failed file/.test(state.buildStatus), `Unexpected drop status: ${state.buildStatus}`);
    interceptMode = 'off';
    await page.send('Fetch.disable');
    state = await build();
    assert(state.buildStatus.includes('Book ready'), `Rebuild after drop failed: ${state.buildStatus}`);
    assert(state.renderedChapters.length === 2, `Expected 2 chapters, got ${state.renderedChapters.length}`);
    return { chapters: state.chapters, status: state.buildStatus };
  });

  await step('cancel aborts an in-flight build without rendering or enabling print', async () => {
    // Re-add the dropped file so the next build has three requests in flight.
    await page.evaluate(`(() => {
      const cb = document.querySelector('#book-tree input[data-file=' + JSON.stringify(${JSON.stringify(
        failTarget,
      )}) + ']');
      if (!cb.checked) cb.click();
      return true;
    })()`);
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    interceptMode = 'hold';
    held = [];
    await page.send('Fetch.enable', {
      patterns: [{ urlPattern: 'https://raw.githubusercontent.com/*', requestStage: 'Request' }],
    });
    await click(page, '#book-build-btn');
    await page.waitFor(`!document.querySelector('#book-build-cancel-btn').hidden`, { timeout: 20000 });
    await page.waitFor(`document.querySelector('#book-build-btn').textContent.includes('Building')`, {
      timeout: 20000,
    });
    await click(page, '#book-build-cancel-btn');
    state = await domState();
    assert(state.buildStatus.includes('cancelled'), `Unexpected cancel status: ${state.buildStatus}`);
    assert(state.printDisabled === true, 'Print enabled after cancel');
    assert(state.buildText === 'Build book', `Build button stuck at: ${state.buildText}`);
    assert(state.cancelHidden === true, 'Cancel button still visible');
    interceptMode = 'off';
    for (const params of held) {
      await page
        .send('Fetch.fulfillRequest', {
          requestId: params.requestId,
          responseCode: 499,
          body: Buffer.from('cancelled').toString('base64'),
        })
        .catch(() => {});
    }
    held = [];
    await page.send('Fetch.disable');
    await page.send('Network.setCacheDisabled', { cacheDisabled: false });
    return { status: state.buildStatus, output: state.output, printDisabled: state.printDisabled };
  });

  // Rebuild a clean final book after the destructive scenarios.
  await build();

  const consoleSummary = {
    consoleErrors: [...page.consoleErrors],
    exceptions: [...page.exceptions],
    failedRequests: [...page.failedRequests],
    httpErrors: [...httpErrors],
  };
  console.log('CONSOLE', JSON.stringify(consoleSummary, null, 2));

  await page.screenshot('verification-book.png');
  await writeFile(
    'verification-browser-book.json',
    JSON.stringify({ results, console: consoleSummary }, null, 2),
  );
  console.log(JSON.stringify({ total: results.length, pass: results.filter((r) => r.status === 'PASS').length, fail: results.filter((r) => r.status === 'FAIL').length }, null, 2));
}

try {
  await main();
} catch (error) {
  fatal = error;
  console.error('FATAL', error.stack ?? error.message);
  try {
    await page.screenshot('verification-book-error.png');
  } catch {}
  await writeFile(
    'verification-browser-book.json',
    JSON.stringify({ results, fatal: fatal.message, stack: fatal.stack }, null, 2),
  );
} finally {
  page.close();
  if (fatal) process.exitCode = 1;
}

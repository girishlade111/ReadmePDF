import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initBookExplorer } from '../src/scripts/book-explorer.js';

const COMMIT = 'abcdef0123456789abcdef0123456789abcdef01';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(text, status = 200) {
  return new Response(text, { status, headers: { 'content-type': 'text/plain' } });
}

function makeDom() {
  const dom = new JSDOM(`<!doctype html><html><body>
    <input id="book-url">
    <button id="book-scan-btn" type="button">Scan repository</button>
    <button id="book-cancel-scan-btn" type="button" hidden>Cancel scan</button>
    <p id="book-status" role="status"></p>
    <p id="book-meta"></p>
    <div id="book-warnings" hidden><ul id="book-warning-list"></ul></div>
    <div id="book-workspace">
      <span id="book-file-summary"></span>
      <button id="book-select-all" type="button"></button>
      <button id="book-clear-selection" type="button"></button>
      <input id="book-search">
      <div id="book-tree"></div>
      <p id="book-tree-empty"></p>
    </div>
    <input id="book-title">
    <input id="book-subtitle">
    <input id="book-cover-toggle" type="checkbox" checked>
    <input id="book-toc-toggle" type="checkbox" checked>
    <label><input type="radio" name="book-theme" value="clean" checked></label>
    <label><input type="radio" name="book-theme" value="business"></label>
    <label><input type="radio" name="book-theme" value="academic"></label>
    <label><input type="radio" name="book-theme" value="dark"></label>
    <ol id="book-chapters"></ol>
    <p id="book-chapters-empty"></p>
    <button id="book-build-btn" type="button" disabled>Build book</button>
    <button id="book-build-cancel-btn" type="button" hidden>Cancel build</button>
    <p id="book-build-status" role="status"></p>
    <div id="book-failures" hidden><ul id="book-failure-list"></ul>
      <button id="book-retry-btn" type="button" hidden></button>
      <button id="book-drop-failures-btn" type="button" hidden></button>
    </div>
    <button id="book-print-btn" type="button" disabled>Print</button>
    <div id="book-preview-bar" hidden><span id="book-preview-label"></span>
      <button id="book-preview-back" type="button"></button>
    </div>
    <article id="book-sheet" class="sheet book-sheet theme-clean">
      <div id="book-output" class="doc book-output"></div>
      <article id="book-preview" class="doc book-preview" hidden></article>
    </article>
  </body></html>`);
  return dom;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function waitFor(predicate, label, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      let value;
      try {
        value = predicate();
      } catch (error) {
        reject(error);
        return;
      }
      if (value) {
        resolve(value);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${label}`));
        return;
      }
      setTimeout(tick, 5);
    };
    tick();
  });
}

let dom;
let previousWindow;
let previousDocument;
let previousFetch;
let pendingRaw;
let rawRequests;

function installFetch() {
  pendingRaw = [];
  rawRequests = [];
  globalThis.fetch = async (url) => {
    const target = String(url);
    if (target === 'https://api.github.com/repos/acme/docs') {
      return jsonResponse({ default_branch: 'main' });
    }
    if (target === `https://api.github.com/repos/acme/docs/commits/main`) {
      return jsonResponse({ sha: COMMIT, commit: { tree: { sha: 'tree-root' } } });
    }
    if (
      target ===
      `https://api.github.com/repos/acme/docs/git/trees/tree-root?recursive=1`
    ) {
      return jsonResponse({
        truncated: false,
        tree: [
          { path: 'README.md', type: 'blob', size: 120, sha: 'readme-sha' },
          { path: 'guide.md', type: 'blob', size: 80, sha: 'guide-sha' },
        ],
      });
    }
    if (target.startsWith('https://raw.githubusercontent.com/acme/docs/')) {
      const request = deferred();
      rawRequests.push({ url: target, ...request });
      return request.promise;
    }
    throw new Error(`Unexpected fetch: ${target}`);
  };
}

async function scan() {
  const url = dom.window.document.getElementById('book-url');
  url.value = 'https://github.com/acme/docs';
  dom.window.document.getElementById('book-scan-btn').click();
  await waitFor(
    () => /Found 2 Markdown files/.test(dom.window.document.getElementById('book-status').textContent),
    'scan to complete',
  );
}

function fileCheckbox(path) {
  return dom.window.document.querySelector(`input[data-file="${path}"]`);
}

beforeEach(() => {
  dom = makeDom();
  previousWindow = globalThis.window;
  previousDocument = globalThis.document;
  previousFetch = globalThis.fetch;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  installFetch();
});

afterEach(() => {
  globalThis.window = previousWindow;
  globalThis.document = previousDocument;
  globalThis.fetch = previousFetch;
  dom.window.close();
});

describe('book controller stale-work protection', () => {
  it('cancels an in-flight build when the chapter selection changes', async () => {
    const controller = initBookExplorer();
    assert.ok(controller);
    await scan();

    dom.window.document.getElementById('book-build-btn').click();
    await waitFor(() => rawRequests.length === 2, 'both chapter fetches to start');

    // Deselect the only two chapters while the build is still waiting for GitHub.
    const readme = fileCheckbox('README.md');
    readme.checked = false;
    readme.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const guide = fileCheckbox('guide.md');
    guide.checked = false;
    guide.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    assert.match(
      dom.window.document.getElementById('book-build-status').textContent,
      /cancelled/i,
      'the controller should tell the reader the build was superseded',
    );

    for (const request of rawRequests) {
      request.resolve(textResponse(`# Stale chapter\n\n${request.url}`));
    }

    await waitFor(
      () => dom.window.document.getElementById('book-build-btn').textContent === 'Build book',
      'the build controls to settle',
    );

    assert.equal(controller.state.built, false, 'a superseded build must not become current');
    assert.equal(controller.state.chapters.length, 0);
    assert.equal(dom.window.document.getElementById('book-print-btn').disabled, true);
    assert.doesNotMatch(
      dom.window.document.getElementById('book-output').textContent,
      /Stale chapter/,
      'stale chapter content must never reach the output',
    );
  });

  it('cancels an in-flight build when a new scan starts', async () => {
    const controller = initBookExplorer();
    assert.ok(controller);
    await scan();

    dom.window.document.getElementById('book-build-btn').click();
    await waitFor(() => rawRequests.length === 2, 'both chapter fetches to start');

    dom.window.document.getElementById('book-scan-btn').click();
    await waitFor(
      () => /Found 2 Markdown files/.test(dom.window.document.getElementById('book-status').textContent),
      'the replacement scan to complete',
    );

    for (const request of rawRequests) {
      request.resolve(textResponse('# Stale chapter\n\nthis must not render'));
    }
    await waitFor(
      () => dom.window.document.getElementById('book-build-btn').textContent === 'Build book',
      'the build controls to settle',
    );

    assert.equal(controller.state.built, false, 'the old build must not attach to the new scan');
    assert.equal(dom.window.document.getElementById('book-print-btn').disabled, true);
    assert.doesNotMatch(
      dom.window.document.getElementById('book-output').textContent,
      /Stale chapter/,
      'the old build must not overwrite the reset output',
    );
  });
});

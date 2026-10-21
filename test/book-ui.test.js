import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  MAX_BOOK_FILES,
  formatBytes,
  bookErrorMessage,
  defaultBookSelection,
  initBookExplorer,
} from '../src/scripts/book-explorer.js';

const astroSource = readFileSync(
  new URL('../src/pages/index.astro', import.meta.url),
  'utf8',
);
const controllerSource = readFileSync(
  new URL('../src/scripts/book-explorer.js', import.meta.url),
  'utf8',
);

describe('formatBytes', () => {
  it('formats bytes, kilobytes, megabytes, and gigabytes', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(1023), '1023 B');
    assert.equal(formatBytes(1024), '1.0 KB');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(10 * 1024), '10 KB');
    assert.equal(formatBytes(1024 * 1024), '1.0 MB');
    assert.equal(formatBytes(6 * 1024 * 1024), '6.0 MB');
    assert.equal(formatBytes(1024 * 1024 * 1024), '1.0 GB');
  });

  it('returns an empty string for invalid or negative input', () => {
    assert.equal(formatBytes(-1), '');
    assert.equal(formatBytes('nope'), '');
    assert.equal(formatBytes(Number.NaN), '');
    assert.equal(formatBytes(undefined), '');
  });
});

describe('bookErrorMessage', () => {
  it('turns every known error code into actionable copy', () => {
    assert.match(bookErrorMessage({ code: 'INVALID_URL' }), /github\.com\/owner\/repo/);
    assert.match(bookErrorMessage({ code: 'PRIVATE_OR_NOT_FOUND' }), /public repositories only/);
    assert.match(bookErrorMessage({ code: 'REF_NOT_FOUND', message: 'No ref.' }), /No ref\./);
    assert.match(bookErrorMessage({ code: 'PATH_NOT_FOUND', message: 'Gone.' }), /^Gone\.$/);
    assert.match(bookErrorMessage({ code: 'NO_MARKDOWN' }), /README, \.md/);
    assert.match(bookErrorMessage({ code: 'TREE_UNAVAILABLE' }), /tree\/<branch>/);
    assert.match(
      bookErrorMessage({ code: 'RATE_LIMITED', resetAt: '12:30' }),
      /12:30/,
    );
    assert.match(bookErrorMessage({ code: 'TOO_MANY_FILES' }), /30/);
    assert.match(bookErrorMessage({ code: 'EMPTY_BOOK' }), /at least one/);
    assert.match(bookErrorMessage({ code: 'BOOK_INCOMPLETE' }), /incomplete/);
    assert.equal(bookErrorMessage({ code: 'CANCELLED' }), 'Cancelled. Nothing was printed.');
    assert.match(bookErrorMessage({ code: 'SANITIZE_UNAVAILABLE' }), /not rendered/);
    assert.match(bookErrorMessage({ code: 'PRINT_UNAVAILABLE' }), /print dialog/);
    assert.match(bookErrorMessage({ code: 'TIMEOUT' }), /retry/i);
    assert.match(bookErrorMessage({ code: 'NETWORK_ERROR' }), /connection/i);
    assert.match(bookErrorMessage({ code: 'FORBIDDEN' }), /Private repositories/);
    assert.match(bookErrorMessage({ code: 'GITHUB_UNAVAILABLE' }), /temporarily/);
  });

  it('prefers a specific message and falls back safely', () => {
    assert.equal(
      bookErrorMessage({ code: 'INVALID_URL', message: 'Bad link.' }),
      'Bad link.',
    );
    assert.equal(bookErrorMessage({ code: 'MYSTERY', message: 'Odd.' }), 'Odd.');
    assert.equal(
      bookErrorMessage({ code: 'MYSTERY' }),
      'Something went wrong. Check the URL and try again.',
    );
    assert.equal(bookErrorMessage(null), 'Something went wrong. Check the URL and try again.');
  });
});

describe('defaultBookSelection', () => {
  it('selects every file when the repository is small', () => {
    assert.deepEqual(defaultBookSelection(['README.md', 'docs/a.md']), [
      'README.md',
      'docs/a.md',
    ]);
    assert.deepEqual(defaultBookSelection([]), []);
    assert.deepEqual(defaultBookSelection(null), []);
  });

  it('prefers README-like files when over the chapter cap', () => {
    const files = [
      ...Array.from({ length: 40 }, (_, index) => `docs/page-${index}.md`),
      'README.md',
      'docs/readme.markdown',
      'CONTRIBUTING.md',
      { path: 'guide/README' },
    ];
    const selected = defaultBookSelection(files, 3);
    assert.deepEqual(selected, ['README.md', 'docs/readme.markdown', 'guide/README']);
    assert.equal(selected.length, 3);
  });

  it('falls back to the first files and supports object input', () => {
    const files = Array.from({ length: 40 }, (_, index) => ({ path: `docs/${index}.md` }));
    const selected = defaultBookSelection(files, 5);
    assert.deepEqual(selected, ['docs/0.md', 'docs/1.md', 'docs/2.md', 'docs/3.md', 'docs/4.md']);
  });

  it('uses the shared 30-file cap by default', () => {
    assert.equal(MAX_BOOK_FILES, 30);
    const files = Array.from({ length: 35 }, (_, index) => `f${index}.md`);
    assert.equal(defaultBookSelection(files).length, 30);
  });
});

describe('book page wiring', () => {
  it('contains every element id the controller queries', () => {
    const ids = [...controllerSource.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]);
    assert.ok(ids.length >= 20, `expected many ids, found ${ids.length}`);
    for (const id of new Set(ids)) {
      assert.match(astroSource, new RegExp(`id="${id}"`), `missing #${id}`);
    }
    assert.match(astroSource, /<section class="band band--white" id="book"/);
    assert.match(astroSource, /id="book-print-btn"[^>]*disabled/);
  });

  it('exposes all four book themes as radios', () => {
    for (const theme of ['clean', 'business', 'academic', 'dark']) {
      assert.match(
        astroSource,
        new RegExp(`name="book-theme" value="${theme}"`),
        `missing theme ${theme}`,
      );
    }
  });

  it('initialises once and reports read-only controller state', () => {
    const dom = new JSDOM(`<!doctype html><html><body>
      <input id="book-url">
      <button id="book-scan-btn" type="button"></button>
      <div id="book-tree"></div>
      <div id="book-output"></div>
      <ol id="book-chapters"></ol>
      <p id="book-chapters-empty"></p>
      <article id="book-preview" hidden></article>
      <div id="book-preview-bar" hidden></div>
      <article id="book-sheet" class="sheet book-sheet theme-clean"></article>
      <p id="book-status"></p>
    </body></html>`);

    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;

    try {
      const controller = initBookExplorer();
      assert.ok(controller);
      assert.deepEqual(controller.state, {
        owner: null,
        repo: null,
        ref: null,
        commitSha: null,
        files: 0,
        selected: 0,
        chapters: [],
        built: false,
        failures: [],
      });
      assert.equal(dom.window.document.body.dataset.bookInit, '1');
      assert.equal(initBookExplorer(), null);
    } finally {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
    }
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRINT_MODES,
  normalizePrintMode,
  setPrintMode,
  clearPrintMode,
  isBookPrintable,
  printDocument,
} from '../src/lib/print.js';
import { assertBookComplete } from '../src/lib/pdf/validation.js';

function completeBook() {
  return {
    owner: 'octo',
    repo: 'demo',
    commitSha: 'sha',
    documents: [{ path: 'README.md', markdown: '# Hi' }],
    complete: true,
    requested: 1,
    failures: [],
  };
}

function fakeView() {
  const listeners = new Map();
  const calls = { print: 0, add: 0, remove: 0 };
  const view = {
    calls,
    document: { body: { dataset: {} } },
    print() {
      calls.print += 1;
    },
    addEventListener(type, listener) {
      calls.add += 1;
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      calls.remove += 1;
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    fire(type) {
      const listener = listeners.get(type);
      listeners.delete(type);
      listener?.();
    },
    listeners,
  };
  return view;
}

describe('print modes', () => {
  it('normalises only the exact book mode', () => {
    assert.deepEqual(PRINT_MODES, { SINGLE: 'single', BOOK: 'book' });
    assert.equal(normalizePrintMode('book'), 'book');
    assert.equal(normalizePrintMode('single'), 'single');
    assert.equal(normalizePrintMode('BOOK'), 'single');
    assert.equal(normalizePrintMode(undefined), 'single');
  });

  it('sets and clears body[data-print-mode]', () => {
    const body = { dataset: {} };
    assert.equal(setPrintMode('book', { body }), 'book');
    assert.equal(body.dataset.printMode, 'book');
    assert.equal(clearPrintMode({ body }), true);
    assert.equal('printMode' in body.dataset, false);
  });

  it('throws PRINT_UNAVAILABLE without a body', () => {
    assert.throws(
      () => setPrintMode('single', { body: null }),
      (error) => error.code === 'PRINT_UNAVAILABLE',
    );
    assert.equal(clearPrintMode({ body: null }), false);
  });
});

describe('isBookPrintable', () => {
  it('is true only for a complete book', () => {
    assert.equal(isBookPrintable(completeBook()), true);
    assert.equal(isBookPrintable(null), false);
    assert.equal(
      isBookPrintable({ ...completeBook(), complete: false, failures: [{ path: 'b.md' }] }),
      false,
    );
    assert.equal(isBookPrintable({ ...completeBook(), requested: 2 }), false);
    assert.equal(isBookPrintable({ ...completeBook(), documents: [] }), false);
  });
});

describe('printDocument', () => {
  it('marks the single sheet, prints, and restores on afterprint', () => {
    const view = fakeView();
    const mode = printDocument({ mode: 'single', view });

    assert.equal(mode, 'single');
    assert.equal(view.calls.print, 1);
    assert.equal(view.document.body.dataset.printMode, 'single');
    assert.equal(typeof view.listeners.get('afterprint'), 'function');

    view.fire('afterprint');
    assert.equal('printMode' in view.document.body.dataset, false);
    assert.equal(view.calls.remove, 1);
  });

  it('restores a pre-existing print mode after printing', () => {
    const view = fakeView();
    view.document.body.dataset.printMode = 'book';

    printDocument({ mode: 'single', view });
    assert.equal(view.document.body.dataset.printMode, 'single');

    view.fire('afterprint');
    assert.equal(view.document.body.dataset.printMode, 'book');
  });

  it('prints a complete book in book mode', () => {
    const view = fakeView();
    assert.equal(printDocument({ mode: 'book', book: completeBook(), view }), 'book');
    assert.equal(view.document.body.dataset.printMode, 'book');
    assert.equal(view.calls.print, 1);
  });

  it('blocks an incomplete book before touching the DOM or the dialog', () => {
    const view = fakeView();
    view.document.body.dataset.printMode = 'single';

    assert.throws(
      () =>
        printDocument({
          mode: 'book',
          book: { ...completeBook(), complete: false, failures: [{ path: 'x.md' }] },
          view,
        }),
      (error) => error.code === 'BOOK_INCOMPLETE',
    );
    assert.equal(view.calls.print, 0);
    assert.equal(view.document.body.dataset.printMode, 'single');
    assert.equal(view.listeners.size, 0);
  });

  it('restores the DOM immediately and rethrows when printing fails', () => {
    const view = fakeView();
    view.print = () => {
      throw new Error('printer on fire');
    };

    assert.throws(() => printDocument({ mode: 'single', view }), /printer on fire/);
    assert.equal('printMode' in view.document.body.dataset, false);
    assert.equal(view.calls.remove, 1);
  });

  it('throws PRINT_UNAVAILABLE when the browser cannot print', () => {
    assert.throws(
      () =>
        printDocument({
          mode: 'single',
          view: { document: { body: { dataset: {} } } },
        }),
      (error) => error.code === 'PRINT_UNAVAILABLE',
    );
    assert.throws(
      () => printDocument({ mode: 'single' }),
      (error) => error.code === 'PRINT_UNAVAILABLE',
    );
  });
});

describe('assertBookComplete isolation', () => {
  it('validates complete books without importing renderer or assembly', () => {
    assert.equal(assertBookComplete(completeBook()), true);
    assert.throws(
      () => assertBookComplete(null),
      (error) => error.code === 'BOOK_INCOMPLETE',
    );
    assert.throws(
      () => assertBookComplete({ documents: [] }),
      (error) => error.code === 'EMPTY_BOOK',
    );
  });
});

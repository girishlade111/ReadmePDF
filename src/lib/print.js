/**
 * Print-mode control.
 *
 * Both the single-document preview and the documentation book live on the same
 * page. `window.print()` has no argument, so the active print target is
 * expressed as `body[data-print-mode]`; print CSS then isolates the matching
 * sheet. A book is only printable when every selected chapter was fetched.
 */
import { githubError } from './errors.js';
import { assertBookComplete } from './pdf/validation.js';

export const PRINT_MODES = Object.freeze({
  SINGLE: 'single',
  BOOK: 'book',
});

/** Unknown or missing values fall back to the single-document mode. */
export function normalizePrintMode(mode) {
  return mode === PRINT_MODES.BOOK ? PRINT_MODES.BOOK : PRINT_MODES.SINGLE;
}

/**
 * Mark which sheet the next print job should use.
 * @returns {'single'|'book'}
 */
export function setPrintMode(mode, { body } = {}) {
  const target = body ?? (typeof document !== 'undefined' ? document.body : null);
  if (!target) {
    throw githubError('PRINT_UNAVAILABLE', 'The page is not ready to print yet.');
  }
  const normalized = normalizePrintMode(mode);
  target.dataset.printMode = normalized;
  return normalized;
}

/** Remove the print target, returning the page to its screen layout. */
export function clearPrintMode({ body } = {}) {
  const target = body ?? (typeof document !== 'undefined' ? document.body : null);
  if (!target) return false;
  delete target.dataset.printMode;
  return true;
}

/**
 * True only when the assembled book represents every selected file.
 * Never renders or prints a partial book.
 */
export function isBookPrintable(book) {
  try {
    assertBookComplete(book);
    return true;
  } catch {
    return false;
  }
}

/**
 * Print the active sheet.
 *
 * The mode is restored on `afterprint` (and immediately if printing throws).
 * The book guard runs before any DOM changes, so an incomplete book cannot
 * flash into the print layout.
 *
 * @param {{
 *   mode?: 'single'|'book',
 *   book?: object,
 *   view?: Window,
 *   body?: HTMLElement,
 * }} [options]
 * @returns {'single'|'book'}
 */
export function printDocument({ mode = PRINT_MODES.SINGLE, book, view, body } = {}) {
  const normalized = normalizePrintMode(mode);
  if (normalized === PRINT_MODES.BOOK) {
    assertBookComplete(book);
  }

  const win = view ?? (typeof window !== 'undefined' ? window : null);
  if (!win || typeof win.print !== 'function') {
    throw githubError(
      'PRINT_UNAVAILABLE',
      'This browser does not expose a print dialog. Use your browser menu to print instead.',
    );
  }
  const target = body ?? win.document?.body ?? null;
  const previous = target?.dataset?.printMode ?? '';

  if (target) target.dataset.printMode = normalized;

  const restore = () => {
    if (!target) return;
    if (previous) target.dataset.printMode = previous;
    else delete target.dataset.printMode;
    if (typeof win.removeEventListener === 'function') {
      win.removeEventListener('afterprint', restore);
    }
  };

  if (typeof win.addEventListener === 'function') {
    win.addEventListener('afterprint', restore, { once: true });
  }

  try {
    win.print();
  } catch (error) {
    restore();
    throw error;
  }
  return normalized;
}

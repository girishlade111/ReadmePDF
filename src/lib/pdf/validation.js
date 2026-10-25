/**
 * Bounded book completeness validation.
 *
 * Lightweight guard to verify a book fetch report is complete before rendering or printing.
 * Kept separate from assembly.js so print.js does not pull in markdown-it or DOMPurify.
 */
import { githubError } from '../errors.js';

/**
 * Throw unless a fetch report represents a complete set of selected files.
 * `assembleBook` uses this by default, and the print guard repeats the check.
 */
export function assertBookComplete(book) {
  if (!book || typeof book !== 'object') {
    throw githubError('BOOK_INCOMPLETE', 'No book data is available to render.');
  }
  const documents = Array.isArray(book.documents) ? book.documents : [];
  if (!documents.length) {
    throw githubError('EMPTY_BOOK', 'Select at least one Markdown file to build a book.');
  }
  if (book.complete !== true) {
    throw githubError(
      'BOOK_INCOMPLETE',
      'This book is incomplete. Reload the failed files before printing or exporting.',
      { failures: Array.isArray(book.failures) ? book.failures : [] },
    );
  }
  if (Array.isArray(book.failures) && book.failures.length) {
    throw githubError(
      'BOOK_INCOMPLETE',
      `${book.failures.length} selected file${
        book.failures.length === 1 ? '' : 's'
      } could not be loaded. The book cannot be printed until every chapter is available.`,
      { failures: book.failures },
    );
  }
  if (
    Number.isInteger(book.requested) &&
    book.requested > 0 &&
    documents.length !== book.requested
  ) {
    throw githubError(
      'BOOK_INCOMPLETE',
      `The book has ${documents.length} of ${book.requested} selected chapters. Reload the missing files before printing.`,
      { requested: book.requested, loaded: documents.length },
    );
  }
  for (const document of documents) {
    if (!document || typeof document.path !== 'string' || typeof document.markdown !== 'string') {
      throw githubError(
        'BOOK_INCOMPLETE',
        'A chapter is missing its Markdown source. Rebuild the book to continue.',
      );
    }
  }
  return true;
}

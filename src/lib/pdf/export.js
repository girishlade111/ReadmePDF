/**
 * Client-side individual-PDF export and ZIP packaging.
 *
 * One PDF is produced for every selected Markdown file. The documents are
 * fetched and sanitised by the existing book pipeline, laid out by the shared
 * A4 renderer, validated, and packed into a real ZIP archive. Everything runs
 * in the browser: no document, image, or generated file is uploaded.
 *
 * The module is loaded with a dynamic `import()` from the book controller so
 * `pdf-lib`, the fonts, and JSZip cost nothing until a reader asks for an
 * export.
 */
import JSZip from 'jszip';
import { defaultBookLabels } from '../../i18n/book-labels.js';
import { assertBookComplete, renderDocumentPreview } from './assembly.js';
import { loadFontBytesSet } from './fonts.js';
import { htmlToBlocks } from './model.js';
import { chapterHeading, renderPdf } from './renderer.js';

export const EXPORT_LIMITS = Object.freeze({
  maxFiles: 30,
  maxPdfBytes: 32 * 1024 * 1024,
  maxZipBytes: 128 * 1024 * 1024,
});

const PDF_EXTENSION = '.pdf';
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const CONTROL_CHARS_GLOBAL = /[\u0000-\u001f\u007f]/g;
const ILLEGAL_SEGMENT_CHARS = /[<>:"|?*]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const MARKDOWN_EXTENSION = /\.(?:md|markdown|mdown)$/i;

/** Error with a stable code and optional per-file evidence. */
export class ExportError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ExportError';
    this.code = code;
    Object.assign(this, details);
  }
}

function cancelledError() {
  return new ExportError('CANCELLED', 'Export cancelled.');
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw cancelledError();
}

function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new ExportError('EXPORT_INVALID_BYTES', 'A generated PDF was not valid binary data.');
}

/**
 * Reject a path that could escape the archive root when extracted.
 *
 * ZIP Slip is an extraction-side vulnerability, so no generated entry may be
 * absolute, contain `..`, use a drive/UNC prefix, or hide control characters.
 * Backslashes are rejected rather than silently normalised: a caller that
 * passes a Windows path has a bug and should fail closed.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function assertSafeZipPath(value) {
  const path = String(value ?? '');
  if (!path.trim()) throw new ExportError('UNSAFE_PATH', 'ZIP entry name is empty.');
  if (path.includes('\\')) {
    throw new ExportError('UNSAFE_PATH', 'ZIP entry names must use forward slashes.');
  }
  if (path.startsWith('/') || path.startsWith('~')) {
    throw new ExportError('UNSAFE_PATH', 'ZIP entry names must be relative.');
  }
  if (/^[a-zA-Z]:/.test(path)) {
    throw new ExportError('UNSAFE_PATH', 'ZIP entry names must not include a drive letter.');
  }
  if (CONTROL_CHARS.test(path)) {
    throw new ExportError('UNSAFE_PATH', 'ZIP entry names must not contain control characters.');
  }
  const segments = path.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new ExportError('UNSAFE_PATH', 'ZIP entry names must not contain traversal segments.');
  }
  return path;
}

/** Non-throwing variant used by tests and defensive UI checks. */
export function isSafeZipPath(value) {
  try {
    assertSafeZipPath(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Turn one repository path segment into a portable filename segment.
 * Unicode letters stay intact; Windows-reserved device names are prefixed
 * instead of being allowed to collide with the operating system.
 *
 * @param {unknown} value
 * @param {string} [fallback]
 */
export function sanitizeSegment(value, fallback = 'document') {
  let segment = String(value ?? '')
    .normalize('NFC')
    .replace(CONTROL_CHARS_GLOBAL, '')
    .replace(ILLEGAL_SEGMENT_CHARS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  if (!segment) segment = fallback;
  if (WINDOWS_RESERVED.test(segment)) segment = `_${segment}`;
  if (segment.length > 120) {
    const dot = segment.lastIndexOf('.');
    const extension = dot > 0 ? segment.slice(dot) : '';
    segment = `${segment.slice(0, 120 - extension.length)}${extension}`;
  }
  return segment;
}

function safeRelativePdfPath(path) {
  const raw = String(path ?? '').normalize('NFC').replace(/\\/g, '/');
  if (!raw.trim()) throw new ExportError('UNSAFE_PATH', 'A selected file has no path.');
  if (raw.startsWith('/') || /^[a-zA-Z]:/.test(raw) || CONTROL_CHARS.test(raw)) {
    throw new ExportError('UNSAFE_PATH', `Unsafe repository path: ${raw}`);
  }
  const segments = raw.split('/');
  if (segments.some((segment) => segment === '..')) {
    throw new ExportError('UNSAFE_PATH', `Unsafe repository path: ${raw}`);
  }
  const cleaned = segments
    .filter((segment) => segment && segment !== '.')
    .map((segment) => sanitizeSegment(segment, 'document'));
  if (!cleaned.length) throw new ExportError('UNSAFE_PATH', `Unsafe repository path: ${raw}`);
  const last = cleaned[cleaned.length - 1].replace(MARKDOWN_EXTENSION, '');
  cleaned[cleaned.length - 1] = `${last || 'document'}${PDF_EXTENSION}`;
  const relative = cleaned.join('/');
  if (relative.length > 240) {
    throw new ExportError('UNSAFE_PATH', `Repository path is too long for a portable ZIP: ${raw}`);
  }
  return relative;
}

function uniqueRelativePath(relative, used) {
  const key = relative.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return relative;
  }
  const dot = relative.lastIndexOf('.');
  const stem = dot > 0 ? relative.slice(0, dot) : relative;
  const extension = dot > 0 ? relative.slice(dot) : '';
  let counter = 2;
  let candidate = `${stem}-${counter}${extension}`;
  while (used.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${stem}-${counter}${extension}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Deterministic archive layout for a list of documents.
 *
 * @param {Array<{path: string}>} documents
 * @param {{ root?: string }} [options]
 */
export function planPdfPaths(documents = [], { root = 'readmepdf-export' } = {}) {
  const folder = sanitizeSegment(root, 'readmepdf-export');
  const used = new Set();
  return documents.map((document) => {
    const relative = uniqueRelativePath(safeRelativePdfPath(document?.path), used);
    return {
      path: String(document?.path ?? ''),
      relative,
      zipPath: assertSafeZipPath(`${folder}/${relative}`),
      fileName: relative.split('/').pop(),
    };
  });
}

/** `%PDF-` header and a trailing `%%EOF` marker, allowing normal whitespace. */
export function isPdfBytes(value) {
  const bytes = toBytes(value);
  if (bytes.length < 8) return false;
  const header = String.fromCharCode(...bytes.subarray(0, 5));
  if (header !== '%PDF-') return false;
  const tail = new TextDecoder('latin1').decode(bytes.subarray(Math.max(0, bytes.length - 2048)));
  return tail.includes('%%EOF');
}

function zipSignatureOk(bytes) {
  return (
    bytes.length > 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06)
  );
}

/**
 * Build a ZIP from validated PDF entries.
 *
 * @param {Array<{ zipPath: string, bytes: Uint8Array|ArrayBuffer }>} entries
 * @param {{ generatedAt?: Date }} [options]
 * @returns {Promise<Uint8Array>}
 */
export async function createZipArchive(entries, { generatedAt = new Date() } = {}) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) throw new ExportError('EXPORT_EMPTY', 'There are no PDFs to package.');
  const zip = new JSZip();
  let total = 0;
  for (const entry of list) {
    const path = assertSafeZipPath(entry?.zipPath);
    const bytes = toBytes(entry?.bytes);
    if (!isPdfBytes(bytes)) {
      throw new ExportError('EXPORT_INVALID_PDF', `Not a valid PDF: ${path}`);
    }
    total += bytes.byteLength;
    if (total > EXPORT_LIMITS.maxZipBytes) {
      throw new ExportError(
        'EXPORT_TOO_LARGE',
        'The generated ZIP would exceed the 128 MB export limit.',
      );
    }
    zip.file(path, bytes, {
      binary: true,
      date: generatedAt,
      createFolders: false,
      unixPermissions: 0o644,
    });
  }
  const archive = await zip.generateAsync({
    type: 'uint8array',
    compression: 'STORE',
    platform: 'UNIX',
    streamFiles: false,
  });
  if (!zipSignatureOk(archive)) {
    throw new ExportError('EXPORT_INVALID_ZIP', 'The generated ZIP archive was invalid.');
  }
  return archive;
}

function archiveRoot(book) {
  const owner = sanitizeSegment(book?.owner, 'repository');
  const repo = sanitizeSegment(book?.repo, 'repository');
  const sha = sanitizeSegment(String(book?.commitSha ?? '').slice(0, 8), 'snapshot');
  return `readmepdf-${owner}-${repo}-${sha}`;
}

/**
 * Render every selected Markdown document to its own PDF and pack the
 * successful results into one ZIP.
 *
 * A single unrenderable document does not destroy the whole export: its error
 * is returned in `failures` and the remaining PDFs are still delivered.
 *
 * @param {{
 *   owner: string, repo: string, commitSha: string, ref?: string,
 *   documents: Array<{ path: string, name?: string, markdown: string }>,
 *   complete?: boolean, requested?: number, failures?: Array<object>
 * }} book
 * @param {{
 *   sanitize?: (html: string) => string | Promise<string>,
 *   labels?: Record<string, any>,
 *   locale?: string,
 *   theme?: string,
 *   fontBytes?: Record<string, ArrayBuffer>,
 *   fetchImpl?: typeof fetch,
 *   baseUrl?: string,
 *   imageLoader?: Function,
 *   parseHtml?: (html: string) => Array<object>,
 *   generatedAt?: Date,
 *   signal?: AbortSignal,
 *   onProgress?: (event: object) => void,
 * }} [options]
 */
export async function exportBookToZip(book, options = {}) {
  assertBookComplete(book);
  const documents = Array.isArray(book.documents) ? book.documents : [];
  if (documents.length > EXPORT_LIMITS.maxFiles) {
    throw new ExportError(
      'EXPORT_TOO_MANY',
      `A ZIP export can contain at most ${EXPORT_LIMITS.maxFiles} PDFs.`,
    );
  }
  const signal = options.signal;
  throwIfAborted(signal);

  const labels = options.labels ?? defaultBookLabels();
  const theme = options.theme ?? 'clean';
  const locale = options.locale ?? 'en';
  const generatedAt = options.generatedAt ?? new Date();
  const parseHtml =
    options.parseHtml ?? ((html) => htmlToBlocks(html));
  const root = archiveRoot(book);
  const used = new Set();
  const failures = [];
  const files = [];

  options.onProgress?.({ phase: 'fonts', done: 0, total: 6 });
  let fontBytes = options.fontBytes;
  if (!fontBytes) {
    try {
      fontBytes = await loadFontBytesSet({
        fetchImpl: options.fetchImpl,
        baseUrl: options.baseUrl,
        onProgress: (done, total) => {
          options.onProgress?.({ phase: 'fonts', done, total });
        },
      });
    } catch (error) {
      throw new ExportError(
        'EXPORT_FONTS',
        'The PDF fonts could not be downloaded. Check the connection and try again.',
        { cause: error },
      );
    }
  }
  throwIfAborted(signal);

  for (const [index, document] of documents.entries()) {
    throwIfAborted(signal);
    let planned;
    try {
      planned = {
        path: String(document?.path ?? ''),
        relative: uniqueRelativePath(safeRelativePdfPath(document?.path), used),
      };
      planned.zipPath = assertSafeZipPath(`${sanitizeSegment(root)}/${planned.relative}`);
      planned.fileName = planned.relative.split('/').pop();
    } catch (error) {
      failures.push({
        path: String(document?.path ?? ''),
        code: error?.code ?? 'UNSAFE_PATH',
        message: error?.message ?? 'Unsafe file path.',
      });
      options.onProgress?.({
        phase: 'document-failed',
        done: index + 1,
        total: documents.length,
        path: String(document?.path ?? ''),
      });
      continue;
    }

    options.onProgress?.({
      phase: 'document',
      done: index,
      total: documents.length,
      path: document.path,
      fileName: planned.fileName,
    });

    try {
      const preview = await renderDocumentPreview({
        document,
        owner: book.owner,
        repo: book.repo,
        commitSha: book.commitSha,
        sanitize: options.sanitize,
        idPrefix: 'export-',
        labels,
      });
      throwIfAborted(signal);
      const blocks = parseHtml(preview.html);
      const title =
        chapterHeading(blocks) || document.name || planned.fileName.replace(/\.pdf$/i, '');
      const result = await renderPdf({
        chapters: [{ path: document.path, title, anchor: 'export-document', blocks }],
        title,
        subtitle: `${book.owner}/${book.repo} · ${document.path}`,
        author: `${book.owner}/${book.repo}`,
        owner: book.owner,
        repo: book.repo,
        ref: book.ref,
        commitSha: book.commitSha,
        locale,
        theme,
        includeCover: false,
        includeToc: false,
        fontBytes,
        imageLoader: options.imageLoader,
        labels,
        signal,
        warnings: [],
        generatedAt,
      });
      const bytes = toBytes(result.bytes);
      if (!isPdfBytes(bytes)) {
        throw new ExportError('EXPORT_INVALID_PDF', 'The renderer returned an invalid PDF.');
      }
      if (bytes.byteLength > EXPORT_LIMITS.maxPdfBytes) {
        throw new ExportError(
          'EXPORT_PDF_TOO_LARGE',
          'This PDF exceeds the 32 MB per-file export limit.',
        );
      }
      const warnings = Array.isArray(result.warnings) ? result.warnings : [];
      files.push({
        path: document.path,
        relative: planned.relative,
        zipPath: planned.zipPath,
        fileName: planned.fileName,
        bytes,
        pageCount: result.pageCount,
        warnings,
      });
      options.onProgress?.({
        phase: 'document-done',
        done: index + 1,
        total: documents.length,
        path: document.path,
        fileName: planned.fileName,
        pageCount: result.pageCount,
        warnings: warnings.length,
      });
    } catch (error) {
      if (error?.code === 'CANCELLED' || signal?.aborted) throw cancelledError();
      failures.push({
        path: String(document?.path ?? ''),
        code: error?.code ?? 'EXPORT_RENDER_FAILED',
        message: error?.message ?? 'This file could not be exported.',
      });
      options.onProgress?.({
        phase: 'document-failed',
        done: index + 1,
        total: documents.length,
        path: String(document?.path ?? ''),
        message: error?.message ?? '',
      });
    }
  }

  throwIfAborted(signal);
  if (!files.length) {
    throw new ExportError(
      'EXPORT_ALL_FAILED',
      'None of the selected files could be exported.',
      { failures },
    );
  }

  options.onProgress?.({
    phase: 'packing',
    done: files.length,
    total: documents.length,
  });
  const zipBytes = await createZipArchive(files, { generatedAt });
  throwIfAborted(signal);

  return {
    zipBytes,
    zipName: `${root}.zip`,
    files: files.map((file) => ({
      path: file.path,
      relative: file.relative,
      zipPath: file.zipPath,
      fileName: file.fileName,
      pageCount: file.pageCount,
      bytes: file.bytes.byteLength,
      warnings: file.warnings,
    })),
    failures,
    totalBytes: files.reduce((sum, file) => sum + file.bytes.byteLength, 0),
    generatedAt,
  };
}

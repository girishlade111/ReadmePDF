import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import JSZip from 'jszip';
import { JSDOM } from 'jsdom';
import { PDFDocument } from 'pdf-lib';

import {
  EXPORT_LIMITS,
  assertSafeZipPath,
  createZipArchive,
  exportBookToZip,
  isPdfBytes,
  isSafeZipPath,
  planPdfPaths,
  sanitizeSegment,
} from '../src/lib/pdf/export.js';
import { htmlToBlocks } from '../src/lib/pdf/model.js';

const FONT_FILES = {
  regular: 'DejaVuSans.ttf',
  bold: 'DejaVuSans-Bold.ttf',
  italic: 'DejaVuSans-Oblique.ttf',
  boldItalic: 'DejaVuSans-BoldOblique.ttf',
  mono: 'DejaVuSansMono.ttf',
  cjk: 'NotoSansCJKsc-Common.otf',
};

const FONT_BYTES = Object.fromEntries(
  Object.entries(FONT_FILES).map(([role, name]) => [
    role,
    readFileSync(new URL(`../public/fonts/${name}`, import.meta.url)),
  ]),
);

const GENERATED_AT = new Date('2026-10-20T12:00:00.000Z');

const parseHtml = (html) =>
  htmlToBlocks(html, { document: new JSDOM(`<body>${html}</body>`).window.document });

async function makePdf(text = 'ReadmePDF') {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([200, 200]);
  page.drawText(text, { x: 20, y: 100, size: 12 });
  return pdf.save();
}

async function readZip(bytes) {
  return JSZip.loadAsync(bytes);
}

async function pdfText(bytes) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const document = await task.promise;
  try {
    const pages = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str ?? '').join(' '));
      page.cleanup();
    }
    return pages.join('\n');
  } finally {
    await task.destroy();
  }
}

describe('ZIP path safety', () => {
  it('accepts portable relative paths', () => {
    for (const path of ['a.pdf', 'docs/a.pdf', 'docs/中文 指南.pdf', 'a/b/c.pdf']) {
      assert.equal(assertSafeZipPath(path), path);
      assert.equal(isSafeZipPath(path), true);
    }
  });

  it('rejects absolute, traversal, drive, backslash, and control-character paths', () => {
    const unsafe = [
      '',
      '   ',
      '/etc/passwd',
      '~/secret.pdf',
      '../escape.pdf',
      'docs/../../escape.pdf',
      'docs/./a.pdf',
      'docs//a.pdf',
      'C:/Windows/a.pdf',
      'C:\\Windows\\a.pdf',
      'docs\\a.pdf',
      'docs/a\u0000.pdf',
      'docs/a\u001f.pdf',
    ];
    for (const path of unsafe) {
      assert.equal(isSafeZipPath(path), false, path);
      assert.throws(() => assertSafeZipPath(path), /UNSAFE|relative|forward|drive|control|traversal|empty/i);
    }
  });
});

describe('portable archive layout', () => {
  it('sanitizes segments without losing Unicode letters', () => {
    assert.equal(sanitizeSegment('Guide 中文.md'), 'Guide 中文.md');
    assert.equal(sanitizeSegment('  a:b*c?.md  '), 'a-b-c-.md');
    assert.equal(sanitizeSegment('CON'), '_CON');
    assert.equal(sanitizeSegment('lpt1.txt'), '_lpt1.txt');
    assert.equal(sanitizeSegment('trailing.  '), 'trailing');
    assert.equal(sanitizeSegment(''), 'document');
    assert.ok(sanitizeSegment('x'.repeat(300)).length <= 120);
  });

  it('preserves repository folders and adds deterministic collision suffixes', () => {
    const planned = planPdfPaths(
      [
        { path: 'README.md' },
        { path: 'docs/README.md' },
        { path: 'docs/readme.md' },
        { path: 'docs/Guide 中文.md' },
        { path: 'docs/Guide 中文.markdown' },
      ],
      { root: 'readmepdf-octo-demo-abc12345' },
    );
    assert.deepEqual(
      planned.map((entry) => entry.relative),
      [
        'README.pdf',
        'docs/README.pdf',
        'docs/readme-2.pdf',
        'docs/Guide 中文.pdf',
        'docs/Guide 中文-2.pdf',
      ],
    );
    assert.equal(planned[0].zipPath, 'readmepdf-octo-demo-abc12345/README.pdf');
    assert.ok(planned.every((entry) => isSafeZipPath(entry.zipPath)));
    assert.deepEqual(
      planned.map((entry) => entry.fileName),
      ['README.pdf', 'README.pdf', 'readme-2.pdf', 'Guide 中文.pdf', 'Guide 中文-2.pdf'],
    );
  });

  it('rejects repository paths that would escape the archive', () => {
    for (const path of ['../escape.md', '/absolute.md', 'C:\\absolute.md', 'docs/\u0000x.md']) {
      assert.throws(() => planPdfPaths([{ path }]), (error) => error.code === 'UNSAFE_PATH');
    }
  });
});

describe('PDF and ZIP validation', () => {
  it('detects a real PDF signature and rejects decoys', async () => {
    const bytes = await makePdf();
    assert.equal(isPdfBytes(bytes), true);
    assert.equal(isPdfBytes(new TextEncoder().encode('%PDF-1.7\nnot a document')), false);
    assert.equal(isPdfBytes(new TextEncoder().encode('plain text')), false);
  });

  it('packs validated PDFs into a readable ZIP and refuses invalid entries', async () => {
    const one = await makePdf('one');
    const two = await makePdf('two');
    const zipBytes = await createZipArchive(
      [
        { zipPath: 'root/one.pdf', bytes: one },
        { zipPath: 'root/nested/two.pdf', bytes: two },
      ],
      { generatedAt: GENERATED_AT },
    );
    assert.equal(zipBytes[0], 0x50);
    assert.equal(zipBytes[1], 0x4b);
    const zip = await readZip(zipBytes);
    assert.deepEqual(Object.keys(zip.files).filter((name) => !zip.files[name].dir).sort(), [
      'root/nested/two.pdf',
      'root/one.pdf',
    ]);
    assert.equal(isPdfBytes(await zip.file('root/one.pdf').async('uint8array')), true);
    assert.equal(isPdfBytes(await zip.file('root/nested/two.pdf').async('uint8array')), true);

    await assert.rejects(
      createZipArchive([{ zipPath: '../escape.pdf', bytes: one }]),
      (error) => error.code === 'UNSAFE_PATH',
    );
    await assert.rejects(
      createZipArchive([{ zipPath: 'root/fake.pdf', bytes: new Uint8Array([1, 2, 3]) }]),
      (error) => error.code === 'EXPORT_INVALID_PDF',
    );
    await assert.rejects(createZipArchive([]), (error) => error.code === 'EXPORT_EMPTY');
  });
});

describe('exportBookToZip', () => {
  const book = {
    owner: 'octo',
    repo: 'demo',
    ref: 'main',
    commitSha: 'abc12345def67890',
    complete: true,
    requested: 3,
    failures: [],
    documents: [
      {
        path: 'README.md',
        markdown: [
          '# ReadmePDF export',
          '',
          'A **real** client-side PDF, packed into a ZIP.',
          '',
          '## Install',
          '',
          '```sh',
          'npm install',
          '```',
        ].join('\n'),
      },
      {
        path: 'docs/readme.md',
        markdown: ['# Merhaba Dünya', '', 'Türkçe içerik ve ğüşiöç harfleri.'].join('\n'),
      },
      {
        path: 'docs/中文 指南.md',
        markdown: ['# 中文标题', '', '这是中文内容。日本語と한국어も確認します。'].join('\n'),
      },
    ],
  };

  it('renders one real PDF per document and returns a valid ZIP', async () => {
    const progress = [];
    const result = await exportBookToZip(book, {
      sanitize: (html) => html,
      parseHtml,
      fontBytes: FONT_BYTES,
      locale: 'en',
      theme: 'clean',
      generatedAt: GENERATED_AT,
      onProgress: (event) => progress.push(event.phase),
    });

    assert.equal(result.zipName, 'readmepdf-octo-demo-abc12345.zip');
    assert.equal(result.files.length, 3);
    assert.deepEqual(result.failures, []);
    assert.ok(result.totalBytes > 1000);
    const zipHeader = Array.from(result.zipBytes.subarray(0, 4));
    assert.deepEqual(zipHeader, [0x50, 0x4b, 0x03, 0x04]);

    const zip = await readZip(result.zipBytes);
    assert.deepEqual(
      result.files.map((file) => file.zipPath),
      [
        'readmepdf-octo-demo-abc12345/README.pdf',
        'readmepdf-octo-demo-abc12345/docs/readme.pdf',
        'readmepdf-octo-demo-abc12345/docs/中文 指南.pdf',
      ],
    );
    for (const file of result.files) {
      const bytes = await zip.file(file.zipPath).async('uint8array');
      assert.equal(isPdfBytes(bytes), true, file.zipPath);
      assert.ok(file.pageCount >= 1);
      const parsed = await PDFDocument.load(bytes);
      assert.ok(parsed.getPageCount() >= 1);
    }

    const english = await zip
      .file('readmepdf-octo-demo-abc12345/README.pdf')
      .async('uint8array');
    const turkish = await zip
      .file('readmepdf-octo-demo-abc12345/docs/readme.pdf')
      .async('uint8array');
    const chinese = await zip
      .file('readmepdf-octo-demo-abc12345/docs/中文 指南.pdf')
      .async('uint8array');
    assert.match(await pdfText(english), /ReadmePDF export/);
    assert.match(await pdfText(turkish), /Merhaba Dünya/);
    assert.match(await pdfText(chinese), /中文标题/);

    assert.equal(progress[0], 'fonts');
    assert.ok(progress.includes('document'));
    assert.ok(progress.includes('document-done'));
    assert.equal(progress.at(-1), 'packing');
  });

  it('returns per-file evidence when one path is unsafe and still exports the rest', async () => {
    const result = await exportBookToZip(
      {
        ...book,
        requested: 4,
        documents: [
          ...book.documents,
          { path: '../escape.md', markdown: '# Escape' },
        ],
      },
      {
        sanitize: (html) => html,
        parseHtml,
        fontBytes: FONT_BYTES,
        generatedAt: GENERATED_AT,
      },
    );
    assert.equal(result.files.length, 3);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].path, '../escape.md');
    assert.equal(result.failures[0].code, 'UNSAFE_PATH');
  });

  it('cancels before downloading fonts', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      exportBookToZip(book, { signal: controller.signal }),
      (error) => error.code === 'CANCELLED',
    );
  });

  it('reports a font download failure explicitly', async () => {
    await assert.rejects(
      exportBookToZip(book, {
        sanitize: (html) => html,
        fetchImpl: async () => {
          throw new Error('offline');
        },
      }),
      (error) => error.code === 'EXPORT_FONTS',
    );
  });

  it('enforces the per-export file cap before rendering', async () => {
    const documents = Array.from({ length: EXPORT_LIMITS.maxFiles + 1 }, (_, index) => ({
      path: `docs/${index}.md`,
      markdown: '# x',
    }));
    await assert.rejects(
      exportBookToZip({ ...book, documents, requested: documents.length }, {}),
      (error) => error.code === 'EXPORT_TOO_MANY',
    );
  });
});

import { readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';

const zipPath = 'C:/Users/Girish Lade/AppData/Local/Temp/opencode/e2e/out/readmepdf-export.zip';
const outDir = 'C:/Users/Girish Lade/AppData/Local/Temp/opencode/e2e/out';
const zip = await JSZip.loadAsync(await readFile(zipPath));
const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir).sort();
const files = [];
let linkTotal = 0;
for (const name of names) {
  const bytes = await zip.file(name).async('uint8array');
  const byteLength = bytes.byteLength;
  const header = Buffer.from(bytes.subarray(0, 5)).toString('latin1');
  const eof = Buffer.from(bytes).lastIndexOf(Buffer.from('%%EOF'));
  let pages = 0;
  let parseError = null;
  try {
    const parsed = await PDFDocument.load(bytes);
    pages = parsed.getPageCount();
  } catch (error) {
    parseError = String(error.message ?? error);
  }
  const task = getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true, useWorkerFetch: false });
  const doc = await task.promise;
  let annotations = 0;
  const uris = [];
  let gotos = 0;
  const text = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const anns = await page.getAnnotations();
    annotations += anns.length;
    for (const annot of anns) {
      if (annot.url) uris.push(annot.url);
      if (annot.subtype === 'Link' && !annot.url) gotos += 1;
    }
    const content = await page.getTextContent();
    text.push(content.items.map((item) => item.str ?? '').join(' '));
    page.cleanup();
  }
  await task.destroy();
  linkTotal += annotations;
  files.push({
    name,
    bytes: byteLength,
    header,
    eofAt: eof,
    pages,
    parseError,
    annotations,
    uris,
    gotos,
    unicodeName: /[^\x20-\x7E]/.test(name),
    unsafePath: name.startsWith('/') || name.includes('..') || /^[A-Za-z]:/.test(name),
    textSample: text.join('\n').slice(0, 160),
  });
}
const report = {
  zipPath,
  zipBytes: (await readFile(zipPath)).length,
  entryCount: files.length,
  allPdfHeaders: files.every((f) => f.header === '%PDF-'),
  allEof: files.every((f) => f.eofAt > 0),
  allParse: files.every((f) => !f.parseError && f.pages > 0),
  uniqueNames: new Set(files.map((f) => f.name)).size === files.length,
  unsafePaths: files.filter((f) => f.unsafePath).map((f) => f.name),
  unicodeNames: files.filter((f) => f.unicodeName).map((f) => f.name),
  totalPages: files.reduce((sum, f) => sum + f.pages, 0),
  annotationTotal: linkTotal,
  files,
};
await writeFile(`${outDir}/zip-report-final.json`, JSON.stringify(report, null, 2), 'utf8');
await writeFile(
  `${outDir}/pdf-links-final.json`,
  JSON.stringify(files.map(({ name, pages, annotations, uris, gotos }) => ({ name, pages, annotations, uris, gotos })), null, 2),
  'utf8',
);
console.log(JSON.stringify({ ...report, files: files.map(({ name, bytes, pages, annotations, uris }) => ({ name, bytes, pages, annotations, uris })) }, null, 2));

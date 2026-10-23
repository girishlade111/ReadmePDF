import { readFileSync } from 'node:fs';
import JSZip from 'jszip';

const zip = await JSZip.loadAsync(
  readFileSync('C:/Users/Girish Lade/AppData/Local/Temp/opencode/e2e/out/readmepdf-export.zip'),
);
const bytes = await zip.file('readmepdf-octo-guide-01234567/README.pdf').async('uint8array');
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
const task = getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true });
const doc = await task.promise;
for (let n = 1; n <= doc.numPages; n += 1) {
  const page = await doc.getPage(n);
  const annots = await page.getAnnotations();
  console.log('page', n, JSON.stringify(annots.map((a) => ({ subtype: a.subtype, url: a.url, dest: a.dest, rect: a.rect }))));
  page.cleanup();
}
await task.destroy();

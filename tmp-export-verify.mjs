import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const zipBytes = new Uint8Array(await readFile('.cache-fonts/export-probe.zip'));
const zip = await JSZip.loadAsync(zipBytes);
for (const [name, entry] of Object.entries(zip.files)) {
  if (entry.dir) continue;
  const data = await entry.async('uint8array');
  const doc = await getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((item) => item.str).join(' ');
  console.log('PDF', name, 'pages', doc.numPages);
  console.log('  text:', JSON.stringify(text.slice(0, 260)));
  const fonts = await doc.getPage(1).then((p) => p.getOperatorList()).then((op) => op.fnArray.length);
  console.log('  ops', fonts);
}

import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFString } from 'pdf-lib';
import { htmlToBlocks } from './src/lib/pdf/model.js';
import { renderPdf } from './src/lib/pdf/renderer.js';

const FONT_FILES = {
  regular: 'DejaVuSans.ttf', bold: 'DejaVuSans-Bold.ttf', italic: 'DejaVuSans-Oblique.ttf',
  boldItalic: 'DejaVuSans-BoldOblique.ttf', mono: 'DejaVuSansMono.ttf', cjk: 'NotoSansCJKsc-Common.ttf',
};
const fontBytes = Object.fromEntries(Object.entries(FONT_FILES).map(([role, name]) => [role, readFileSync(new URL(`./public/fonts/${name}`, import.meta.url))]));

const html = `<p>Before <a href="https://example.com/docs">external link</a> after.</p>
<ul><li><a href="https://example.com/nested">nested link</a> tail</li></ul>
<p><a href="#section">anchor</a></p><h2 id="section">Section</h2>`;
const blocks = htmlToBlocks(html, { document: new JSDOM(`<body>${html}</body>`).window.document });

const result = await renderPdf({
  chapters: [{ path: 'README.md', title: 'Readme', blocks }],
  title: 'Link test', fontBytes, includeCover: false, includeToc: false,
  generatedAt: new Date('2026-10-20T12:00:00Z'),
});
const pdf = await PDFDocument.load(result.bytes);
for (const page of pdf.getPages()) {
  const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  for (let i = 0; i < (annots?.size() ?? 0); i++) {
    const annot = annots.lookup(i, PDFDict);
    const action = annot.lookupMaybe(PDFName.of('A'), PDFDict);
    const uri = action?.lookupMaybe(PDFName.of('URI'), PDFString);
    console.log('subtype', annot.get(PDFName.of('Subtype'))?.toString(), 'S', action?.get(PDFName.of('S'))?.toString(), 'uri', uri?.decodeText());
  }
}

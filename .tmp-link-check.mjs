import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { PDFDocument, PDFName, PDFArray, PDFDict } from 'pdf-lib';
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
console.log('BLOCKS', JSON.stringify(blocks, null, 1).slice(0, 2500));

const result = await renderPdf({
  chapters: [{ path: 'README.md', title: 'Readme', blocks }],
  title: 'Link test', fontBytes, includeCover: false, includeToc: false,
  generatedAt: new Date('2026-10-20T12:00:00Z'),
});
const pdf = await PDFDocument.load(result.bytes);
console.log('PAGES', pdf.getPages().length);
for (const [i, page] of pdf.getPages().entries()) {
  const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  console.log('PAGE', i, 'annots', annots?.size?.() ?? 0);
  if (annots) {
    for (let j = 0; j < annots.size(); j++) {
      const dict = annots.lookup(j, PDFDict);
      console.log('  annot', j, dict?.toString?.().slice(0, 400));
    }
  }
}

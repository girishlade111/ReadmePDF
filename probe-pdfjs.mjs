import fs from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(await fs.readFile('dist-seo/_font-probe2.pdf'));
const doc = await getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();
console.log(JSON.stringify(content.items.map(i=>i.str)));

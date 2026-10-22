import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { htmlToBlocks } from './src/lib/pdf/model.js';
import { createFontPicker } from './src/lib/pdf/fonts.js';
import { wrapRuns } from './src/lib/pdf/text.js';

const fake = (chars) => ({
  widthOfTextAtSize: (text, size) => [...text].length * size * 0.5,
  getCharacterSet: () => chars,
});
// Real chars not needed for shape; use a fake covering all code points in sample.
const all = new Set();
for (let i = 0; i < 0x3000; i += 1) all.add(i);
const roles = ['regular', 'bold', 'italic', 'boldItalic', 'mono', 'cjk'];
const fonts = Object.fromEntries(roles.map((r) => [r, fake([...all])]));
const charsets = Object.fromEntries(roles.map((r) => [r, all]));
const picker = createFontPicker(fonts, charsets);
const html = `<p>Hello <strong>world</strong>, <em>Привет</em>. A <a href="https://example.com/x">link here</a>.</p>`;
const dom = new JSDOM(`<body>${html}</body>`);
const blocks = htmlToBlocks(html, { document: dom.window.document });
console.log(JSON.stringify(blocks, null, 2));
const lines = wrapRuns(blocks[0].runs, { picker, width: 487, size: 10.3 });
console.log(JSON.stringify(lines, null, 2));

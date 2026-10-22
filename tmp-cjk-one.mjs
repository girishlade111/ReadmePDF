import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'node:fs/promises';

const bytes = await fs.readFile('public/fonts/NotoSansCJKsc-Common.otf');
const fk = fontkit.create(bytes);
console.log('numGlyphs', fk.numGlyphs, 'charset', fk.characterSet.length);
for (const cp of [0x20, 0x4e2d, 0x1f600, 0xfffd, 0x2714]) {
  const has = fk.hasGlyphForCodePoint(cp);
  const gid = has ? fk.glyphForCodePoint(cp).id : -1;
  console.log('U+' + cp.toString(16), 'has', has, 'gid', gid);
}

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const font = await doc.embedFont(bytes, { subset: true });
const page = doc.addPage();
page.drawText(' ', { x: 20, y: 700, size: 12, font, opacity: 0 });
const out = await doc.save();
console.log('space-only bytes', out.length);

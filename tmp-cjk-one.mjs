import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'node:fs/promises';

const fontBytes = await fs.readFile('public/fonts/NotoSansCJKsc-Common.otf');
const text = process.argv[2] === 'null' ? null : JSON.parse(process.argv[2]);

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const font = await doc.embedFont(fontBytes, { subset: true });
const page = doc.addPage();
if (text !== null) page.drawText(text, { x: 20, y: 700, size: 12, font });
try {
  const out = await doc.save();
  console.log('OK', JSON.stringify(text), out.length);
} catch (error) {
  console.log('FAIL', JSON.stringify(text), error.message);
}

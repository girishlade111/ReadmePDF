import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'node:fs/promises';
const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
for (const file of ['DejaVuSans.ttf','NotoSansCJKsc-Common.otf']) {
  const bytes = await fs.readFile('public/fonts/'+file);
  const font = await doc.embedFont(bytes, { subset: true });
  const set = font.getCharacterSet();
  console.log(file, 'glyphs', set.length, 'CJK', set.includes(0x4e2d), 'Cyr', set.includes(0x0416), 'tr', set.includes(0x015f), 'emoji', set.includes(0x1f600));
  const page = doc.addPage();
  page.drawText('Hello 中文 Привет ş', { x: 50, y: 700, size: 12, font });
}
const out = await doc.save();
await fs.writeFile('dist-seo/_font-probe.pdf', out);
console.log('bytes', out.length);

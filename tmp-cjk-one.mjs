import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'node:fs/promises';

for (const file of ['DejaVuSans.ttf', 'DejaVuSansMono.ttf', 'NotoSansCJKsc-Common.otf']) {
  const bytes = await fs.readFile('public/fonts/' + file);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(bytes, { subset: true });
  const page = doc.addPage();
  try {
    const out = await doc.save();
    console.log('unused OK', file, out.length);
  } catch (error) {
    console.log('unused FAIL', file, error.message);
  }
}

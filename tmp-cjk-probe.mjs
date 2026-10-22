import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'node:fs/promises';

process.on('uncaughtException', (error) => {
  console.log('UNCAUGHT', error.message);
});
process.on('unhandledRejection', (error) => {
  console.log('UNHANDLED', error?.message);
});

const fontBytes = await fs.readFile('public/fonts/NotoSansCJKsc-Common.otf');

async function run(name, draw) {
  try {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fontBytes, { subset: true });
    const page = doc.addPage();
    if (draw) page.drawText(draw, { x: 20, y: 700, size: 12, font });
    const out = await doc.save();
    console.log('OK  ', name, out.length);
  } catch (error) {
    console.log('FAIL', name, error.message);
  }
}

await run('unused', null);
await run('ascii-unmapped', 'hello');
await run('emoji-grin', '\u{1F600}');
await run('replacement', '\uFFFD');
await run('han', '\u4E2D');
console.log('done');

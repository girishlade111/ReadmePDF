import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const text = '中文标题 日本語の見出し ひらがな、カタカナ、漢字を混在させます。 한국어 문장입니다.';
const fonts = {
  fullTtf: 'C:/Users/Girish Lade/OneDrive/Desktop/ReadmePDF/.cache-fonts/NotoSansCJKsc-Common.ttf',
  smallTtf: 'C:/Users/Girish Lade/AppData/Local/Temp/cjk-test-small.ttf',
  malgun: 'C:/Windows/Fonts/malgun.ttf',
};

for (const [name, file] of Object.entries(fonts)) {
  const bytes = fs.readFileSync(file);
  const font = fontkit.create(bytes);
  const glyphs = font.layout(text).glyphs;
  console.log(name, 'font glyphs', font.numGlyphs, 'layout', glyphs.length,
    'ids', glyphs.slice(0, 12).map((g) => `${g.id}:${g.codePoints.map((c) => c.toString(16)).join('.')}`).join(' '));

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const embedded = await pdf.embedFont(bytes, { subset: true });
  const page = pdf.addPage([595, 842]);
  page.drawText(text, { x: 40, y: 760, size: 18, font: embedded });
  const out = await pdf.save();
  const dest = `C:/Users/Girish Lade/AppData/Local/Temp/opencode/e2e/out/png/diag-${name}.pdf`;
  fs.writeFileSync(dest, out);
  console.log('  pdf bytes', out.length, '->', dest);
}

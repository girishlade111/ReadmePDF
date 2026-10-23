import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
const lines = [
  '中文标题：简体中文测试，汉字混排。',
  '日本語の見出し：ひらがな、カタカナ、漢字。',
  '한국어 문장입니다. 한글 테스트.',
  'Mixed Latin, Türkçe, Русский, Ελληνικά.',
  'Rare: 龘 齉 鬱 麤',
];
const bytes = fs.readFileSync('C:/Users/Girish Lade/AppData/Local/Temp/cjk-padded4.ttf');
const pdf = await PDFDocument.create();
pdf.registerFontkit(fontkit);
const embedded = await pdf.embedFont(bytes, { subset: true });
const page = pdf.addPage([595, 500]);
let y = 450;
for (const line of lines) { page.drawText(line, { x: 30, y, size: 16, font: embedded }); y -= 40; }
const out = await pdf.save();
fs.writeFileSync('C:/Users/Girish Lade/AppData/Local/Temp/opencode/e2e/out/png/diag-padded4-multi.pdf', out);
console.log('pdf bytes', out.length);

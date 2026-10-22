import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'node:fs/promises';

const fontBytes = await fs.readFile('public/fonts/NotoSansCJKsc-Common.otf');

const groups = {
  han: '中文文档测试导出阅读器支持简体繁体日本語한국어',
  punct: '。，、；：？！“”‘’（）《》【】…—',
  full: 'ＡＢＣ１２３％＆＃＠',
  kana: 'あいうえおアイウエオ',
  hangul: '가나다라마바사',
  symbols: '✓✔✗✘→←↑↓•·§¶©®™°±×÷',
  emoji: '😀🎉🚀',
  accents: 'şŞğĞıİçÇöÖüÜñÑ',
};

async function tryText(text) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const missing = [...new Set([...text].filter((c) => !font.getCharacterSet().includes(c.codePointAt(0))))];
  const usable = [...text].filter((c) => font.getCharacterSet().includes(c.codePointAt(0))).join('');
  const page = doc.addPage();
  if (usable) page.drawText(usable, { x: 20, y: 700, size: 12, font });
  const out = await doc.save();
  return { bytes: out.length, missing };
}

for (const [name, text] of Object.entries(groups)) {
  try {
    const result = await tryText(text);
    console.log('OK  ', name, result.bytes, 'missing', result.missing.map((c) => 'U+' + c.codePointAt(0).toString(16)).join(','));
  } catch (error) {
    console.log('FAIL', name, error.name, error.message);
  }
}

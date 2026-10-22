import { readFile, writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
import { FONT_FILES } from './src/lib/pdf/fonts.js';
import { htmlToBlocks } from './src/lib/pdf/model.js';
import { exportBookToZip } from './src/lib/pdf/export.js';

const doubleBuffer = (buffer) =>
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const fontBytes = {};
for (const [role, path] of Object.entries(FONT_FILES)) {
  fontBytes[role] = doubleBuffer(await readFile(new URL(`./public${path}`, import.meta.url)));
}

const book = {
  owner: 'ladestack',
  repo: 'readmepdf',
  commitSha: '552192b68867b200a1b326efc6467a42c9fab663',
  ref: 'main',
  complete: true,
  requested: 4,
  failures: [],
  documents: [
    {
      path: 'README.md',
      markdown: `# ReadmePDF

Hello **world**, *emphasis*, \`inline code\`, and Türkçe şğüıöç.

## Install

\`\`\`bash
npm install readmepdf
\`\`\`

- one
- two
  - nested
`,
    },
    {
      path: 'docs/README.md',
      markdown: `# 中文文档

这是一个导出测试。支持简体中文、标点符号：，。！？以及全角字符ＡＢＣ。

## 安装

| 名称 | 值 |
| --- | --- |
| 甲 | 一 |
`,
    },
    {
      path: 'docs/Guide 中文.md',
      markdown: `# 日本語ガイド

こんにちは。한국어 문서도 함께 표시됩니다.

> 引用文です。
`,
    },
    {
      path: 'docs/emoji.md',
      markdown: `# Unicode test

Emoji 😀🎉🚀 must not crash the exporter. Replaced glyph: \uFFFD.
`,
    },
  ],
};

const events = [];
const result = await exportBookToZip(book, {
  fontBytes,
  locale: 'en',
  theme: 'clean',
  labels: undefined,
  sanitize: (html) => html,
  parseHtml: (html) => htmlToBlocks(html, { document: new JSDOM(`<body>${html}</body>`).window.document }),
  onProgress: (event) => events.push(event),
});

await writeFile('.cache-fonts/export-probe.zip', result.zipBytes);
console.log('zip bytes', result.zipBytes.length, 'file', result.zipName);
console.log('files', result.files.map((file) => [file.zipPath, file.bytes, file.pageCount]));
console.log('failures', result.failures);
console.log('events', events.map((event) => event.phase).join(','));

const zip = await JSZip.loadAsync(result.zipBytes);
for (const [name, entry] of Object.entries(zip.files)) {
  if (entry.dir) continue;
  const data = await entry.async('uint8array');
  const head = Buffer.from(data.slice(0, 5)).toString('latin1');
  const tail = Buffer.from(data.slice(-64)).toString('latin1');
  console.log('entry', name, data.length, head, tail.includes('%%EOF'));
}

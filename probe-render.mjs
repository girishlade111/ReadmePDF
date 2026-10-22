import { readFile, writeFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { htmlToBlocks } from './src/lib/pdf/model.js';
import { renderPdf } from './src/lib/pdf/renderer.js';
import { FONT_FILES } from './src/lib/pdf/fonts.js';

const doubleBuffer = (buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

const fontBytes = {};
for (const [role, path] of Object.entries(FONT_FILES)) {
  fontBytes[role] = doubleBuffer(await readFile(new URL(`./public${path}`, import.meta.url)));
}

const html = `
<h1 id="intro">Project 文档</h1>
<p>Hello <strong>world</strong>, <em>Привет</em>, ş ğ İ. A <a href="https://example.com/x">link here</a>.</p>
<h2 id="install">Install</h2>
<ul><li>First item with a long sentence that should wrap nicely across the page when the text is long enough to exceed the line width.</li>
<li>Second<ul><li>Nested item 中文</li></ul></li></ul>
<pre><code>npm install readmepdf
console.log("xD");
</code></pre>
<blockquote><p>A quoted paragraph that should get a rule. 日本語のテキスト。</p></blockquote>
<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>
<tr><td>alpha</td><td>one</td></tr><tr><td>beta</td><td>two</td></tr></tbody></table>
<p>한국어 텍스트 and русский текст.</p>
`;

const dom = new JSDOM(`<body>${html}</body>`);
const blocks = htmlToBlocks(html, { document: dom.window.document });
console.log('blocks', blocks.length, JSON.stringify(blocks[0]).slice(0, 120));

const warnings = [];
const result = await renderPdf({
  chapters: [{ path: 'README.md', title: 'Project 文档', anchor: 'doc-1', blocks }],
  title: 'Project 文档',
  subtitle: 'A test document',
  owner: 'owner',
  repo: 'repo',
  ref: 'main',
  commitSha: 'abcdef1234567890',
  locale: 'en',
  theme: 'clean',
  includeCover: false,
  includeToc: false,
  fontBytes,
  labels: { coverEyebrow: 'README TO PDF' },
  warnings,
});

await writeFile('probe-render.pdf', result.bytes);
console.log('pages', result.pageCount, 'bytes', result.bytes.length, 'warnings', warnings);

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const doc = await pdfjs.getDocument({ data: new Uint8Array(result.bytes), useSystemFonts: false }).promise;
console.log('pdfjs pages', doc.numPages);
for (let i = 1; i <= doc.numPages; i += 1) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  console.log(`--- page ${i} ---`);
  console.log(content.items.map((item) => item.str).join(' ').slice(0, 900));
}
const annotations = await (await doc.getPage(1)).getAnnotations();
console.log('annotations page1', annotations.length, annotations.map(a => `${a.subtype}:${a.url ?? ''}`).slice(0, 5));

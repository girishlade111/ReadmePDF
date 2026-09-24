import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdownSync, extractHeadings, buildTocHtml } from '../src/lib/markdown.js';

describe('markdown render (GFM)', () => {
  it('renders tables, task lists, strikethrough, fenced code', () => {
    const md = [
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '- [x] done',
      '- [ ] todo',
      '',
      '~~struck~~',
      '',
      '```js',
      'const x = 1;',
      '```',
    ].join('\n');
    const html = renderMarkdownSync(md);
    assert.match(html, /<table>/);
    assert.match(html, /contains-task-list|task-list-item/);
    assert.match(html, /<del>struck<\/del>|<s>struck<\/s>/);
    assert.match(html, /language-js/);
  });
});

describe('TOC', () => {
  it('extracts H1-H4 outside fences with unique slugs', () => {
    const md = '# Title\n\n## A\n\n## A\n\n```md\n# not a heading\n```\n\n##### too deep\n';
    const hs = extractHeadings(md);
    assert.deepEqual(hs.map((h) => h.level), [1, 2, 2]);
    assert.notEqual(hs[1].slug, hs[2].slug);
  });
  it('builds TOC only for 3+ headings', () => {
    assert.equal(buildTocHtml([{ level: 1, text: 'a', slug: 'a' }]), '');
    const toc = buildTocHtml([
      { level: 1, text: 'a', slug: 'a' },
      { level: 2, text: 'b', slug: 'b' },
      { level: 2, text: 'c', slug: 'c' },
    ]);
    assert.match(toc, /href="#a"/);
    assert.match(toc, /toc-l2/);
  });
});

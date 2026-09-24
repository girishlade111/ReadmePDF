import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchReadme, rewriteRelativeUrls } from '../src/lib/github.js';
import { renderMarkdownSync, extractHeadings, buildTocHtml } from '../src/lib/markdown.js';

const README = `# Demo Project

![logo](docs/logo.png)

[![build](img/badge.svg)](docs/ci.md)

## Install

\`\`\`md
Example, do not rewrite: [![x](a.png)](b.md)
\`\`\`

## Usage

See the [guide](docs/guide.md). Logo again: ![logo][imgref].

[imgref]: docs/logo.png
[guide-ref]: docs/other.md

[docs]: https://example.com/y
`;

/** Full MVP pipeline with GitHub mocked: fetch → rewrite → render → TOC. */
describe('full pipeline (mocked GitHub)', () => {
  const mockFetch = async (url) => {
    if (url.startsWith('https://api.github.com/repos/')) {
      return { ok: true, status: 200, json: async () => ({ default_branch: 'main' }) };
    }
    if (url.endsWith('/main/README.md')) {
      return { ok: true, status: 200, text: async () => README };
    }
    return { ok: false, status: 404, text: async () => '' };
  };

  it('fetches, resolves paths, renders HTML with TOC and no leaks', async () => {
    const res = await fetchReadme('https://github.com/o/r', { fetchFn: mockFetch });
    assert.equal(res.branch, 'main');

    const effective = rewriteRelativeUrls(res.markdown, res);
    // Images → raw, doc links → blob, fenced example untouched, no stash leakage.
    assert.match(effective, /raw\.githubusercontent\.com\/o\/r\/main\/docs\/logo\.png/);
    assert.match(
      effective,
      /\[!\[build\]\(https:\/\/raw\.githubusercontent\.com\/o\/r\/main\/img\/badge\.svg\)\]\(https:\/\/github\.com\/o\/r\/blob\/main\/docs\/ci\.md\)/,
    );
    assert.match(effective, /\[imgref\]: https:\/\/raw\.githubusercontent\.com/);
    assert.match(effective, /\[guide-ref\]: https:\/\/github\.com\/o\/r\/blob\/main/);
    assert.match(effective, /\[\!\s*\[x\]\(a\.png\)\s*\]\(b\.md\)/);
    assert.doesNotMatch(effective, /RPDF-STASH/);

    const headings = extractHeadings(effective);
    assert.ok(headings.length >= 3);
    const toc = buildTocHtml(headings);
    assert.match(toc, /href="#demo-project"/);

    const html = renderMarkdownSync(toc + effective);
    assert.match(html, /<img[^>]*raw\.githubusercontent\.com/);
    assert.match(html, /<table>|<ul>|<code>/);
  });
});

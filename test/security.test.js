import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { SANITIZE_OPTIONS, sanitizeHtml } from '../src/lib/sanitize.js';
import { renderMarkdownDocument } from '../src/lib/markdown.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const purify = createDOMPurify(dom.window);

const XSS = [
  '<p onclick="alert(1)">hello</p>',
  '<script>alert(1)</script>',
  '<iframe src="https://evil.example"></iframe>',
  '<form action="/collect"><input name="secret"></form>',
  '<a href="javascript:alert(1)" target="_blank" rel="noopener">bad link</a>',
  '<img src="https://example.com/ok.png" onerror="alert(1)">',
  '<div srcdoc="<script>alert(1)</script>">srcdoc</div>',
].join('');

describe('sanitizeHtml', () => {
  it('refuses to run without a browser when no engine is injected', async () => {
    await assert.rejects(sanitizeHtml('<b>x</b>'), (error) => {
      assert.equal(error.code, 'SANITIZE_UNAVAILABLE');
      return true;
    });
  });

  it('passes the locked-down options to an injected engine', async () => {
    let received = null;
    const engine = {
      sanitize(html, options) {
        received = options;
        return `<!--clean-->${html}`;
      },
    };
    const output = await sanitizeHtml('<b>x</b>', { purify: engine });
    assert.equal(output, '<!--clean--><b>x</b>');
    assert.deepEqual(received, { ...SANITIZE_OPTIONS });
    assert.equal(Object.isFrozen(SANITIZE_OPTIONS), true);
    for (const tag of ['script', 'iframe', 'object', 'embed', 'form']) {
      assert.ok(SANITIZE_OPTIONS.FORBID_TAGS.includes(tag), tag);
    }
    assert.equal(SANITIZE_OPTIONS.ALLOW_UNKNOWN_PROTOCOLS, false);
  });

  it('coerces null and rejects a non-string sanitizer result', async () => {
    const engine = { sanitize: (html) => (html === '' ? 'empty' : html) };
    assert.equal(await sanitizeHtml(null, { purify: engine }), 'empty');

    await assert.rejects(
      sanitizeHtml('<b>x</b>', { purify: { sanitize: () => null } }),
      (error) => error.code === 'SANITIZE_UNAVAILABLE',
    );
    await assert.rejects(
      sanitizeHtml('<b>x</b>', { purify: {} }),
      (error) => error.code === 'SANITIZE_UNAVAILABLE',
    );
  });

  it('strips scripts, event handlers, frames, forms, and javascript URLs', async () => {
    const clean = await sanitizeHtml(XSS, { purify });

    assert.doesNotMatch(clean, /<script/i);
    assert.doesNotMatch(clean, /<iframe/i);
    assert.doesNotMatch(clean, /<form/i);
    assert.doesNotMatch(clean, /onclick=/i);
    assert.doesNotMatch(clean, /onerror=/i);
    assert.doesNotMatch(clean, /javascript:/i);
    assert.doesNotMatch(clean, /srcdoc=/i);
    assert.match(clean, /hello/);
    assert.match(clean, /example\.com\/ok\.png/);
    // Safe GitHub links keep their new-tab attributes.
    assert.match(clean, /target="_blank"/);
    assert.match(clean, /rel="noopener"/);
  });
});

describe('renderMarkdownDocument sanitization', () => {
  it('renders scoped heading ids and passes output through the sanitizer', async () => {
    let calls = 0;
    const result = await renderMarkdownDocument('# A\n\n## A', {
      idPrefix: 'doc-1-',
      sanitize: async (html) => {
        calls += 1;
        return html.replace(/<h1/g, '<h1 data-clean="yes"');
      },
    });

    assert.equal(calls, 1);
    assert.match(result.html, /data-clean="yes"/);
    assert.match(result.html, /id="doc-1-a"/);
    assert.match(result.html, /id="doc-1-a-2"/);
    assert.deepEqual(
      result.headings.map((heading) => heading.slug),
      ['doc-1-a', 'doc-1-a-2'],
    );
  });

  it('rejects instead of returning raw HTML when sanitization fails', async () => {
    await assert.rejects(
      renderMarkdownDocument('# Safe', {
        sanitize: () => {
          throw new Error('purifier offline');
        },
      }),
      /purifier offline/,
    );
  });

  it('removes event handlers from a real DOMPurify pass', async () => {
    const result = await renderMarkdownDocument('<img src="x" onerror="alert(1)">', {
      sanitize: (html) => sanitizeHtml(html, { purify }),
    });
    assert.doesNotMatch(result.html, /onerror/);
    assert.match(result.html, /<img/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOK_CHAPTER_PREFIX,
  documentAnchor,
  documentIdPrefix,
  resolveHeadingAnchor,
  assertBookComplete,
  assembleBook,
  renderDocumentPreview,
} from '../src/lib/pdf/assembly.js';

function makeBook(overrides = {}) {
  return {
    owner: 'octo',
    repo: 'demo',
    commitSha: 'abc123def4567890',
    ref: 'main',
    documents: [
      {
        path: 'README.md',
        name: 'README.md',
        markdown: [
          '# Setup',
          '',
          'Welcome.',
          '',
          '## Install',
          '',
          '![screenshot](images/my%20shot.png)',
          '',
          '[Jump](#install)',
          '',
          '[Second](docs/b.md#install)',
          '',
          '[Guide](docs/guide.md)',
          '',
          '[Site](https://example.com)',
        ].join('\n'),
      },
      {
        path: 'docs/b.md',
        name: 'b.md',
        markdown: [
          '# Setup',
          '',
          'Back to [start](../README.md#setup).',
          '',
          '![diagram](../assets/diagram.png)',
        ].join('\n'),
      },
    ],
    complete: true,
    requested: 2,
    failures: [],
    ...overrides,
  };
}

function errorCode(fn) {
  try {
    fn();
  } catch (error) {
    return error.code;
  }
  return null;
}

describe('book anchors and heading resolution', () => {
  it('maps a zero-based document index to 1-based chapter anchors', () => {
    assert.equal(documentAnchor(0), 'doc-1');
    assert.equal(documentAnchor(4), 'doc-5');
    assert.equal(documentIdPrefix(0), 'doc-1-');
    assert.equal(BOOK_CHAPTER_PREFIX, 'doc-');
  });

  it('resolves GitHub anchors, percent encoding, and heading text', () => {
    const headings = [
      { slug: 'install' },
      { slug: 'setup-guide' },
      { slug: '中文说明' },
    ];
    assert.equal(resolveHeadingAnchor(headings, '#install'), 'install');
    assert.equal(resolveHeadingAnchor(headings, 'Install'), 'install');
    assert.equal(resolveHeadingAnchor(headings, 'setup_guide'), 'setup-guide');
    assert.equal(resolveHeadingAnchor(headings, 'Setup Guide'), 'setup-guide');
    assert.equal(
      resolveHeadingAnchor(headings, `#${encodeURIComponent('中文说明')}`),
      '中文说明',
    );
    assert.equal(resolveHeadingAnchor(headings, 'missing'), 'missing');
    assert.equal(resolveHeadingAnchor(headings, ''), 'section');
  });
});

describe('assertBookComplete', () => {
  it('rejects missing, empty, partial, and malformed books', () => {
    assert.equal(errorCode(() => assertBookComplete(null)), 'BOOK_INCOMPLETE');
    assert.equal(
      errorCode(() => assertBookComplete({ documents: [], complete: true })),
      'EMPTY_BOOK',
    );
    assert.equal(
      errorCode(() => assertBookComplete({ documents: [{ path: 'a.md', markdown: '' }] })),
      'BOOK_INCOMPLETE',
    );

    const withFailures = {
      documents: [{ path: 'a.md', markdown: '# A' }],
      complete: true,
      requested: 2,
      failures: [{ path: 'b.md', code: 'NETWORK_ERROR' }],
    };
    const failureError = (() => {
      try {
        assertBookComplete(withFailures);
      } catch (error) {
        return error;
      }
      return null;
    })();
    assert.equal(failureError.code, 'BOOK_INCOMPLETE');
    assert.deepEqual(failureError.failures, withFailures.failures);

    assert.equal(
      errorCode(() =>
        assertBookComplete({
          documents: [{ path: 'a.md', markdown: '# A' }],
          complete: true,
          requested: 3,
          failures: [],
        }),
      ),
      'BOOK_INCOMPLETE',
    );

    assert.equal(
      errorCode(() =>
        assertBookComplete({
          documents: [{ path: 'a.md' }],
          complete: true,
          requested: 1,
          failures: [],
        }),
      ),
      'BOOK_INCOMPLETE',
    );
  });

  it('accepts a complete book', () => {
    assert.equal(assertBookComplete(makeBook()), true);
  });
});

describe('assembleBook', () => {
  it('scopes heading ids and rewrites images and links', async () => {
    const result = await assembleBook(makeBook(), {
      title: 'My <Book>',
      subtitle: 'A "quoted" & fast guide',
    });

    assert.equal(result.chapterCount, 2);
    assert.equal(result.requested, 2);
    assert.equal(result.complete, true);
    assert.deepEqual(result.failures, []);
    assert.equal(result.title, 'My <Book>');

    const { html } = result;
    assert.match(html, /<section class="book-chapter" id="doc-1"/);
    assert.match(html, /<section class="book-chapter" id="doc-2"/);
    assert.match(html, /id="doc-1-setup"/);
    assert.match(html, /id="doc-1-install"/);
    assert.match(html, /id="doc-2-setup"/);
    assert.match(html, /id="doc-2-install"/);

    // In-document and cross-document fragments point at scoped ids.
    assert.match(html, /href="#doc-1-install"/);
    assert.match(html, /href="#doc-2-install"/);
    assert.match(html, /href="#doc-1-setup"/);

    // Selected docs link internally; unselected docs go to GitHub at the pin.
    assert.doesNotMatch(html, /blob\/abc123def4567890\/docs\/b\.md/);
    assert.match(
      html,
      /github\.com\/octo\/demo\/blob\/abc123def4567890\/docs\/guide\.md/,
    );
    assert.match(html, /href="https:\/\/example\.com"/);

    // Every image is pinned to the resolved commit and encoded exactly once.
    assert.match(
      html,
      /raw\.githubusercontent\.com\/octo\/demo\/abc123def4567890\/images\/my%20shot\.png/,
    );
    assert.match(
      html,
      /raw\.githubusercontent\.com\/octo\/demo\/abc123def4567890\/assets\/diagram\.png/,
    );
    assert.doesNotMatch(html, /%2520/);
    assert.doesNotMatch(html, /RPDF-STASH/);

    assert.deepEqual(
      result.documents.map((document) => document.headings.map((heading) => heading.slug)),
      [
        ['doc-1-setup', 'doc-1-install'],
        ['doc-2-setup'],
      ],
    );

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'every element id is unique');
  });

  it('escapes cover and TOC metadata', async () => {
    const result = await assembleBook(makeBook(), {
      title: '</h1><script>alert(1)</script>',
      subtitle: '"><img src=x onerror=alert(1)>',
    });

    assert.match(result.coverHtml, /&lt;\/h1&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(result.coverHtml, /&quot;&gt;&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(result.coverHtml, /<script>/);
    assert.match(result.tocHtml, /Contents · &lt;\/h1&gt;/);
    assert.match(result.html, /octo\/demo/);
    assert.match(result.coverHtml, /2 chapters/);
  });

  it('omits the cover and master TOC when disabled', async () => {
    const result = await assembleBook(makeBook(), {
      includeCover: false,
      includeToc: false,
    });
    assert.equal(result.coverHtml, '');
    assert.equal(result.tocHtml, '');
    assert.doesNotMatch(result.html, /book-cover/);
    assert.doesNotMatch(result.html, /book-toc/);
    assert.match(result.html, /id="doc-1"/);
  });

  it('sanitises every chapter before concatenation', async () => {
    let calls = 0;
    const result = await assembleBook(makeBook(), {
      sanitize: (html) => {
        calls += 1;
        return html.replace(/<img /g, '<img data-clean="yes" ');
      },
    });
    assert.equal(calls, 2);
    assert.equal((result.html.match(/data-clean="yes"/g) ?? []).length, 2);
  });

  it('fails closed when the sanitizer rejects', async () => {
    await assert.rejects(
      assembleBook(makeBook(), {
        sanitize: async () => {
          throw Object.assign(new Error('sanitizer exploded'), {
            code: 'SANITIZE_UNAVAILABLE',
          });
        },
      }),
      (error) => error.code === 'SANITIZE_UNAVAILABLE' && /exploded/.test(error.message),
    );
  });

  it('requires repository metadata after the completeness check', async () => {
    await assert.rejects(
      assembleBook(makeBook({ commitSha: '' })),
      (error) => error.code === 'INTERNAL',
    );
  });
});

describe('renderDocumentPreview', () => {
  const document = {
    path: 'docs/readme.md',
    markdown: [
      '# Preview',
      '',
      '## Install',
      '',
      '![logo](logo.png)',
      '',
      '[Jump](#install)',
      '',
      '[Other](other.md)',
    ].join('\n'),
  };

  it('renders one file with a preview-scoped id prefix', async () => {
    const preview = await renderDocumentPreview({
      document,
      owner: 'octo',
      repo: 'demo',
      commitSha: 'sha-1',
    });

    assert.equal(preview.path, 'docs/readme.md');
    assert.match(preview.html, /class="book-file-preview"/);
    assert.match(preview.html, /id="file-preview-preview"/);
    assert.match(preview.html, /id="file-preview-install"/);
    assert.match(preview.html, /href="#file-preview-install"/);
    assert.match(
      preview.html,
      /raw\.githubusercontent\.com\/octo\/demo\/sha-1\/docs\/logo\.png/,
    );
    assert.match(preview.html, /github\.com\/octo\/demo\/blob\/sha-1\/docs\/other\.md/);
    assert.deepEqual(
      preview.headings.map((heading) => heading.slug),
      ['file-preview-preview', 'file-preview-install'],
    );
  });

  it('accepts an injected sanitizer and honours a custom prefix', async () => {
    let seen = '';
    const preview = await renderDocumentPreview({
      document,
      owner: 'octo',
      repo: 'demo',
      commitSha: 'sha-1',
      idPrefix: 'custom-',
      sanitize: (html) => {
        seen = html;
        return html.replace('<h1', '<h1 data-clean="1"');
      },
    });
    assert.match(seen, /custom-preview/);
    assert.match(preview.html, /data-clean="1"/);
    assert.equal(preview.headings[0].slug, 'custom-preview');
  });

  it('rejects a document without Markdown and a missing commit', async () => {
    await assert.rejects(
      renderDocumentPreview({ document: { path: 'a.md' }, owner: 'o', repo: 'r', commitSha: 's' }),
      (error) => error.code === 'INVALID_DOCUMENT',
    );
    await assert.rejects(
      renderDocumentPreview({ document, owner: 'o', repo: 'r' }),
      (error) => error.code === 'INTERNAL',
    );
  });
});

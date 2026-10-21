import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { fetchReadme } from '../src/lib/github.js';
import { friendlyError, repoMetaLabel } from '../src/scripts/converter.js';
import { extractHeadings, injectHeadingIds } from '../src/lib/markdown.js';

describe('friendlyError (all failure codes)', () => {
  const codes = ['INVALID_URL', 'PRIVATE_OR_NOT_FOUND', 'NO_README', 'RATE_LIMITED'];
  for (const code of codes) {
    it(`maps ${code} to a manual-fallback message`, () => {
      const err = new Error('orig ' + code);
      err.code = code;
      const msg = friendlyError(err);
      assert.ok(msg.length > 10);
      if (code === 'INVALID_URL') assert.equal(msg, 'orig ' + code);
      else assert.match(msg, /manual|retry/i);
    });
  }
  it('falls back for unknown errors', () => {
    assert.match(friendlyError(new Error('boom')), /boom/);
    assert.match(friendlyError(null), /Fetch failed/);
  });
});

describe('repoMetaLabel (live README context)', () => {
  it('uses fetchReadme\'s path field when readmePath is absent', () => {
    assert.equal(
      repoMetaLabel({ owner: 'octocat', repo: 'Hello-World', branch: 'master', path: 'README' }),
      'octocat/Hello-World @ master — README',
    );
  });
  it('prefers the stored readmePath and tolerates a missing context', () => {
    assert.equal(
      repoMetaLabel({
        owner: 'o',
        repo: 'r',
        branch: 'main',
        readmePath: 'docs/README.md',
        path: 'ignored',
      }),
      'o/r @ main — docs/README.md',
    );
    assert.equal(repoMetaLabel(null), '');
  });
});

describe('fetchReadme resilience', () => {
  it('falls through to raw when the API is rate-limited (403)', async () => {
    const mockFetch = async (url) => {
      if (url.startsWith('https://api.github.com/')) return { ok: false, status: 403 };
      if (url.endsWith('/main/README.md')) {
        return { ok: true, status: 200, text: async () => '# hi' };
      }
      return { ok: false, status: 404, text: async () => '' };
    };
    const res = await fetchReadme('https://github.com/o/r', { fetchFn: mockFetch });
    assert.equal(res.branch, 'main');
  });
  it('reports NO_README (not rate limit) when API 403s and raw 404s', async () => {
    const mockFetch = async (url) => {
      if (url.startsWith('https://api.github.com/')) return { ok: false, status: 403 };
      return { ok: false, status: 404, text: async () => '' };
    };
    await assert.rejects(fetchReadme('https://github.com/o/r', { fetchFn: mockFetch }), (e) => {
      assert.equal(e.code, 'NO_README');
      return true;
    });
  });
  it('finds extensionless README files', async () => {
    const mockFetch = async (url) => {
      if (url.startsWith('https://api.github.com/')) {
        return { ok: true, status: 200, json: async () => ({ default_branch: 'master' }) };
      }
      if (url.endsWith('/master/README')) {
        return { ok: true, status: 200, text: async () => 'Hello World!' };
      }
      return { ok: false, status: 404, text: async () => '' };
    };
    const res = await fetchReadme('https://github.com/o/r', { fetchFn: mockFetch });
    assert.equal(res.path, 'README');
  });
  it('surfaces timeouts as NETWORK_ERROR, never hangs silently', async () => {
    const abortErr = new Error('The operation was aborted.');
    abortErr.name = 'AbortError';
    const mockFetch = async () => {
      throw abortErr;
    };
    await assert.rejects(fetchReadme('https://github.com/o/r', { fetchFn: mockFetch }), (e) => {
      assert.equal(e.code, 'NETWORK_ERROR');
      return true;
    });
  });
});

describe('injectHeadingIds (jsdom)', () => {
  it('assigns TOC slugs in order and counts headings', () => {
    const headings = extractHeadings('# Title\n\n## Install it\n\n### See [guide][ref]\n');
    assert.deepEqual(headings.map((h) => h.slug), ['title', 'install-it', 'see-guide']);
    const dom = new JSDOM('<div><h1>Title</h1><h2>Install it</h2><h3>See guide</h3></div>');
    const root = dom.window.document.querySelector('div');
    assert.equal(injectHeadingIds(root, headings), 3);
    assert.equal(root.querySelector('h1').id, 'title');
    assert.equal(root.querySelector('h2').id, 'install-it');
    assert.equal(root.querySelector('h3').id, 'see-guide');
  });
  it('falls back to section-N when headings run out, 0 for missing root', () => {
    const dom = new JSDOM('<div><h2>Only</h2><h2>Extra</h2></div>');
    const root = dom.window.document.querySelector('div');
    assert.equal(injectHeadingIds(root, [{ slug: 'only' }]), 2);
    assert.equal(root.querySelectorAll('h2')[1].id, 'section-2');
    assert.equal(injectHeadingIds(null, []), 0);
  });
});

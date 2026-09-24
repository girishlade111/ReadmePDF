import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitHubUrl,
  resolveRepoPath,
  rewriteRelativeUrls,
  fetchReadme,
} from '../src/lib/github.js';

describe('parseGitHubUrl', () => {
  it('parses standard https URL', () => {
    assert.deepEqual(parseGitHubUrl('https://github.com/owner/repo'), { owner: 'owner', repo: 'repo' });
  });
  it('strips .git, trailing slash, extra path, query', () => {
    assert.deepEqual(parseGitHubUrl('https://github.com/owner/repo.git'), { owner: 'owner', repo: 'repo' });
    assert.deepEqual(parseGitHubUrl('https://github.com/owner/repo/'), { owner: 'owner', repo: 'repo' });
    assert.deepEqual(parseGitHubUrl('https://github.com/owner/repo/tree/main/docs'), { owner: 'owner', repo: 'repo' });
    assert.deepEqual(parseGitHubUrl('https://github.com/owner/repo/blob/main/README.md'), { owner: 'owner', repo: 'repo' });
    assert.deepEqual(parseGitHubUrl('github.com/owner/repo'), { owner: 'owner', repo: 'repo' });
    assert.deepEqual(parseGitHubUrl('owner/repo'), { owner: 'owner', repo: 'repo' });
  });
  it('rejects non-github hosts and bad input', () => {
    assert.throws(() => parseGitHubUrl('https://gitlab.com/o/r'), /Only github/);
    assert.throws(() => parseGitHubUrl('https://github.com/onlyowner'), /owner and repo/);
    assert.throws(() => parseGitHubUrl(''), /Empty/);
  });
});

describe('resolveRepoPath', () => {
  it('resolves relative to readme dir and root-absolute', () => {
    assert.equal(resolveRepoPath('docs/a.png', ''), 'docs/a.png');
    assert.equal(resolveRepoPath('./docs/a.png', ''), 'docs/a.png');
    assert.equal(resolveRepoPath('/docs/a.png', ''), 'docs/a.png');
    assert.equal(resolveRepoPath('img.png', '.github'), '.github/img.png');
    assert.equal(resolveRepoPath('../img.png', '.github'), 'img.png');
    assert.equal(resolveRepoPath('../../escape.png', ''), 'escape.png'); // clamped
    assert.equal(resolveRepoPath('a.png?raw=true', ''), 'a.png?raw=true');
  });
});

describe('rewriteRelativeUrls', () => {
  const ctx = { owner: 'o', repo: 'r', branch: 'main', readmePath: 'README.md' };
  it('rewrites md images to raw, links to blob; leaves absolute/anchors', () => {
    const md = [
      '![logo](docs/logo.png)',
      '[guide](docs/guide.md)',
      '![badge](https://img.shields.io/badge/x-y)',
      '[abs](https://example.com/x)',
      '[anchor](#section)',
      '<img src="assets/a.png">',
      '<a href="docs/b.md">b</a>',
    ].join('\n');
    const out = rewriteRelativeUrls(md, ctx);
    assert.match(out, /raw\.githubusercontent\.com\/o\/r\/main\/docs\/logo\.png/);
    assert.match(out, /github\.com\/o\/r\/blob\/main\/docs\/guide\.md/);
    assert.match(out, /img\.shields\.io\/badge\/x-y/);
    assert.match(out, /example\.com\/x/);
    assert.match(out, /\(#section\)/);
    assert.match(out, /raw\.githubusercontent\.com\/o\/r\/main\/assets\/a\.png/);
    assert.match(out, /github\.com\/o\/r\/blob\/main\/docs\/b\.md/);
  });
  it('does not touch fenced code blocks or inline code', () => {
    const md = '```md\n![x](should/not/touch.png)\n```\n\nReal: ![y](touch/me.png)\n\n`![z](nope.png)`';
    const out = rewriteRelativeUrls(md, ctx);
    assert.match(out, /should\/not\/touch\.png/); // unchanged, still relative
    assert.match(out, /raw\.githubusercontent\.com\/o\/r\/main\/touch\/me\.png/);
    assert.match(out, /`!\[z\]\(nope\.png\)`/);
  });
  it('resolves relative to .github dir when README lives there', () => {
    const out = rewriteRelativeUrls('![a](../logo.png)', { ...ctx, readmePath: '.github/README.md' });
    assert.match(out, /raw\.githubusercontent\.com\/o\/r\/main\/logo\.png/);
  });
  it('rewrites outer URL of linked images, leaves no placeholders', () => {
    const out = rewriteRelativeUrls('[![alt](img/badge.svg)](docs/guide.md)', ctx);
    assert.match(out, /\[!\[alt\]\(https:\/\/raw\.githubusercontent\.com\/o\/r\/main\/img\/badge\.svg\)\]\(https:\/\/github\.com\/o\/r\/blob\/main\/docs\/guide\.md\)/);
    assert.doesNotMatch(out, /RPDF-STASH/);
  });
  it('rewrites image reference definitions to raw, link definitions to blob', () => {
    const md = '![logo][imgref] and [guide][docref]\n\n[imgref]: docs/a.png\n[docref]: docs/b.md\n';
    const out = rewriteRelativeUrls(md, ctx);
    assert.match(out, /\[imgref\]: https:\/\/raw\.githubusercontent\.com\/o\/r\/main\/docs\/a\.png/);
    assert.match(out, /\[docref\]: https:\/\/github\.com\/o\/r\/blob\/main\/docs\/b\.md/);
  });
});

describe('fetchReadme (mocked fetch)', () => {
  it('uses default_branch from API then resolves relative image', async () => {
    const calls = [];
    const mockFetch = async (url) => {
      calls.push(url);
      if (url.startsWith('https://api.github.com/repos/')) {
        return { ok: true, status: 200, json: async () => ({ default_branch: 'main' }) };
      }
      if (url.endsWith('/main/README.md')) {
        return { ok: true, status: 200, text: async () => '![l](docs/l.png)' };
      }
      return { ok: false, status: 404, text: async () => 'not found' };
    };
    const res = await fetchReadme('https://github.com/o/r', { fetchFn: mockFetch });
    assert.equal(res.branch, 'main');
    assert.equal(res.path, 'README.md');
    const rewritten = rewriteRelativeUrls(res.markdown, res);
    assert.match(rewritten, /raw\.githubusercontent\.com\/o\/r\/main\/docs\/l\.png/);
  });
  it('falls back to master when main 404s', async () => {
    const mockFetch = async (url) => {
      if (url.startsWith('https://api.github.com/')) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      if (url.includes('/master/README.md')) {
        return { ok: true, status: 200, text: async () => '# hi' };
      }
      return { ok: false, status: 404, text: async () => '' };
    };
    const res = await fetchReadme('https://github.com/o/r', { fetchFn: mockFetch });
    assert.equal(res.branch, 'master');
  });
  it('throws PRIVATE_OR_NOT_FOUND on repo 404', async () => {
    const mockFetch = async (url) => {
      if (url.startsWith('https://api.github.com/')) return { ok: false, status: 404 };
      return { ok: false, status: 404, text: async () => '' };
    };
    await assert.rejects(fetchReadme('https://github.com/o/private-repo', { fetchFn: mockFetch }), /private|not found/i);
  });
});

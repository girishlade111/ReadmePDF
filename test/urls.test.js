import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitHubSource,
  parseGitHubUrl,
  splitRefCandidates,
  resolveRepoPath,
  encodeRepoPath,
  buildRawUrl,
  buildBlobUrl,
  rewriteRelativeUrls,
  isReadmeName,
} from '../src/lib/github/urls.js';

describe('parseGitHubSource', () => {
  it('parses repository URLs, shorthand, and .git suffixes', () => {
    for (const input of [
      'https://github.com/owner/repo',
      'https://github.com/owner/repo/',
      'https://github.com/owner/repo.git',
      'github.com/owner/repo',
      'owner/repo',
    ]) {
      const parsed = parseGitHubSource(input);
      assert.equal(parsed.owner, 'owner', input);
      assert.equal(parsed.repo, 'repo', input);
      assert.equal(parsed.kind, 'repo', input);
      assert.deepEqual(parsed.refCandidates, [], input);
    }
  });

  it('keeps the public parseGitHubUrl shape as { owner, repo }', () => {
    assert.deepEqual(parseGitHubUrl('owner/repo/tree/main/docs'), {
      owner: 'owner',
      repo: 'repo',
    });
  });

  it('parses /tree/ URLs longest ref first, including slash branches', () => {
    const parsed = parseGitHubSource('https://github.com/o/r/tree/feature/docs/guide');
    assert.equal(parsed.kind, 'tree');
    assert.deepEqual(parsed.refCandidates, [
      { ref: 'feature/docs/guide', path: '' },
      { ref: 'feature/docs', path: 'guide' },
      { ref: 'feature', path: 'docs/guide' },
    ]);
  });

  it('parses /blob/ and raw URLs with Unicode and encoded paths', () => {
    const tag = parseGitHubSource(
      'https://github.com/o/r/blob/v1.2.3/docs/My%20File.md',
    );
    assert.equal(tag.kind, 'blob');
    assert.deepEqual(tag.refCandidates[0], {
      ref: 'v1.2.3/docs',
      path: 'My File.md',
    });
    assert.ok(
      tag.refCandidates.some(
        (candidate) => candidate.ref === 'v1.2.3' && candidate.path === 'docs/My File.md',
      ),
      'the encoded path is decoded before splitting',
    );

    const raw = parseGitHubSource(
      'https://raw.githubusercontent.com/o/r/feature/docs/README.md',
    );
    assert.equal(raw.kind, 'raw');
    assert.deepEqual(raw.refCandidates[0], {
      ref: 'feature/docs',
      path: 'README.md',
    });

    const unicode = parseGitHubSource(
      'https://github.com/o/r/blob/main/%E6%97%A5%E6%9C%AC%E8%AA%9E/%E8%AA%AC%E6%98%8E.md',
    );
    assert.deepEqual(unicode.refCandidates[0], {
      ref: 'main/日本語',
      path: '説明.md',
    });
    assert.ok(
      unicode.refCandidates.some(
        (candidate) => candidate.ref === 'main' && candidate.path === '日本語/説明.md',
      ),
      'the decoded Unicode path is available as a candidate',
    );
  });

  it('rejects malformed and unsupported URLs clearly', () => {
    assert.throws(() => parseGitHubSource('https://gitlab.com/o/r'), /Only github/i);
    assert.throws(() => parseGitHubSource(''), /Empty GitHub URL/);
    assert.throws(() => parseGitHubSource('https://github.com/onlyowner'), /owner and repo/);
    assert.throws(
      () => parseGitHubSource('https://github.com/o/r/blob/main'),
      /needs a branch, tag, or commit and a file path/i,
    );
    assert.throws(
      () => parseGitHubSource('https://github.com/o/r/raw/main'),
      /needs a branch, tag, or commit and a file path/i,
    );
    assert.throws(
      () => parseGitHubSource('https://raw.githubusercontent.com/o/r/main'),
      /Raw GitHub URLs need a ref and a file path/i,
    );
    assert.throws(
      () => parseGitHubSource('https://github.com/o/r/issues/1'),
      /Unsupported GitHub URL path/i,
    );
    assert.throws(
      () => parseGitHubSource('https://user:pass@github.com/o/r'),
      /embedded credentials/i,
    );
    assert.throws(() => parseGitHubSource('ftp://github.com/o/r'), /Only http/i);
  });
});

describe('splitRefCandidates', () => {
  it('omits empty paths for file URLs and respects the cap', () => {
    assert.deepEqual(
      splitRefCandidates(['feature', 'docs', 'README.md'], { requirePath: true }),
      [
        { ref: 'feature/docs', path: 'README.md' },
        { ref: 'feature', path: 'docs/README.md' },
      ],
    );
    assert.equal(splitRefCandidates(['a', 'b', 'c'], { max: 2 }).length, 2);
  });
});

describe('repository path resolution and encoding', () => {
  it('decodes path escapes exactly once and clamps traversal', () => {
    assert.equal(resolveRepoPath('docs/My%20File.md', ''), 'docs/My File.md');
    assert.equal(
      resolveRepoPath('../../assets/logo%20one.png', 'docs/guide'),
      'assets/logo one.png',
    );
    assert.equal(resolveRepoPath('/img/%E2%9C%93.png', 'docs'), 'img/✓.png');
    assert.equal(resolveRepoPath('../../escape.png', ''), 'escape.png');
    assert.equal(resolveRepoPath('README.md?raw=1#intro', ''), 'README.md?raw=1#intro');
  });

  it('re-encodes raw and blob URLs without double-encoding', () => {
    const raw = buildRawUrl('o', 'r', 'feature/docs', 'docs/My File.md');
    assert.equal(
      raw,
      'https://raw.githubusercontent.com/o/r/feature/docs/docs/My%20File.md',
    );
    assert.doesNotMatch(raw, /%2520/);

    const blob = buildBlobUrl('o', 'r', 'main', '日本語/説明.md');
    assert.equal(
      blob,
      'https://github.com/o/r/blob/main/%E6%97%A5%E6%9C%AC%E8%AA%9E/%E8%AA%AC%E6%98%8E.md',
    );
    assert.equal(encodeRepoPath('docs/My File.md?raw=1'), 'docs/My%20File.md?raw=1');
  });

  it('rewrites encoded relative images to pinned raw URLs', () => {
    const out = rewriteRelativeUrls('![logo](docs/My%20File.png)', {
      owner: 'o',
      repo: 'r',
      branch: 'abc123',
      readmePath: 'README.md',
    });
    assert.match(
      out,
      /https:\/\/raw\.githubusercontent\.com\/o\/r\/abc123\/docs\/My%20File\.png/,
    );
    assert.doesNotMatch(out, /%2520/);
  });

  it('passes resolved paths and suffixes to custom resolvers', () => {
    const seen = [];
    const out = rewriteRelativeUrls('[setup](docs/setup.md#install)', {
      owner: 'o',
      repo: 'r',
      branch: 'abc123',
      readmePath: 'README.md',
      linkResolver: ({ url, repoPath, suffix }) => {
        seen.push({ url, repoPath, suffix });
        return '#scoped-install';
      },
    });
    assert.deepEqual(seen, [
      { url: 'docs/setup.md#install', repoPath: 'docs/setup.md', suffix: '#install' },
    ]);
    assert.match(out, /\]\(#scoped-install\)/);
  });
});

describe('isReadmeName', () => {
  it('recognises every supported README casing and rejects unrelated names', () => {
    for (const name of ['README', 'Readme.md', 'readme.markdown', 'readme.mdown', 'README.MDX']) {
      assert.equal(isReadmeName(name), true, name);
    }
    assert.equal(isReadmeName('CONTRIBUTING.md'), false);
  });
});

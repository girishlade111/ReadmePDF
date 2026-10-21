import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchMarkdownFiles,
  mapWithConcurrency,
  assertSafeRepoPath,
  BOOK_FETCH_LIMITS,
} from '../src/lib/github/content.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function makeApi(texts = {}, { delayMs = 0, onText } = {}) {
  const calls = [];
  return {
    calls,
    async text(url, { signal } = {}) {
      calls.push(url);
      if (delayMs) await delay(delayMs);
      const marker = '/commit-1/';
      const index = url.indexOf(marker);
      const path = decodeURIComponent(index === -1 ? url : url.slice(index + marker.length));
      if (onText) {
        const custom = await onText({ path, url, signal });
        if (custom !== undefined) return custom;
      }
      if (!Object.hasOwn(texts, path)) {
        throw Object.assign(new Error(`Missing ${path}`), { code: 'NOT_FOUND' });
      }
      return texts[path];
    },
    stats() {
      return { requests: calls.length };
    },
  };
}

const base = {
  owner: 'o',
  repo: 'r',
  commitSha: 'commit-1',
};

describe('assertSafeRepoPath', () => {
  it('normalises legal paths and rejects traversal or control characters', () => {
    assert.equal(assertSafeRepoPath('docs//./guide.md'), 'docs/guide.md');
    assert.equal(assertSafeRepoPath('日本語/説明.md'), '日本語/説明.md');
    assert.throws(() => assertSafeRepoPath(''), (error) => error.code === 'INVALID_PATH');
    assert.throws(() => assertSafeRepoPath('docs/../../x.md'), (error) => error.code === 'PATH_ESCAPE');
    assert.throws(() => assertSafeRepoPath('docs\\x.md'), (error) => error.code === 'INVALID_PATH');
    assert.throws(() => assertSafeRepoPath('docs/\0x.md'), (error) => error.code === 'INVALID_PATH');
  });
});

describe('fetchMarkdownFiles', () => {
  it('fetches only selected files, in order, with bounded concurrency and pinned URLs', async () => {
    let active = 0;
    let maxActive = 0;
    const api = makeApi(
      { 'a.md': '# A', 'b.md': '# B', 'docs/c.md': '# C', 'docs/My File.md': '# D' },
      {
        onText: async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await delay(5);
          active -= 1;
          return undefined;
        },
      },
    );
    const report = await fetchMarkdownFiles({
      ...base,
      files: ['a.md', 'b.md', 'docs/c.md', 'docs/My File.md'],
      api,
      limits: { concurrency: 2 },
    });

    assert.deepEqual(report.documents.map((document) => document.path), [
      'a.md',
      'b.md',
      'docs/c.md',
      'docs/My File.md',
    ]);
    assert.equal(maxActive, 2);
    assert.equal(report.requested, 4);
    assert.equal(report.fetched, 4);
    assert.equal(report.complete, true);
    assert.deepEqual(report.failures, []);
    assert.equal(report.requests, 4);
    assert.ok(api.calls.every((url) => url.startsWith('https://raw.githubusercontent.com/o/r/commit-1/')));
    assert.ok(api.calls.some((url) => url.endsWith('/docs/My%20File.md')));
  });

  it('deduplicates paths and reports per-file failures without aborting the book', async () => {
    const api = makeApi({ 'a.md': '# A', 'b.md': '# B' });
    const report = await fetchMarkdownFiles({
      ...base,
      files: ['a.md', 'a.md', 'missing.md', 'b.md'],
      api,
    });

    assert.equal(report.requested, 3);
    assert.equal(report.fetched, 3);
    assert.deepEqual(report.documents.map((document) => document.path), ['a.md', 'b.md']);
    assert.equal(report.failures.length, 1);
    assert.equal(report.failures[0].path, 'missing.md');
    assert.equal(report.failures[0].code, 'NOT_FOUND');
    assert.equal(report.failures[0].retryable, true);
    assert.equal(report.complete, false);
    assert.equal(report.totalBytes, 6);
  });

  it('rejects a file above the per-file byte limit', async () => {
    const api = makeApi({ 'big.md': '12345678901', 'ok.md': 'ok' });
    const report = await fetchMarkdownFiles({
      ...base,
      files: ['big.md', 'ok.md'],
      api,
      limits: { maxFileBytes: 10 },
    });

    assert.deepEqual(report.documents.map((document) => document.path), ['ok.md']);
    assert.equal(report.failures.length, 1);
    assert.equal(report.failures[0].code, 'FILE_TOO_LARGE');
    assert.equal(report.failures[0].retryable, false);
    assert.match(report.failures[0].message, /per-file limit/i);
    assert.equal(report.totalBytes, 2);
    assert.equal(report.complete, false);
  });

  it('enforces the aggregate limit deterministically and skips later files', async () => {
    const api = makeApi({ 'a.md': '123456', 'b.md': '123456', 'c.md': '123' });
    const report = await fetchMarkdownFiles({
      ...base,
      files: ['a.md', 'b.md', 'c.md'],
      api,
      limits: { maxTotalBytes: 10 },
    });

    assert.deepEqual(report.documents.map((document) => document.path), ['a.md']);
    assert.deepEqual(
      report.failures.map((failure) => [failure.path, failure.code]),
      [
        ['b.md', 'BOOK_TOO_LARGE'],
        ['c.md', 'SKIPPED_BY_LIMIT'],
      ],
    );
    assert.equal(report.totalBytes, 6);
    assert.equal(report.complete, false);
    assert.equal(report.warnings.length, 1);
  });

  it('rejects empty and oversized selections before fetching', async () => {
    const api = makeApi({});
    await assert.rejects(fetchMarkdownFiles({ ...base, files: [], api }), (error) => {
      assert.equal(error.code, 'EMPTY_BOOK');
      return true;
    });
    await assert.rejects(
      fetchMarkdownFiles({ ...base, files: ['a.md', 'b.md'], api, limits: { maxFiles: 1 } }),
      (error) => {
        assert.equal(error.code, 'TOO_MANY_FILES');
        return true;
      },
    );
    assert.equal(api.calls.length, 0);
  });

  it('rejects missing configuration and unsafe paths', async () => {
    await assert.rejects(
      fetchMarkdownFiles({ owner: 'o', repo: 'r', files: ['a.md'], api: makeApi() }),
      (error) => error.code === 'INTERNAL',
    );
    await assert.rejects(
      fetchMarkdownFiles({ ...base, files: ['../secret.md'], api: makeApi() }),
      (error) => error.code === 'PATH_ESCAPE',
    );
  });

  it('cancels cleanly before and during fetching', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      fetchMarkdownFiles({
        ...base,
        files: ['a.md'],
        api: makeApi({ 'a.md': '# A' }),
        signal: controller.signal,
      }),
      (error) => error.code === 'CANCELLED',
    );

    const running = new AbortController();
    const api = makeApi(
      { 'a.md': '# A' },
      {
        onText: () => {
          running.abort();
          const error = new Error('The operation was aborted.');
          error.name = 'AbortError';
          throw error;
        },
      },
    );
    await assert.rejects(
      fetchMarkdownFiles({ ...base, files: ['a.md'], api, signal: running.signal }),
      (error) => error.code === 'CANCELLED',
    );
  });

  it('exposes frozen default limits', () => {
    assert.ok(Object.isFrozen(BOOK_FETCH_LIMITS));
    assert.equal(BOOK_FETCH_LIMITS.maxFiles, 30);
    assert.equal(BOOK_FETCH_LIMITS.concurrency, 4);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves input order while limiting active work', async () => {
    let active = 0;
    let maxActive = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await delay(2);
      active -= 1;
      return value * 2;
    });
    assert.deepEqual(result, [2, 4, 6, 8, 10]);
    assert.equal(maxActive, 2);
  });

  it('waits for in-flight work and surfaces the first mapper failure', async () => {
    let calls = 0;
    await assert.rejects(
      mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
        calls += 1;
        await delay(2);
        if (value === 2) throw new Error('boom');
        return value;
      }),
      /boom/,
    );
    assert.ok(calls >= 2);
  });

  it('returns an empty array, validates the mapper, and honours aborts', async () => {
    assert.deepEqual(await mapWithConcurrency([], 2, async () => 1), []);
    await assert.rejects(mapWithConcurrency([1], 1, null), /mapper function/);

    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      mapWithConcurrency([1, 2], 2, async (value) => value, { signal: controller.signal }),
      (error) => error.code === 'CANCELLED',
    );
  });
});

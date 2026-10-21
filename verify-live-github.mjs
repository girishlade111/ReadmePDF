import { createGitHubApi } from './src/lib/github/api.js';
import { buildBlobUrl, parseGitHubSource } from './src/lib/github/urls.js';
import { resolveRepositorySource } from './src/lib/github/references.js';
import { discoverMarkdownFiles } from './src/lib/github/discovery.js';

const api = createGitHubApi({ maxRequests: 60, timeoutMs: 30000 });
const results = [];

function encodePath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function run(label, url, { discover = true, kindExpected } = {}) {
  const started = Date.now();
  const record = { label, url, ok: false, ms: 0 };
  try {
    const source = parseGitHubSource(url);
    record.parse = {
      owner: source.owner,
      repo: source.repo,
      kind: source.kind,
      candidates: source.refCandidates.length,
    };
    if (kindExpected && source.kind !== kindExpected) {
      throw new Error(`expected kind ${kindExpected}, got ${source.kind}`);
    }
    const resolved = await resolveRepositorySource(source, api);
    record.resolved = {
      owner: resolved.owner,
      repo: resolved.repo,
      kind: resolved.kind,
      ref: resolved.ref,
      commitSha: resolved.commitSha,
      path: resolved.path,
      treeSha: resolved.treeSha,
    };
    if (discover) {
      const found = await discoverMarkdownFiles(resolved, api);
      record.discovery = {
        files: found.files.length,
        complete: found.complete,
        truncated: found.truncated,
        warnings: found.warnings,
        requests: found.requests,
        first: found.files.slice(0, 4).map((file) => file.path),
        last: found.files.slice(-2).map((file) => file.path),
      };
    }
    record.ok = true;
  } catch (error) {
    record.error = { code: error?.code, message: error?.message };
  }
  record.ms = Date.now() - started;
  results.push(record);
  console.log(JSON.stringify(record));
  return record;
}

async function main() {
  // Parse-only cases first: no API budget spent.
  const parseOnly = [
    'https://github.com/goldbergyoni/nodebestpractices',
    'goldbergyoni/nodebestpractices',
    'https://github.com/goldbergyoni/nodebestpractices.git',
    'https://github.com/goldbergyoni/nodebestpractices/blob/master/README.md',
    'https://github.com/goldbergyoni/nodebestpractices/tree/master/sections',
    'https://github.com/microsoft/vscode/tree/BV/1.114',
    'https://github.com/withastro/astro/tree/v0.0.12',
    'https://github.com/goldbergyoni/nodebestpractices/tree/dc3d60c29d5483d9ea99cf261bbd6203516a2ba7',
    'https://raw.githubusercontent.com/goldbergyoni/nodebestpractices/master/README.md',
    'https://github.com/goldbergyoni/nodebestpractices/blob/master/%52EADME.md',
    'https://github.com/jackfrued/Python-100-Days/blob/master/Day01-20/01.%E5%88%9D%E8%AF%86Python.md',
  ].map((url) => {
    try {
      const source = parseGitHubSource(url);
      return {
        url,
        owner: source.owner,
        repo: source.repo,
        kind: source.kind,
        firstCandidate: source.refCandidates[0],
        lastCandidate: source.refCandidates.at(-1),
      };
    } catch (error) {
      return { url, error: error.message, code: error.code };
    }
  });
  console.log(JSON.stringify({ parseOnly }, null, 2));

  await run('repository root (default branch, >500 files)', 'https://github.com/goldbergyoni/nodebestpractices');
  await run('owner/repo shorthand', 'goldbergyoni/nodebestpractices');
  await run('.git suffix', 'https://github.com/goldbergyoni/nodebestpractices.git');
  await run('blob README', 'https://github.com/goldbergyoni/nodebestpractices/blob/master/README.md');
  await run('raw README', 'https://raw.githubusercontent.com/goldbergyoni/nodebestpractices/master/README.md');
  await run('percent-encoded path', 'https://github.com/goldbergyoni/nodebestpractices/blob/master/%52EADME.md');
  await run('tree folder', 'https://github.com/goldbergyoni/nodebestpractices/tree/master/sections');
  await run(
    'commit SHA',
    'https://github.com/goldbergyoni/nodebestpractices/tree/dc3d60c29d5483d9ea99cf261bbd6203516a2ba7',
  );
  await run('non-default slash branch', 'https://github.com/microsoft/vscode/tree/BV/1.114', {
    discover: false,
  });
  await run('tag', 'https://github.com/withastro/astro/tree/v0.0.12', { discover: false });
  await run(
    'Unicode path',
    'https://github.com/jackfrued/Python-100-Days/blob/master/Day01-20/01.%E5%88%9D%E8%AF%86Python.md',
  );

  // Find a real space-containing Markdown path in the Python-100-Days tree,
  // which was fetched above and is cached by the GitHub client.
  try {
    const source = parseGitHubSource('https://github.com/jackfrued/Python-100-Days');
    const resolved = await resolveRepositorySource(source, api);
    const commit = await api.getCommit('jackfrued', 'Python-100-Days', resolved.ref);
    const tree = await api.getTree(
      'jackfrued',
      'Python-100-Days',
      commit.commit.tree.sha,
      { recursive: true },
    );
    const md = (tree?.tree ?? []).filter(
      (entry) => entry.type === 'blob' && /\.(md|markdown|mdown)$/i.test(entry.path),
    );
    const spaces = md.filter((entry) => /\s/.test(entry.path)).map((entry) => entry.path);
    const unicode = md.filter((entry) => /[^\x00-\x7F]/.test(entry.path)).map((entry) => entry.path);
    console.log(JSON.stringify({ pythonTree: { markdown: md.length, spaces, unicode: unicode.slice(0, 3) } }));
    if (spaces.length) {
      const path = spaces[0];
      await run('space-containing path', buildBlobUrl('jackfrued', 'Python-100-Days', resolved.ref, path));
    }
  } catch (error) {
    console.log(JSON.stringify({ pythonTreeError: { code: error?.code, message: error?.message } }));
  }

  console.log(
    JSON.stringify(
      {
        api: api.stats(),
        summary: results.map(({ label, ok, ms, error, resolved, discovery }) => ({
          label,
          ok,
          ms,
          ref: resolved?.ref,
          commit: resolved?.commitSha?.slice(0, 8),
          files: discovery?.files,
          complete: discovery?.complete,
          error: error?.code,
        })),
      },
      null,
      2,
    ),
  );
}

await main();

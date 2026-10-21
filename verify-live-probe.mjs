import { createGitHubApi } from './src/lib/github/api.js';
import { parseGitHubSource } from './src/lib/github/urls.js';
import { resolveRepositorySource } from './src/lib/github/references.js';

const api = createGitHubApi({ maxRequests: 10, timeoutMs: 30000 });
const source = parseGitHubSource('https://github.com/jackfrued/Python-100-Days');
const resolved = await resolveRepositorySource(source, api);
const commit = await api.getCommit('jackfrued', 'Python-100-Days', resolved.ref);
const tree = await api.getTree('jackfrued', 'Python-100-Days', commit.commit.tree.sha, {
  recursive: true,
});
const entries = Array.isArray(tree?.tree) ? tree.tree : [];
const md = entries.filter(
  (entry) => entry.type === 'blob' && /\.(md|markdown|mdown)$/i.test(entry.path),
);
const unusual = md.filter((entry) => /[^\x00-\x7F]/.test(entry.path) || /\s/.test(entry.path));
console.log(
  JSON.stringify(
    {
      defaultBranch: resolved.ref,
      commitSha: resolved.commitSha,
      truncated: tree?.truncated ?? null,
      entries: entries.length,
      markdown: md.length,
      unusual: unusual.slice(0, 20).map((entry) => entry.path),
      requests: api.stats(),
    },
    null,
    2,
  ),
);

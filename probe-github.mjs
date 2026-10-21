const r = await fetch('https://api.github.com/repos/goldbergyoni/nodebestpractices', {headers:{'User-Agent':'ReadmePDF-verification','Accept':'application/vnd.github+json'}});
console.log('repo status', r.status, 'remaining', r.headers.get('x-ratelimit-remaining'));
const d = await r.json(); console.log(d.full_name, d.default_branch, d.size);
const b = await fetch('https://api.github.com/repos/microsoft/vscode/branches?per_page=100', {headers:{'User-Agent':'ReadmePDF-verification'}});
console.log('branches status', b.status, b.headers.get('x-ratelimit-remaining'));
const branches = await b.json(); console.log(branches.filter(x=>x.name.includes('/')).slice(0,10).map(x=>x.name));
const t = await fetch('https://api.github.com/repos/withastro/astro/tags?per_page=10', {headers:{'User-Agent':'ReadmePDF-verification'}});
console.log('tags status', t.status, t.headers.get('x-ratelimit-remaining'));
const tags = await t.json(); console.log(tags.slice(0,5).map(x=>x.name));

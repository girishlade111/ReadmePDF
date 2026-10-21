import fs from 'fs';
import path from 'path';
const roots=['src','test','package.json','README.md'];
const bad=[];
function walk(p){const st=fs.statSync(p); if(st.isDirectory()){for(const e of fs.readdirSync(p)) walk(path.join(p,e));} else if(/\.(js|astro|css|md|json|ts)$/.test(p)){const t=fs.readFileSync(p,'utf8'); const lines=t.split(/\r?\n/); lines.forEach((line,i)=>{ if(line.includes('\uFFFD')||line.includes('Â')||line.includes('â€')) bad.push(`${p}:${i+1}: ${line.trim().slice(0,180)}`); });}}
for(const r of roots) walk(r);
console.log(bad.join('\n'));
console.log('TOTAL',bad.length);

import fs from 'fs';
for (const p of ['src/pages/index.astro','src/scripts/book-explorer.js','src/lib/pdf/assembly.js','package.json']) {
  const t=fs.readFileSync(p,'utf8');
  const lines=t.split(/\r?\n/);
  for (let i=0;i<lines.length;i++){
    if(/[^\x00-\x7F]/.test(lines[i])){
      const s=lines[i];
      const odd=[...s].filter(c=>c.codePointAt(0)>127).map(c=>`U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')}`).filter(v=>!['U+2014','U+00B7','U+2192','U+2019','U+201C','U+201D'].includes(v));
      if(odd.length) console.log(p+':'+(i+1), [...s].filter(c=>c.codePointAt(0)>127).map(c=>`${c}(U+${c.codePointAt(0).toString(16).toUpperCase()})`).join(' '), '||', s.trim().slice(0,160));
    }
  }
}

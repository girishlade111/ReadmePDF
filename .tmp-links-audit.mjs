import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFString } from 'pdf-lib';

const zipPath = 'C:/Users/Girish Lade/AppData/Local/Temp/opencode/e2e/out/readmepdf-export.zip';
const zip = await JSZip.loadAsync(readFileSync(zipPath));
const rows = [];
for (const name of Object.keys(zip.files).sort()) {
  if (zip.files[name].dir || !name.endsWith('.pdf')) continue;
  const bytes = await zip.file(name).async('uint8array');
  const pdf = await PDFDocument.load(bytes);
  let links = 0;
  const uris = [];
  const gotos = [];
  for (const page of pdf.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    for (let index = 0; index < (annots?.size() ?? 0); index += 1) {
      const annot = annots.lookup(index, PDFDict);
      if (annot.get(PDFName.of('Subtype'))?.toString() !== '/Link') continue;
      links += 1;
      const action = annot.lookupMaybe(PDFName.of('A'), PDFDict);
      const s = action?.get(PDFName.of('S'))?.toString();
      if (s === '/URI') uris.push(action.lookupMaybe(PDFName.of('URI'), PDFString)?.decodeText());
      if (s === '/GoTo') gotos.push(true);
    }
  }
  rows.push({ name, pages: pdf.getPageCount(), bytes: bytes.length, links, uris, gotos: gotos.length });
}
console.log(JSON.stringify(rows, null, 2));

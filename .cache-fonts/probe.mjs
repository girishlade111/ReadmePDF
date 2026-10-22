import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const dejavu = await doc.embedFont(await readFile(".cache-fonts/dejavu/dejavu-fonts-ttf-2.37/ttf/DejaVuSans.ttf"), { subset: true });
const noto = await doc.embedFont(await readFile(".cache-fonts/NotoSansCJKsc-Common.otf"), { subset: true });
const page = doc.addPage([595.28, 841.89]);
page.drawText("Hello — Türkçe, Русский", { x: 50, y: 760, size: 16, font: dejavu, color: rgb(0,0,0) });
page.drawText("简体中文 日本語 한국어", { x: 50, y: 720, size: 16, font: noto, color: rgb(0,0,0) });
const bytes = await doc.save();
await writeFile(".cache-fonts/probe.pdf", bytes);
console.log("bytes", bytes.length, "header", Buffer.from(bytes.slice(0, 8)).toString());

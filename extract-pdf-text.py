import json
from pypdf import PdfReader

reader = PdfReader("verification-book.pdf")
out = {
    "pages": len(reader.pages),
    "metadata": {k: str(v) for k, v in (reader.metadata or {}).items()},
    "pageText": [],
}
for i, page in enumerate(reader.pages):
    out["pageText"].append({"page": i + 1, "text": page.extract_text() or ""})

with open("verification-book-text.json", "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)

for entry in out["pageText"]:
    print(f"--- PAGE {entry['page']} ---")
    print(entry["text"][:1200])

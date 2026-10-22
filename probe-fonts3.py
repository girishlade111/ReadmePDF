import json
from pypdf import PdfReader
r=PdfReader('dist-seo/_font-probe3.pdf')
open('dist-seo/_font-probe3.json','w',encoding='utf-8').write(json.dumps({'text':r.pages[0].extract_text()},ensure_ascii=False,indent=2))

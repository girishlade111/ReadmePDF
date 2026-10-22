import json
from pypdf import PdfReader
r=PdfReader('dist-seo/_font-probe.pdf')
text=r.pages[0].extract_text()
open('dist-seo/_font-probe.json','w',encoding='utf-8').write(json.dumps({'text':text,'meta':dict(r.metadata or {})},ensure_ascii=False,indent=2))
print('chars',len(text))

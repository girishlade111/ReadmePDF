import json
from pypdf import PdfReader
r=PdfReader('dist-seo/_font-probe2.pdf')
p=r.pages[0]
fonts=p['/Resources']['/Font']
out={}
for name,ref in fonts.items():
    f=ref.get_object()
    d={'Subtype':str(f.get('/Subtype')),'BaseFont':str(f.get('/BaseFont')),'Encoding':str(f.get('/Encoding'))}
    tu=f.get('/ToUnicode')
    if tu:
      data=tu.get_object().get_data().decode('latin-1')
      d['ToUnicodeSample']=data[:1200]
    out[str(name)]=d
open('dist-seo/_fontdump.json','w',encoding='utf-8').write(json.dumps(out,ensure_ascii=False,indent=2))

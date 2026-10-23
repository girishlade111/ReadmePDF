from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

root = Path('.')
font_bold = root / '.cache-fonts/dejavu/dejavu-fonts-ttf-2.37/ttf/DejaVuSans-Bold.ttf'
font_reg = root / '.cache-fonts/dejavu/dejavu-fonts-ttf-2.37/ttf/DejaVuSans.ttf'

W, H = 1200, 630
img = Image.new('RGB', (W, H), '#f1efed')
d = ImageDraw.Draw(img)

d.rectangle([0, 0, W - 1, H - 1], outline='#211e1c', width=2)
d.rectangle([72, 72, 80, 558], fill='#b98a2e')

f_eyebrow = ImageFont.truetype(str(font_bold), 26)
f_title = ImageFont.truetype(str(font_bold), 92)
f_sub = ImageFont.truetype(str(font_reg), 34)
f_badge = ImageFont.truetype(str(font_bold), 22)
f_footer = ImageFont.truetype(str(font_reg), 22)

d.text((120, 96), 'READMEPDF  /  LADESTACK', font=f_eyebrow, fill='#6b625a')
d.text((118, 160), 'README', font=f_title, fill='#211e1c')
d.text((118, 258), 'to PDF.', font=f_title, fill='#211e1c')
d.text((122, 390), 'GitHub documentation, printed properly.', font=f_sub, fill='#3b3631')

labels = ['CLIENT-SIDE', 'NO LOGIN', '9 LANGUAGES', 'MULTI-FILE ZIP']
x = 120
for label in labels:
    tw = d.textlength(label, font=f_badge)
    d.rounded_rectangle([x, 470, x + tw + 36, 520], radius=25, outline='#211e1c', width=2)
    d.text((x + 18, 483), label, font=f_badge, fill='#211e1c')
    x += tw + 52

d.text((120, 565), 'md2pdf  •  free  •  private  •  offline-capable', font=f_footer, fill='#6b625a')
img.save('public/og/md2pdf.png', optimize=True)
print('wrote public/og/md2pdf.png', Path('public/og/md2pdf.png').stat().st_size)

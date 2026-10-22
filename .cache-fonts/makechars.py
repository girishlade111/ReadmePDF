from pathlib import Path

chars = set()

def add_range(start, end):
    chars.update(chr(cp) for cp in range(start, end + 1))

# Latin, punctuation, currency, arrows, math, box drawing, checkboxes.
add_range(0x0020, 0x024F)
add_range(0x0370, 0x052F)
add_range(0x2000, 0x206F)
add_range(0x20A0, 0x20CF)
add_range(0x2100, 0x214F)
add_range(0x2190, 0x21FF)
add_range(0x2200, 0x22FF)
add_range(0x2500, 0x257F)
add_range(0x25A0, 0x25FF)
add_range(0x2600, 0x26FF)
add_range(0x2700, 0x27BF)
add_range(0x3000, 0x303F)
add_range(0x3040, 0x30FF)
add_range(0x3100, 0x312F)
add_range(0x31F0, 0x31FF)
add_range(0xFF00, 0xFFEF)

# GB2312 (Simplified Chinese) level 1+2.
for hi in range(0xA1, 0xF8):
    for lo in range(0xA1, 0xFF):
        try:
            chars.add(bytes([hi, lo]).decode('gb2312'))
        except UnicodeDecodeError:
            pass

# JIS X 0208 (Japanese) via EUC-JP.
for hi in range(0xA1, 0xFF):
    for lo in range(0xA1, 0xFF):
        try:
            chars.add(bytes([hi, lo]).decode('euc_jp'))
        except UnicodeDecodeError:
            pass

# KS X 1001 (Korean) via EUC-KR: 2350 Hangul + 4888 Hanja.
for hi in range(0xA1, 0xFF):
    for lo in range(0xA1, 0xFF):
        try:
            chars.add(bytes([hi, lo]).decode('euc_kr'))
        except UnicodeDecodeError:
            pass

# All modern Hangul syllables for names and less common words.
add_range(0xAC00, 0xD7A3)

chars.discard('\x00')
text = ''.join(sorted(chars))
Path('.cache-fonts/cjk-subset-chars.txt').write_text(text, encoding='utf-8')
print('characters', len(chars))

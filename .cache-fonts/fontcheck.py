from fontTools.ttLib import TTFont

f = TTFont('.cache-fonts/NotoSansCJKsc-Regular.otf')
cmap = f.getBestCmap()
tests = {
    'Latin A': 0x41,
    'Cyrillic A': 0x0410,
    'Cyrillic ya': 0x044F,
    'CJK ni': 0x4F60,
    'Hiragana a': 0x3042,
    'Katakana a': 0x30A2,
    'Hangul han': 0xD55C,
    'Turkish s cedilla': 0x015F,
    'Portuguese a tilde': 0x00E3,
    'emoji': 0x1F600,
    'arrow': 0x2192,
    'ballot box': 0x2610,
}
for name, cp in tests.items():
    print(name, hex(cp), 'YES' if cp in cmap else 'NO')
print('glyphs', len(cmap))
print('tables', ','.join(f.keys()))

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fontkit from '@pdf-lib/fontkit';

import { createFontPicker, FONT_FILES, roleForStyle } from '../src/lib/pdf/fonts.js';

const FONT_DIR = fileURLToPath(new URL('../public/fonts/', import.meta.url));

function collect(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const WIDTHS = (text, size) => [...String(text)].length * size;

function picker(charsets) {
  const fonts = Object.fromEntries(
    ['regular', 'bold', 'italic', 'boldItalic', 'mono', 'cjk'].map((role) => [
      role,
      { widthOfTextAtSize: WIDTHS },
    ]),
  );
  return createFontPicker(fonts, charsets);
}

describe('PDF font selection', () => {
  it('uses the preferred face, then falls back across Latin faces and CJK', () => {
    const select = picker({
      regular: new Set([0x41, 0x3f, 0x20]),
      bold: new Set([0x42]),
      italic: new Set([]),
      boldItalic: new Set([]),
      mono: new Set([]),
      cjk: new Set([0x4e2d]),
    });

    assert.equal(select.roleFor('A', { bold: true }), 'regular');
    assert.equal(select.roleFor('B', { bold: true }), 'bold');
    assert.equal(select.roleFor('中', { bold: true }), 'cjk');
    assert.equal(select.roleFor('A', { code: true }), 'regular');
  });

  it('replaces unsupported code points with ? and records them once', () => {
    const select = picker({
      regular: new Set([0x41, 0x3f, 0x20]),
      bold: new Set([]),
      italic: new Set([]),
      boldItalic: new Set([]),
      mono: new Set([]),
      cjk: new Set([]),
    });

    assert.deepEqual(select.split('A😀😀'), [
      { text: 'A??', role: 'regular' },
    ]);
    assert.deepEqual([...select.missingCodePoints], [0x1f600]);
  });

  it('drops control characters, zero-width characters, and variation selectors', () => {
    const select = picker({
      regular: new Set([0x41, 0x20]),
      bold: new Set([]),
      italic: new Set([]),
      boldItalic: new Set([]),
      mono: new Set([]),
      cjk: new Set([]),
    });

    assert.deepEqual(select.split('A\u200b\u200d\ufe0f\u0007'), [
      { text: 'A', role: 'regular' },
    ]);
    assert.equal(select.missingCodePoints.size, 0);
  });

  it('maps style flags to the expected font role', () => {
    assert.equal(roleForStyle({}), 'regular');
    assert.equal(roleForStyle({ bold: true }), 'bold');
    assert.equal(roleForStyle({ italic: true }), 'italic');
    assert.equal(roleForStyle({ bold: true, italic: true }), 'boldItalic');
    assert.equal(roleForStyle({ code: true, bold: true }), 'mono');
  });
});

describe('CJK PDF font asset', () => {
  it('is TrueType with 4-byte aligned glyph boundaries', async () => {
    assert.match(FONT_FILES.cjk, /\.ttf$/);
    const bytes = await readFile(new URL(`.${FONT_FILES.cjk}`, `file://${FONT_DIR}`));
    const font = fontkit.create(bytes);

    assert.equal(font.head.indexToLocFormat, 1);
    assert.ok(font.numGlyphs > 30000, `expected broad coverage, got ${font.numGlyphs}`);
    assert.ok(
      font.loca.offsets.every((offset) => offset % 4 === 0),
      'glyf boundaries must be 4-byte aligned for fontkit short loca output',
    );
  });

  it('keeps every subset outline intact after encoding', async () => {
    const bytes = await readFile(new URL(`.${FONT_FILES.cjk}`, `file://${FONT_DIR}`));
    const font = fontkit.create(bytes);
    const subset = font.createSubset();
    const ids = [...'中文日本語한국어漢字'].map((char) =>
      subset.includeGlyph(font.glyphForCodePoint(char.codePointAt(0))),
    );

    const encoded = fontkit.create(await collect(subset.encodeStream()));
    for (const id of ids) {
      const { minX, minY, maxX, maxY } = encoded.getGlyph(id).path.bbox;
      assert.ok(maxX > minX && maxY > minY, `subset glyph ${id} has an empty outline`);
    }
  });
});

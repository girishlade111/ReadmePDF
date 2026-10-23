import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createFontPicker, roleForStyle } from '../src/lib/pdf/fonts.js';

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

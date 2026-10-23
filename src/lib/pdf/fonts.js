/**
 * PDF font loading and per-character font selection.
 *
 * The export must be able to print Latin, Cyrillic, Greek, Turkish, Chinese,
 * Japanese, and Korean without producing tofu. DejaVu Sans covers the
 * alphabetic/symbol ranges; a subset of Noto Sans CJK covers Han, Kana, and
 * Hangul. Both are lazily fetched when the user asks for a PDF, never on page
 * load.
 *
 * Fonts are embedded subsetted. `pdf-lib` writes a correct ToUnicode CMap, so
 * the result stays selectable and searchable (verified with pdf.js, which
 * honours the CMap; some older extractors such as pypdf do not).
 */
import fontkit from '@pdf-lib/fontkit';

export const FONT_FILES = Object.freeze({
  regular: '/fonts/DejaVuSans.ttf',
  bold: '/fonts/DejaVuSans-Bold.ttf',
  italic: '/fonts/DejaVuSans-Oblique.ttf',
  boldItalic: '/fonts/DejaVuSans-BoldOblique.ttf',
  mono: '/fonts/DejaVuSansMono.ttf',
  cjk: '/fonts/NotoSansCJKsc-Common.otf',
});

export const FONT_ROLES = Object.freeze(Object.keys(FONT_FILES));

/** @type {Map<string, Promise<ArrayBuffer>>} */
const byteCache = new Map();

/**
 * Fetch (and cache) one font file. The cache is module-level so exporting
 * thirty chapters does not download ten megabytes thirty times.
 *
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, baseUrl?: string }} [options]
 */
export function loadFontBytes(url, { fetchImpl = globalThis.fetch, baseUrl = '' } = {}) {
  const resolved = baseUrl ? `${baseUrl.replace(/\/$/, '')}${url}` : url;
  if (!byteCache.has(resolved)) {
    const promise = (async () => {
      if (typeof fetchImpl !== 'function') {
        throw new Error('This browser cannot download the PDF fonts.');
      }
      const response = await fetchImpl(resolved);
      if (!response || !response.ok) {
        throw new Error(`Font request failed (${response?.status ?? 'network'}): ${resolved}`);
      }
      return response.arrayBuffer();
    })().catch((error) => {
      byteCache.delete(resolved);
      throw error;
    });
    byteCache.set(resolved, promise);
  }
  return byteCache.get(resolved);
}

/** Test hook: drop cached font bytes. */
export function clearFontCache() {
  byteCache.clear();
}

/**
 * Download all font files once. Failures propagate: a PDF with missing fonts
 * would be worse than an explicit error.
 *
 * @param {{ fetchImpl?: typeof fetch, baseUrl?: string, onProgress?: (done:number,total:number)=>void }} [options]
 * @returns {Promise<Record<string, ArrayBuffer>>}
 */
export async function loadFontBytesSet(options = {}) {
  const entries = Object.entries(FONT_FILES);
  const result = {};
  let done = 0;
  await Promise.all(
    entries.map(async ([role, url]) => {
      result[role] = await loadFontBytes(url, options);
      done += 1;
      options.onProgress?.(done, entries.length);
    }),
  );
  return result;
}

/**
 * Build the set of code points a font can actually draw.
 *
 * pdf-lib's `getCharacterSet()` reports every code point listed in the font's
 * cmap, including entries whose glyph id is 0 (`.notdef`). Handing one of those
 * to `drawText` makes the CFF subsetter crash on save with a RangeError, so the
 * set is rebuilt from fontkit and filtered to real glyphs.
 *
 * @param {ArrayBuffer|Uint8Array} bytes
 */
function supportedCodePoints(bytes) {
  const font = fontkit.create(
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
  );
  const set = new Set();
  for (const codePoint of font.characterSet ?? []) {
    if (font.hasGlyphForCodePoint(codePoint)) set.add(codePoint);
  }
  return set;
}

function normalizeChar(char) {
  const cp = char.codePointAt(0);
  // Variation selectors and the zero-width joiner only complicate font
  // selection; the base character carries the meaning in a printed document.
  if (cp === 0xfe0e || cp === 0xfe0f || cp === 0x200d) return '';
  if (cp === 0x200b) return '';
  if (cp < 0x20 && cp !== 0x09 && cp !== 0x0a) return '';
  return char;
}

/**
 * Embed the font roles in a PDFDocument and return a resolver that picks the
 * right font for every character.
 *
 * @param {import('pdf-lib').PDFDocument} pdfDoc
 * @param {Record<string, ArrayBuffer>} bytes
 */
export async function embedPdfFonts(pdfDoc, bytes) {
  pdfDoc.registerFontkit(fontkit);
  /** @type {Record<string, import('pdf-lib').PDFFont>} */
  const fonts = {};
  /** @type {Record<string, Set<number>>} */
  const charsets = {};

  await Promise.all(
    FONT_ROLES.map(async (role) => {
      if (!bytes[role]) throw new Error(`Missing font data for ${role}.`);
      charsets[role] = supportedCodePoints(bytes[role]);
      fonts[role] = await pdfDoc.embedFont(bytes[role], { subset: true });
    }),
  );

  return createFontPicker(fonts, charsets);
}

/**
 * Build the resolver separately so font-selection logic is unit-testable with
 * fake metric objects.
 *
 * @param {Record<string, {widthOfTextAtSize:(text:string,size:number)=>number}>} fonts
 * @param {Record<string, Set<number>>} charsets
 */
export function createFontPicker(fonts, charsets) {
  const latinRoles = ['regular', 'bold', 'italic', 'boldItalic', 'mono'];
  // Unique code points that no embedded face can draw. The renderer turns
  // this into a per-document warning so a PDF never silently loses content.
  const missingCodePoints = new Set();

  function supports(role, char) {
    const cp = char.codePointAt(0);
    return Boolean(charsets[role]?.has(cp));
  }

  /**
   * Pick a font role for one character.
   * @param {string} char
   * @param {{ bold?: boolean, italic?: boolean, code?: boolean }} [style]
   */
  function roleFor(char, style = {}) {
    const normalized = normalizeChar(char);
    if (!normalized) return null;
    const preferred = style.code
      ? 'mono'
      : style.bold && style.italic
        ? 'boldItalic'
        : style.bold
          ? 'bold'
          : style.italic
            ? 'italic'
            : 'regular';
    if (supports(preferred, normalized)) return preferred;
    for (const role of latinRoles) {
      if (supports(role, normalized)) return role;
    }
    if (supports('cjk', normalized)) return 'cjk';
    missingCodePoints.add(normalized.codePointAt(0));
    return 'missing';
  }

  /**
   * Split one styled run into contiguous font runs. Unsupported characters
   * become U+FFFD if the replacement glyph exists, otherwise '?'. This keeps
   * an exotic emoji from crashing an otherwise valid export.
   *
   * @param {string} text
   * @param {{ bold?: boolean, italic?: boolean, code?: boolean }} [style]
   * @returns {{ text: string, role: string }[]}
   */
  function split(text, style = {}) {
    const out = [];
    for (const char of String(text ?? '')) {
      let role = roleFor(char, style);
      let value = char;
      if (!role) continue;
      if (role === 'missing') {
        // U+FFFD is listed by some CJK cmaps but maps to .notdef; a plain
        // question mark is guaranteed to exist in every embedded font and,
        // more importantly, is a real glyph the subsetter can encode.
        role = 'regular';
        value = '?';
      }
      const previous = out[out.length - 1];
      if (previous && previous.role === role) previous.text += value;
      else out.push({ text: value, role });
    }
    return out;
  }

  function widthOf(text, role, size) {
    const font = fonts[role] ?? fonts.regular;
    return font.widthOfTextAtSize(text, size);
  }

  return {
    fonts,
    charsets,
    roleFor,
    split,
    widthOf,
    normalizeChar,
    missingCodePoints,
  };
}

/** Font role used for a bold/italic combination. */
export function roleForStyle(style = {}) {
  if (style.code) return 'mono';
  if (style.bold && style.italic) return 'boldItalic';
  if (style.bold) return 'bold';
  if (style.italic) return 'italic';
  return 'regular';
}

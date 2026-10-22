/**
 * Text measurement and line breaking for the PDF renderer.
 *
 * Lines are built from styled runs, then split again by glyph coverage so a
 * single sentence can mix DejaVu Latin and Noto CJK without tofu. The result is
 * a list of positioned-ready line objects; drawing belongs to renderer.js.
 */

const CJK_RE =
  /[\u1100-\u11ff\u2e80-\u2fdf\u3040-\u30ff\u3100-\u31ff\u3400-\u4dbf\u4e00-\u9fff\ua960-\ua97f\uac00-\ud7af\uf900-\ufaff\uff66-\uff9f]/u;
const CLOSING_PUNCTUATION = new Set('，。！？；：、）》」』】〕〉·…—');
const OPENING_PUNCTUATION = new Set('（《「『【〔〈');

/** @param {string} char */
export function isCjk(char) {
  return CJK_RE.test(char);
}

function segmentKey(segment) {
  return `${segment.role}|${segment.size}|${segment.link ?? ''}|${segment.code ? 1 : 0}`;
}

function pushSegment(segments, segment) {
  const last = segments[segments.length - 1];
  if (last && segmentKey(last) === segmentKey(segment)) last.text += segment.text;
  else segments.push({ ...segment });
}

/**
 * Split one token into font-role segments at the given size.
 *
 * @param {{text:string,bold?:boolean,italic?:boolean,code?:boolean,link?:string|null}} run
 * @param {ReturnType<import('./fonts.js').createFontPicker>} picker
 * @param {number} size
 */
export function tokenSegments(run, picker, size) {
  const style = { bold: run.bold, italic: run.italic, code: run.code };
  const parts = picker.split(run.text, style);
  return parts.map((part) => ({
    text: part.text,
    role: part.role,
    size: run.code ? size * 0.92 : size,
    code: Boolean(run.code),
    link: run.link || null,
  }));
}

function segmentsWidth(segments, picker) {
  return segments.reduce((sum, segment) => sum + picker.widthOf(segment.text, segment.role, segment.size), 0);
}

/**
 * Tokenize while preserving each token's originating style. The simpler
 * `tokenizeRuns` shape is kept for direct tests; this internal variant carries
 * style and font segments.
 */
function tokenizeStyledRuns(runs, picker, size) {
  const tokens = [];
  for (const run of runs) {
    const text = String(run.text ?? '');
    let index = 0;
    const emitWord = (value) => {
      const base = {
        text: run.text,
        bold: run.bold,
        italic: run.italic,
        code: run.code,
        link: run.link,
      };
      const segments = tokenSegments({ ...base, text: value }, picker, size);
      tokens.push({
        type: 'word',
        text: value,
        segments,
        width: segmentsWidth(segments, picker),
      });
    };
    while (index < text.length) {
      const char = text[index];
      if (char === '\n') {
        tokens.push({ type: 'newline' });
        index += 1;
        continue;
      }
      if (/\s/.test(char)) {
        while (index < text.length && /\s/.test(text[index]) && text[index] !== '\n') index += 1;
        tokens.push({ type: 'space' });
        continue;
      }
      if (isCjk(char)) {
        if (CLOSING_PUNCTUATION.has(char) && tokens.length) {
          const previous = tokens[tokens.length - 1];
          if (previous.type === 'word') {
            previous.text += char;
            previous.segments = tokenSegments(
              {
                text: previous.text,
                bold: previous.bold,
                italic: previous.italic,
                code: previous.code,
                link: previous.link,
              },
              picker,
              size,
            );
            previous.width = segmentsWidth(previous.segments, picker);
            index += 1;
            continue;
          }
        }
        emitWord(char);
        index += 1;
        continue;
      }

      let word = '';
      let local = index;
      while (local < text.length) {
        const next = text[local];
        if (/\s/.test(next) || next === '\n' || isCjk(next)) break;
        word += next;
        local += 1;
      }
      // Split punctuation-only runs from words so CJK opening brackets can
      // follow a Latin word without creating a leading-punctuation line.
      emitWord(word);
      index = local;
    }
  }
  return tokens;
}

/**
 * Wrap styled runs into lines.
 *
 * @param {Array<object>} runs
 * @param {{
 *   picker: ReturnType<import('./fonts.js').createFontPicker>,
 *   width: number,
 *   size: number,
 * }} options
 * @returns {{ segments: Array<object>, width: number }[]}
 */
export function wrapRuns(runs, { picker, width, size }) {
  const tokens = tokenizeStyledRuns(runs, picker, size);
  const lines = [];
  let line = [];
  let lineWidth = 0;
  let pendingSpace = null;

  const flush = () => {
    lines.push({ segments: line, width: lineWidth });
    line = [];
    lineWidth = 0;
    pendingSpace = null;
  };

  const addSegments = (segments, extraWidth) => {
    for (const segment of segments) pushSegment(line, segment);
    lineWidth += extraWidth;
  };

  for (const token of tokens) {
    if (token.type === 'newline') {
      flush();
      continue;
    }
    if (token.type === 'space') {
      if (line.length) {
        const last = line[line.length - 1];
        // Spread first, then force the space text: the other order lets the
        // previous segment's text overwrite the space and duplicates words.
        pendingSpace = { ...last, text: ' ', link: last.link };
      }
      continue;
    }
    if (!token.width) continue;

    const spaceWidth = pendingSpace
      ? picker.widthOf(' ', pendingSpace.role, pendingSpace.size)
      : 0;
    if (line.length && lineWidth + spaceWidth + token.width > width) {
      flush();
    }
    if (!line.length) pendingSpace = null;

    if (pendingSpace && line.length) {
      addSegments([pendingSpace], spaceWidth);
      pendingSpace = null;
    }

    if (token.width <= width - lineWidth) {
      addSegments(token.segments, token.width);
      continue;
    }

    // A single token longer than the line: split it by character.
    for (const segment of token.segments) {
      let buffer = '';
      for (const char of segment.text) {
        const candidate = buffer + char;
        const candidateWidth = picker.widthOf(candidate, segment.role, segment.size);
        if (buffer && lineWidth + candidateWidth > width) {
          addSegments([{ ...segment, text: buffer }], picker.widthOf(buffer, segment.role, segment.size));
          flush();
          buffer = char;
        } else {
          buffer = candidate;
        }
      }
      if (buffer) {
        const bufferWidth = picker.widthOf(buffer, segment.role, segment.size);
        addSegments([{ ...segment, text: buffer }], bufferWidth);
      }
    }
  }

  if (line.length || !lines.length) flush();
  return lines;
}

/** Measure plain text with one font role. */
export function textWidth(text, role, size, picker) {
  return picker.widthOf(text, role, size);
}

/**
 * Truncate with an ellipsis to fit a width.
 *
 * @param {string} text
 * @param {string} role
 * @param {number} size
 * @param {number} width
 * @param {ReturnType<import('./fonts.js').createFontPicker>} picker
 */
export function truncateText(text, role, size, width, picker) {
  const value = String(text ?? '');
  if (picker.widthOf(value, role, size) <= width) return value;
  const ellipsis = '…';
  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (picker.widthOf(value.slice(0, mid) + ellipsis, role, size) <= width) low = mid;
    else high = mid - 1;
  }
  return value.slice(0, low).trimEnd() + ellipsis;
}

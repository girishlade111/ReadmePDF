/**
 * HTML → semantic PDF block model.
 *
 * The PDF renderer deliberately does not know about CSS classes or print
 * themes. It consumes a small, deterministic model produced here from the
 * already-sanitised document HTML. That keeps layout testable and makes the
 * output independent of the browser's stylesheet.
 *
 * Inline style is represented on runs (`bold`, `italic`, `code`, `link`), so
 * words can be re-wrapped without losing emphasis.
 */

const HEADING_LEVELS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NAV', 'TEMPLATE', 'NOSCRIPT']);

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ');
}

function pushRun(runs, text, style = {}) {
  if (!text) return;
  const clean = text === '\n' ? '\n' : normalizeWhitespace(text);
  if (!clean) return;
  const last = runs[runs.length - 1];
  if (
    last &&
    Boolean(last.bold) === Boolean(style.bold) &&
    Boolean(last.italic) === Boolean(style.italic) &&
    Boolean(last.code) === Boolean(style.code) &&
    (last.link ?? '') === (style.link ?? '')
  ) {
    last.text += clean;
    return;
  }
  runs.push({
    text: clean,
    bold: Boolean(style.bold),
    italic: Boolean(style.italic),
    code: Boolean(style.code),
    link: style.link || null,
  });
}

function trimRuns(runs) {
  const out = runs.map((run) => ({ ...run }));
  while (out.length && !out[0].text.trim()) out.shift();
  while (out.length && !out[out.length - 1].text.trim()) out.pop();
  if (out.length) {
    out[0].text = out[0].text.replace(/^\s+/, '');
    out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, '');
  }
  return out.filter((run) => run.text.length > 0);
}

function textOf(runs) {
  return runs.map((run) => run.text).join('');
}

/**
 * Inline content of one DOM element.
 *
 * @param {Element|Node} node
 * @param {{ bold?: boolean, italic?: boolean, code?: boolean, link?: string|null }} style
 * @param {Array<object>} images collected images found inside inline flow
 * @returns {Array<object>} runs
 */
function inlineRuns(node, style, images) {
  const runs = [];
  for (const child of Array.from(node.childNodes ?? [])) {
    if (child.nodeType === 3) {
      pushRun(runs, child.nodeValue ?? '', style);
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName;
    if (SKIP_TAGS.has(tag)) continue;
    if (tag === 'BR') {
      pushRun(runs, '\n', style);
      continue;
    }
    if (tag === 'IMG') {
      images.push(imageBlock(child));
      continue;
    }
    if (tag === 'STRONG' || tag === 'B') {
      runs.push(...inlineRuns(child, { ...style, bold: true }, images));
      continue;
    }
    if (tag === 'EM' || tag === 'I' || tag === 'CITE') {
      runs.push(...inlineRuns(child, { ...style, italic: true }, images));
      continue;
    }
    if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') {
      // No strikethrough font in the PDF; the text is still meaningful.
      runs.push(...inlineRuns(child, style, images));
      continue;
    }
    if (tag === 'CODE' || tag === 'KBD' || tag === 'SAMP') {
      runs.push(...inlineRuns(child, { ...style, code: true }, images));
      continue;
    }
    if (tag === 'A') {
      const href = child.getAttribute('href') ?? '';
      runs.push(...inlineRuns(child, { ...style, link: href || null }, images));
      continue;
    }
    if (tag === 'PICTURE') {
      const img = child.querySelector('img');
      if (img) images.push(imageBlock(img));
      continue;
    }
    if (tag === 'SUP' || tag === 'SUB' || tag === 'MARK' || tag === 'SPAN') {
      runs.push(...inlineRuns(child, style, images));
      continue;
    }
    if (tag === 'INPUT') continue;
    // Unknown inline element: keep its text.
    runs.push(...inlineRuns(child, style, images));
  }
  return runs;
}

/** @param {Element} element */
function imageBlock(element) {
  return {
    type: 'image',
    src: element.getAttribute('src') ?? '',
    alt: (element.getAttribute('alt') ?? '').trim(),
    title: (element.getAttribute('title') ?? '').trim(),
    width: Number(element.getAttribute('width')) || null,
    height: Number(element.getAttribute('height')) || null,
  };
}

/**
 * Inline content of a child node that sits directly inside a list item.
 *
 * `inlineRuns` applies a tag's meaning when it walks *children*, so an `<a>`
 * or `<strong>` at the item level would otherwise lose its style. Apply the
 * node's own inline semantics before delegating to the normal walker.
 *
 * @param {Element} element
 * @param {{ bold?: boolean, italic?: boolean, code?: boolean, link?: string|null }} style
 * @param {Array<object>} images
 */
function inlineChildRuns(element, style, images) {
  const tag = element.tagName;
  if (SKIP_TAGS.has(tag) || tag === 'INPUT') return [];
  if (tag === 'IMG') {
    images.push(imageBlock(element));
    return [];
  }
  if (tag === 'PICTURE') {
    const img = element.querySelector('img');
    if (img) images.push(imageBlock(img));
    return [];
  }
  if (tag === 'STRONG' || tag === 'B') {
    return inlineRuns(element, { ...style, bold: true }, images);
  }
  if (tag === 'EM' || tag === 'I' || tag === 'CITE') {
    return inlineRuns(element, { ...style, italic: true }, images);
  }
  if (tag === 'CODE' || tag === 'KBD' || tag === 'SAMP') {
    return inlineRuns(element, { ...style, code: true }, images);
  }
  if (tag === 'A') {
    const href = element.getAttribute('href') ?? '';
    return inlineRuns(element, { ...style, link: href || null }, images);
  }
  return inlineRuns(element, style, images);
}

/**
 * Convert a list item into blocks, dropping the item's own marker so the PDF
 * renderer controls numbering and indentation.
 *
 * @param {Element} item
 * @param {object} context
 */
function listItemBlocks(item, context) {
  const blocks = [];
  const inline = [];
  let sawBlock = false;

  const flushInline = () => {
    if (!inline.length) return;
    const runs = trimRuns(inline.splice(0, inline.length));
    if (runs.length) blocks.push({ type: 'paragraph', runs });
  };

  for (const child of Array.from(item.childNodes ?? [])) {
    if (child.nodeType === 3) {
      pushRun(inline, child.nodeValue ?? '');
      continue;
    }
    if (child.nodeType !== 1) continue;
    if (child.tagName === 'UL' || child.tagName === 'OL') {
      flushInline();
      blocks.push(convertList(child, context));
      sawBlock = true;
      continue;
    }
    if (child.tagName === 'P' || child.tagName === 'DIV') {
      flushInline();
      blocks.push(...convertBlock(child, context));
      sawBlock = true;
      continue;
    }
    // Inline node at item level.
    const images = [];
    const runs = inlineChildRuns(child, {}, images);
    inline.push(...runs);
    for (const image of images) {
      flushInline();
      blocks.push(image);
      sawBlock = true;
    }
  }
  flushInline();
  if (!blocks.length && !sawBlock) blocks.push({ type: 'paragraph', runs: [] });
  return blocks;
}

/** @param {Element} element @param {object} context */
function convertList(element, context) {
  const ordered = element.tagName === 'OL';
  const startAttr = Number(element.getAttribute('start'));
  const items = [];
  for (const child of Array.from(element.children ?? [])) {
    if (child.tagName !== 'LI') continue;
    items.push({ blocks: listItemBlocks(child, context) });
  }
  return {
    type: 'list',
    ordered,
    start: Number.isFinite(startAttr) && startAttr > 0 ? startAttr : 1,
    items,
  };
}

/** @param {Element} element @param {object} context */
function convertTable(element, context) {
  const rows = [];
  let headerRows = 0;

  const collect = (row, isHeader) => {
    const cells = [];
    for (const cell of Array.from(row.children ?? [])) {
      if (cell.tagName !== 'TD' && cell.tagName !== 'TH') continue;
      const images = [];
      const runs = trimRuns(inlineRuns(cell, {}, images));
      cells.push({
        runs,
        header: isHeader || cell.tagName === 'TH',
        colspan: Math.max(1, Math.min(8, Number(cell.getAttribute('colspan')) || 1)),
      });
    }
    if (cells.length) {
      rows.push(cells);
      if (isHeader) headerRows = rows.length;
    }
  };

  for (const child of Array.from(element.children ?? [])) {
    if (child.tagName === 'THEAD') {
      for (const row of Array.from(child.children ?? [])) collect(row, true);
    } else if (child.tagName === 'TBODY' || child.tagName === 'TFOOT') {
      for (const row of Array.from(child.children ?? [])) collect(row, false);
    } else if (child.tagName === 'TR') {
      collect(child, false);
    }
  }

  if (!rows.length) {
    // Degenerate table (e.g. all cells stripped): keep any visible text.
    const runs = trimRuns(inlineRuns(element, {}, []));
    return runs.length ? [{ type: 'paragraph', runs }] : [];
  }

  return {
    type: 'table',
    headerRows,
    rows,
    columns: Math.max(...rows.map((row) => row.reduce((sum, cell) => sum + cell.colspan, 0))),
  };
}

/** @param {Element} element @param {object} context */
function convertBlock(element, context) {
  const tag = element.tagName;
  if (SKIP_TAGS.has(tag)) return [];
  if (tag === 'P') {
    const images = [];
    const runs = trimRuns(inlineRuns(element, {}, images));
    const blocks = [];
    if (runs.length) blocks.push({ type: 'paragraph', runs });
    blocks.push(...images);
    return blocks;
  }
  if (HEADING_LEVELS.has(tag)) {
    const images = [];
    const runs = trimRuns(inlineRuns(element, { bold: true }, images));
    if (!runs.length) return [];
    return [
      {
        type: 'heading',
        level: Number(tag.slice(1)),
        runs,
        anchor: element.getAttribute('id') || null,
      },
    ];
  }
  if (tag === 'UL' || tag === 'OL') return [{ ...convertList(element, context) }];
  if (tag === 'PRE') {
    const code = element.querySelector('code');
    const source = code ?? element;
    const className = source.getAttribute?.('class') ?? element.getAttribute('class') ?? '';
    const language = /language-([\w-]+)/.exec(className)?.[1] ?? '';
    return [
      {
        type: 'code',
        text: String(source.textContent ?? '').replace(/\s+$/, ''),
        language,
      },
    ];
  }
  if (tag === 'BLOCKQUOTE') {
    const blocks = [];
    for (const child of Array.from(element.childNodes ?? [])) {
      if (child.nodeType === 3) {
        const runs = trimRuns([{ text: child.nodeValue ?? '' }]);
        if (runs.length) blocks.push({ type: 'paragraph', runs });
      } else if (child.nodeType === 1) {
        blocks.push(...convertBlock(child, context));
      }
    }
    return [{ type: 'blockquote', blocks }];
  }
  if (tag === 'TABLE') return [convertTable(element, context)];
  if (tag === 'HR') return [{ type: 'hr' }];
  if (tag === 'IMG') return [imageBlock(element)];
  if (tag === 'FIGURE') {
    const blocks = [];
    const img = element.querySelector('img');
    if (img) blocks.push(imageBlock(img));
    const caption = element.querySelector('figcaption');
    if (caption) {
      const runs = trimRuns(inlineRuns(caption, { italic: true }, []));
      if (runs.length) blocks.push({ type: 'caption', runs });
    }
    return blocks;
  }
  if (tag === 'FIGCAPTION') {
    const runs = trimRuns(inlineRuns(element, { italic: true }, []));
    return runs.length ? [{ type: 'caption', runs }] : [];
  }
  if (tag === 'DETAILS') {
    const blocks = [];
    for (const child of Array.from(element.children ?? [])) {
      if (child.tagName === 'SUMMARY') {
        const runs = trimRuns(inlineRuns(child, { bold: true }, []));
        if (runs.length) blocks.push({ type: 'paragraph', runs });
      } else {
        blocks.push(...convertBlock(child, context));
      }
    }
    return blocks;
  }
  if (tag === 'DL') {
    const blocks = [];
    for (const child of Array.from(element.children ?? [])) {
      if (child.tagName === 'DT') {
        const runs = trimRuns(inlineRuns(child, { bold: true }, []));
        if (runs.length) blocks.push({ type: 'paragraph', runs, spaceAfter: 2 });
      } else if (child.tagName === 'DD') {
        const runs = trimRuns(inlineRuns(child, {}, []));
        if (runs.length) blocks.push({ type: 'paragraph', runs, indent: 16 });
      }
    }
    return blocks;
  }
  if (tag === 'LI') return listItemBlocks(element, context);

  // Layout containers: recurse.
  const blocks = [];
  for (const child of Array.from(element.childNodes ?? [])) {
    if (child.nodeType === 3) {
      const runs = trimRuns([{ text: child.nodeValue ?? '' }]);
      if (runs.length && textOf(runs).trim()) blocks.push({ type: 'paragraph', runs });
    } else if (child.nodeType === 1) {
      blocks.push(...convertBlock(child, context));
    }
  }
  return blocks;
}

/**
 * Convert a sanitised HTML fragment into blocks.
 *
 * @param {string} html
 * @param {{ document?: Document, title?: string }} [options]
 */
export function htmlToBlocks(html, options = {}) {
  const doc =
    options.document ??
    (typeof DOMParser !== 'undefined' ? new DOMParser().parseFromString(html, 'text/html') : null);
  if (!doc) throw new Error('No DOM parser is available to build the PDF model.');
  const body = doc.body;
  if (!body) return [];
  const blocks = [];
  for (const child of Array.from(body.childNodes)) {
    if (child.nodeType === 3) {
      const runs = trimRuns([{ text: child.nodeValue ?? '' }]);
      if (runs.length && textOf(runs).trim()) blocks.push({ type: 'paragraph', runs });
    } else if (child.nodeType === 1) {
      blocks.push(...convertBlock(child, {}));
    }
  }
  return blocks;
}

/** Concatenate all text from a block tree (used for tests and emptiness checks). */
export function blocksToText(blocks) {
  const out = [];
  const walk = (list) => {
    for (const block of list ?? []) {
      if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'caption') {
        out.push(textOf(block.runs));
      } else if (block.type === 'code') {
        out.push(block.text);
      } else if (block.type === 'list') {
        for (const item of block.items) walk(item.blocks);
      } else if (block.type === 'blockquote') {
        walk(block.blocks);
      } else if (block.type === 'table') {
        for (const row of block.rows) {
          for (const cell of row) out.push(textOf(cell.runs));
        }
      }
    }
  };
  walk(blocks);
  return out.join('\n');
}

export { inlineRuns, trimRuns, textOf, normalizeWhitespace };

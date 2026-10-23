/**
 * A4 PDF layout and rendering.
 *
 * The renderer consumes the semantic block model from model.js and draws with
 * pdf-lib. It implements page flow, headings, paragraphs, nested lists, code
 * blocks, tables (including header repetition), images, external link
 * annotations, internal chapter anchors, a cover, and a linked table of
 * contents with real page numbers.
 *
 * All layout is deterministic. Fonts are subsetted and glyph-selected; see
 * fonts.js.
 */
import { PDFDocument, PDFName, PDFString, rgb } from 'pdf-lib';
import { embedPdfFonts } from './fonts.js';
import { wrapRuns } from './text.js';

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const PAGE_MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const THEMES = Object.freeze({
  clean: {
    accent: rgb(0.05, 0.45, 0.42),
    heading: rgb(0.09, 0.16, 0.18),
    text: rgb(0.12, 0.15, 0.16),
    muted: rgb(0.38, 0.42, 0.43),
    rule: rgb(0.82, 0.84, 0.84),
    codeBg: rgb(0.955, 0.96, 0.955),
    tableBg: rgb(0.94, 0.955, 0.95),
    link: rgb(0.05, 0.36, 0.62),
  },
  business: {
    accent: rgb(0.11, 0.24, 0.42),
    heading: rgb(0.08, 0.15, 0.28),
    text: rgb(0.12, 0.15, 0.2),
    muted: rgb(0.4, 0.45, 0.52),
    rule: rgb(0.8, 0.83, 0.87),
    codeBg: rgb(0.95, 0.96, 0.98),
    tableBg: rgb(0.92, 0.94, 0.97),
    link: rgb(0.1, 0.32, 0.6),
  },
  academic: {
    accent: rgb(0.45, 0.16, 0.1),
    heading: rgb(0.24, 0.12, 0.09),
    text: rgb(0.16, 0.13, 0.12),
    muted: rgb(0.44, 0.4, 0.37),
    rule: rgb(0.84, 0.8, 0.76),
    codeBg: rgb(0.97, 0.955, 0.94),
    tableBg: rgb(0.96, 0.93, 0.9),
    link: rgb(0.45, 0.16, 0.1),
  },
  dark: {
    // A literal black-background PDF wastes toner and prints poorly. The dark
    // theme is represented by its ink/contrast hierarchy, not by black pages.
    accent: rgb(0.55, 0.42, 0.12),
    heading: rgb(0.1, 0.1, 0.1),
    text: rgb(0.14, 0.14, 0.14),
    muted: rgb(0.4, 0.4, 0.4),
    rule: rgb(0.72, 0.72, 0.72),
    codeBg: rgb(0.93, 0.93, 0.93),
    tableBg: rgb(0.9, 0.9, 0.9),
    link: rgb(0.36, 0.28, 0.08),
  },
});

export function themePalette(theme) {
  return THEMES[theme] ?? THEMES.clean;
}

function cleanText(value, fallback = '') {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}

function headingSize(level) {
  return [0, 20, 16.5, 14, 12.3, 11.2, 10.5][level] ?? 10.5;
}

function addDays(date) {
  return new Date(date);
}

/**
 * Heading text from the first heading of a chapter, used as a friendly TOC
 * label instead of a raw repository path.
 *
 * @param {Array<object>} blocks
 */
export function chapterHeading(blocks) {
  const heading = (blocks ?? []).find((block) => block.type === 'heading');
  if (!heading) return '';
  return heading.runs.map((run) => run.text).join('').trim();
}

class PdfRenderer {
  /**
   * @param {import('pdf-lib').PDFDocument} pdfDoc
   * @param {ReturnType<import('./fonts.js').createFontPicker>} picker
   * @param {object} options
   */
  constructor(pdfDoc, picker, options) {
    this.pdfDoc = pdfDoc;
    this.picker = picker;
    this.options = options;
    this.palette = themePalette(options.theme);
    this.pages = [];
    this.page = null;
    this.ops = [];
    this.y = 0;
    this.anchors = new Map();
    this.tocSlots = [];
    this.warnings = Array.isArray(options.warnings) ? options.warnings : [];
    this.imageCache = new Map();
    this.contentTop = PAGE_MARGIN + 18;
    this.contentBottom = PAGE_HEIGHT - PAGE_MARGIN;
    this.contentHeight = this.contentBottom - this.contentTop;
    this.page = null;
  }

  get currentPageIndex() {
    return this.pages.length - 1;
  }

  newPage({ chrome = true } = {}) {
    const page = this.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.page = page;
    this.ops = [];
    this.pages.push({ page, ops: this.ops, chrome, index: this.pages.length });
    this.y = this.contentTop;
    return page;
  }

  ensure(height) {
    if (!this.page || this.y + height > this.contentBottom) {
      this.newPage();
      return true;
    }
    return false;
  }

  baseline(top, size) {
    return PAGE_HEIGHT - top - size * 0.82;
  }

  addText(text, { x, top, size, role, color }) {
    if (!text) return;
    this.ops.push({
      kind: 'text',
      text,
      x,
      top,
      size,
      role,
      color,
    });
  }

  /** First-line width of auto-font text, capped to `width`. */
  measureAutoText(text, style, size, width = CONTENT_WIDTH) {
    const lines = wrapRuns([{ text: String(text ?? ''), ...style }], {
      picker: this.picker,
      width,
      size,
    });
    return Math.min(lines[0]?.width ?? 0, width);
  }

  /**
   * Draw text whose font must be chosen per glyph (CJK, Cyrillic, emoji
   * fallbacks). Unlike `addText`, this never forces a face that may not cover
   * the string.
   *
   * @param {string} text
   * @param {{ bold?: boolean, italic?: boolean, code?: boolean }} style
   * @param {{ x: number, top: number, size: number, color?: object, width?: number }} options
   * @returns {{ width: number, truncated: boolean }}
   */
  addAutoText(text, style, { x, top, size, color, width = CONTENT_WIDTH }) {
    const lines = wrapRuns([{ text: String(text ?? ''), ...style }], {
      picker: this.picker,
      width,
      size,
    });
    const line = lines[0];
    if (!line || !line.segments.length) return { width: 0, truncated: false };
    if (lines.length > 1) {
      const ellipsisWidth = this.picker.widthOf('…', 'regular', size);
      if (line.width + ellipsisWidth <= width) {
        line.segments.push({
          text: '…',
          role: 'regular',
          size,
          code: false,
          link: null,
        });
        line.width += ellipsisWidth;
      }
    }
    this.drawLine(line, x, top, { color });
    return { width: line.width, truncated: lines.length > 1 };
  }

  addRect({ x, top, width, height, fill, stroke, lineWidth = 0.6 }) {
    this.ops.push({ kind: 'rect', x, top, width, height, fill, stroke, lineWidth });
  }

  addLine({ x1, top1, x2, top2, color, width = 0.6, dash = null }) {
    this.ops.push({ kind: 'line', x1, top1, x2, top2, color, width, dash });
  }

  /**
   * Draw a wrapped line of segments at x/top. External link segments become
   * annotation rectangles; internal links are resolved after layout.
   */
  drawLine(line, x, top, { color = this.palette.text, linkColor = this.palette.link } = {}) {
    let cursor = x;
    const links = [];
    for (const segment of line.segments) {
      if (!segment.text) continue;
      const width = this.picker.widthOf(segment.text, segment.role, segment.size);
      this.addText(segment.text, {
        x: cursor,
        top,
        size: segment.size,
        role: segment.role,
        color: segment.link ? linkColor : color,
      });
      if (segment.link) {
        const previous = links[links.length - 1];
        if (previous && previous.link === segment.link && Math.abs(previous.x + previous.width - cursor) < 0.5) {
          previous.width += width;
        } else {
          links.push({ link: segment.link, x: cursor, width, height: segment.size * 1.25 });
        }
      }
      cursor += width;
    }
    for (const link of links) {
      if (!this.page) continue;
      this.ops.push({
        kind: 'link',
        link: link.link,
        x: link.x,
        top,
        width: link.width,
        height: link.height,
      });
    }
    return cursor - x;
  }

  placeRuns(runs, opts = {}) {
    const size = opts.size ?? 10.3;
    const lineHeight = opts.lineHeight ?? size * 1.5;
    const indent = opts.indent ?? 0;
    const width = CONTENT_WIDTH - indent - (opts.rightIndent ?? 0);
    const lines = wrapRuns(runs, { picker: this.picker, width, size });
    const before = opts.spaceBefore ?? 0;
    const after = opts.spaceAfter ?? 0;
    if (!lines.length) return;

    if (before) {
      if (this.y + before > this.contentBottom) this.newPage();
      else this.y += before;
    }

    // Avoid a single orphan line at the top of a new page when the paragraph
    // has at least two lines: keep two lines together.
    if (lines.length > 1 && this.y + lineHeight * 2 > this.contentBottom) {
      this.newPage();
    }

    for (const line of lines) {
      if (this.y + lineHeight > this.contentBottom) this.newPage();
      this.drawLine(line, PAGE_MARGIN + indent, this.y + (lineHeight - size) / 2 + size * 0.12, {
        color: opts.color ?? this.palette.text,
      });
      this.y += lineHeight;
    }
    this.y += after;
  }

  heading(block) {
    const level = Math.min(6, Math.max(1, block.level));
    const size = headingSize(level);
    const lineHeight = size * 1.35;
    const runs = block.runs.map((run) => ({ ...run, bold: true }));
    const lines = wrapRuns(runs, {
      picker: this.picker,
      width: CONTENT_WIDTH,
      size,
    });
    const before = level === 1 ? 18 : level === 2 ? 14 : 10;
    const after = level <= 2 ? 7 : 5;
    const needed = before + lineHeight * Math.min(lines.length, 2) + after;
    if (this.y + needed > this.contentBottom) this.newPage();
    else this.y += before;

    if (block.anchor && !this.anchors.has(block.anchor)) {
      this.anchors.set(block.anchor, { page: this.currentPageIndex, top: this.y });
    }
    this.addRect({
      x: PAGE_MARGIN,
      top: this.y + 1,
      width: level <= 2 ? 28 : 16,
      height: level <= 2 ? 2.4 : 1.6,
      fill: this.palette.accent,
    });
    this.y += 5;
    for (const line of lines) {
      if (this.y + lineHeight > this.contentBottom) this.newPage();
      this.drawLine(line, PAGE_MARGIN, this.y + (lineHeight - size) / 2, {
        color: this.palette.heading,
      });
      this.y += lineHeight;
    }
    this.y += after;
  }

  paragraph(block, opts = {}) {
    this.placeRuns(block.runs, {
      indent: opts.indent ?? block.indent ?? 0,
      spaceAfter: block.spaceAfter ?? 6,
      color: opts.color,
    });
  }

  caption(block) {
    this.placeRuns(
      block.runs.map((run) => ({ ...run, italic: true })),
      {
        size: 8.8,
        lineHeight: 12.5,
        indent: 0,
        spaceAfter: 10,
        color: this.palette.muted,
      },
    );
  }

  list(block, indent = 0) {
    let number = block.start ?? 1;
    for (const item of block.items) {
      const marker = block.ordered ? `${number}.` : '•';
      number += 1;
      const markerWidth = this.picker.widthOf(marker, 'regular', 10.3);
      // Keep the marker with at least the first two lines of its item.
      if (this.y + 30 > this.contentBottom) this.newPage();
      const markerTop = this.y;
      this.addText(marker, {
        x: PAGE_MARGIN + indent,
        top: markerTop,
        size: block.ordered ? 9.6 : 10.3,
        role: 'regular',
        color: this.palette.accent,
      });
      const itemIndent = indent + Math.max(16, markerWidth + 6);
      for (const child of item.blocks) {
        this.block(child, { indent: itemIndent });
      }
      this.y += 3;
    }
  }

  code(block, indent = 0) {
    const size = 8.4;
    const lineHeight = 11.6;
    const pad = 7;
    const width = CONTENT_WIDTH - indent;
    const sourceLines = String(block.text ?? '').split(/\r?\n/);
    const wrapped = [];
    for (const source of sourceLines) {
      if (!source) {
        wrapped.push({ segments: [], width: 0 });
        continue;
      }
      const lines = wrapRuns([{ text: source, code: true }], {
        picker: this.picker,
        width: width - pad * 2,
        size,
      });
      wrapped.push(...lines);
    }
    if (!wrapped.length) return;
    if (this.y + Math.min(lineHeight * 2 + pad, this.contentBottom - this.contentTop) > this.contentBottom) {
      this.newPage();
    }
    this.y += 5;
    for (const line of wrapped) {
      if (this.y + lineHeight > this.contentBottom) this.newPage();
      this.addRect({
        x: PAGE_MARGIN + indent,
        top: this.y,
        width,
        height: lineHeight,
        fill: this.palette.codeBg,
      });
      if (line.segments.length) {
        this.drawLine(
          line,
          PAGE_MARGIN + indent + pad,
          this.y + (lineHeight - size) / 2,
          { color: this.palette.text },
        );
      }
      this.y += lineHeight;
    }
    this.y += 9;
  }

  async blockquote(block, indent = 0) {
    this.y += 3;
    const x = PAGE_MARGIN + indent + 2;
    let segmentPage = this.currentPageIndex;
    let segmentTop = this.y;
    const closeSegment = (bottom) => {
      if (!this.page || bottom <= segmentTop + 0.5) return;
      this.pages[segmentPage].ops.push({
        kind: 'line',
        x1: x,
        top1: segmentTop,
        x2: x,
        top2: bottom,
        color: this.palette.rule,
        width: 2,
      });
    };
    for (const child of block.blocks) {
      await this.block(child, { indent: indent + 16, color: this.palette.muted });
      if (this.currentPageIndex !== segmentPage) {
        // The quote crossed a page boundary: finish the rule at the bottom of
        // the old page and start a new rule at the top of the new one.
        closeSegment(this.contentBottom);
        segmentPage = this.currentPageIndex;
        segmentTop = this.contentTop;
      }
    }
    closeSegment(this.y);
    this.y += 3;
  }

  async image(block, indent = 0) {
    const loaded = await this.loadImage(block.src);
    const available = CONTENT_WIDTH - indent;
    if (!loaded) {
      const label = block.alt ? `[Image unavailable: ${cleanText(block.alt)}]` : '[Image unavailable]';
      this.placeRuns([{ text: label, italic: true }], {
        size: 8.8,
        indent,
        color: this.palette.muted,
        spaceAfter: 8,
      });
      return;
    }
    const maxWidth = available;
    const maxHeight = Math.min(this.contentHeight * 0.62, 440);
    const ratio = loaded.width / loaded.height;
    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
    if (this.y + height + 8 > this.contentBottom) this.newPage();
    if (height > this.contentHeight) {
      height = this.contentHeight;
      width = height * ratio;
    }
    const x = PAGE_MARGIN + indent + Math.max(0, (available - width) / 2);
    this.ops.push({ kind: 'image', image: loaded.image, x, top: this.y, width, height });
    this.y += height + 6;
    if (block.alt) {
      this.placeRuns([{ text: cleanText(block.alt), italic: true }], {
        size: 8.2,
        lineHeight: 11,
        indent,
        spaceAfter: 8,
        color: this.palette.muted,
      });
    } else {
      this.y += 4;
    }
  }

  async loadImage(src) {
    const key = String(src ?? '');
    if (!key) return null;
    if (this.imageCache.has(key)) return this.imageCache.get(key);
    let result = null;
    try {
      if (!/^(https?:|data:image\/)/i.test(key)) throw new Error('unsupported image URL');
      const loader = this.options.imageLoader;
      if (loader) {
        result = await loader(key, this.pdfDoc);
      } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(key, { signal: controller.signal, mode: 'cors' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const type = response.headers.get('content-type') ?? '';
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength > 8 * 1024 * 1024) throw new Error('image larger than 8 MB');
          const bytes = new Uint8Array(buffer);
          if (/png/i.test(type) || /^data:image\/png/i.test(key) || (bytes[0] === 0x89 && bytes[1] === 0x50)) {
            result = await this.pdfDoc.embedPng(bytes);
          } else if (/jpe?g/i.test(type) || /^data:image\/jpe?g/i.test(key) || bytes[0] === 0xff) {
            result = await this.pdfDoc.embedJpg(bytes);
          } else if (/gif|webp/i.test(type)) {
            throw new Error('GIF/WebP images are not supported; use PNG or JPEG');
          } else {
            throw new Error('unsupported image format');
          }
        } finally {
          clearTimeout(timer);
        }
      }
    } catch (error) {
      this.warnings.push({ path: key, message: `Image skipped: ${error?.message ?? error}` });
      result = null;
    }
    this.imageCache.set(key, result);
    return result;
  }

  measureCell(cell, width, size = 8.6) {
    const lines = wrapRuns(cell.runs, {
      picker: this.picker,
      width: Math.max(20, width - 8),
      size,
    });
    return lines.length ? lines : [{ segments: [], width: 0 }];
  }

  table(block, indent = 0) {
    const size = 8.6;
    const lineHeight = 11.8;
    const padY = 4;
    const available = CONTENT_WIDTH - indent;
    const columns = Math.max(1, block.columns || 1);

    // Natural widths from treated-as-plain max token widths, then scale into
    // the available column area.
    const natural = new Array(columns).fill(40);
    for (const row of block.rows) {
      let col = 0;
      for (const cell of row) {
        const text = cell.runs.map((run) => run.text).join(' ');
        const longest = text.split(/\s+/).reduce(
          (max, word) => Math.max(max, this.picker.widthOf(word, 'regular', size)),
          36,
        );
        const span = Math.max(1, Math.min(cell.colspan, columns - col));
        const share = Math.min(190, longest + 10) / span;
        for (let i = 0; i < span; i += 1) natural[col + i] = Math.max(natural[col + i], share);
        col += span;
      }
    }
    const total = natural.reduce((sum, value) => sum + value, 0);
    let widths = natural.map((value) => (value / total) * available);
    widths = widths.map((value) => Math.max(32, value));
    const fixedTotal = widths.reduce((sum, value) => sum + value, 0);
    widths = widths.map((value) => (value / fixedTotal) * available);

    const headerRows = Math.max(0, Math.min(block.headerRows || 0, block.rows.length));
    const drawHeader = (row) => this.drawTableRow(row, widths, { size, lineHeight, padY, header: true, indent });

    let rowIndex = 0;
    while (rowIndex < block.rows.length) {
      const row = block.rows[rowIndex];
      const cells = [];
      let col = 0;
      for (const cell of row) {
        const span = Math.max(1, Math.min(cell.colspan, columns - col));
        const width = widths.slice(col, col + span).reduce((sum, value) => sum + value, 0);
        cells.push({ cell, col, span, width, lines: this.measureCell(cell, width, size) });
        col += span;
      }
      const rowHeight = Math.max(...cells.map((entry) => entry.lines.length)) * lineHeight + padY * 2;
      const isHeader = rowIndex < headerRows;

      if (!isHeader && rowHeight > this.contentHeight) {
        // Split an unusually tall row across pages, repeating the header.
        let offset = 0;
        let first = true;
        while (offset < Math.max(...cells.map((entry) => entry.lines.length))) {
          if (this.y + lineHeight + padY * 2 > this.contentBottom) {
            this.newPage();
            if (headerRows && !first) {
              for (let h = 0; h < headerRows; h += 1) drawHeader(block.rows[h]);
            }
          }
          const capacity = Math.max(
            1,
            Math.floor((this.contentBottom - this.y - padY * 2) / lineHeight),
          );
          const chunkCells = cells.map((entry) => ({
            ...entry,
            lines: entry.lines.slice(offset, offset + capacity),
          }));
          const chunkHeight =
            Math.max(...chunkCells.map((entry) => entry.lines.length)) * lineHeight + padY * 2;
          this.drawTableCells(chunkCells, { size, lineHeight, padY, header: isHeader, indent, height: chunkHeight });
          offset += capacity;
          first = false;
          if (offset < Math.max(...cells.map((entry) => entry.lines.length))) this.newPage();
        }
        rowIndex += 1;
        continue;
      }

      if (this.y + rowHeight > this.contentBottom) {
        this.newPage();
        if (headerRows && !isHeader) {
          for (let h = 0; h < headerRows; h += 1) drawHeader(block.rows[h]);
        }
      }
      this.drawTableCells(cells, { size, lineHeight, padY, header: isHeader, indent, height: rowHeight });
      rowIndex += 1;
    }
    this.y += 10;
  }

  drawTableRow(row, widths, opts) {
    let col = 0;
    const cells = [];
    for (const cell of row) {
      const span = Math.max(1, Math.min(cell.colspan, widths.length - col));
      const width = widths.slice(col, col + span).reduce((sum, value) => sum + value, 0);
      cells.push({ cell, col, span, width, lines: this.measureCell(cell, width, opts.size) });
      col += span;
    }
    const height = Math.max(...cells.map((entry) => entry.lines.length)) * opts.lineHeight + opts.padY * 2;
    if (this.y + height > this.contentBottom) this.newPage();
    this.drawTableCells(cells, { ...opts, height });
  }

  drawTableCells(cells, { size, lineHeight, padY, header, indent, height }) {
    let x = PAGE_MARGIN + indent;
    const top = this.y;
    // Borders first so text sits above them.
    const totalWidth = cells.reduce((sum, entry) => sum + entry.width, 0);
    this.addRect({
      x,
      top,
      width: totalWidth,
      height,
      fill: header ? this.palette.tableBg : null,
      stroke: this.palette.rule,
      lineWidth: 0.5,
    });
    let borderX = x;
    for (const entry of cells) {
      borderX += entry.width;
      if (borderX < x + totalWidth - 0.5) {
        this.addLine({ x1: borderX, top1: top, x2: borderX, top2: top + height, color: this.palette.rule, width: 0.5 });
      }
    }
    for (const entry of cells) {
      let lineTop = top + padY;
      for (const line of entry.lines) {
        if (line.segments.length) {
          this.drawLine(line, x + 4, lineTop + (lineHeight - size) / 2, {
            color: entry.cell.header || header ? this.palette.heading : this.palette.text,
          });
        }
        lineTop += lineHeight;
      }
      x += entry.width;
    }
    this.y += height;
  }

  hr() {
    if (this.y + 14 > this.contentBottom) this.newPage();
    this.y += 6;
    this.addLine({
      x1: PAGE_MARGIN,
      top1: this.y,
      x2: PAGE_MARGIN + CONTENT_WIDTH,
      top2: this.y,
      color: this.palette.rule,
      width: 0.8,
    });
    this.y += 8;
  }

  async block(block, context = {}) {
    const indent = context.indent ?? 0;
    switch (block.type) {
      case 'heading':
        this.heading(block);
        break;
      case 'paragraph':
        this.paragraph(block, { ...context, indent });
        break;
      case 'caption':
        this.caption(block);
        break;
      case 'list':
        this.list(block, indent);
        break;
      case 'code':
        this.code(block, indent);
        break;
      case 'blockquote':
        this.blockquote(block, indent);
        break;
      case 'table':
        this.table(block, indent);
        break;
      case 'image':
        await this.image(block, indent);
        break;
      case 'hr':
        this.hr();
        break;
      default:
        break;
    }
  }

  async blocks(blocks, context = {}) {
    for (const block of blocks ?? []) {
      await this.block(block, context);
    }
  }

  drawCover() {
    const opts = this.options;
    this.newPage({ chrome: false });
    const palette = this.palette;
    this.addRect({ x: 0, top: 0, width: PAGE_WIDTH, height: 14, fill: palette.accent });
    let top = 138;
    this.addAutoText(cleanText(opts.labels?.coverEyebrow ?? 'README TO PDF').toUpperCase(), { bold: true }, {
      x: PAGE_MARGIN + 10,
      top,
      size: 9,
      color: palette.accent,
    });
    top += 34;
    const title = cleanText(opts.title, 'Documentation');
    const titleLines = wrapRuns([{ text: title, bold: true }], {
      picker: this.picker,
      width: CONTENT_WIDTH - 20,
      size: 30,
    }).slice(0, 4);
    for (const line of titleLines) {
      this.drawLine(line, PAGE_MARGIN + 10, top, { color: palette.heading });
      top += 38;
    }
    if (opts.subtitle) {
      top += 6;
      const subtitleLines = wrapRuns([{ text: cleanText(opts.subtitle), italic: true }], {
        picker: this.picker,
        width: CONTENT_WIDTH - 20,
        size: 13,
      });
      for (const line of subtitleLines.slice(0, 3)) {
        this.drawLine(line, PAGE_MARGIN + 10, top, { color: palette.muted });
        top += 19;
      }
    }
    top += 30;
    this.addLine({
      x1: PAGE_MARGIN + 10,
      top1: top,
      x2: PAGE_MARGIN + 150,
      top2: top,
      color: palette.accent,
      width: 2,
    });
    top += 24;
    const meta = [];
    if (opts.owner && opts.repo) meta.push(`${opts.owner}/${opts.repo}`);
    if (opts.ref) meta.push(opts.ref);
    if (opts.commitSha) meta.push(opts.commitSha.slice(0, 8));
    if (Number.isInteger(opts.chapterCount)) {
      meta.push(`${opts.chapterCount} chapter${opts.chapterCount === 1 ? '' : 's'}`);
    }
    if (opts.generatedAt) meta.push(addDays(opts.generatedAt).toISOString().slice(0, 10));
    for (const item of meta) {
      this.addAutoText(item, {}, {
        x: PAGE_MARGIN + 10,
        top,
        size: 10.5,
        color: palette.muted,
      });
      top += 17;
    }
    this.addAutoText('Generated locally by ReadmePDF. No file was uploaded.', {}, {
      x: PAGE_MARGIN + 10,
      top: PAGE_HEIGHT - PAGE_MARGIN - 16,
      size: 8,
      color: palette.muted,
    });
  }

  drawTitleBlock() {
    const opts = this.options;
    const titleLines = wrapRuns([{ text: cleanText(opts.title, 'Document'), bold: true }], {
      picker: this.picker,
      width: CONTENT_WIDTH,
      size: 22,
    }).slice(0, 4);
    for (const line of titleLines) {
      this.drawLine(line, PAGE_MARGIN, this.y, { color: this.palette.heading });
      this.y += 30;
    }
    if (opts.subtitle) {
      const lines = wrapRuns([{ text: cleanText(opts.subtitle), italic: true }], {
        picker: this.picker,
        width: CONTENT_WIDTH,
        size: 10.5,
      });
      for (const line of lines) {
        this.drawLine(line, PAGE_MARGIN, this.y, { color: this.palette.muted });
        this.y += 15;
      }
    }
    const meta = [opts.source, opts.ref, opts.commitSha?.slice(0, 8)].filter(Boolean).join(' · ');
    if (meta) {
      this.addAutoText(meta, {}, {
        x: PAGE_MARGIN,
        top: this.y,
        size: 8.5,
        color: this.palette.muted,
      });
      this.y += 14;
    }
    this.addLine({
      x1: PAGE_MARGIN,
      top1: this.y,
      x2: PAGE_MARGIN + CONTENT_WIDTH,
      top2: this.y,
      color: this.palette.rule,
      width: 0.8,
    });
    this.y += 16;
  }

  /**
   * Pre-compute TOC page groups. This must happen before body pages are
   * created, because the body page numbers depend on how many TOC pages exist.
   */
  planToc(entries) {
    const pageCapacity = this.contentHeight - 34;
    const pages = [];
    let current = [];
    let used = 0;
    for (const entry of entries) {
      const height = entry.kind === 'chapter' ? 24 : 17;
      if (used + height > pageCapacity && current.length) {
        pages.push(current);
        current = [];
        used = 0;
      }
      current.push({ ...entry, height });
      used += height;
    }
    if (current.length) pages.push(current);
    return pages;
  }

  drawToc(entries) {
    const groups = this.planToc(entries);
    this.tocPageStart = this.pages.length;
    for (const [groupIndex, group] of groups.entries()) {
      this.newPage();
      this.addText(groupIndex === 0 ? 'Contents' : 'Contents (continued)', {
        x: PAGE_MARGIN,
        top: this.y,
        size: 18,
        role: 'bold',
        color: this.palette.heading,
      });
      this.y += 30;
      this.addLine({
        x1: PAGE_MARGIN,
        top1: this.y - 4,
        x2: PAGE_MARGIN + CONTENT_WIDTH,
        top2: this.y - 4,
        color: this.palette.rule,
        width: 0.6,
      });
      for (const entry of group) {
        const size = entry.kind === 'chapter' ? 10.4 : 9.4;
        const indent = entry.kind === 'chapter' ? 0 : 16 + (entry.level - 1) * 10;
        const numberWidth = 34;
        const textWidth = CONTENT_WIDTH - indent - numberWidth - 8;
        const { width: labelWidth } = this.addAutoText(entry.text, {
          bold: entry.kind === 'chapter',
        }, {
          x: PAGE_MARGIN + indent,
          top: this.y + 4,
          size,
          width: textWidth,
          color: entry.kind === 'chapter' ? this.palette.heading : this.palette.text,
        });
        const dotsStart = PAGE_MARGIN + indent + labelWidth + 5;
        const dotsEnd = PAGE_MARGIN + CONTENT_WIDTH - numberWidth;
        if (dotsEnd > dotsStart) {
          this.addLine({
            x1: dotsStart,
            top1: this.y + size,
            x2: dotsEnd,
            top2: this.y + size,
            color: this.palette.rule,
            width: 0.5,
            dash: [0.8, 2.6],
          });
        }
        this.tocSlots.push({
          pageIndex: this.currentPageIndex,
          top: this.y + 2,
          indent,
          numberX: PAGE_MARGIN + CONTENT_WIDTH - numberWidth + 6,
          width: CONTENT_WIDTH - indent,
          anchor: entry.anchor ?? null,
        });
        this.y += entry.height;
      }
    }
    this.tocPageEnd = this.pages.length;
  }

  finishToc() {
    const total = this.pages.length;
    for (const slot of this.tocSlots) {
      const target = slot.anchor ? this.anchors.get(slot.anchor) : null;
      if (!target) continue;
      this.pages[slot.pageIndex].ops.push({
        kind: 'text',
        text: String(target.page + 1),
        x: slot.numberX,
        top: slot.top,
        size: 9.4,
        role: 'regular',
        color: this.palette.text,
      });
      this.pages[slot.pageIndex].ops.push({
        kind: 'link',
        link: `#page:${target.page}`,
        x: PAGE_MARGIN + slot.indent,
        top: slot.top - 2,
        width: slot.width,
        height: 14,
      });
    }
    return total;
  }

  drawChrome() {
    const total = this.pages.length;
    const opts = this.options;
    for (const entry of this.pages) {
      if (!entry.chrome) continue;
      const headerY = 30;
      if (opts.chapters > 1) {
        this.ops = entry.ops;
        this.addAutoText(cleanText(opts.title), {}, {
          x: PAGE_MARGIN,
          top: headerY,
          size: 8,
          width: 330,
          color: this.palette.muted,
        });
        const right = cleanText([opts.owner, opts.repo].filter(Boolean).join('/'));
        if (right) {
          const width = this.measureAutoText(right, {}, 8, 150);
          this.addAutoText(right, {}, {
            x: PAGE_MARGIN + CONTENT_WIDTH - width,
            top: headerY,
            size: 8,
            width: 150,
            color: this.palette.muted,
          });
        }
        this.addLine({
          x1: PAGE_MARGIN,
          top1: 43,
          x2: PAGE_MARGIN + CONTENT_WIDTH,
          top2: 43,
          color: this.palette.rule,
          width: 0.5,
        });
      }
      const label = `${entry.index + 1} / ${total}`;
      const width = this.picker.widthOf(label, 'regular', 8.5);
      this.addText(label, {
        x: PAGE_MARGIN + (CONTENT_WIDTH - width) / 2,
        top: PAGE_HEIGHT - 34,
        size: 8.5,
        role: 'regular',
        color: this.palette.muted,
      });
    }
    this.ops = this.pages[this.pages.length - 1]?.ops ?? [];
  }

  async build() {
    const opts = this.options;
    const chapters = opts.chapters ?? [];
    if (opts.includeCover && chapters.length > 1) this.drawCover();

    const tocEntries = [];
    if (opts.includeToc && chapters.length > 1) {
      for (const chapter of chapters) {
        tocEntries.push({
          kind: 'chapter',
          text: chapter.title || chapter.path,
          anchor: chapter.anchor,
        });
        const headings = [];
        const walk = (blocks) => {
          for (const block of blocks) {
            if (block.type === 'heading' && block.level <= 2 && block.anchor) headings.push(block);
            else if (block.type === 'blockquote') walk(block.blocks);
          }
        };
        walk(chapter.blocks);
        for (const heading of headings.slice(0, 12)) {
          tocEntries.push({
            kind: 'heading',
            level: heading.level,
            text: heading.runs.map((run) => run.text).join(''),
            anchor: heading.anchor,
          });
        }
      }
      this.drawToc(tocEntries);
    }

    for (const [index, chapter] of chapters.entries()) {
      if (opts.includeCover || index > 0 || opts.includeToc) this.newPage();
      else this.newPage();
      const anchor = chapter.anchor ?? `chapter-${index + 1}`;
      this.anchors.set(anchor, { page: this.currentPageIndex, top: this.y });
      this.addAutoText(cleanText(chapter.path || chapter.title || ''), {}, {
        x: PAGE_MARGIN,
        top: this.y,
        size: 8.5,
        color: this.palette.accent,
      });
      this.y += 13;
      this.addLine({
        x1: PAGE_MARGIN,
        top1: this.y,
        x2: PAGE_MARGIN + CONTENT_WIDTH,
        top2: this.y,
        color: this.palette.rule,
        width: 0.6,
      });
      this.y += 14;
      if (chapters.length === 1 && !opts.includeCover) this.drawTitleBlock();
      await this.blocks(chapter.blocks);

      if (opts.onChapter) opts.onChapter(index, this.pages.length);
      if (opts.signal?.aborted) {
        const error = new Error('PDF export cancelled.');
        error.code = 'CANCELLED';
        throw error;
      }
    }

    if (this.tocSlots.length) this.finishToc();
    this.drawChrome();
    this.renderOps();
    return { pageCount: this.pages.length };
  }

  renderOps() {
    // pdf-lib's CFF subsetter throws while saving when an embedded font never
    // encoded a glyph (the CJK font is embedded for every export so Chinese,
    // Japanese, and Korean text can appear anywhere). One invisible space per
    // face keeps every subset non-empty without changing the visible page.
    const first = this.pages[0];
    if (first) {
      for (const font of new Set(Object.values(this.picker.fonts))) {
        try {
          first.page.drawText(' ', { x: 0, y: 0, size: 1, font, opacity: 0 });
        } catch {
          // A face without a space glyph is still usable for visible text.
        }
      }
    }
    for (const entry of this.pages) {
      for (const op of entry.ops) {
        if (op.kind === 'text') {
          const font = this.picker.fonts[op.role] ?? this.picker.fonts.regular;
          entry.page.drawText(op.text, {
            x: op.x,
            y: this.baseline(op.top, op.size),
            size: op.size,
            font,
            color: op.color ?? this.palette.text,
          });
        } else if (op.kind === 'rect') {
          entry.page.drawRectangle({
            x: op.x,
            y: PAGE_HEIGHT - op.top - op.height,
            width: op.width,
            height: op.height,
            color: op.fill ?? undefined,
            borderColor: op.stroke ?? undefined,
            borderWidth: op.stroke ? op.lineWidth : undefined,
          });
        } else if (op.kind === 'line') {
          entry.page.drawLine({
            start: { x: op.x1, y: PAGE_HEIGHT - op.top1 },
            end: { x: op.x2, y: PAGE_HEIGHT - op.top2 },
            color: op.color ?? this.palette.rule,
            thickness: op.width,
            dashArray: op.dash ?? undefined,
          });
        } else if (op.kind === 'image') {
          entry.page.drawImage(op.image, {
            x: op.x,
            y: PAGE_HEIGHT - op.top - op.height,
            width: op.width,
            height: op.height,
          });
        }
      }
    }
    this.addAnnotations();
  }

  addAnnotations() {
    const context = this.pdfDoc.context;
    for (const entry of this.pages) {
      for (const op of entry.ops) {
        if (op.kind !== 'link') continue;
        let action;
        if (op.link.startsWith('#page:')) {
          const pageIndex = Number(op.link.slice(6));
          const target = this.pages[pageIndex];
          if (!target) continue;
          action = {
            Type: 'Action',
            S: 'GoTo',
            D: [target.page.ref, PDFName.of('XYZ'), null, null, null],
          };
        } else if (op.link.startsWith('#')) {
          const anchor = this.anchors.get(op.link.slice(1));
          if (!anchor) continue;
          const target = this.pages[anchor.page];
          action = {
            Type: 'Action',
            S: 'GoTo',
            D: [target.page.ref, PDFName.of('XYZ'), null, null, null],
          };
        } else if (/^https?:/i.test(op.link)) {
          action = {
            Type: 'Action',
            S: 'URI',
            URI: PDFString.of(op.link),
          };
        } else {
          continue;
        }
        const rect = [
          op.x,
          PAGE_HEIGHT - op.top - op.height,
          op.x + op.width,
          PAGE_HEIGHT - op.top,
        ];
        const annot = context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: rect,
          Border: [0, 0, 0],
          A: action,
        });
        entry.page.node.addAnnot(context.register(annot));
      }
    }
  }
}

/**
 * Build one PDF.
 *
 * @param {{
 *   chapters: Array<{path:string, title?:string, anchor?:string, blocks:Array<object>}>,
 *   title?: string,
 *   subtitle?: string,
 *   owner?: string,
 *   repo?: string,
 *   ref?: string,
 *   commitSha?: string,
 *   locale?: string,
 *   theme?: string,
 *   includeCover?: boolean,
 *   includeToc?: boolean,
 *   fontBytes: Record<string, ArrayBuffer>,
 *   imageLoader?: Function,
 *   labels?: Record<string, string>,
 *   signal?: AbortSignal,
 *   warnings?: Array<object>,
 *   generatedAt?: Date,
 * }} options
 */
export async function renderPdf(options) {
  if (!options?.chapters?.length) throw new Error('No chapters were supplied for PDF export.');
  if (options.signal?.aborted) {
    const error = new Error('PDF export cancelled.');
    error.code = 'CANCELLED';
    throw error;
  }

  const pdfDoc = await PDFDocument.create();
  const generatedAt = options.generatedAt ?? new Date();
  pdfDoc.setTitle(cleanText(options.title, 'ReadmePDF document'));
  pdfDoc.setAuthor(cleanText(options.author ?? 'ReadmePDF'));
  pdfDoc.setSubject(cleanText(options.subtitle ?? 'Documentation exported from GitHub'));
  pdfDoc.setCreator('ReadmePDF');
  pdfDoc.setProducer('ReadmePDF (pdf-lib)');
  pdfDoc.setCreationDate(generatedAt);
  pdfDoc.setModificationDate(generatedAt);
  if (options.locale) pdfDoc.setLanguage(options.locale);

  const picker = await embedPdfFonts(pdfDoc, options.fontBytes);
  const renderer = new PdfRenderer(pdfDoc, picker, {
    ...options,
    chapters: options.chapters,
    chapterCount: options.chapters.length,
    generatedAt,
  });
  const result = await renderer.build();

  // `?` substitution keeps the export valid, but the reader must know that
  // the PDF is not a faithful copy. Report the exact code points once per
  // document instead of failing the whole export (an emoji in a heading must
  // not cost the reader the other twenty-nine chapters).
  const missing = [...(picker.missingCodePoints ?? [])].sort((a, b) => a - b);
  if (missing.length) {
    const shown = missing
      .slice(0, 24)
      .map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
    renderer.warnings.push({
      code: 'MISSING_GLYPHS',
      message: `Characters with no embedded glyph were replaced by "?": ${shown.join(', ')}${
        missing.length > shown.length ? ` (+${missing.length - shown.length} more)` : ''
      }.`,
      codePoints: shown,
      count: missing.length,
    });
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return {
    bytes: Uint8Array.from(bytes),
    pageCount: result.pageCount,
    warnings: renderer.warnings,
    anchors: renderer.anchors,
  };
}

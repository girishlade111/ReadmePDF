/**
 * ReadmePDF — Markdown → HTML (GFM) + TOC helpers.
 * Works in browser (Vite-bundled) and Node (tests).
 *
 * Heading ids are produced from markdown-it's own token stream so the table of
 * contents and the rendered headings can never drift apart. Combined books
 * pass an id prefix (`doc-2-`) to make every document's ids unique.
 */
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import { sanitizeHtml } from './sanitize.js';

let _md = null;

function getMd() {
  if (!_md) {
    _md = new MarkdownIt({ html: true, linkify: true, typographer: false });
    _md.use(taskLists, { enabled: true, label: true });
    // The ids are supplied per render through `env`; using a renderer rule
    // means the id is attached to the actual heading element, not guessed
    // later from the source text.
    _md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
      const level = Number(String(tokens[idx]?.tag ?? '').slice(1));
      if (Number.isInteger(level) && level >= 1 && level <= 4) {
        const ids = env?.rpdfHeadingIds;
        if (Array.isArray(ids) && ids.length) {
          const id = ids.shift();
          if (id) tokens[idx].attrSet('id', id);
        }
      }
      return self.renderToken(tokens, idx, options);
    };
  }
  return _md;
}

function slugify(text, used) {
  let slug = text
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  if (!slug) slug = 'section';
  let uniq = slug;
  let i = 2;
  while (used.has(uniq)) uniq = `${slug}-${i++}`;
  used.add(uniq);
  return uniq;
}

/** Slug the way heading ids are minted, without duplicate tracking. */
export function slugifyHeading(text) {
  return slugify(text, new Set());
}

function stripMdInline(text) {
  return String(text ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inlineTokenText(token) {
  if (!token) return '';
  if (Array.isArray(token.children) && token.children.length) {
    let text = '';
    for (const child of token.children) {
      if (child.type === 'softbreak' || child.type === 'hardbreak') {
        text += ' ';
      } else if (child.type === 'html_inline') {
        text += stripMdInline(child.content);
      } else if (child.type === 'image') {
        text += child.content || child.attrGet?.('alt') || '';
      } else if (typeof child.content === 'string') {
        text += child.content;
      }
    }
    return stripMdInline(text);
  }
  return stripMdInline(token.content);
}

/** Extract H1–H4 headings from parsed markdown-it tokens. */
export function extractHeadingsFromTokens(tokens) {
  const out = [];
  const used = new Set();
  for (let i = 0; i < (tokens?.length ?? 0); i += 1) {
    const token = tokens[i];
    if (token.type !== 'heading_open') continue;
    const level = Number(token.tag.slice(1));
    if (!Number.isFinite(level) || level < 1 || level > 4) continue;
    const text = inlineTokenText(tokens[i + 1]);
    if (!text) continue;
    out.push({ level, text, slug: slugify(text, used) });
  }
  return out;
}

/**
 * Extract ATX/setext headings (H1-H4) with unique, stable slugs.
 * @returns {{ level:number, text:string, slug:string }[]}
 */
export function extractHeadings(md) {
  const tokens = getMd().parse(String(md ?? ''), {});
  return extractHeadingsFromTokens(tokens);
}

/** Build TOC nav HTML from headings. Empty string when < 3 headings. */
export function buildTocHtml(headings) {
  if (!headings || headings.length < 3) return '';
  const items = headings
    .map(
      (h) =>
        `<li class="toc-l${h.level}"><a href="#${escapeHtml(h.slug)}">${escapeHtml(h.text)}</a></li>`,
    )
    .join('');
  return `<nav class="toc" aria-label="Table of contents"><p class="toc-title">Contents</p><ul>${items}</ul></nav>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}

function normalizeIdPrefix(prefix) {
  return String(prefix ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Render a document with heading ids, synchronously. Useful for tests and for
 * callers that sanitise the result separately.
 *
 * @param {string} md
 * @param {{ idPrefix?: string }} [options]
 * @returns {{ html: string, headings: {level:number,text:string,slug:string}[] }}
 */
export function renderMarkdownDocumentSync(md, { idPrefix = '' } = {}) {
  const engine = getMd();
  const source = typeof md === 'string' ? md : '';
  const env = {};
  const tokens = engine.parse(source, env);
  const prefix = normalizeIdPrefix(idPrefix);
  const headings = extractHeadingsFromTokens(tokens).map((heading) => ({
    ...heading,
    slug: `${prefix}${heading.slug}`,
  }));
  env.rpdfHeadingIds = headings.map((heading) => heading.slug);
  const html = engine.renderer.render(tokens, engine.options, env);
  return { html, headings };
}

/**
 * Render a document and sanitise it in the browser. In Node (tests) HTML is
 * returned as-is unless a `sanitize` function is supplied.
 *
 * @param {string} md
 * @param {{
 *   idPrefix?: string,
 *   sanitize?: (html: string) => string | Promise<string>
 * }} [options]
 */
export async function renderMarkdownDocument(md, options = {}) {
  const result = renderMarkdownDocumentSync(md, options);
  if (typeof options.sanitize === 'function') {
    result.html = await options.sanitize(result.html);
  } else if (typeof window !== 'undefined') {
    result.html = await sanitizeHtml(result.html);
  }
  return result;
}

/**
 * Render Markdown to HTML for the single-document preview.
 * Browser output is sanitised; a sanitizer failure rejects rather than
 * returning unsanitised GitHub HTML.
 */
export async function renderMarkdown(md) {
  const html = getMd().render(typeof md === 'string' ? md : '');
  if (typeof window !== 'undefined') {
    return sanitizeHtml(html);
  }
  return html;
}

/** Synchronous render for Node tests (no sanitization). */
export function renderMarkdownSync(md) {
  return getMd().render(typeof md === 'string' ? md : '');
}

/**
 * Assign matching slug ids to rendered h1-h4 in DOM order.
 * Must run after setting preview innerHTML. Returns heading count.
 */
export function injectHeadingIds(root, headings) {
  if (!root) return 0;
  const els = root.querySelectorAll('h1, h2, h3, h4');
  const queue = [...(headings ?? [])];
  let i = 0;
  els.forEach((el) => {
    const match = queue[i++];
    el.id = match ? match.slug : el.id || `section-${i}`;
  });
  return els.length;
}

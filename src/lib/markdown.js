/**
 * ReadmePDF — Markdown → HTML (GFM) + TOC helpers.
 * Works in browser (Vite-bundled) and Node (tests).
 */
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';

let _md = null;
function getMd() {
  if (!_md) {
    _md = new MarkdownIt({ html: true, linkify: true, typographer: false });
    _md.use(taskLists, { enabled: true, label: true });
  }
  return _md;
}

/** Render Markdown to HTML. Sanitizes in browser via DOMPurify; passthrough in Node (tests). */
let _purifyPromise = null;
export async function renderMarkdown(md) {
  const html = getMd().render(typeof md === 'string' ? md : '');
  if (typeof window !== 'undefined') {
    try {
      _purifyPromise ??= import('dompurify');
      const { default: DOMPurify } = await _purifyPromise;
      return DOMPurify.sanitize(html, {
        ADD_ATTR: ['target', 'rel'],
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      });
    } catch {
      return html;
    }
  }
  return html;
}

/** Synchronous render for Node tests (no sanitization). */
export function renderMarkdownSync(md) {
  return getMd().render(typeof md === 'string' ? md : '');
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

function stripMdInline(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Extract ATX headings (H1-H4) outside fenced code blocks.
 * @returns {{ level:number, text:string, slug:string }[]}
 */
export function extractHeadings(md) {
  const lines = String(md ?? '').split('\n');
  const out = [];
  const used = new Set();
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  for (const line of lines) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      const fence = m[1];
      if (!inFence) {
        inFence = true;
        fenceChar = fence[0];
        fenceLen = fence.length;
      } else if (fence[0] === fenceChar && fence.length >= fenceLen) {
        inFence = false;
        fenceChar = '';
        fenceLen = 0;
      }
      continue;
    }
    if (inFence) continue;
    const h = line.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (h) {
      const text = stripMdInline(h[2]);
      if (!text) continue;
      out.push({ level: h[1].length, text, slug: slugify(text, used) });
    }
  }
  return out;
}

/** Build TOC nav HTML from headings. Empty string when < 3 headings. */
export function buildTocHtml(headings) {
  if (!headings || headings.length < 3) return '';
  const items = headings
    .map(
      (h) =>
        `<li class="toc-l${h.level}"><a href="#${h.slug}">${escapeHtml(h.text)}</a></li>`,
    )
    .join('');
  return `<nav class="toc" aria-label="Table of contents"><p class="toc-title">Contents</p><ul>${items}</ul></nav>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

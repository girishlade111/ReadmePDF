/**
 * ReadmePDF — client-side converter controller (no login, no uploads).
 * Only network calls: github.com / raw.githubusercontent.com via lib/github.js.
 */
import { fetchReadme, rewriteRelativeUrls } from '../lib/github.js';
import {
  renderMarkdown,
  extractHeadings,
  buildTocHtml,
  injectHeadingIds,
} from '../lib/markdown.js';

const SAMPLE = `# ReadmePDF — Sample README

Paste a GitHub repo URL above, drop a \`README.md\`, or just type Markdown here.

## Features

- [x] GitHub URL fetch with image/badge path resolution
- [x] Live GFM preview (tables, task lists, code)
- [ ] Your next great README section

## Table demo

| Option | What it does |
| ------ | ------------ |
| Clean  | Neutral default |
| Dark   | Screen-friendly (auto-lightens for print) |

## Code demo

\`\`\`js
const msg = "hello readme";
console.log(msg);
\`\`\`

## Links & images

A relative image like \`docs/logo.png\` resolves against the fetched repo.
An absolute badge like ![build](https://img.shields.io/badge/build-passing-brightgreen) is left untouched.

### A fourth-level heading exists so TOC shows nesting

#### Detail heading
`;

export function initConverter() {
  if (typeof document === 'undefined' || document.body.dataset.readmepdfInit) return;
  document.body.dataset.readmepdfInit = '1';
  const $ = (id) => document.getElementById(id);
  const urlInput = $('gh-url');
  const fetchBtn = $('fetch-btn');
  const fileInput = $('file-input');
  const mdInput = $('md-input');
  const statusEl = $('status');
  const metaEl = $('meta');
  const previewEl = $('preview-doc');
  const sheetEl = $('sheet');
  const tocToggle = $('toc-toggle');
  const printBtn = $('print-btn');
  const clearBtn = $('clear-btn');
  const sampleBtn = $('sample-btn');
  const darkWarn = $('dark-warn');
  const themeInputs = [...document.querySelectorAll('input[name="theme"]')];
  const printTriggers = [...document.querySelectorAll('[data-print]')];

  /** Repo context for relative-path resolution; null = paste/upload mode. */
  let repoCtx = null;
  let renderTimer = 0;

  setStatus('', '');
  renderMeta();
  scheduleRender();

  fetchBtn.addEventListener('click', onFetch);
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onFetch();
  });
  fileInput.addEventListener('change', onFile);
  mdInput.addEventListener('input', scheduleRender);
  tocToggle.addEventListener('change', scheduleRender);
  printBtn.addEventListener('click', () => window.print());
  printTriggers.forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      window.print();
    }),
  );
  initSubnav();
  clearBtn.addEventListener('click', () => {
    mdInput.value = '';
    repoCtx = null;
    renderMeta();
    setStatus('', '');
    scheduleRender();
  });
  sampleBtn.addEventListener('click', () => {
    mdInput.value = SAMPLE;
    repoCtx = null;
    renderMeta();
    setStatus('Sample loaded. Paste a repo URL to try the real flow.', 'ok');
    scheduleRender();
  });
  themeInputs.forEach((r) =>
    r.addEventListener('change', () => {
      sheetEl.classList.remove('theme-clean', 'theme-business', 'theme-academic', 'theme-dark');
      sheetEl.classList.add(`theme-${document.querySelector('input[name="theme"]:checked').value}`);
      darkWarn.hidden = document.querySelector('input[name="theme"]:checked').value !== 'dark';
    }),
  );
  // Broken-image placeholder: never fail the whole export.
  previewEl.addEventListener(
    'error',
    (e) => {
      const t = e.target;
      if (t && t.tagName === 'IMG') {
        t.classList.add('broken');
        t.title = 'Image failed to load (missing or private). Export continues.';
        t.alt = `${t.alt || 'image'} [unavailable]`;
      }
    },
    true,
  );

  async function onFetch() {
    const url = urlInput.value.trim();
    if (!url) {
      setStatus('Paste a GitHub repo URL first, e.g. https://github.com/owner/repo', 'error');
      return;
    }
    fetchBtn.disabled = true;
    setStatus('Fetching README from GitHub…', '');
    try {
      const res = await fetchReadme(url);
      repoCtx = { owner: res.owner, repo: res.repo, branch: res.branch, readmePath: res.path };
      mdInput.value = res.markdown;
      renderMeta(res);
      setStatus(`Loaded ${res.owner}/${res.repo} @ ${res.branch} — preview updated.`, 'ok');
      scheduleRender();
    } catch (e) {
      repoCtx = null;
      renderMeta();
      setStatus(friendlyError(e), 'error');
    } finally {
      fetchBtn.disabled = false;
    }
  }

  async function onFile() {
    const f = fileInput.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setStatus('File is over the 2 MB free-tier limit. Try a smaller file.', 'error');
      fileInput.value = '';
      return;
    }
    try {
      mdInput.value = await f.text();
      repoCtx = null; // uploaded files have no repo base; relative images can't resolve
      renderMeta();
      setStatus(
        `Loaded ${f.name}. Note: relative image paths can't resolve without a repo URL.`,
        'ok',
      );
      scheduleRender();
    } catch {
      setStatus('Could not read that file. Try pasting the Markdown instead.', 'error');
    } finally {
      fileInput.value = '';
    }
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 180);
  }

  async function render() {
    const raw = mdInput.value || '';
    if (!raw.trim()) {
      previewEl.innerHTML = '<p class="hint">Nothing to preview yet — paste a repo URL, drop a file, or type Markdown.</p>';
      return;
    }
    let effective = raw;
    if (repoCtx) {
      try {
        effective = rewriteRelativeUrls(raw, repoCtx);
      } catch {
        effective = raw;
      }
    }
    const headings = extractHeadings(effective);
    const toc = tocToggle.checked ? buildTocHtml(headings) : '';
    try {
      previewEl.innerHTML = toc + (await renderMarkdown(effective));
      injectHeadingIds(previewEl, headings);
      // Open doc links in a new tab; keep TOC anchors in-page.
      previewEl.querySelectorAll('a[href^="http"]').forEach((a) => {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      });
    } catch {
      previewEl.innerHTML = '<p class="hint">Preview failed on this input. The Markdown is kept — try printing anyway or simplify it.</p>';
    }
  }

  function renderMeta(res) {
    if (!res && !repoCtx) {
      metaEl.textContent = 'Local mode — everything stays in your browser.';
      return;
    }
    const c = res ?? repoCtx;
    metaEl.textContent = '';
    metaEl.append(`${c.owner}/${c.repo} @ ${c.branch} — ${c.readmePath ?? ''}`);
    if (res?.rawUrl) {
      metaEl.append(' · ');
      const a = document.createElement('a');
      a.href = res.rawUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'raw source';
      metaEl.append(a);
    }
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = `status${kind ? ' ' + kind : ''}`;
  }

}

/**
 * Marks the sub-navigation item for the section currently in view.
 * The gold tab is a ::after on the active link, so toggling aria-current
 * is all the state this needs.
 */
function initSubnav() {
  const links = [...document.querySelectorAll('.subnav a[href^="#"]')];
  if (!links.length || typeof IntersectionObserver === 'undefined') return;
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;

  const setActive = (id) => {
    links.forEach((a) =>
      a.setAttribute('aria-current', a.getAttribute('href') === `#${id}` ? 'true' : 'false'),
    );
  };

  const visible = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => visible.set(entry.target.id, entry.isIntersecting));
      const active = sections.find((s) => visible.get(s.id));
      if (active) setActive(active.id);
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
  );
  sections.forEach((s) => observer.observe(s));
  setActive(sections[0].id);
}

/** User-facing message for fetch failures. Pure function — covered by tests. */
export function friendlyError(e) {
  const code = e?.code;
  if (code === 'INVALID_URL') return e.message;
  if (code === 'PRIVATE_OR_NOT_FOUND')
    return 'Repo not found or private (private repos need OAuth — phase 2). Paste the Markdown manually instead.';
  if (code === 'NO_README')
    return 'No README found on main/master (incl. .github/). Upload the file or paste it manually.';
  if (code === 'RATE_LIMITED') return 'GitHub rate limit hit (unauthenticated API). Wait ~1 min and retry.';
  return `Fetch failed: ${e?.message ?? e}. You can still paste Markdown manually.`;
}

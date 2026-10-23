/**
 * md2pdf — client-side converter controller (no login, no uploads).
 * Only network calls: github.com / raw.githubusercontent.com via lib/github.js.
 */
import { fetchReadme, rewriteRelativeUrls } from '../lib/github.js';
import {
  renderMarkdown,
  extractHeadings,
  buildTocHtml,
  injectHeadingIds,
} from '../lib/markdown.js';
import { printDocument } from '../lib/print.js';
import { initClientI18n, t } from '../i18n/client.js';

/**
 * Repo context line shown under the URL field.
 * `fetchReadme` reports the README path as `path`; stored contexts use
 * `readmePath`. Accept either so a live fetch never shows a blank path.
 */
export function repoMetaLabel(context) {
  if (!context) return '';
  const path = context.readmePath ?? context.path ?? '';
  return `${context.owner}/${context.repo} @ ${context.branch} — ${path}`;
}

export function initConverter() {
  if (typeof document === 'undefined' || document.body.dataset.md2pdfInit) return;
  document.body.dataset.md2pdfInit = '1';
  initClientI18n();
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
  printBtn.addEventListener('click', () => printSingle());
  printTriggers.forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      printSingle();
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
    mdInput.value = t('converter.sample');
    repoCtx = null;
    renderMeta();
    setStatus(t('converter.status.sampleLoaded'), 'ok');
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
      const image = e.target;
      if (image && image.tagName === 'IMG') {
        image.classList.add('broken');
        image.title = t('converter.image.failedTitle');
        image.alt = t('converter.image.unavailable', {
          alt: image.alt || t('converter.image.altFallback'),
        });
      }
    },
    true,
  );

  async function onFetch() {
    const url = urlInput.value.trim();
    if (!url) {
      setStatus(t('converter.status.emptyUrl'), 'error');
      return;
    }
    fetchBtn.disabled = true;
    setStatus(t('converter.status.fetching'), '');
    try {
      const res = await fetchReadme(url);
      repoCtx = { owner: res.owner, repo: res.repo, branch: res.branch, readmePath: res.path };
      mdInput.value = res.markdown;
      renderMeta(res);
      setStatus(
        t('converter.status.loaded', {
          owner: res.owner,
          repo: res.repo,
          branch: res.branch,
        }),
        'ok',
      );
      scheduleRender();
    } catch (e) {
      repoCtx = null;
      renderMeta();
      setStatus(friendlyError(e, t), 'error');
    } finally {
      fetchBtn.disabled = false;
    }
  }

  async function onFile() {
    const f = fileInput.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setStatus(t('converter.status.fileTooLarge'), 'error');
      fileInput.value = '';
      return;
    }
    try {
      mdInput.value = await f.text();
      repoCtx = null; // uploaded files have no repo base; relative images can't resolve
      renderMeta();
      setStatus(t('converter.status.fileLoaded', { name: f.name }), 'ok');
      scheduleRender();
    } catch {
      setStatus(t('converter.status.fileReadError'), 'error');
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
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = t('converter.preview.empty');
      previewEl.replaceChildren(empty);
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
      const failed = document.createElement('p');
      failed.className = 'hint';
      failed.textContent = t('converter.preview.failed');
      previewEl.replaceChildren(failed);
    }
  }

  function renderMeta(res) {
    if (!res && !repoCtx) {
      metaEl.textContent = t('converter.meta.localMode');
      return;
    }
    const c = res ?? repoCtx;
    metaEl.textContent = '';
    metaEl.append(repoMetaLabel(c));
    if (res?.rawUrl) {
      metaEl.append(' · ');
      const a = document.createElement('a');
      a.href = res.rawUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = t('converter.meta.rawSource');
      metaEl.append(a);
    }
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = `status${kind ? ' ' + kind : ''}`;
  }

  /** Print only the single-document sheet, never the documentation book. */
  function printSingle() {
    try {
      printDocument({ mode: 'single' });
      setStatus(t('converter.print.opened'), '');
    } catch (error) {
      setStatus(friendlyPrintError(error, t), 'error');
    }
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

/**
 * User-facing message for fetch failures. Pure function — covered by tests.
 * Without an explicit translator it preserves the historical English behaviour
 * (notably returning the parser's own INVALID_URL message).
 *
 * @param {any} e
 * @param {(key: string, vars?: Record<string, unknown>) => string} [translate]
 */
export function friendlyError(e, translate) {
  const code = e?.code;
  const tr = translate ?? t;
  if (code === 'INVALID_URL') {
    return translate
      ? tr('converter.errors.invalidUrl')
      : e?.message || tr('converter.errors.invalidUrl');
  }
  if (code === 'PRIVATE_OR_NOT_FOUND') return tr('converter.errors.privateOrNotFound');
  if (code === 'NO_README') return tr('converter.errors.noReadme');
  if (code === 'RATE_LIMITED') return tr('converter.errors.rateLimited');
  return tr('converter.errors.fetchFailed', { message: e?.message ?? e });
}

/**
 * User-facing message for print failures. Pure function.
 *
 * @param {any} e
 * @param {(key: string, vars?: Record<string, unknown>) => string} [translate]
 */
export function friendlyPrintError(e, translate) {
  const tr = translate ?? t;
  if (e?.code === 'PRINT_UNAVAILABLE') {
    return translate
      ? tr('converter.errors.printUnavailable')
      : e?.message || tr('converter.errors.printUnavailable');
  }
  return tr('converter.errors.printFailed', { message: e?.message ?? e });
}

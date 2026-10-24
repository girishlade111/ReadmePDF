import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

import { KEY_ALIASES, translateFrom } from '../src/i18n/core.js';
import { DICTIONARIES } from '../src/i18n/index.js';
import { LOCALES } from '../src/i18n/config.js';
import { t, initClientI18n, resetClientI18n } from '../src/i18n/client.js';

const homeAstro = readFileSync(new URL('../src/components/HomePage.astro', import.meta.url), 'utf8');
const headerAstro = readFileSync(new URL('../src/components/sections/Header.astro', import.meta.url), 'utf8');
const footerAstro = readFileSync(new URL('../src/components/sections/Footer.astro', import.meta.url), 'utf8');
const appCss = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');
const tokensCss = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const converterJs = readFileSync(new URL('../src/scripts/converter.js', import.meta.url), 'utf8');

describe('Issue A: Header Theme Toggle Removal & Dark Theme Architecture', () => {
  it('does not import or render ThemeToggle in Header or Footer', () => {
    assert.ok(!headerAstro.includes('ThemeToggle'), 'Header must not reference ThemeToggle');
    assert.ok(!footerAstro.includes('ThemeToggle'), 'Footer must not reference ThemeToggle');
    assert.ok(!headerAstro.includes('theme-toggle'), 'Header must not contain theme-toggle class');
  });

  it('sets data-theme="dark" on the html element directly', () => {
    assert.match(homeAstro, /<html[^>]*data-theme="dark"/);
  });

  it('removes obsolete localStorage md2pdf-theme detection scripts', () => {
    assert.ok(!homeAstro.includes('md2pdf-theme'), 'HomePage must not contain obsolete theme switcher script');
  });

  it('defines Arounda dark design tokens as the default :root tokens', () => {
    assert.match(tokensCss, /:root\s*\{[\s\S]*--bg-canvas:\s*#000000/);
    assert.match(tokensCss, /:root\s*\{[\s\S]*--text-primary:\s*#ffffff/);
  });

  it('preserves all four PDF print themes (clean, business, academic, dark)', () => {
    assert.ok(homeAstro.includes('value="clean"'));
    assert.ok(homeAstro.includes('value="business"'));
    assert.ok(homeAstro.includes('value="academic"'));
    assert.ok(homeAstro.includes('value="dark"'));
    assert.ok(homeAstro.includes('value="clean" checked'));
    assert.ok(homeAstro.includes('name="book-theme" value="clean"'));
    assert.ok(homeAstro.includes('name="book-theme" value="business"'));
    assert.ok(homeAstro.includes('name="book-theme" value="academic"'));
    assert.ok(homeAstro.includes('name="book-theme" value="dark"'));
  });
});

describe('Issue B: Markdown Preview Color Contrast & Scoped Document Styles', () => {
  it('provides a dedicated white/light document surface for clean, business, and academic themes', () => {
    assert.match(appCss, /\.sheet\s*\{[\s\S]*background:\s*#ffffff/);
    assert.match(appCss, /\.theme-clean\s*\{[\s\S]*background:\s*#ffffff/);
    assert.match(appCss, /\.theme-business\s*\{[\s\S]*background:\s*#ffffff/);
    assert.match(appCss, /\.theme-academic\s*\{[\s\S]*background:\s*#faf9f6/);
  });

  it('provides deliberate dark paper and light text for the dark print theme', () => {
    assert.match(appCss, /\.theme-dark\s*\{[\s\S]*background:\s*#151a23/);
    assert.match(appCss, /\.theme-dark\s*\{[\s\S]*color:\s*#e6ebf2/);
    assert.match(appCss, /\.theme-dark\s*\.doc\s*h1[\s\S]*color:\s*#ffffff/);
  });

  it('ensures high contrast for clean theme headings, paragraphs, links, and tables', () => {
    assert.match(appCss, /\.theme-clean\s*\.doc\s*h1[\s\S]*color:\s*#0f172a/);
    assert.match(appCss, /\.theme-clean\s*\{[\s\S]*color:\s*#1e293b/);
    assert.match(appCss, /\.theme-clean\s*\.doc\s*a\s*\{[\s\S]*color:\s*#0284c7/);
    assert.match(appCss, /\.theme-clean\s*\.doc\s*th\s*\{[\s\S]*background:\s*#f8fafc/);
    assert.match(appCss, /\.theme-clean\s*\.doc\s*th[\s\S]*border:\s*1px\s*solid\s*#e2e8f0/);
    assert.match(appCss, /\.theme-clean\s*\.doc\s*pre\s*\{[\s\S]*background:\s*#f8fafc/);
    assert.match(appCss, /\.theme-clean\s*\.doc\s*blockquote\s*\{[\s\S]*color:\s*#475569/);
  });
});

describe('Issue C: Bounded Height & Independent Scrolling Preview', () => {
  it('wraps preview sheets in dedicated scroll containers in DOM', () => {
    assert.ok(homeAstro.includes('preview-scroll-container'), 'HomePage must contain preview-scroll-container');
    assert.ok(homeAstro.includes('book-preview-scroll-container'), 'HomePage must contain book-preview-scroll-container');
    assert.match(homeAstro, /<div class="preview-scroll-container">\s*<article id="sheet"/);
    assert.match(homeAstro, /<div class="book-preview-scroll-container">\s*<article id="book-sheet"/);
  });

  it('applies bounded max-height and overflow-y: auto in app.css', () => {
    assert.match(appCss, /\.preview-scroll-container[\s\S]*overflow-y:\s*auto/);
    assert.match(appCss, /\.preview-scroll-container[\s\S]*max-height:\s*760px/);
    assert.match(appCss, /\.preview-scroll-container[\s\S]*overscroll-behavior-y:\s*contain/);
    assert.match(appCss, /\.preview-scroll-container[\s\S]*-webkit-overflow-scrolling:\s*touch/);
  });

  it('adjusts bounded preview height for mobile viewports', () => {
    assert.match(appCss, /@media\s*\(max-width:\s*970px\)[\s\S]*\.preview-scroll-container[\s\S]*max-height:\s*560px/);
    assert.match(appCss, /@media\s*\(max-width:\s*600px\)[\s\S]*\.preview-scroll-container[\s\S]*max-height:\s*480px/);
  });

  it('completely removes all height & overflow constraints in @media print for complete unclipped output', () => {
    const printSection = appCss.slice(appCss.indexOf('@media print'));
    assert.match(printSection, /\.preview-scroll-container[\s\S]*height:\s*auto\s*!important/);
    assert.match(printSection, /\.preview-scroll-container[\s\S]*max-height:\s*none\s*!important/);
    assert.match(printSection, /\.preview-scroll-container[\s\S]*overflow:\s*visible\s*!important/);
  });

  it('wires in-preview TOC anchor smooth scrolling and scroll reset on document load', () => {
    assert.ok(converterJs.includes('previewEl.addEventListener(\'click\''));
    assert.ok(converterJs.includes('resetPreviewScroll'));
    assert.ok(converterJs.includes('scrollWrap.scrollTo'));
  });
});

describe('Issue D: History Localization & Key Parity', () => {
  it('maps legacy and camelCase keys to canonical dictionary keys', () => {
    assert.equal(KEY_ALIASES['history.statusSaved'], 'history.status.saved');
    assert.equal(KEY_ALIASES['history.statusSaving'], 'history.status.saving');
    assert.equal(KEY_ALIASES['history.statusUnsaved'], 'history.status.unsaved');
    assert.equal(KEY_ALIASES['history.statusUnavailable'], 'history.status.unavailable');
    assert.equal(KEY_ALIASES['history.statusFailed'], 'history.status.failed');
    assert.equal(KEY_ALIASES['history.autoSaveOff'], 'history.autoSave.off');
    assert.equal(KEY_ALIASES['history.autoSave'], 'history.autoSave.label');
    assert.equal(KEY_ALIASES['history.saveVersion'], 'history.action.saveVersion');
    assert.equal(KEY_ALIASES['history.saveBookSnapshot'], 'history.action.saveVersion');
  });

  it('resolves aliased keys in all 9 supported languages without returning raw key names', () => {
    for (const locale of LOCALES) {
      const dict = DICTIONARIES[locale];
      const saved = translateFrom(dict, 'history.statusSaved');
      const saveVer = translateFrom(dict, 'history.saveVersion');
      assert.notEqual(saved, 'history.statusSaved', `${locale} must not return raw key`);
      assert.notEqual(saveVer, 'history.saveVersion', `${locale} must not return raw key`);
      assert.ok(saved.length > 0, `${locale} saved string must not be empty`);
      assert.ok(saveVer.length > 0, `${locale} saveVersion string must not be empty`);
    }
  });

  it('uses canonical dictionary keys in HomePage.astro and converter.js', () => {
    assert.ok(!homeAstro.includes("t('history.saveVersion')"));
    assert.ok(!homeAstro.includes("t('history.statusSaved')"));
    assert.ok(homeAstro.includes("t('history.action.saveVersion')"));
    assert.ok(converterJs.includes("t('history.status.saved')"));
    assert.ok(converterJs.includes("t('history.status.saving')"));
  });

  it('falls back cleanly in client t() without leaking raw unknown keys', () => {
    resetClientI18n();
    const result = t('history.statusSaved');
    assert.equal(result, 'Saved locally');
    const unknown = t('completely.nonexistent.key');
    assert.equal(unknown, '', 'Unknown key should return empty string so || fallback operates');
  });
});

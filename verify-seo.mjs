/**
 * Verify the SEO output of a built site.
 *
 * Usage: node verify-seo.mjs [distDir] [expectedOrigin]
 * Defaults: dist-seo https://example.test
 *
 * This script intentionally inspects generated HTML instead of trusting the
 * builders: duplicate tags, stale canned metadata, or a missing alternate are
 * only visible in the final artifact.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const distDir = process.argv[2] ?? 'dist-seo';
const origin = (process.argv[3] ?? process.env.PUBLIC_SITE_URL ?? 'https://example.test').replace(
  /\/$/,
  '',
);

const LOCALES = ['en', 'es', 'ja', 'ko', 'zh', 'ru', 'tr', 'fr', 'pt'];
const HREFLANG = {
  en: 'en',
  es: 'es',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh',
  ru: 'ru',
  tr: 'tr',
  fr: 'fr',
  pt: 'pt-BR',
};
const HTML_LANG = { en: 'en', es: 'es', ja: 'ja', ko: 'ko', zh: 'zh-Hans', ru: 'ru', tr: 'tr', fr: 'fr', pt: 'pt-BR' };
const OG_LOCALE = {
  en: 'en_US',
  es: 'es_ES',
  ja: 'ja_JP',
  ko: 'ko_KR',
  zh: 'zh_CN',
  ru: 'ru_RU',
  tr: 'tr_TR',
  fr: 'fr_FR',
  pt: 'pt_BR',
};

const errors = [];
const checks = [];
function fail(message) {
  errors.push(message);
}
function pass(label) {
  checks.push(label);
}

async function listHtml(dir) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name === 'index.html') out.push(full);
    }
  }
  await walk(dir);
  return out.sort();
}

function localeFromFile(dist, file) {
  const rel = path.relative(dist, path.dirname(file)).split(path.sep).join('/');
  const first = rel.split('/')[0];
  if (LOCALES.includes(first) && first !== 'en') return first;
  return 'en';
}

function pathFromFile(dist, file) {
  const rel = path.relative(dist, path.dirname(file)).split(path.sep).join('/');
  return rel === '' || rel === '.' ? '/' : `/${rel}/`;
}

function matchAll(html, regex) {
  return [...html.matchAll(regex)];
}

function attr(tag, name) {
  const match = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return match ? match[1] : null;
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const htmlFiles = await listHtml(distDir);
if (htmlFiles.length !== 45) fail(`expected 45 HTML pages, found ${htmlFiles.length}`);
else pass('45 HTML pages');

/** @type {Map<string, {locale:string, canonical:string, alternates:Map<string,string>}>} */
const pages = new Map();

for (const file of htmlFiles) {
  const rel = path.relative(distDir, file).split(path.sep).join('/');
  const html = await fs.readFile(file, 'utf8');
  const locale = localeFromFile(distDir, file);
  const pagePath = pathFromFile(distDir, file);
  const expectedCanonical = `${origin}${pagePath}`;

  const titles = matchAll(html, /<title\b[^>]*>([\s\S]*?)<\/title>/gi);
  if (titles.length !== 1) fail(`${rel}: expected 1 <title>, found ${titles.length}`);
  else if (!decodeEntities(titles[0][1]).trim()) fail(`${rel}: empty <title>`);

  const descriptions = matchAll(html, /<meta\s+name="description"[^>]*>/gi);
  if (descriptions.length !== 1) fail(`${rel}: expected 1 meta description, found ${descriptions.length}`);

  const canonicals = matchAll(html, /<link\s+rel="canonical"[^>]*>/gi);
  if (canonicals.length !== 1) fail(`${rel}: expected 1 canonical, found ${canonicals.length}`);
  const canonical = canonicals[0] ? attr(canonicals[0][0], 'href') : null;
  if (canonical !== expectedCanonical) fail(`${rel}: canonical ${canonical} != ${expectedCanonical}`);

  const alternates = new Map();
  for (const match of matchAll(html, /<link\s+rel="alternate"[^>]*>/gi)) {
    const href = attr(match[0], 'href');
    const hreflang = attr(match[0], 'hreflang');
    if (!hreflang || !href) {
      fail(`${rel}: malformed alternate ${match[0]}`);
      continue;
    }
    if (alternates.has(hreflang)) fail(`${rel}: duplicate hreflang ${hreflang}`);
    alternates.set(hreflang, href);
  }
  const expectedCodes = [...Object.values(HREFLANG), 'x-default'];
  for (const code of expectedCodes) {
    if (!alternates.has(code)) fail(`${rel}: missing hreflang ${code}`);
  }
  for (const [code, href] of alternates) {
    if (!Object.values(HREFLANG).includes(code) && code !== 'x-default') {
      fail(`${rel}: unexpected hreflang ${code}`);
    }
    if (!href.startsWith(`${origin}/`)) fail(`${rel}: hreflang ${code} is not absolute: ${href}`);
  }
  // x-default always points at the English equivalent: /zh/blog/x/ -> /blog/x/.
  const englishPath = pagePath.replace(/^\/(es|ja|ko|zh|ru|tr|fr|pt)\//, '/');
  if (alternates.get('x-default') !== `${origin}${englishPath}`) {
    fail(`${rel}: x-default ${alternates.get('x-default')} != ${origin}${englishPath}`);
  }

  const htmlLang = attr(html.match(/<html\b[^>]*>/i)?.[0] ?? '', 'lang');
  if (htmlLang !== HTML_LANG[locale]) fail(`${rel}: html lang ${htmlLang} != ${HTML_LANG[locale]}`);

  const ogUrl = matchAll(html, /<meta\s+property="og:url"[^>]*>/gi);
  if (ogUrl.length !== 1) fail(`${rel}: expected 1 og:url, found ${ogUrl.length}`);
  else if (attr(ogUrl[0][0], 'content') !== expectedCanonical) {
    fail(`${rel}: og:url ${attr(ogUrl[0][0], 'content')} != ${expectedCanonical}`);
  }

  const ogLocale = matchAll(html, /<meta\s+property="og:locale"[^>]*>/gi);
  if (ogLocale.length !== 1) fail(`${rel}: expected 1 og:locale, found ${ogLocale.length}`);
  else if (attr(ogLocale[0][0], 'content') !== OG_LOCALE[locale]) {
    fail(`${rel}: og:locale ${attr(ogLocale[0][0], 'content')} != ${OG_LOCALE[locale]}`);
  }

  const ogImage = matchAll(html, /<meta\s+property="og:image"[^>]*>/gi);
  if (ogImage.length !== 1) fail(`${rel}: expected 1 og:image, found ${ogImage.length}`);
  else if (!attr(ogImage[0][0], 'content')?.startsWith(`${origin}/`)) {
    fail(`${rel}: og:image is not absolute`);
  }

  const jsonLd = matchAll(html, /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLd.length !== 1) fail(`${rel}: expected 1 JSON-LD block, found ${jsonLd.length}`);
  else {
    try {
      const parsed = JSON.parse(jsonLd[0][1]);
      const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
      if (!graph.length) fail(`${rel}: empty JSON-LD`);
      for (const node of graph) {
        if (!node['@type']) fail(`${rel}: JSON-LD node without @type`);
      }
      if (!jsonLd[0][1].includes(`"inLanguage"`)) fail(`${rel}: JSON-LD lacks inLanguage`);
    } catch (error) {
      fail(`${rel}: invalid JSON-LD (${error.message})`);
    }
  }

  if (/<meta\s+property="og:title"/i.test(html) === false) fail(`${rel}: missing og:title`);
  if (/<link\s+rel="canonical"/i.test(html) === false) fail(`${rel}: missing canonical`);

  pages.set(pagePath, { locale, canonical, alternates });
}

// Reciprocal alternates: every page's alternates must agree with the target
// page's own canonical and with each other.
for (const [pagePath, page] of pages) {
  for (const [code, href] of page.alternates) {
    const targetPath = href.slice(origin.length);
    const target = pages.get(targetPath);
    if (!target) {
      fail(`${pagePath}: alternate ${code} points at unbuilt page ${targetPath}`);
      continue;
    }
    if (target.canonical !== href) fail(`${pagePath}: alternate ${code} is not canonical there`);
    if (code !== 'x-default' && target.locale !== Object.keys(HREFLANG).find((key) => HREFLANG[key] === code)) {
      fail(`${pagePath}: alternate ${code} resolves to a ${target.locale} page`);
    }
  }
}
pass('reciprocal hreflang graph');

const sitemapPath = path.join(distDir, 'sitemap.xml');
const sitemap = await fs.readFile(sitemapPath, 'utf8').catch(() => null);
if (!sitemap) fail('missing sitemap.xml');
else {
  const locs = matchAll(sitemap, /<loc>([^<]+)<\/loc>/g).map((match) => decodeEntities(match[1]));
  if (locs.length !== 45) fail(`sitemap has ${locs.length} URLs, expected 45`);
  else pass('sitemap has 45 URLs');
  for (const pagePath of pages.keys()) {
    if (!locs.includes(`${origin}${pagePath}`)) fail(`sitemap missing ${origin}${pagePath}`);
  }
  const xDefaults = matchAll(sitemap, /hreflang="x-default"/g).length;
  if (xDefaults !== 45) fail(`sitemap has ${xDefaults} x-default links, expected 45`);
  if (!sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')) {
    fail('sitemap lacks xhtml namespace');
  }
  if (!sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) fail('sitemap lacks XML declaration');
  if (/<loc>\//.test(sitemap)) fail('sitemap contains a relative <loc>');
}

const robots = await fs.readFile(path.join(distDir, 'robots.txt'), 'utf8').catch(() => null);
if (!robots) fail('missing robots.txt');
else {
  if (!/^User-agent: \*$/m.test(robots)) fail('robots.txt lacks User-agent: *');
  if (!new RegExp(`^Sitemap: ${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/sitemap\\.xml$`, 'm').test(robots)) {
    fail('robots.txt lacks the absolute sitemap URL');
  }
  if (/Disallow: \/$/m.test(robots)) fail('robots.txt blocks the whole site');
  pass('robots.txt');
}

// The localized Chinese page must contain real CJK text, not mojibake or a
// placeholder translation.
const zhHome = await fs.readFile(path.join(distDir, 'zh', 'index.html'), 'utf8');
if (!/[\u4e00-\u9fff]/.test(zhHome)) fail('zh homepage contains no Han characters');
if (/\uFFFD/.test(zhHome)) fail('zh homepage contains replacement characters');
const zhHtmlTag = zhHome.match(/<html\b[^>]*>/i)?.[0] ?? '';
if (attr(zhHtmlTag, 'lang') !== 'zh-Hans') fail('zh homepage must use html lang="zh-Hans"');
pass('Chinese localization encoding');

const report = {
  origin,
  pages: pages.size,
  checks: checks.length,
  errors,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length) {
  console.error(`SEO verification failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`SEO verification passed: ${pages.size} pages, ${checks.length} check groups.`);

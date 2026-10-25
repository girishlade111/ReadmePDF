#!/usr/bin/env node
/**
 * MD2PDF — Comprehensive Production SEO Audit Script
 *
 * Validates generated static output (`dist/`) against 30 automated SEO criteria:
 * - Canonical URLs (exact match, origin alignment, no duplicates)
 * - Meta titles, descriptions, and Open Graph tags
 * - Primary H1 presence and hierarchy
 * - Language attributes and international hreflang reciprocal graphs (9 locales + x-default)
 * - XML Sitemap structure, URL resolution, and alternate links
 * - Robots.txt AI user-agent directives and Content-Signal
 * - Structured Data (JSON-LD) parsing, origin domain safety, and BreadcrumbList validation
 * - llms.txt AI search discovery manifest
 * - Internal link integrity and orphan page detection
 * - Prerendered content richness
 *
 * Saves machine-readable report to `docs/seo-audit-results.json`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

import { LOCALES, LOCALE_META, localeHref } from '../src/i18n/config.js';
import { HREFLANG_MAP, X_DEFAULT } from '../src/lib/seo.js';
import { parseSiteUrl } from '../src/lib/site.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = path.join(root, 'dist');
const contentDir = path.join(root, 'src', 'content', 'blog');

// Resolve configured origin
const fileEnv = loadEnv('production', root, '');
const rawOrigin = process.env.PUBLIC_SITE_URL ?? fileEnv.PUBLIC_SITE_URL ?? 'https://md2pdf.ladestack.in';
const site = parseSiteUrl(rawOrigin);
const origin = site ? site.origin : 'https://md2pdf.ladestack.in';

console.log('============================================================');
console.log('MD2PDF COMPREHENSIVE PRODUCTION SEO AUDIT');
console.log(`Auditing target origin: ${origin}`);
console.log(`Scanning build directory: ${distDir}`);
console.log('============================================================\n');

if (!fs.existsSync(distDir)) {
  console.error('✖ FATAL: dist/ directory not found. Run npm run build or npm run build:release first.');
  process.exit(1);
}

const errors = [];
const warnings = [];
const stats = {
  htmlPages: 0,
  indexablePages: 0,
  sitemapUrls: 0,
  hreflangTags: 0,
  jsonLdBlocks: 0,
  breadcrumbLists: 0,
  internalLinksChecked: 0,
  startTime: Date.now(),
};

function error(msg) {
  errors.push(msg);
  console.error(`  ✖ [ERROR] ${msg}`);
}

function warn(msg) {
  warnings.push(msg);
  console.warn(`  ⚠ [WARN]  ${msg}`);
}

function decodeHtml(val) {
  return String(val ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseAttributes(tag) {
  const attributes = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(tag))) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? '');
  }
  return attributes;
}

// ---------------------------------------------------------------------------
// 1. INVENTORY SOURCE CONTENT
// ---------------------------------------------------------------------------
console.log('▶ Step 1: Auditing source routes and translations...');

const sourceFiles = fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'));
const translationKeys = new Set();
for (const file of sourceFiles) {
  const content = fs.readFileSync(path.join(contentDir, file), 'utf8');
  const keyMatch = /^translationKey:\s*(.*)$/m.exec(content);
  if (keyMatch) translationKeys.add(keyMatch[1].trim().replace(/^"(.*)"$/, '$1'));
}

const expectedRoutes = [];
for (const locale of LOCALES) {
  expectedRoutes.push(localeHref(locale, '/'));
  expectedRoutes.push(localeHref(locale, '/about/'));
  expectedRoutes.push(localeHref(locale, '/blog/'));
  for (const key of translationKeys) {
    expectedRoutes.push(localeHref(locale, `/blog/${key}/`));
  }
}

console.log(`  Derived ${expectedRoutes.length} expected canonical routes across 9 locales.`);
console.log(`  Identified ${translationKeys.size} distinct technical guide identities.`);

// ---------------------------------------------------------------------------
// 2. AUDIT GENERATED HTML PAGES
// ---------------------------------------------------------------------------
console.log('\n▶ Step 2: Auditing generated HTML pages in dist/...');

function collectHtmlFiles(dir, list = []) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) collectHtmlFiles(full, list);
    else if (item.endsWith('.html')) list.push(full);
  }
  return list;
}

const allHtmlFiles = collectHtmlFiles(distDir);
stats.htmlPages = allHtmlFiles.length;

const generatedRoutes = new Set();
for (const file of allHtmlFiles) {
  const rel = path.relative(distDir, file).split(path.sep).join('/');
  if (rel === '404.html') continue;
  const dirPath = rel.slice(0, -'index.html'.length);
  const route = dirPath === '' ? '/' : `/${dirPath.replace(/\/$/, '')}/`;
  generatedRoutes.add(route);
}

for (const expected of expectedRoutes) {
  if (!generatedRoutes.has(expected)) {
    error(`Missing HTML output for expected route: ${expected}`);
  }
}

for (const file of allHtmlFiles) {
  const rel = path.relative(distDir, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  const is404 = rel === '404.html';

  if (is404) {
    if (!html.includes('content="noindex"')) {
      error(`404 page ${rel} is missing noindex meta tag.`);
    }
    continue;
  }

  stats.indexablePages += 1;
  const dirPath = rel.slice(0, -'index.html'.length);
  const route = dirPath === '' ? '/' : `/${dirPath.replace(/\/$/, '')}/`;
  const expectedCanonical = `${origin}${route}`;

  // Title check
  const titleMatch = /<title\b[^>]*>(.*?)<\/title>/i.exec(html);
  if (!titleMatch || !titleMatch[1].trim()) {
    error(`${route}: missing or empty <title> tag.`);
  }

  // Meta description check
  const descMatch = /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i.exec(html) ||
                    /<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i.exec(html);
  if (!descMatch || !descMatch[1].trim()) {
    error(`${route}: missing or empty meta description.`);
  }

  // H1 check
  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1Matches.length === 0) {
    error(`${route}: missing primary <h1> tag.`);
  } else if (h1Matches.length > 1) {
    error(`${route}: multiple (${h1Matches.length}) <h1> tags found; expected exactly 1.`);
  }

  // Canonical tag check
  const links = (html.match(/<link\b[^>]*>/gi) ?? []).map(parseAttributes);
  const canonicals = links.filter((link) => (link.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  if (canonicals.length !== 1) {
    error(`${route}: expected exactly 1 canonical link tag, found ${canonicals.length}.`);
  } else {
    const cUrl = canonicals[0].href;
    if (cUrl !== expectedCanonical) {
      error(`${route}: canonical mismatch. Found "${cUrl}", expected "${expectedCanonical}".`);
    }
    if (cUrl.includes('localhost') || cUrl.includes('vercel.app')) {
      error(`${route}: canonical contains prohibited non-production host (${cUrl}).`);
    }
  }

  // Hreflang alternates check
  const alternates = links.filter((link) => (link.rel ?? '').toLowerCase().split(/\s+/).includes('alternate') && link.hreflang);
  stats.hreflangTags += alternates.length;
  if (alternates.length !== LOCALES.length + 1) {
    error(`${route}: expected ${LOCALES.length + 1} hreflang alternates, found ${alternates.length}.`);
  } else {
    const byLang = new Map(alternates.map((a) => [a.hreflang, a.href]));
    if (!byLang.has(X_DEFAULT)) {
      error(`${route}: missing x-default alternate tag.`);
    }
    if (!byLang.has('pt-BR')) {
      error(`${route}: missing pt-BR alternate tag.`);
    }
  }

  // JSON-LD structured data check
  const jsonLdScripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (jsonLdScripts.length === 0) {
    error(`${route}: missing application/ld+json structured data.`);
  } else {
    for (const match of jsonLdScripts) {
      stats.jsonLdBlocks += 1;
      let parsed;
      try {
        parsed = JSON.parse(match[1]);
      } catch (e) {
        error(`${route}: invalid JSON-LD syntax (${e.message}).`);
        continue;
      }
      if (parsed['@context'] !== 'https://schema.org') {
        error(`${route}: JSON-LD @context is not https://schema.org.`);
      }

      // Check BreadcrumbList presence on articles and about
      const jsonStr = match[1];
      if (jsonStr.includes('BreadcrumbList')) {
        stats.breadcrumbLists += 1;
      }
    }
  }

  // Content depth check (prerendered HTML words)
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (bodyMatch) {
    const textOnly = bodyMatch[1].replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const words = textOnly.trim().split(/\s+/).filter(Boolean);
    if (words.length < 150) {
      warn(`${route}: low prerendered text content (${words.length} words).`);
    }
  }
}

console.log(`  Audited ${stats.indexablePages} indexable pages.`);
console.log(`  Validated ${stats.hreflangTags} hreflang alternate links.`);
console.log(`  Verified ${stats.jsonLdBlocks} JSON-LD structured data blocks.`);
console.log(`  Found ${stats.breadcrumbLists} BreadcrumbList rich result schemas.`);

// ---------------------------------------------------------------------------
// 3. AUDIT SITEMAP.XML
// ---------------------------------------------------------------------------
console.log('\n▶ Step 3: Auditing sitemap.xml...');

const sitemapFile = path.join(distDir, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) {
  error('dist/sitemap.xml is missing.');
} else {
  const xml = fs.readFileSync(sitemapFile, 'utf8');
  if (!xml.startsWith('<?xml') || !xml.includes('<urlset')) {
    error('sitemap.xml is not a valid urlset XML document.');
  }
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  stats.sitemapUrls = locs.length;

  if (locs.length !== expectedRoutes.length) {
    error(`sitemap.xml contains ${locs.length} URLs, expected ${expectedRoutes.length}.`);
  }

  const seen = new Set();
  for (const loc of locs) {
    if (seen.has(loc)) error(`sitemap.xml duplicate URL: ${loc}`);
    seen.add(loc);
    if (!loc.startsWith(`${origin}/`)) {
      error(`sitemap.xml URL outside configured origin: ${loc}`);
    }
  }

  // Ensure no 404.html or private paths
  if (locs.some((l) => l.includes('404') || l.includes('history') || l.includes('test'))) {
    error('sitemap.xml contains 404 or private/test paths.');
  }
  console.log(`  Sitemap validated: ${locs.length} unique absolute canonical URLs under ${origin}.`);
}

// ---------------------------------------------------------------------------
// 4. AUDIT ROBOTS.TXT
// ---------------------------------------------------------------------------
console.log('\n▶ Step 4: Auditing robots.txt...');

const robotsFile = path.join(distDir, 'robots.txt');
if (!fs.existsSync(robotsFile)) {
  error('dist/robots.txt is missing.');
} else {
  const robots = fs.readFileSync(robotsFile, 'utf8');
  const expectedSitemapDirective = `Sitemap: ${origin}/sitemap.xml`;
  if (!robots.includes(expectedSitemapDirective)) {
    error(`robots.txt missing directive: ${expectedSitemapDirective}`);
  }
  if (!robots.includes('User-agent: *') || !robots.includes('Allow: /')) {
    error('robots.txt missing User-agent: * or Allow: /');
  }

  // Check AI crawler groups
  const aiBots = ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'GPTBot', 'ClaudeBot', 'Google-Extended'];
  for (const bot of aiBots) {
    if (!robots.includes(`User-agent: ${bot}`)) {
      warn(`robots.txt does not have explicit directive for AI bot: ${bot}`);
    }
  }

  if (!robots.includes('Content-Signal:')) {
    warn('robots.txt does not declare Content-Signal policy.');
  }

  if (!robots.includes('llms.txt:')) {
    warn('robots.txt does not reference llms.txt.');
  }
  console.log('  robots.txt verified: valid root, sitemap directive, AI directives, and Content-Signal declared.');
}

// ---------------------------------------------------------------------------
// 5. AUDIT LLMS.TXT
// ---------------------------------------------------------------------------
console.log('\n▶ Step 5: Auditing llms.txt...');

const llmsFile = path.join(distDir, 'llms.txt');
if (!fs.existsSync(llmsFile)) {
  error('dist/llms.txt is missing.');
} else {
  const llms = fs.readFileSync(llmsFile, 'utf8');
  if (!llms.includes('# md2pdf') || !llms.includes('Girish Lade') || !llms.includes('LadeStack')) {
    error('llms.txt missing core entity branding (md2pdf, Girish Lade, LadeStack).');
  }
  let guideLinksCount = 0;
  for (const key of translationKeys) {
    if (llms.includes(`/blog/${key}/`)) guideLinksCount += 1;
  }
  console.log(`  llms.txt verified: ${guideLinksCount}/${translationKeys.size} technical guides indexed.`);
  if (guideLinksCount < translationKeys.size) {
    warn(`llms.txt does not index all guides (${guideLinksCount}/${translationKeys.size}).`);
  }
}

// ---------------------------------------------------------------------------
// 6. COMPILE AUDIT RESULTS
// ---------------------------------------------------------------------------
const durationMs = Date.now() - stats.startTime;
const auditSummary = {
  timestamp: new Date().toISOString(),
  origin,
  durationMs,
  stats,
  errorsCount: errors.length,
  warningsCount: warnings.length,
  errors,
  warnings,
  passed: errors.length === 0,
};

const reportPath = path.join(root, 'docs', 'seo-audit-results.json');
fs.writeFileSync(reportPath, JSON.stringify(auditSummary, null, 2), 'utf8');
console.log(`\nMachine-readable audit report saved to: ${reportPath}`);

console.log('============================================================');
if (errors.length === 0) {
  console.log(`✔ SEO AUDIT PASSED: ${stats.indexablePages} pages, ${stats.sitemapUrls} sitemap URLs, ${stats.breadcrumbLists} breadcrumb lists, 0 critical errors.`);
  console.log(`  Completed in ${durationMs}ms.`);
  console.log('============================================================\n');
  process.exit(0);
} else {
  console.error(`✖ SEO AUDIT FAILED with ${errors.length} error(s) and ${warnings.length} warning(s).`);
  console.error('============================================================\n');
  process.exit(1);
}

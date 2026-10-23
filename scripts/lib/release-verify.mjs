/**
 * Release-artifact verification for `npm run build:release`.
 *
 * The build is only half of a release. A static host will happily serve a page
 * with a relative canonical, a sitemap pointing at somebody else's domain, or
 * JSON-LD that still contains localhost. These checks read the generated
 * `dist/` tree and compare it with the source content inventory and the one
 * configured public origin.
 *
 * The verifier deliberately has no "skip" switch. Passing it is the release
 * condition; local `npm run build` remains available without an origin.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { LOCALES, LOCALE_META, localeHref } from '../../src/i18n/config.js';
import { HREFLANG_MAP, X_DEFAULT } from '../../src/lib/seo.js';

export class ReleaseVerificationError extends Error {
  /** @param {string[]} failures */
  constructor(failures) {
    super(`Release verification failed with ${failures.length} issue(s).`);
    this.name = 'ReleaseVerificationError';
    this.failures = failures;
  }
}

const ARTICLE_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_KEYS = new Set([
  'url',
  '@id',
  'image',
  'logo',
  'mainEntityOfPage',
  'isPartOf',
  'item',
]);

class Checker {
  constructor() {
    /** @type {string[]} */
    this.failures = [];
  }

  fail(message) {
    this.failures.push(message);
  }

  assert(condition, message) {
    if (!condition) this.fail(message);
  }

  finish() {
    if (this.failures.length) throw new ReleaseVerificationError(this.failures);
  }
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Parse the attributes of one HTML/XML start tag. */
function parseAttributes(tag) {
  /** @type {Record<string, string>} */
  const attributes = {};
  const source = String(tag ?? '');
  const pattern =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(source))) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? '');
  }
  return attributes;
}

/**
 * Minimal, dependency-free reader for the flat YAML frontmatter used by the
 * blog collection. Values are strings or simple scalars; nested YAML is not
 * used by this project and should fail loudly rather than be guessed.
 *
 * @param {string} source
 * @param {string} file
 */
function parseFrontmatter(source, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) throw new Error(`${file}: missing YAML frontmatter.`);
  /** @type {Record<string, string>} */
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const field = /^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!field) throw new Error(`${file}: unsupported frontmatter line: ${line}`);
    let value = field[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[field[1]] = value;
  }
  return data;
}

async function listFiles(directory) {
  /** @type {string[]} */
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

/**
 * Derive the expected route inventory from the Markdown source, not from the
 * build output. This is what makes a missing page detectable.
 *
 * Every locale must publish the same translation keys. Without that property
 * the hreflang graph cannot be reciprocal, which is a release-blocking SEO
 * defect rather than a cosmetic translation gap.
 *
 * @param {string} contentDir
 */
export async function collectExpectedRoutes(contentDir) {
  const files = (await listFiles(contentDir)).filter((file) => /\.md$/i.test(file));
  if (!files.length) throw new Error(`No Markdown content found in ${contentDir}.`);

  /** @type {Array<{ file: string, locale: string, key: string }>} */
  const posts = [];
  for (const file of files) {
    const data = parseFrontmatter(await readFile(file, 'utf8'), file);
    if (data.draft === 'true') continue;
    const locale = data.locale;
    const key = data.translationKey;
    if (!LOCALES.includes(/** @type {any} */ (locale))) {
      throw new Error(`${file}: unsupported locale "${locale ?? ''}".`);
    }
    if (!ARTICLE_KEY.test(key ?? '')) {
      throw new Error(`${file}: missing or invalid translationKey.`);
    }
    posts.push({ file, locale, key });
  }
  if (!posts.length) throw new Error('No published articles found.');

  const keysByLocale = new Map(LOCALES.map((locale) => [locale, new Set()]));
  /** @type {Array<{ route: string, locale: string, group: string, kind: string }>} */
  const routes = [];
  const seenRoutes = new Set();

  const push = (route, locale, group, kind) => {
    if (seenRoutes.has(route)) throw new Error(`Duplicate expected route: ${route}`);
    seenRoutes.add(route);
    routes.push({ route, locale, group, kind });
  };

  for (const locale of LOCALES) {
    push(localeHref(locale, '/'), locale, 'home', 'home');
    push(localeHref(locale, '/blog/'), locale, 'blog', 'blog');
  }

  for (const post of posts) {
    const keys = keysByLocale.get(post.locale);
    if (keys.has(post.key)) {
      throw new Error(`Duplicate translationKey "${post.key}" for locale "${post.locale}".`);
    }
    keys.add(post.key);
    push(
      localeHref(post.locale, `/blog/${post.key}/`),
      post.locale,
      `article:${post.key}`,
      'article',
    );
  }

  const expectedKeys = [...keysByLocale.get('en')].sort();
  for (const locale of LOCALES) {
    const actualKeys = [...keysByLocale.get(locale)].sort();
    if (actualKeys.join('\n') !== expectedKeys.join('\n')) {
      throw new Error(
        `Locale "${locale}" does not publish the same translation keys as English ` +
          `(${actualKeys.join(', ') || 'none'} vs ${expectedKeys.join(', ')}).`,
      );
    }
  }

  routes.sort((a, b) => a.route.localeCompare(b.route, 'en'));
  return { routes, keys: expectedKeys };
}

/** Read Astro's directory-style HTML output into a route -> file map. */
async function readHtmlRoutes(distDir) {
  const files = await listFiles(distDir);
  const routes = new Map();
  for (const file of files) {
    if (path.basename(file) !== 'index.html') continue;
    const relative = path.relative(distDir, file).split(path.sep).join('/');
    const directory = relative.slice(0, -'index.html'.length);
    const route = directory === '' ? '/' : `/${directory.replace(/\/$/, '')}/`;
    if (routes.has(route)) throw new Error(`Duplicate HTML output for route: ${route}`);
    routes.set(route, file);
  }
  return routes;
}

function expectedAlternates(routes, current, origin) {
  const group = routes.filter((entry) => entry.group === current.group);
  const alternates = [];
  for (const locale of LOCALES) {
    const match = group.find((entry) => entry.locale === locale);
    if (!match) throw new Error(`Missing ${locale} alternate for ${current.route}.`);
    alternates.push({
      hreflang: HREFLANG_MAP[locale],
      href: `${origin}${match.route}`,
    });
  }
  const english = group.find((entry) => entry.locale === 'en');
  if (!english) throw new Error(`Missing English x-default for ${current.route}.`);
  alternates.push({ hreflang: X_DEFAULT, href: `${origin}${english.route}` });
  return alternates;
}

function compareAlternateSets(checker, label, actual, expected) {
  const serialize = (entry) => `${entry.hreflang}\u0000${entry.href}`;
  const actualSet = new Set(actual.map(serialize));
  const expectedSet = new Set(expected.map(serialize));
  if (actualSet.size !== actual.length) checker.fail(`${label}: duplicate hreflang entries.`);
  for (const value of expectedSet) {
    if (!actualSet.has(value)) {
      checker.fail(`${label}: missing alternate ${value.replace('\u0000', ' -> ')}`);
    }
  }
  for (const value of actualSet) {
    if (!expectedSet.has(value)) {
      checker.fail(`${label}: unexpected alternate ${value.replace('\u0000', ' -> ')}`);
    }
  }
}

function verifyJsonLd(value, context, location = '$') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      verifyJsonLd(entry, context, `${location}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== 'object') return;

  const type = value['@type'];
  for (const [key, child] of Object.entries(value)) {
    const childLocation = `${location}.${key}`;
    if (typeof child === 'string' && URL_KEYS.has(key)) {
      if (key === 'url' && type === 'Organization') {
        if (!/^https:\/\/[^\s]+$/i.test(child)) {
          context.checker.fail(
            `${context.route}: JSON-LD ${childLocation} must be an absolute HTTPS URL (${child}).`,
          );
        }
        continue;
      }
      if (!child.startsWith(`${context.origin}/`) && child !== context.origin) {
        context.checker.fail(
          `${context.route}: JSON-LD ${childLocation} is not on ${context.origin} (${child}).`,
        );
      } else {
        context.stats.originUrls += 1;
      }
    } else if (child && typeof child === 'object') {
      verifyJsonLd(child, context, childLocation);
    }
  }
}

function verifyPage(checker, html, routeInfo, routes, origin) {
  const route = routeInfo.route;
  const expectedCanonical = `${origin}${route}`;
  const links = (html.match(/<link\b[^>]*>/gi) ?? []).map(parseAttributes);

  const canonicals = links.filter((link) =>
    String(link.rel ?? '')
      .toLowerCase()
      .split(/\s+/)
      .includes('canonical'),
  );
  checker.assert(canonicals.length === 1, `${route}: expected exactly one canonical, found ${canonicals.length}.`);
  if (canonicals.length === 1) {
    checker.assert(
      canonicals[0].href === expectedCanonical,
      `${route}: canonical is "${canonicals[0].href}", expected "${expectedCanonical}".`,
    );
    checker.assert(
      !canonicals[0].href.startsWith('/'),
      `${route}: canonical is relative (${canonicals[0].href}).`,
    );
  }

  const hreflangs = links
    .filter((link) => link.hreflang)
    .map((link) => ({ hreflang: link.hreflang, href: link.href }));
  const expected = expectedAlternates(routes, routeInfo, origin);
  checker.assert(
    hreflangs.length === expected.length,
    `${route}: expected ${expected.length} hreflang links, found ${hreflangs.length}.`,
  );
  compareAlternateSets(checker, `${route}: hreflang`, hreflangs, expected);
  for (const alternate of hreflangs) {
    checker.assert(
      alternate.href.startsWith(`${origin}/`),
      `${route}: hreflang ${alternate.hreflang} is not an absolute URL on ${origin} (${alternate.href}).`,
    );
  }

  const ogUrls = (html.match(/<meta\b[^>]*>/gi) ?? [])
    .map(parseAttributes)
    .filter((meta) => String(meta.property ?? '').toLowerCase() === 'og:url');
  checker.assert(ogUrls.length === 1, `${route}: expected exactly one og:url, found ${ogUrls.length}.`);
  if (ogUrls.length === 1) {
    checker.assert(
      ogUrls[0].content === expectedCanonical,
      `${route}: og:url is "${ogUrls[0].content}", expected "${expectedCanonical}".`,
    );
  }

  const htmlTag = /<html\b([^>]*)>/i.exec(html);
  const htmlAttributes = htmlTag ? parseAttributes(`<html ${htmlTag[1]}>`) : {};
  const expectedLang = LOCALE_META[/** @type {any} */ (routeInfo.locale)].htmlLang;
  checker.assert(
    htmlAttributes.lang === expectedLang,
    `${route}: <html lang> is "${htmlAttributes.lang ?? ''}", expected "${expectedLang}".`,
  );

  const jsonLdBlocks = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let script;
  while ((script = scriptPattern.exec(html))) {
    const attributes = parseAttributes(`<script ${script[1]}>`);
    if (String(attributes.type ?? '').toLowerCase() === 'application/ld+json') {
      jsonLdBlocks.push(script[2]);
    }
  }
  checker.assert(jsonLdBlocks.length > 0, `${route}: no JSON-LD block found.`);

  for (const block of jsonLdBlocks) {
    let parsed;
    try {
      parsed = JSON.parse(block);
    } catch (error) {
      checker.fail(`${route}: JSON-LD is not valid JSON (${error.message}).`);
      continue;
    }
    checker.assert(
      parsed['@context'] === 'https://schema.org',
      `${route}: JSON-LD @context is not https://schema.org.`,
    );
    const stats = { originUrls: 0 };
    verifyJsonLd(parsed, { checker, route, origin, stats });
    checker.assert(
      stats.originUrls > 0,
      `${route}: JSON-LD contains no URL on ${origin}.`,
    );
  }

  return jsonLdBlocks.length;
}

function verifySitemap(checker, xml, routes, origin) {
  if (!xml) {
    checker.fail('sitemap.xml is missing.');
    return { locs: 0, alternates: 0 };
  }
  checker.assert(xml.startsWith('<?xml'), 'sitemap.xml does not start with an XML declaration.');
  checker.assert(/<urlset\b/.test(xml), 'sitemap.xml has no <urlset> root.');
  checker.assert(
    xml.includes('http://www.sitemaps.org/schemas/sitemap/0.9'),
    'sitemap.xml is missing the sitemap namespace.',
  );

  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  checker.assert(
    blocks.length === routes.length,
    `sitemap.xml has ${blocks.length} URLs, expected ${routes.length}.`,
  );

  const expectedByLoc = new Map(routes.map((entry) => [`${origin}${entry.route}`, entry]));
  const seen = new Set();
  let totalAlternates = 0;

  for (const block of blocks) {
    const locMatch = /<loc>([\s\S]*?)<\/loc>/.exec(block);
    if (!locMatch) {
      checker.fail('sitemap.xml contains a <url> without <loc>.');
      continue;
    }
    const loc = decodeHtml(locMatch[1]).trim();
    if (seen.has(loc)) checker.fail(`sitemap.xml contains a duplicate <loc>: ${loc}`);
    seen.add(loc);
    if (!loc.startsWith(`${origin}/`)) {
      checker.fail(`sitemap.xml contains a URL outside ${origin}: ${loc}`);
    }
    const routeInfo = expectedByLoc.get(loc);
    if (!routeInfo) {
      checker.fail(`sitemap.xml contains an unexpected URL: ${loc}`);
      continue;
    }

    const alternates = [...block.matchAll(/<xhtml:link\b([^>]*?)\/?>/g)]
      .map((match) => parseAttributes(`<xhtml:link ${match[1]}>`))
      .map((attributes) => ({
        hreflang: attributes.hreflang,
        href: attributes.href,
      }));
    totalAlternates += alternates.length;
    const expected = expectedAlternates(routes, routeInfo, origin);
    checker.assert(
      alternates.length === expected.length,
      `${loc}: expected ${expected.length} sitemap alternates, found ${alternates.length}.`,
    );
    compareAlternateSets(checker, `${loc}: sitemap alternates`, alternates, expected);
  }

  for (const loc of expectedByLoc.keys()) {
    if (!seen.has(loc)) checker.fail(`sitemap.xml is missing: ${loc}`);
  }

  return { locs: seen.size, alternates: totalAlternates };
}

function verifyRobots(checker, robots, origin) {
  const expected = `Sitemap: ${origin}/sitemap.xml`;
  const sitemapLines = String(robots ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^Sitemap:/i.test(line));
  checker.assert(
    sitemapLines.length === 1 && sitemapLines[0] === expected,
    `robots.txt must contain exactly one "${expected}" directive.`,
  );
  checker.assert(/^User-agent:\s*\*$/m.test(robots), 'robots.txt is missing "User-agent: *".');
  checker.assert(/^Allow:\s*\/$/m.test(robots), 'robots.txt is missing "Allow: /".');
}

/**
 * Verify every release condition and return a compact evidence summary.
 *
 * @param {{ distDir: string, origin: string, contentDir: string }} options
 */
export async function verifyReleaseArtifacts({ distDir, origin: rawOrigin, contentDir }) {
  const checker = new Checker();
  let origin;
  try {
    const parsed = new URL(rawOrigin);
    if (parsed.protocol !== 'https:') throw new Error('origin must use https://');
    origin = parsed.origin;
  } catch (error) {
    throw new ReleaseVerificationError([
      `Invalid release origin "${String(rawOrigin)}": ${error.message}`,
    ]);
  }

  const { routes } = await collectExpectedRoutes(contentDir);
  const expectedByRoute = new Map(routes.map((entry) => [entry.route, entry]));

  let actual;
  try {
    actual = await readHtmlRoutes(distDir);
  } catch (error) {
    throw new ReleaseVerificationError([
      `Could not read the build output at ${distDir}: ${error.message}`,
    ]);
  }

  const missing = [...expectedByRoute.keys()].filter((route) => !actual.has(route));
  const unexpected = [...actual.keys()].filter((route) => !expectedByRoute.has(route));
  if (missing.length) checker.fail(`Missing page(s): ${missing.join(', ')}`);
  if (unexpected.length) checker.fail(`Unexpected page(s): ${unexpected.join(', ')}`);

  let jsonLdBlocks = 0;
  for (const [route, routeInfo] of expectedByRoute) {
    const file = actual.get(route);
    if (!file) continue;
    try {
      jsonLdBlocks += verifyPage(
        checker,
        await readFile(file, 'utf8'),
        routeInfo,
        routes,
        origin,
      );
    } catch (error) {
      checker.fail(`${route}: page verification crashed: ${error.message}`);
    }
  }

  let xml = '';
  try {
    xml = await readFile(path.join(distDir, 'sitemap.xml'), 'utf8');
  } catch {
    checker.fail('sitemap.xml is missing from dist/.');
  }
  const sitemap = verifySitemap(checker, xml, routes, origin);

  let robots = '';
  try {
    robots = await readFile(path.join(distDir, 'robots.txt'), 'utf8');
  } catch {
    checker.fail('robots.txt is missing from dist/.');
  }
  verifyRobots(checker, robots, origin);

  checker.finish();

  return {
    origin,
    pages: routes.length,
    htmlPages: actual.size,
    sitemapUrls: sitemap.locs,
    alternates: sitemap.alternates,
    jsonLdBlocks,
  };
}

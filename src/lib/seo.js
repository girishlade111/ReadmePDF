/**
 * International SEO for ReadmePDF.
 *
 * One source of truth for:
 * - BCP-47 hreflang codes (which deliberately differ from <html lang> for
 *   Simplified Chinese and Brazilian Portuguese);
 * - canonical and reciprocal alternate URLs;
 * - localized Open Graph metadata;
 * - JSON-LD for the homepage, journal index, and articles;
 * - the multilingual XML sitemap and robots.txt.
 *
 * Absolute URLs are emitted only when a validated `PUBLIC_SITE_URL` exists.
 * Without it, pages keep a self-referencing root-relative canonical and omit
 * hreflang/og:url, because hreflang requires fully-qualified URLs. The sitemap
 * endpoint returns 404 and the build is marked SEO-production-BLOCKED in the
 * implementation report.
 */
import { LOCALES, localeHref, localeMeta, stripLocalePrefix } from '../i18n/config.js';
import { absoluteUrl } from './site.js';

/**
 * Official hreflang identifiers. `zh-Hans` is the correct HTML language but
 * search engines use the `zh` grouping; `pt-BR` is a full regional tag.
 */
export const HREFLANG_MAP = Object.freeze({
  en: 'en',
  es: 'es',
  ja: 'ja',
  ko: 'ko',
  zh: 'zh',
  ru: 'ru',
  tr: 'tr',
  fr: 'fr',
  pt: 'pt-BR',
});

/** Open Graph locale identifiers (language_TERRITORY). */
export const OG_LOCALE_MAP = Object.freeze({
  en: 'en_US',
  es: 'es_ES',
  ja: 'ja_JP',
  ko: 'ko_KR',
  zh: 'zh_CN',
  ru: 'ru_RU',
  tr: 'tr_TR',
  fr: 'fr_FR',
  pt: 'pt_BR',
});

export const X_DEFAULT = 'x-default';
export const DEFAULT_OG_IMAGE_PATH = '/og/readmepdf.png';

/** @param {string} locale */
export function hreflangFor(locale) {
  const value = HREFLANG_MAP[locale];
  if (!value) throw new TypeError(`No hreflang mapping for locale: ${String(locale)}`);
  return value;
}

/** @param {string} locale */
export function ogLocaleFor(locale) {
  const value = OG_LOCALE_MAP[locale];
  if (!value) throw new TypeError(`No Open Graph locale mapping for locale: ${String(locale)}`);
  return value;
}

/**
 * Normalize a page path into the directory-style URLs Astro generates.
 * Query strings and fragments are never part of a canonical.
 *
 * @param {string} path
 */
export function normalizePathname(path = '/') {
  let clean = String(path ?? '/').split('?')[0].split('#')[0];
  if (!clean.startsWith('/')) clean = `/${clean}`;
  clean = clean.replace(/\/{2,}/g, '/');
  if (clean !== '/' && !clean.endsWith('/')) clean += '/';
  return clean;
}

/**
 * Canonical path for the current document.
 * @param {string} path
 */
export function canonicalPath(path = '/') {
  return normalizePathname(path);
}

/**
 * All language equivalents of a page, including x-default.
 *
 * Callers must only render these when a site origin exists; hreflang values
 * have to be absolute URLs.
 *
 * @param {{ path: string, site: import('./site.js').SiteConfig|null }} options
 * @returns {{ locale: string, hreflang: string, href: string }[]}
 */
export function pageAlternates({ path, site }) {
  const normalized = normalizePathname(path);
  const basePath = stripLocalePrefix(normalized);
  const alternates = LOCALES.map((locale) => ({
    locale,
    hreflang: hreflangFor(locale),
    href: absoluteUrl(site, localeHref(locale, basePath)),
  }));
  alternates.push({
    locale: 'en',
    hreflang: X_DEFAULT,
    href: absoluteUrl(site, localeHref('en', basePath)),
  });
  return alternates;
}

/**
 * Everything the <head> needs for one localized page.
 *
 * @param {{
 *   title: string,
 *   description: string,
 *   locale: string,
 *   path: string,
 *   site: import('./site.js').SiteConfig|null,
 *   type?: 'website'|'article',
 *   imagePath?: string|null,
 * }} options
 */
export function buildSeoPage({
  title,
  description,
  locale,
  path,
  site,
  type = 'website',
  imagePath = DEFAULT_OG_IMAGE_PATH,
}) {
  const normalized = canonicalPath(path);
  const hasAbsolute = Boolean(site?.origin);
  const canonical = absoluteUrl(site, normalized);
  return {
    title,
    description,
    locale,
    path: normalized,
    type,
    hasAbsolute,
    canonical,
    url: hasAbsolute ? canonical : null,
    hreflang: hreflangFor(locale),
    ogLocale: ogLocaleFor(locale),
    ogAlternates: LOCALES.filter((entry) => entry !== locale).map(ogLocaleFor),
    alternates: pageAlternates({ path: normalized, site }),
    // Open Graph images must be absolute too; a relative value is not a
    // publishable social preview.
    image: hasAbsolute && imagePath ? absoluteUrl(site, imagePath) : null,
  };
}

/* -------------------------------------------------------------------------- */
/* JSON-LD                                                                    */
/* -------------------------------------------------------------------------- */

/** JSON-LD must never be able to close its own <script> element. */
export function serializeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function organization() {
  return {
    '@type': 'Organization',
    name: 'LadeStack',
    url: 'https://ladestack.in',
  };
}

/**
 * WebSite + SoftwareApplication graph for the homepage.
 *
 * @param {{ locale: string, description: string, site: import('./site.js').SiteConfig|null, path: string }} options
 */
export function homeJsonLd({ locale, description, site, path }) {
  const url = absoluteUrl(site, canonicalPath(path));
  // JSON-LD `inLanguage` is content language, not a search-engine hreflang
  // grouping: Chinese must stay `zh-Hans` and Portuguese `pt-BR`.
  const inLanguage = localeMeta(locale).htmlLang;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        name: 'ReadmePDF',
        url,
        description,
        inLanguage,
        publisher: organization(),
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${url}#software`,
        name: 'ReadmePDF',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        url,
        description,
        inLanguage,
      },
    ],
  };
}

/**
 * CollectionPage + ItemList for the journal index.
 *
 * @param {{
 *   locale: string,
 *   description: string,
 *   site: import('./site.js').SiteConfig|null,
 *   path: string,
 *   posts: Array<{ title: string, href: string }>,
 * }} options
 */
export function blogIndexJsonLd({ locale, description, site, path, posts }) {
  const url = absoluteUrl(site, canonicalPath(path));
  const home = absoluteUrl(site, localeHref(locale, '/'));
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'The ReadmePDF Journal',
    url,
    description,
    inLanguage: localeMeta(locale).htmlLang,
    isPartOf: { '@type': 'WebSite', name: 'ReadmePDF', url: home },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: post.title,
        url: absoluteUrl(site, post.href),
      })),
    },
  };
}

/**
 * BlogPosting schema for a localized article.
 *
 * @param {{
 *   post: any,
 *   locale: string,
 *   path: string,
 *   site: import('./site.js').SiteConfig|null,
 * }} options
 */
export function articleJsonLd({ post, locale, path, site }) {
  const data = post?.data ?? post;
  const url = absoluteUrl(site, canonicalPath(path));
  const language = localeMeta(locale).htmlLang;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: data.title,
    description: data.description,
    datePublished: data.pubDate.toISOString(),
    dateModified: (data.updatedDate ?? data.pubDate).toISOString(),
    author: { '@type': 'Person', name: data.author },
    publisher: organization(),
    keywords: Array.isArray(data.tags) ? data.tags.join(', ') : '',
    inLanguage: language,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isPartOf: {
      '@type': 'Blog',
      name: 'The ReadmePDF Journal',
      url: absoluteUrl(site, localeHref(locale, '/blog/')),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Sitemap                                                                    */
/* -------------------------------------------------------------------------- */

function isoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * The 45 public pages: nine homepages, nine journal indexes, and one article
 * page per locale for each of the three translation keys.
 *
 * @param {Array<any>} posts Published collection entries.
 */
export function buildSitemapPages(posts = []) {
  const published = posts.filter((post) => !post?.data?.draft);
  const pages = [];

  for (const locale of LOCALES) {
    const localePosts = published.filter((post) => post.data.locale === locale);
    const latest = localePosts
      .map((post) => isoDate(post.data.updatedDate ?? post.data.pubDate))
      .filter(Boolean)
      .sort()
      .pop();
    pages.push({
      key: 'home',
      locale,
      path: localeHref(locale, '/'),
      lastmod: null,
      changefreq: 'weekly',
      priority: '1.0',
    });
    pages.push({
      key: 'blog',
      locale,
      path: localeHref(locale, '/blog/'),
      lastmod: latest ?? null,
      changefreq: 'weekly',
      priority: '0.8',
    });
    for (const post of localePosts) {
      pages.push({
        key: String(post.data.translationKey),
        locale,
        path: localeHref(locale, `/blog/${post.data.translationKey}/`),
        lastmod: isoDate(post.data.updatedDate ?? post.data.pubDate),
        changefreq: 'monthly',
        priority: '0.7',
      });
    }
  }

  return pages.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

/**
 * Build sitemap entries with reciprocal alternates. Requires an absolute
 * origin because the sitemap protocol does not allow relative <loc> values.
 *
 * @param {ReturnType<typeof buildSitemapPages>} pages
 * @param {import('./site.js').SiteConfig} site
 */
export function buildSitemapEntries(pages, site) {
  if (!site?.origin) {
    throw new TypeError('A validated PUBLIC_SITE_URL is required to build sitemap URLs.');
  }
  const groups = new Map();
  for (const page of pages) {
    if (!groups.has(page.key)) groups.set(page.key, []);
    groups.get(page.key).push(page);
  }
  return pages.map((page) => {
    const group = groups.get(page.key) ?? [page];
    const alternates = LOCALES.map((locale) => {
      const match = group.find((entry) => entry.locale === locale);
      if (!match) return null;
      return {
        hreflang: hreflangFor(locale),
        href: absoluteUrl(site, match.path),
      };
    }).filter(Boolean);
    const english = group.find((entry) => entry.locale === 'en');
    if (english) {
      alternates.push({
        hreflang: X_DEFAULT,
        href: absoluteUrl(site, english.path),
      });
    }
    return {
      loc: absoluteUrl(site, page.path),
      lastmod: page.lastmod,
      changefreq: page.changefreq,
      priority: page.priority,
      alternates,
    };
  });
}

/** Escape text for XML element content and attributes. */
export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Render a schema.org sitemap with xhtml:link alternates.
 *
 * @param {ReturnType<typeof buildSitemapEntries>} entries
 */
export function buildSitemapXml(entries) {
  const urls = entries.map((entry) => {
    const alternates = entry.alternates
      .map(
        (alternate) =>
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(
            alternate.hreflang,
          )}" href="${escapeXml(alternate.href)}"/>`,
      )
      .join('\n');
    return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
${entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n` : ''}${
      entry.changefreq ? `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n` : ''
    }${entry.priority ? `    <priority>${escapeXml(entry.priority)}</priority>\n` : ''}${alternates}
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

/** robots.txt with an absolute sitemap reference when the origin is known. */
export function buildRobotsTxt(site) {
  const lines = ['User-agent: *', 'Allow: /', ''];
  if (site?.origin) {
    lines.push(`Sitemap: ${absoluteUrl(site, '/sitemap.xml')}`, '');
  } else {
    lines.push('# PUBLIC_SITE_URL is not configured; sitemap publication is disabled.', '');
  }
  return lines.join('\n');
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LOCALES } from '../src/i18n/config.js';
import {
  HREFLANG_MAP,
  X_DEFAULT,
  articleJsonLd,
  blogIndexJsonLd,
  buildRobotsTxt,
  buildSeoPage,
  buildSitemapEntries,
  buildSitemapPages,
  buildSitemapXml,
  canonicalPath,
  escapeXml,
  hreflangFor,
  homeJsonLd,
  normalizePathname,
  ogLocaleFor,
  pageAlternates,
  serializeJsonLd,
} from '../src/lib/seo.js';
import { absoluteUrl, parseSiteUrl, siteFromEnv } from '../src/lib/site.js';

const SITE = parseSiteUrl('https://example.test');
const ORIGIN = 'https://example.test';
const TRANSLATION_KEYS = ['alpha', 'beta', 'gamma'];

function mockPosts() {
  const posts = [];
  for (const locale of LOCALES) {
    for (const [index, key] of TRANSLATION_KEYS.entries()) {
      posts.push({
        id: locale === 'en' ? key : `${locale}/${key}`,
        data: {
          title: `${key} ${locale}`,
          description: `${key} description ${locale}`,
          locale,
          translationKey: key,
          draft: false,
          pubDate: new Date(Date.UTC(2026, index, 10)),
          updatedDate: new Date(Date.UTC(2026, index, 12)),
          author: 'Girish Lade',
          tags: ['PDF', 'GitHub'],
        },
      });
    }
  }
  return posts;
}

describe('deployment origin validation', () => {
  it('accepts bare HTTP(S) origins and normalizes the trailing slash', () => {
    assert.deepEqual(parseSiteUrl('https://example.test'), {
      origin: 'https://example.test',
      href: 'https://example.test',
    });
    assert.equal(parseSiteUrl('https://example.test/')?.origin, 'https://example.test');
    assert.equal(parseSiteUrl('http://localhost:4321')?.origin, 'http://localhost:4321');
    assert.equal(parseSiteUrl('  https://Example.Test  ')?.origin, 'https://example.test');
  });

  it('treats empty and missing values as unconfigured', () => {
    assert.equal(parseSiteUrl(undefined), null);
    assert.equal(parseSiteUrl(null), null);
    assert.equal(parseSiteUrl(''), null);
    assert.equal(parseSiteUrl('   '), null);
    assert.equal(siteFromEnv({}), null);
    assert.equal(siteFromEnv(undefined), null);
  });

  it('rejects paths, credentials, queries, fragments, and non-HTTP protocols', () => {
    for (const value of [
      'https://example.test/subpath',
      'https://user:pass@example.test',
      'https://example.test?x=1',
      'https://example.test/#top',
      'ftp://example.test',
      'javascript:alert(1)',
      'not-a-url',
    ]) {
      assert.throws(() => parseSiteUrl(value), TypeError, value);
    }
  });

  it('joins paths without inventing an origin', () => {
    assert.equal(absoluteUrl(SITE, '/es/'), `${ORIGIN}/es/`);
    assert.equal(absoluteUrl(SITE, 'blog/'), `${ORIGIN}/blog/`);
    assert.equal(absoluteUrl(null, '/es/'), '/es/');
  });
});

describe('hreflang and canonical mapping', () => {
  it('uses search-engine hreflang codes while keeping HTML language accuracy', () => {
    assert.equal(hreflangFor('zh'), 'zh');
    assert.equal(hreflangFor('pt'), 'pt-BR');
    for (const locale of LOCALES) {
      assert.equal(typeof HREFLANG_MAP[locale], 'string');
      assert.ok(HREFLANG_MAP[locale].length >= 2);
      assert.match(ogLocaleFor(locale), /^[a-z]{2}_[A-Z]{2}$/);
    }
  });

  it('normalizes paths to one trailing slash and strips query/fragment', () => {
    assert.equal(normalizePathname('/es/blog/x?utm=1#top'), '/es/blog/x/');
    assert.equal(normalizePathname('blog'), '/blog/');
    assert.equal(normalizePathname('/'), '/');
    assert.equal(canonicalPath('/ja//blog///'), '/ja/blog/');
  });

  it('emits a self-referencing canonical plus reciprocal alternates and x-default', () => {
    const seo = buildSeoPage({
      title: 'Title',
      description: 'Description',
      locale: 'zh',
      path: '/zh/blog/alpha/',
      site: SITE,
    });
    assert.equal(seo.canonical, `${ORIGIN}/zh/blog/alpha/`);
    assert.equal(seo.alternates.length, LOCALES.length + 1);
    const byHreflang = new Map(seo.alternates.map((entry) => [entry.hreflang, entry.href]));
    assert.equal(byHreflang.get('zh'), `${ORIGIN}/zh/blog/alpha/`);
    assert.equal(byHreflang.get('pt-BR'), `${ORIGIN}/pt/blog/alpha/`);
    assert.equal(byHreflang.get('en'), `${ORIGIN}/blog/alpha/`);
    assert.equal(byHreflang.get(X_DEFAULT), `${ORIGIN}/blog/alpha/`);
    assert.equal(new Set(seo.alternates.map((entry) => entry.hreflang)).size, LOCALES.length + 1);
  });

  it('keeps a root-relative canonical and omits absolute alternate URLs without an origin', () => {
    const seo = buildSeoPage({
      title: 'Title',
      description: 'Description',
      locale: 'fr',
      path: '/fr/',
      site: null,
    });
    assert.equal(seo.canonical, '/fr/');
    assert.equal(seo.url, null);
    assert.equal(seo.image, null);
    assert.ok(seo.alternates.every((entry) => entry.href.startsWith('/')));
    assert.ok(pageAlternates({ path: '/es/', site: null }).every((entry) => !entry.href.includes('://')));
  });

  it('does not use a query or fragment as part of a canonical', () => {
    const seo = buildSeoPage({
      title: 'T',
      description: 'D',
      locale: 'en',
      path: '/blog/alpha/?ref=newsletter#section',
      site: SITE,
    });
    assert.equal(seo.canonical, `${ORIGIN}/blog/alpha/`);
    assert.ok(!seo.canonical.includes('?'));
    assert.ok(!seo.canonical.includes('#'));
  });
});

describe('JSON-LD builders', () => {
  it('serializes JSON-LD without allowing a script close tag', () => {
    const serialized = serializeJsonLd({ text: '</script><script>alert(1)</script>' });
    assert.ok(!serialized.toLowerCase().includes('</script'));
    assert.ok(!serialized.includes('<'));
    assert.ok(serialized.includes('\\u003c/script'));
    assert.equal(JSON.parse(serialized).text, '</script><script>alert(1)</script>');
  });

  it('builds localized WebSite and SoftwareApplication data', () => {
    const json = homeJsonLd({
      locale: 'pt',
      description: 'Descrição',
      site: SITE,
      path: '/pt/',
    });
    assert.equal(json['@context'], 'https://schema.org');
    assert.equal(json['@graph'].length, 2);
    assert.equal(json['@graph'][0].inLanguage, 'pt-BR');
    assert.equal(json['@graph'][0].url, `${ORIGIN}/pt/`);
    assert.equal(json['@graph'][1].offers.price, '0');
  });

  it('builds a collection page with a full item list and breadcrumbs', () => {
    const json = blogIndexJsonLd({
      locale: 'ja',
      description: '説明',
      site: SITE,
      path: '/ja/blog/',
      posts: [
        { title: 'A', href: '/ja/blog/a/' },
        { title: 'B', href: '/ja/blog/b/' },
      ],
    });
    assert.equal(json['@type'], 'CollectionPage');
    assert.equal(json.mainEntity.numberOfItems, 2);
    assert.deepEqual(
      json.mainEntity.itemListElement.map((item) => item.position),
      [1, 2],
    );
    assert.equal(json.mainEntity.itemListElement[0].url, `${ORIGIN}/ja/blog/a/`);
    assert.equal(json.breadcrumb?.['@type'], 'BreadcrumbList');
    assert.equal(json.breadcrumb?.itemListElement?.length, 2);
    assert.equal(json.breadcrumb?.itemListElement[0].item, `${ORIGIN}/ja/`);
    assert.equal(json.breadcrumb?.itemListElement[1].item, `${ORIGIN}/ja/blog/`);
  });

  it('builds BlogPosting data with localized language, dates, and breadcrumbs', () => {
    const post = mockPosts().find((entry) => entry.data.locale === 'ru');
    const json = articleJsonLd({
      post,
      locale: 'ru',
      path: `/ru/blog/${post.data.translationKey}/`,
      site: SITE,
    });
    assert.equal(json['@type'], 'BlogPosting');
    assert.equal(json.inLanguage, 'ru');
    assert.equal(json.datePublished, post.data.pubDate.toISOString());
    assert.equal(json.dateModified, post.data.updatedDate.toISOString());
    assert.equal(json.publisher.name, 'LadeStack');
    assert.equal(json.url, `${ORIGIN}/ru/blog/${post.data.translationKey}/`);
    assert.equal(json.image, `${ORIGIN}/og/md2pdf.png`);
    assert.equal(json.breadcrumb?.['@type'], 'BreadcrumbList');
    assert.equal(json.breadcrumb?.itemListElement?.length, 3);
    assert.equal(json.breadcrumb?.itemListElement[0].item, `${ORIGIN}/ru/`);
    assert.equal(json.breadcrumb?.itemListElement[1].item, `${ORIGIN}/ru/blog/`);
    assert.equal(json.breadcrumb?.itemListElement[2].item, `${ORIGIN}/ru/blog/${post.data.translationKey}/`);
  });

  it('uses the accurate content language in JSON-LD, not the hreflang grouping', () => {
    const home = homeJsonLd({
      locale: 'zh',
      description: '说明',
      site: SITE,
      path: '/zh/',
    });
    assert.equal(home['@graph'][0].inLanguage, 'zh-Hans');
    assert.equal(home['@graph'][1].inLanguage, 'zh-Hans');

    const blog = blogIndexJsonLd({
      locale: 'zh',
      description: '说明',
      site: SITE,
      path: '/zh/blog/',
      posts: [],
    });
    assert.equal(blog.inLanguage, 'zh-Hans');

    const post = mockPosts().find(
      (entry) => entry.data.locale === 'zh' && entry.data.translationKey === 'alpha',
    );
    const article = articleJsonLd({
      post,
      locale: 'zh',
      path: '/zh/blog/alpha/',
      site: SITE,
    });
    assert.equal(article.inLanguage, 'zh-Hans');
    // Search engines still receive the official `zh` grouping.
    assert.equal(hreflangFor('zh'), 'zh');
  });
});

describe('multilingual sitemap and robots', () => {
  it('covers all 54 public pages with per-page reciprocal alternates', () => {
    const pages = buildSitemapPages(mockPosts());
    assert.equal(pages.length, 54);
    assert.equal(pages.filter((page) => page.key === 'home').length, 9);
    assert.equal(pages.filter((page) => page.key === 'blog').length, 9);
    assert.equal(pages.filter((page) => page.key === 'about').length, 9);
    assert.equal(pages.filter((page) => TRANSLATION_KEYS.includes(page.key)).length, 27);
    assert.ok(pages.every((page) => page.path.startsWith('/') && page.path.endsWith('/')));

    const entries = buildSitemapEntries(pages, SITE);
    assert.equal(entries.length, 54);
    for (const entry of entries) {
      assert.equal(entry.alternates.length, LOCALES.length + 1);
      assert.ok(entry.loc.startsWith(`${ORIGIN}/`));
      assert.ok(entry.alternates.every((alternate) => alternate.href.startsWith(`${ORIGIN}/`)));
      assert.ok(entry.alternates.some((alternate) => alternate.hreflang === X_DEFAULT));
    }
  });

  it('publishes one About page per locale as a fixed sitemap group', () => {
    const pages = buildSitemapPages(mockPosts()).filter((page) => page.key === 'about');
    assert.equal(pages.length, LOCALES.length);
    assert.deepEqual(
      pages.map((page) => page.path),
      ['/about/', '/es/about/', '/fr/about/', '/ja/about/', '/ko/about/', '/pt/about/', '/ru/about/', '/tr/about/', '/zh/about/'],
    );
  });

  it('keeps the English page as x-default for translated groups', () => {
    const entries = buildSitemapEntries(buildSitemapPages(mockPosts()), SITE);
    const article = entries.find((entry) => entry.loc === `${ORIGIN}/es/blog/alpha/`);
    const xDefault = article.alternates.find((alternate) => alternate.hreflang === X_DEFAULT);
    assert.equal(xDefault.href, `${ORIGIN}/blog/alpha/`);
  });

  it('refuses to produce a sitemap without an absolute origin', () => {
    assert.throws(
      () => buildSitemapEntries(buildSitemapPages(mockPosts()), null),
      /PUBLIC_SITE_URL/,
    );
  });

  it('renders valid XML with escaped values and xhtml alternates', () => {
    const pages = buildSitemapPages(mockPosts());
    const xml = buildSitemapXml(buildSitemapEntries(pages, SITE));
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
    assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
    assert.equal((xml.match(/<url>/g) ?? []).length, 54);
    assert.equal((xml.match(/hreflang="x-default"/g) ?? []).length, 54);
    assert.ok(!xml.includes('& '));
    assert.equal(escapeXml(`<&>"'`), '&lt;&amp;&gt;&quot;&apos;');
  });

  it('emits a sitemap reference only when the origin is configured', () => {
    const withSite = buildRobotsTxt(SITE);
    assert.match(withSite, /^User-agent: \*$/m);
    assert.match(withSite, /^Allow: \/$/m);
    assert.match(withSite, /^Sitemap: https:\/\/example\.test\/sitemap\.xml$/m);
    assert.match(withSite, /Content-Signal:/);
    assert.match(withSite, /User-agent: OAI-SearchBot/);
    assert.match(withSite, /User-agent: Claude-SearchBot/);
    assert.match(withSite, /User-agent: PerplexityBot/);
    assert.match(withSite, /llms\.txt: https:\/\/example\.test\/llms\.txt/);
    assert.ok(!buildRobotsTxt(null).includes('Sitemap:'));
    assert.match(buildRobotsTxt(null), /PUBLIC_SITE_URL/);
  });
});

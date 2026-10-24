/**
 * Release-gate tests.
 *
 * These tests exercise the two independent halves of `npm run build:release`:
 * the strict origin parser and the artifact verifier. The verifier is run
 * against a synthetic 54-page build so every failure mode can be triggered
 * deterministically, without relying on the checked-in `dist/` directory.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { LOCALES, LOCALE_META } from '../src/i18n/config.js';
import {
  buildRobotsTxt,
  buildSeoPage,
  buildSitemapEntries,
  buildSitemapPages,
  buildSitemapXml,
  serializeJsonLd,
} from '../src/lib/seo.js';
import { parseReleaseSiteUrl } from '../src/lib/site.js';
import {
  ReleaseVerificationError,
  collectExpectedRoutes,
  verifyReleaseArtifacts,
} from '../scripts/lib/release-verify.mjs';

const ORIGIN = 'https://release-gate.md2pdf.dev';
const TRANSLATION_KEYS = ['alpha', 'beta', 'gamma'];
const REAL_CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'blog');

function assertReleaseFailure(error, pattern) {
  assert.ok(error instanceof ReleaseVerificationError, `unexpected error: ${error}`);
  assert.ok(
    error.failures.some((failure) => pattern.test(failure)),
    `expected ${pattern} in:\n${error.failures.join('\n')}`,
  );
  return true;
}

function pageFile(distDir, route) {
  return route === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, ...route.split('/').filter(Boolean), 'index.html');
}

function renderPage(routeInfo, site) {
  const seo = buildSeoPage({
    title: `${routeInfo.route} title`,
    description: `${routeInfo.route} description`,
    locale: routeInfo.locale,
    path: routeInfo.route,
    site,
  });
  const alternates = seo.alternates
    .map(
      (alternate) =>
        `<link rel="alternate" hreflang="${alternate.hreflang}" href="${alternate.href}">`,
    )
    .join('\n    ');
  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: seo.canonical,
  });
  return `<!doctype html>
<html lang="${LOCALE_META[routeInfo.locale].htmlLang}">
  <head>
    <meta charset="utf-8">
    <link rel="canonical" href="${seo.canonical}">
    ${alternates}
    <meta property="og:url" content="${seo.canonical}">
    <script type="application/ld+json">${jsonLd}</script>
  </head>
  <body><h1>${routeInfo.route}</h1></body>
</html>
`;
}

/**
 * Build a temporary content inventory and matching dist tree. The synthetic
 * pages use the real SEO builders, so the verifier is tested against the same
 * canonical/hreflang/sitemap shapes the application emits.
 */
async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'md2pdf-release-'));
  const contentDir = path.join(root, 'content');
  const distDir = path.join(root, 'dist');
  const site = parseReleaseSiteUrl(ORIGIN);
  const posts = [];

  for (const [index, key] of TRANSLATION_KEYS.entries()) {
    for (const locale of LOCALES) {
      const directory = locale === 'en' ? contentDir : path.join(contentDir, locale);
      await mkdir(directory, { recursive: true });
      const pubDate = `2026-0${index + 1}-10`;
      await writeFile(
        path.join(directory, `${key}.md`),
        [
          '---',
          `title: "${key} ${locale}"`,
          `description: "Description for ${key} in ${locale}"`,
          `locale: ${locale}`,
          `translationKey: ${key}`,
          'draft: false',
          `pubDate: ${pubDate}`,
          '---',
          '',
          `Fixture body for ${key}.`,
          '',
        ].join('\n'),
        'utf8',
      );
      posts.push({
        data: {
          locale,
          translationKey: key,
          draft: false,
          pubDate: new Date(`${pubDate}T00:00:00Z`),
        },
      });
    }
  }

  const { routes } = await collectExpectedRoutes(contentDir);
  const sitemap = buildSitemapXml(
    buildSitemapEntries(buildSitemapPages(posts), site),
  );
  const robots = buildRobotsTxt(site);
  const html = new Map(routes.map((routeInfo) => [routeInfo.route, renderPage(routeInfo, site)]));

  async function write({ mutatePage, mutateSitemap, mutateRobots, removePage } = {}) {
    await rm(distDir, { recursive: true, force: true });
    for (const [route, content] of html) {
      if (route === removePage) continue;
      const file = pageFile(distDir, route);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, mutatePage ? mutatePage(content, route) : content, 'utf8');
    }
    await writeFile(
      path.join(distDir, 'sitemap.xml'),
      mutateSitemap ? mutateSitemap(sitemap) : sitemap,
      'utf8',
    );
    await writeFile(
      path.join(distDir, 'robots.txt'),
      mutateRobots ? mutateRobots(robots) : robots,
      'utf8',
    );
  }

  await write();
  return {
    root,
    contentDir,
    distDir,
    site,
    routes,
    html,
    sitemap,
    robots,
    write,
    verify: () =>
      verifyReleaseArtifacts({ distDir, origin: site.origin, contentDir }),
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

async function withFixture(callback) {
  const fixture = await createFixture();
  try {
    return await callback(fixture);
  } finally {
    await fixture.cleanup();
  }
}

describe('release origin policy', () => {
  it('accepts normal HTTPS public domains and normalizes them', () => {
    assert.equal(parseReleaseSiteUrl('https://md2pdf.dev').origin, 'https://md2pdf.dev');
    assert.equal(
      parseReleaseSiteUrl('  https://WWW.md2pdf.dev/  ').origin,
      'https://www.md2pdf.dev',
    );
    assert.equal(
      parseReleaseSiteUrl('https://md2pdf.dev:8443').origin,
      'https://md2pdf.dev:8443',
    );
  });

  it('rejects missing, insecure, internal, reserved, and placeholder origins', () => {
    for (const value of [undefined, null, '', '   ']) {
      assert.throws(() => parseReleaseSiteUrl(value), /required/, String(value));
    }
    for (const value of [
      'http://md2pdf.dev',
      'https://localhost',
      'https://app.localhost',
      'https://127.0.0.1',
      'https://[::1]',
      'https://10.0.0.8',
      'https://md2pdf',
      'https://example.com',
      'https://docs.example.org',
      'https://md2pdf.test',
      'https://md2pdf.invalid',
      'https://md2pdf.local',
      'https://yourdomain.com',
      'https://www.example.net',
      'https://md2pdf.dev/path',
      'https://user:pass@md2pdf.dev',
      'not a url',
    ]) {
      assert.throws(() => parseReleaseSiteUrl(value), TypeError, value);
    }
  });
});

describe('source inventory', () => {
  it('derives the real 216 routes and 21 translation keys', async () => {
    const { routes, keys } = await collectExpectedRoutes(REAL_CONTENT_DIR);
    assert.equal(routes.length, 216);
    assert.deepEqual(keys, [
      'browser-only-markdown-to-pdf',
      'browser-print-markdown-pdf',
      'chapter-sequencing-reordering-pdf',
      'github-branch-tag-commit-pdf',
      'github-readme-to-pdf',
      'github-repository-markdown-tree',
      'live-markdown-preview-pdf',
      'markdown-code-blocks-to-pdf',
      'markdown-editor-paste-pdf',
      'markdown-file-search-filter',
      'markdown-file-upload-to-pdf',
      'markdown-folder-selection-book',
      'markdown-pdf-cover-page',
      'markdown-relative-images-links-pdf',
      'markdown-table-of-contents-pdf',
      'markdown-tables-to-pdf',
      'markdown-zip-pdf-export',
      'multi-file-markdown-book',
      'multilingual-markdown-pdf-fonts',
      'readme-pdf-print-themes',
      'readme-to-pdf-use-cases',
    ]);
    assert.equal(routes.filter((route) => route.kind === 'home').length, 9);
    assert.equal(routes.filter((route) => route.kind === 'blog').length, 9);
    assert.equal(routes.filter((route) => route.kind === 'about').length, 9);
    assert.equal(routes.filter((route) => route.kind === 'article').length, 189);
  });
});

describe('release artifact verification', () => {
  it('accepts a complete 54-page build and reports exact counts', async () => {
    await withFixture(async (fixture) => {
      const summary = await fixture.verify();
      assert.deepEqual(summary, {
        origin: ORIGIN,
        pages: 54,
        htmlPages: 54,
        sitemapUrls: 54,
        alternates: 540,
        jsonLdBlocks: 54,
      });
    });
  });

  it('rejects a missing HTML page', async () => {
    await withFixture(async (fixture) => {
      await fixture.write({ removePage: '/es/blog/alpha/' });
      await assert.rejects(
        fixture.verify(),
        (error) => assertReleaseFailure(error, /Missing page\(s\): \/es\/blog\/alpha\//),
      );
    });
  });

  it('rejects a relative canonical', async () => {
    await withFixture(async (fixture) => {
      await fixture.write({
        mutatePage: (html, route) =>
          route === '/'
            ? html.replace(`rel="canonical" href="${ORIGIN}/"`, 'rel="canonical" href="/"')
            : html,
      });
      await assert.rejects(
        fixture.verify(),
        (error) => assertReleaseFailure(error, /canonical is relative/),
      );
    });
  });

  it('rejects a hreflang alternate on another origin', async () => {
    await withFixture(async (fixture) => {
      await fixture.write({
        mutatePage: (html, route) =>
          route === '/'
            ? html.replace(
                `hreflang="ja" href="${ORIGIN}/ja/"`,
                'hreflang="ja" href="https://attacker.invalid/ja/"',
              )
            : html,
      });
      await assert.rejects(
        fixture.verify(),
        (error) =>
          assertReleaseFailure(
            error,
            /hreflang ja is not an absolute URL on|unexpected alternate/,
          ),
      );
    });
  });

  it('rejects a missing sitemap', async () => {
    await withFixture(async (fixture) => {
      await rm(path.join(fixture.distDir, 'sitemap.xml'));
      await assert.rejects(
        fixture.verify(),
        (error) => assertReleaseFailure(error, /sitemap\.xml is missing/),
      );
    });
  });

  it('rejects a sitemap whose <loc> values use another origin', async () => {
    await withFixture(async (fixture) => {
      await fixture.write({
        mutateSitemap: (xml) =>
          xml.replace(`<loc>${ORIGIN}/`, '<loc>https://other-domain.invalid/'),
      });
      await assert.rejects(
        fixture.verify(),
        (error) => assertReleaseFailure(error, /sitemap\.xml contains a URL outside/),
      );
    });
  });

  it('rejects a sitemap without a urlset root', async () => {
    await withFixture(async (fixture) => {
      await fixture.write({ mutateSitemap: () => 'not an xml sitemap' });
      await assert.rejects(
        fixture.verify(),
        (error) => assertReleaseFailure(error, /sitemap\.xml has no <urlset> root/),
      );
    });
  });

  it('rejects robots.txt without the sitemap directive', async () => {
    await withFixture(async (fixture) => {
      await fixture.write({
        mutateRobots: (robots) => robots.replace(/^Sitemap:.*$/m, ''),
      });
      await assert.rejects(
        fixture.verify(),
        (error) => assertReleaseFailure(error, /robots\.txt must contain exactly one/),
      );
    });
  });

  it('rejects JSON-LD URLs that are not on the release origin', async () => {
    await withFixture(async (fixture) => {
      await fixture.write({
        mutatePage: (html, route) =>
          route === '/'
            ? html.replace(
                `"url":"${ORIGIN}/"`,
                '"url":"http://localhost:4321/"',
              )
            : html,
      });
      await assert.rejects(
        fixture.verify(),
        (error) => assertReleaseFailure(error, /JSON-LD \$\.url is not on/),
      );
    });
  });

  it('rejects an incorrect <html lang> value', async () => {
    await withFixture(async (fixture) => {
      await fixture.write({
        mutatePage: (html, route) =>
          route === '/ja/' ? html.replace('<html lang="ja">', '<html lang="en">') : html,
      });
      await assert.rejects(
        fixture.verify(),
        (error) =>
          assertReleaseFailure(error, /<html lang> is "en", expected "ja"/),
      );
    });
  });

  it('rejects an HTTP origin even when called directly', async () => {
    await withFixture(async (fixture) => {
      await assert.rejects(
        () =>
          verifyReleaseArtifacts({
            distDir: fixture.distDir,
            origin: 'http://localhost:4321',
            contentDir: fixture.contentDir,
          }),
        (error) => assertReleaseFailure(error, /origin must use https:\/\//),
      );
    });
  });
});

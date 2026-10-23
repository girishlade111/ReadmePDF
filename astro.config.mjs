import { defineConfig } from 'astro/config';
import { readFile, rm } from 'node:fs/promises';
import { loadEnv } from 'vite';
import { parseSiteUrl } from './src/lib/site.js';

/**
 * Resolve the deployment origin once, at config load. Astro uses `site` for
 * `Astro.url`/canonical generation; components and endpoints read the same
 * validated value through `siteFromEnv`. An invalid value fails the build.
 */
const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
const fileEnv = loadEnv(mode, process.cwd(), '');
const site = parseSiteUrl(process.env.PUBLIC_SITE_URL ?? fileEnv.PUBLIC_SITE_URL);

/**
 * Fail-closed release guard for the two origin-dependent public files.
 *
 * A static host serves whatever is written to `dist/`, so a 404 endpoint body
 * for `sitemap.xml` would become an HTTP 200 text file. When no origin is
 * configured the file is removed instead. When an origin is configured the
 * build fails unless the sitemap and robots directive are both present and
 * internally consistent.
 */
function releaseGuard(siteConfig) {
  return {
    name: 'readmepdf-release-guard',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const sitemapUrl = new URL('sitemap.xml', dir);
        const robotsUrl = new URL('robots.txt', dir);
        const robots = await readFile(robotsUrl, 'utf8');

        if (!siteConfig) {
          await rm(sitemapUrl, { force: true });
          if (/^Sitemap:/m.test(robots)) {
            throw new Error(
              'robots.txt advertises a sitemap but PUBLIC_SITE_URL is not configured.',
            );
          }
          logger.info(
            'PUBLIC_SITE_URL is not configured: sitemap.xml omitted and robots.txt has no Sitemap directive.',
          );
          return;
        }

        const expectedDirective = `Sitemap: ${siteConfig.origin}/sitemap.xml`;
        if (!robots.includes(expectedDirective)) {
          throw new Error(`robots.txt is missing: ${expectedDirective}`);
        }

        let xml;
        try {
          xml = await readFile(sitemapUrl, 'utf8');
        } catch {
          throw new Error(
            'sitemap.xml was not generated even though PUBLIC_SITE_URL is configured.',
          );
        }
        if (!xml.startsWith('<?xml') || !xml.includes('<urlset')) {
          throw new Error('sitemap.xml is not a valid XML urlset document.');
        }
        const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
        if (!locations.length) throw new Error('sitemap.xml contains no <loc> entries.');
        for (const location of locations) {
          if (!location.startsWith(`${siteConfig.origin}/`)) {
            throw new Error(`sitemap.xml contains a URL outside ${siteConfig.origin}: ${location}`);
          }
        }
        logger.info(
          `Sitemap validated: ${locations.length} absolute URLs under ${siteConfig.origin}.`,
        );
      },
    },
  };
}

/**
 * Native Astro i18n configuration.
 *
 * English remains the default locale and keeps its unprefixed URLs. Spanish,
 * Japanese, Korean, Chinese, Russian, Turkish, French, and Portuguese live
 * under their own prefixes. Routing is entirely static: there is no middleware
 * that inspects Accept-Language, cookies, or `navigator.language`, and no
 * redirect from an explicit locale URL to another language.
 */
export default defineConfig({
  output: 'static',
  // No production domain is assumed. When PUBLIC_SITE_URL is absent, pages
  // emit root-relative canonicals and sitemap publication is disabled.
  ...(site ? { site: site.origin } : {}),
  integrations: [releaseGuard(site)],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'ja', 'ko', 'zh', 'ru', 'tr', 'fr', 'pt'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
});

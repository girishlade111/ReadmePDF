import { defineConfig } from 'astro/config';
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
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'ja', 'ko', 'zh', 'ru', 'tr', 'fr', 'pt'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
});

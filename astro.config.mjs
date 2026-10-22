import { defineConfig } from 'astro/config';

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
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'ja', 'ko', 'zh', 'ru', 'tr', 'fr', 'pt'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
});

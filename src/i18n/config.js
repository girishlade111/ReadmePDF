/**
 * Central locale registry for ReadmePDF.
 *
 * Every locale-dependent decision (routing, <html lang>, date formatting,
 * language-switcher labels, future hreflang identifiers) reads from this one
 * module. Spanish is a documented provisional ninth locale: the product brief
 * named eight languages while requesting nine, so `es` is included behind the
 * same registry and can be replaced or removed without touching page code.
 */

/** @typedef {'en'|'es'|'ja'|'ko'|'zh'|'ru'|'tr'|'fr'|'pt'} Locale */

/** @type {ReadonlyArray<Locale>} */
export const LOCALES = Object.freeze(['en', 'es', 'ja', 'ko', 'zh', 'ru', 'tr', 'fr', 'pt']);

/** @type {Locale} */
export const DEFAULT_LOCALE = 'en';

/**
 * Locale metadata. `prefix` is the URL segment ('' for English) and
 * `htmlLang` is the accurate BCP-47 tag used on <html lang> and hreflang.
 * `dateLocale` keeps regional formatting choices explicit.
 *
 * @type {Record<Locale, {
 *   label: string,
 *   englishLabel: string,
 *   htmlLang: string,
 *   prefix: string,
 *   dateLocale: string,
 *   pluralCategories: ReadonlyArray<string>,
 *   provisional?: boolean,
 * }>}
 */
export const LOCALE_META = Object.freeze({
  en: {
    label: 'English',
    englishLabel: 'English',
    htmlLang: 'en',
    prefix: '',
    dateLocale: 'en',
    pluralCategories: ['one', 'other'],
  },
  es: {
    label: 'Español',
    englishLabel: 'Spanish',
    htmlLang: 'es',
    prefix: 'es',
    dateLocale: 'es',
    pluralCategories: ['one', 'other'],
    provisional: true,
  },
  ja: {
    label: '日本語',
    englishLabel: 'Japanese',
    htmlLang: 'ja',
    prefix: 'ja',
    dateLocale: 'ja',
    pluralCategories: ['other'],
  },
  ko: {
    label: '한국어',
    englishLabel: 'Korean',
    htmlLang: 'ko',
    prefix: 'ko',
    dateLocale: 'ko',
    pluralCategories: ['other'],
  },
  zh: {
    label: '简体中文',
    englishLabel: 'Chinese (Simplified)',
    htmlLang: 'zh-Hans',
    prefix: 'zh',
    dateLocale: 'zh-Hans',
    pluralCategories: ['other'],
  },
  ru: {
    label: 'Русский',
    englishLabel: 'Russian',
    htmlLang: 'ru',
    prefix: 'ru',
    dateLocale: 'ru',
    pluralCategories: ['one', 'few', 'many', 'other'],
  },
  tr: {
    label: 'Türkçe',
    englishLabel: 'Turkish',
    htmlLang: 'tr',
    prefix: 'tr',
    dateLocale: 'tr',
    pluralCategories: ['one', 'other'],
  },
  fr: {
    label: 'Français',
    englishLabel: 'French',
    htmlLang: 'fr',
    prefix: 'fr',
    dateLocale: 'fr',
    pluralCategories: ['one', 'other'],
  },
  pt: {
    label: 'Português (Brasil)',
    englishLabel: 'Portuguese (Brazil)',
    htmlLang: 'pt-BR',
    prefix: 'pt',
    dateLocale: 'pt-BR',
    pluralCategories: ['one', 'other'],
  },
});

/** Locales that use a URL prefix (everything except the default). */
export const PREFIXED_LOCALES = Object.freeze(LOCALES.filter((locale) => locale !== DEFAULT_LOCALE));

/** @param {unknown} value */
export function isLocale(value) {
  return typeof value === 'string' && LOCALES.includes(/** @type {Locale} */ (value));
}

/**
 * Assert-and-narrow a locale value. Throws for unsupported identifiers rather
 * than silently treating an arbitrary path segment as a language.
 * @param {unknown} value
 * @returns {Locale}
 */
export function assertLocale(value) {
  if (!isLocale(value)) {
    throw new TypeError(`Unsupported locale: ${String(value)}`);
  }
  return /** @type {Locale} */ (value);
}

/**
 * Prefix a root-relative path for a locale. English stays unprefixed so every
 * existing URL continues to resolve unchanged.
 *
 * @param {Locale} locale
 * @param {string} [path] Root-relative path beginning with '/'.
 */
export function localeHref(locale, path = '/') {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const prefix = LOCALE_META[assertLocale(locale)].prefix;
  if (!prefix) return clean;
  return clean === '/' ? `/${prefix}/` : `/${prefix}${clean}`;
}

/**
 * The locale implied by a pathname. Unknown first segments are not languages;
 * they simply leave the visitor on the default locale.
 *
 * @param {string} pathname
 * @returns {Locale}
 */
export function localeFromPath(pathname = '/') {
  const segment = String(pathname).split('?')[0].split('#')[0].split('/').filter(Boolean)[0];
  return isLocale(segment) ? /** @type {Locale} */ (segment) : DEFAULT_LOCALE;
}

/**
 * Remove a known locale prefix from a pathname. This is deliberately a
 * path-only operation: no cookie, navigator.language, or redirect is involved.
 *
 * @param {string} pathname
 */
export function stripLocalePrefix(pathname = '/') {
  const clean = String(pathname).split('?')[0].split('#')[0];
  const parts = clean.split('/').filter(Boolean);
  if (parts.length && isLocale(parts[0])) parts.shift();
  return parts.length ? `/${parts.join('/')}${clean.endsWith('/') ? '/' : ''}` : '/';
}

/**
 * Equivalent pathname in another locale, preserving the page path. Used by the
 * explicit language switcher so visitors can move between the translated
 * versions of the current document.
 *
 * @param {string} pathname
 * @param {Locale} locale
 */
export function localizedPathname(pathname, locale) {
  return localeHref(locale, stripLocalePrefix(pathname));
}

/** Metadata for one locale, with a safe runtime check. */
export function localeMeta(locale) {
  return LOCALE_META[assertLocale(locale)];
}

/** Ordered list for language-switcher menus. */
export function localeOptions() {
  return LOCALES.map((locale) => ({ locale, ...LOCALE_META[locale] }));
}

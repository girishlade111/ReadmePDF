/**
 * Dependency-free translation primitives.
 *
 * Kept separate from `index.js` so the browser bundle can import the English
 * fallback and these helpers without pulling every locale dictionary into the
 * client.
 */
import { LOCALE_META, assertLocale } from './config.js';

const PLACEHOLDER = /\{([a-zA-Z0-9_.-]+)\}/g;
const PLURAL_SUFFIX = /\.(zero|one|two|few|many|other)$/;

/** @param {unknown} value */
export function isDictionary(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Replace `{name}` placeholders. Unknown placeholders are left untouched so a
 * missing variable is visible in review rather than rendering "undefined".
 *
 * @param {string} template
 * @param {Record<string, unknown>} [vars]
 */
export function interpolate(template, vars = {}) {
  if (!vars || typeof template !== 'string') return template;
  return template.replace(PLACEHOLDER, (match, name) => {
    if (!Object.hasOwn(vars, name)) return match;
    return String(vars[name]);
  });
}

/**
 * Look up a message without plural selection. Missing keys return the key
 * itself, which is loud in development and harmless in production.
 *
 * @param {Record<string, string>} dictionary
 * @param {string} key
 * @param {Record<string, unknown>} [vars]
 */
export function translateFrom(dictionary, key, vars) {
  const value = dictionary?.[key];
  if (typeof value !== 'string') return key;
  return interpolate(value, vars);
}

/** CLDR plural category for a count in a locale. */
export function pluralCategory(locale, count) {
  const safe = assertLocale(locale);
  try {
    return new Intl.PluralRules(LOCALE_META[safe].dateLocale).select(Number(count));
  } catch {
    return 'other';
  }
}

/**
 * Plural-aware lookup. `key.one`, `key.few`, `key.many`, `key.other` are the
 * dictionary entries; `{count}` is always supplied automatically.
 *
 * @param {unknown} locale
 * @param {string} key
 * @param {number} count
 * @param {Record<string, unknown>} [vars]
 * @param {Record<string, string>} dictionary
 */
export function pluralFrom(locale, key, count, vars = {}, dictionary = {}) {
  const category = pluralCategory(locale, count);
  const template =
    dictionary?.[`${key}.${category}`] ??
    dictionary?.[`${key}.other`] ??
    dictionary?.[`${key}.one`];
  if (typeof template !== 'string') return key;
  return interpolate(template, { count, ...vars });
}

/** All message keys, including plural variants. */
export function dictionaryKeys(dictionary) {
  return Object.keys(dictionary ?? {}).sort();
}

/** Base keys that have at least one plural variant. */
export function pluralBases(dictionary) {
  const bases = new Set();
  for (const key of Object.keys(dictionary ?? {})) {
    const match = key.match(PLURAL_SUFFIX);
    if (match) bases.add(key.slice(0, -match[0].length));
  }
  return [...bases].sort();
}

/** Placeholder names used by a template. */
export function placeholders(template) {
  const names = new Set();
  for (const match of String(template).matchAll(PLACEHOLDER)) names.add(match[1]);
  return [...names].sort();
}

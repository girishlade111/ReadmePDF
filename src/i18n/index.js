/**
 * Server/build-time translation runtime.
 *
 * Dictionaries are flat key/value JSON modules. Flat keys keep parity checks
 * trivial and let every component use the same `t('area.thing')` call.
 * Plural messages live under `<key>.<category>` and are selected with
 * `Intl.PluralRules` for the active locale.
 */
import en from './dictionaries/en.json' with { type: 'json' };
import es from './dictionaries/es.json' with { type: 'json' };
import ja from './dictionaries/ja.json' with { type: 'json' };
import ko from './dictionaries/ko.json' with { type: 'json' };
import zh from './dictionaries/zh.json' with { type: 'json' };
import ru from './dictionaries/ru.json' with { type: 'json' };
import tr from './dictionaries/tr.json' with { type: 'json' };
import fr from './dictionaries/fr.json' with { type: 'json' };
import pt from './dictionaries/pt.json' with { type: 'json' };
import { DEFAULT_LOCALE, assertLocale } from './config.js';
import { pluralFrom, translateFrom } from './core.js';
import { makeBookLabels } from './book-labels.js';

export * from './core.js';

/** @typedef {import('./config.js').Locale} Locale */
/** @typedef {Record<string, string>} Dictionary */

/** @type {Record<Locale, Dictionary>} */
export const DICTIONARIES = Object.freeze({ en, es, ja, ko, zh, ru, tr, fr, pt });

/**
 * Dictionary for a locale. Falling back to English keeps a partially shipped
 * locale readable, but the build-time parity test prevents that from happening
 * in a release.
 *
 * @param {unknown} locale
 * @returns {Dictionary}
 */
export function getDictionary(locale) {
  const safe = assertLocale(locale);
  return DICTIONARIES[safe] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Locale-bound translator.
 *
 * @param {unknown} locale
 * @param {Dictionary} [dictionary]
 */
export function translator(locale, dictionary = getDictionary(locale)) {
  return (key, vars) => translateFrom(dictionary, key, vars);
}

/**
 * Plural-aware lookup against the active locale dictionary.
 *
 * @param {unknown} locale
 * @param {string} key
 * @param {number} count
 * @param {Record<string, unknown>} [vars]
 * @param {Dictionary} [dictionary]
 */
export function plural(locale, key, count, vars = {}, dictionary = getDictionary(locale)) {
  return pluralFrom(locale, key, count, vars, dictionary);
}

/**
 * Locale-bound plural helper.
 *
 * @param {unknown} locale
 * @param {Dictionary} [dictionary]
 */
export function pluralizer(locale, dictionary = getDictionary(locale)) {
  return (key, count, vars) => plural(locale, key, count, vars, dictionary);
}

/**
 * JSON safe to inline inside <script type="application/json">. Escaping `<`
 * prevents a dictionary string from terminating the host element.
 *
 * @param {unknown} locale
 */
export function serializeDictionary(locale) {
  const safe = assertLocale(locale);
  return JSON.stringify({ locale: safe, messages: getDictionary(safe) })
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Labels consumed by the PDF book assembly and preview renderer. English
 * defaults keep the pure library usable outside a page.
 *
 * @param {unknown} locale
 */
export function bookLabels(locale) {
  const safe = assertLocale(locale);
  return makeBookLabels(translator(safe), pluralizer(safe));
}

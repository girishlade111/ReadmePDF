/**
 * Browser-side translation runtime.
 *
 * Each localized page embeds exactly one dictionary in
 * `<script type="application/json" id="readmepdf-i18n">`. Controllers call
 * `initClientI18n()` once and then use `t()` / `tn()`. English is bundled as a
 * fallback so pure helpers behave identically in Node tests and in the browser.
 */
import en from './dictionaries/en.json' with { type: 'json' };
import { DEFAULT_LOCALE, isLocale, localeMeta } from './config.js';
import { pluralFrom, translateFrom } from './core.js';
import { makeBookLabels } from './book-labels.js';

/** @typedef {import('./config.js').Locale} Locale */

/** @type {{ locale: Locale, messages: Record<string, string> }} */
let active = { locale: DEFAULT_LOCALE, messages: en };

let initialized = false;

/**
 * Read the inline dictionary if present. Safe to call repeatedly and safe in
 * Node, where `document` does not exist.
 */
export function initClientI18n() {
  if (initialized || typeof document === 'undefined') return active;
  initialized = true;
  const node = document.getElementById('readmepdf-i18n');
  if (!node) return active;
  try {
    const parsed = JSON.parse(node.textContent || '{}');
    const locale = isLocale(parsed.locale) ? parsed.locale : DEFAULT_LOCALE;
    if (parsed.messages && typeof parsed.messages === 'object') {
      active = { locale, messages: parsed.messages };
    }
  } catch {
    // Malformed inline JSON must never break the page; English stays active.
  }
  return active;
}

/** Current locale selected for this document. */
export function clientLocale() {
  if (!initialized) initClientI18n();
  return active.locale;
}

/** BCP-47 language tag used by <html lang>. */
export function clientHtmlLang() {
  return localeMeta(clientLocale()).htmlLang;
}

/**
 * Translate a non-plural key with English fallback.
 *
 * @param {string} key
 * @param {Record<string, unknown>} [vars]
 */
export function t(key, vars) {
  if (!initialized) initClientI18n();
  const localized = translateFrom(active.messages, key, vars);
  if (localized !== key) return localized;
  return translateFrom(en, key, vars);
}

/**
 * Translate a plural key with English fallback.
 *
 * @param {string} key
 * @param {number} count
 * @param {Record<string, unknown>} [vars]
 */
export function tn(key, count, vars) {
  if (!initialized) initClientI18n();
  const localized = pluralFrom(active.locale, key, count, vars, active.messages);
  if (localized !== key) return localized;
  return pluralFrom(DEFAULT_LOCALE, key, count, vars, en);
}

/** Plain translator function for pure helpers that accept an optional `t`. */
export function translator() {
  return t;
}

/** Plural helper for pure helpers that accept an optional `tn`. */
export function pluralizer() {
  return tn;
}

/** Labels used by the book assembler and preview renderer. */
export function clientBookLabels() {
  return makeBookLabels(t, tn);
}

/** Test hook: forget the cached inline dictionary. */
export function resetClientI18n() {
  active = { locale: DEFAULT_LOCALE, messages: en };
  initialized = false;
}

import { localeHref, localeMeta, DEFAULT_LOCALE } from '../i18n/config.js';

const WORDS_PER_MINUTE = 220;
const CJK_CHARS_PER_MINUTE = 500;
const CJK_LOCALES = new Set(['ja', 'ko', 'zh']);

/**
 * Estimated reading time for a Markdown body. CJK prose has no spaces between
 * words, so it is measured in characters rather than whitespace tokens.
 */
export function readingTime(body = '', locale = DEFAULT_LOCALE) {
  const text = String(body ?? '');
  if (CJK_LOCALES.has(locale)) {
    const characters = text.replace(/\s+/g, '').length;
    return Math.max(1, Math.ceil(characters / CJK_CHARS_PER_MINUTE));
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Human-readable date, fixed to UTC so build machines agree. */
export function formatDate(date, locale = DEFAULT_LOCALE) {
  const dateLocale = localeMeta(locale).dateLocale;
  return new Intl.DateTimeFormat(dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Machine-readable date for <time datetime="…">. */
export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function byNewest(a, b) {
  return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
}

/** Canonical path for a translated article. */
export function postHref(post, locale = DEFAULT_LOCALE) {
  return localeHref(locale, `/blog/${post.data.translationKey}/`);
}

/** Every published article in one locale, newest first. */
export function publishedPosts(posts, locale = DEFAULT_LOCALE) {
  return posts.filter((post) => !post.data.draft && post.data.locale === locale).sort(byNewest);
}

/**
 * Up to `limit` related articles from the same locale. Shared tag IDs win over
 * publication date, exactly like the original English-only implementation.
 */
export function relatedPosts(posts, post, locale = DEFAULT_LOCALE, limit = 2) {
  return posts
    .filter(
      (entry) =>
        !entry.data.draft &&
        entry.data.locale === locale &&
        entry.data.translationKey !== post.data.translationKey,
    )
    .map((entry) => ({
      entry,
      sharedTags: entry.data.tags.filter((tag) => post.data.tags.includes(tag)).length,
    }))
    .sort(
      (a, b) =>
        b.sharedTags - a.sharedTags ||
        b.entry.data.pubDate.valueOf() - a.entry.data.pubDate.valueOf(),
    )
    .slice(0, limit)
    .map(({ entry }) => entry);
}

/**
 * Tag IDs stay stable English identifiers; only the visible label is
 * translated. Unknown tags fall back to the identifier rather than a raw key.
 */
export function tagLabel(tag, t) {
  const key = `tags.${tag}`;
  const value = t(key);
  return value === key ? tag : value;
}

const WORDS_PER_MINUTE = 220;

/** Estimated reading time for a Markdown body. */
export function readingTime(body = '') {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Human-readable date, fixed to UTC so build machines agree. */
export function formatDate(date) {
  return new Intl.DateTimeFormat('en', {
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

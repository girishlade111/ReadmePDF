/**
 * Small, dependency-free HTML escaping helpers.
 *
 * Anything that comes from GitHub, a URL, or user input must pass through
 * escapeHtml() before it is concatenated into an HTML string. Markdown body
 * HTML is sanitised separately by lib/sanitize.js.
 */

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (char) => ESCAPES[char]);
}

/** Escape a value used inside a double-quoted HTML attribute. */
export function escapeAttr(value) {
  return escapeHtml(value);
}

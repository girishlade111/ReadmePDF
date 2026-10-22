/**
 * Inline formatting for dictionary messages.
 *
 * Translations may contain `{code:…}` segments for names that should render as
 * inline code (for example `.github/` or `owner/repo`). Splitting the string
 * into plain parts lets Astro escape every text segment while still emitting a
 * real <code> element. No raw HTML from a dictionary is ever injected.
 */

/**
 * @param {unknown} template
 * @returns {Array<{ type: 'text'|'code', value: string }>}
 */
export function inlineParts(template) {
  const text = String(template ?? '');
  const parts = [];
  let lastIndex = 0;
  for (const match of text.matchAll(/\{code:([^}]*)\}/g)) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts;
}

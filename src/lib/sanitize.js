/**
 * Fail-closed HTML sanitisation.
 *
 * GitHub Markdown can contain arbitrary raw HTML. Nothing reaches the page
 * unless DOMPurify has cleaned it. If the sanitizer cannot load, the caller
 * receives an error and shows a safe message instead of unsanitised HTML.
 */
import { githubError } from './errors.js';

export const SANITIZE_OPTIONS = Object.freeze({
  ADD_ATTR: ['target', 'rel'],
  FORBID_TAGS: [
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'form',
    'base',
    'link',
    'meta',
  ],
  FORBID_ATTR: ['srcdoc'],
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SANITIZE_DOM: true,
});

let enginePromise = null;

async function loadEngine() {
  if (typeof window === 'undefined') {
    throw githubError(
      'SANITIZE_UNAVAILABLE',
      'The HTML sanitizer needs a browser. Reload the page and try again.',
    );
  }
  enginePromise ??= import('dompurify')
    .then((mod) => {
      const factory = mod.default ?? mod;
      const engine = typeof factory === 'function' ? factory(window) : factory;
      if (!engine || typeof engine.sanitize !== 'function') {
        throw new Error('DOMPurify did not expose a sanitize() function.');
      }
      return engine;
    })
    .catch((error) => {
      enginePromise = null;
      throw githubError(
        'SANITIZE_UNAVAILABLE',
        `The HTML sanitizer could not load, so the preview was stopped for safety. ${error?.message ?? ''}`.trim(),
      );
    });
  return enginePromise;
}

/**
 * Sanitise an HTML string. Tests may inject a DOMPurify-compatible engine;
 * production callers rely on the lazily loaded browser instance.
 *
 * @param {string} html
 * @param {{ purify?: { sanitize: (html: string, options?: object) => string } }} [options]
 * @returns {Promise<string>}
 */
export async function sanitizeHtml(html, { purify } = {}) {
  const engine = purify ?? (await loadEngine());
  if (!engine || typeof engine.sanitize !== 'function') {
    throw githubError('SANITIZE_UNAVAILABLE', 'The HTML sanitizer is not available. Preview stopped.');
  }
  const result = engine.sanitize(String(html ?? ''), { ...SANITIZE_OPTIONS });
  if (typeof result !== 'string') {
    throw githubError('SANITIZE_UNAVAILABLE', 'The HTML sanitizer returned an invalid result.');
  }
  return result;
}

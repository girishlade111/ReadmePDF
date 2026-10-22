/**
 * Book labels shared by the pure assembler, the browser controller, and the
 * Astro pages. The factory takes translators so callers can supply either the
 * active dictionary or the English fallback without importing every locale.
 */
import en from './dictionaries/en.json' with { type: 'json' };
import { pluralFrom, translateFrom } from './core.js';

/**
 * @param {(key: string, vars?: Record<string, unknown>) => string} t
 * @param {(key: string, count: number, vars?: Record<string, unknown>) => string} tn
 */
export function makeBookLabels(t, tn) {
  return {
    coverAria: t('assembly.coverAria'),
    coverEyebrow: t('assembly.coverEyebrow'),
    coverSourceFallback: t('assembly.coverSourceFallback'),
    commit: (sha) => t('assembly.commit', { sha }),
    defaultTitle: (repo) => t('assembly.defaultTitle', { repo }),
    contents: t('assembly.contents'),
    contentsWithTitle: (title) => t('assembly.contentsWithTitle', { title }),
    chapter: (number) => t('assembly.chapter', { number }),
    chapterAria: (number, path) => t('assembly.chapterAria', { number, path }),
    chapterCount: (count) => tn('common.chapters', count),
    filePreview: t('assembly.filePreview'),
    filePreviewAria: (path) => t('assembly.filePreviewAria', { path }),
  };
}

/** English labels for direct library use and Node tests. */
export const EN_BOOK_LABELS = Object.freeze(
  makeBookLabels(
    (key, vars) => translateFrom(en, key, vars),
    (key, count, vars) => pluralFrom('en', key, count, vars, en),
  ),
);

/** Fresh copy so callers cannot mutate the shared defaults. */
export function defaultBookLabels() {
  return { ...EN_BOOK_LABELS };
}

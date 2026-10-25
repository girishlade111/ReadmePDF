/**
 * Combined documentation-book assembly.
 *
 * Each selected Markdown file is rendered as its own chapter:
 * - heading ids are prefixed (`doc-2-install`) so two READMEs can never collide;
 * - images are pinned to the resolved commit on raw.githubusercontent.com;
 * - links between selected files become internal anchors;
 * - all other links become GitHub blob URLs at the same commit;
 * - every rendered chapter is sanitised before it is concatenated.
 *
 * The book is only assembled when the fetch report says it is complete. A
 * partial fetch is surfaced to the caller instead of being printed as if it
 * were the whole documentation set.
 */
import { githubError } from '../errors.js';
import { escapeAttr, escapeHtml } from '../html.js';
import {
  buildBlobUrl,
  buildRawUrl,
  rewriteRelativeUrls,
} from '../github/urls.js';
import {
  extractHeadings,
  renderMarkdownDocument,
  slugifyHeading,
} from '../markdown.js';
import { defaultBookLabels } from '../../i18n/book-labels.js';
import { assertBookComplete } from './validation.js';

export { assertBookComplete };

export const BOOK_CHAPTER_PREFIX = 'doc-';

function cleanMetadata(value, fallback = '') {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
}

function decodeFragment(value) {
  const raw = String(value ?? '').replace(/^#/, '').trim();
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function hashFromSuffix(suffix) {
  const raw = String(suffix ?? '');
  const index = raw.indexOf('#');
  return index === -1 ? '' : raw.slice(index + 1);
}

/** Chapter wrapper id for a zero-based document index. */
export function documentAnchor(index) {
  return `${BOOK_CHAPTER_PREFIX}${Number(index) + 1}`;
}

/** Heading-id prefix for a zero-based document index. */
export function documentIdPrefix(index) {
  return `${documentAnchor(index)}-`;
}

/**
 * Find the heading slug a fragment points at. Handles GitHub-style anchors,
 * percent-encoding, casing, and the common "heading text instead of slug"
 * mistake. Falls back to a slugified guess so a link still lands in the right
 * chapter even when GitHub has changed an anchor.
 */
export function resolveHeadingAnchor(headings, fragment) {
  const decoded = decodeFragment(fragment);
  if (!decoded) return 'section';
  const list = Array.isArray(headings) ? headings : [];
  const direct = decoded;
  if (list.some((heading) => heading.slug === direct)) return direct;

  const candidates = [
    slugifyHeading(decoded),
    slugifyHeading(decoded.replace(/-+/g, ' ')),
    slugifyHeading(decoded.replace(/[_-]+/g, ' ')),
  ];
  for (const candidate of candidates) {
    if (candidate && list.some((heading) => heading.slug === candidate)) return candidate;
  }
  return candidates.find(Boolean) || 'section';
}



function buildCover({ title, subtitle, owner, repo, ref, commitSha, chapterCount, labels }) {
  const shortCommit = cleanMetadata(commitSha).slice(0, 8);
  const source = cleanMetadata(
    [owner, repo].filter(Boolean).join('/'),
    labels.coverSourceFallback,
  );
  const version = [
    cleanMetadata(ref),
    shortCommit ? labels.commit(shortCommit) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return `<section class="book-cover" aria-label="${escapeAttr(labels.coverAria)}">
  <p class="book-cover__eyebrow">${escapeHtml(labels.coverEyebrow)}</p>
  <h1 class="book-cover__title">${escapeHtml(title)}</h1>
  ${
    subtitle
      ? `<p class="book-cover__subtitle">${escapeHtml(subtitle)}</p>`
      : ''
  }
  <div class="book-cover__meta">
    <p><strong>${escapeHtml(source)}</strong></p>
    ${version ? `<p>${escapeHtml(version)}</p>` : ''}
    <p>${escapeHtml(labels.chapterCount(chapterCount))}</p>
  </div>
</section>`;
}

function buildBookToc(documents, title, labels) {
  const chapters = documents
    .map((document) => {
      const headings = document.headings
        .map(
          (heading) =>
            `<li class="book-toc__heading book-toc__h${heading.level}"><a href="#${escapeAttr(
              heading.slug,
            )}">${escapeHtml(heading.text)}</a></li>`,
        )
        .join('');
      return `<li class="book-toc__chapter">
  <a class="book-toc__chapter-link" href="#${escapeAttr(document.anchor)}">${escapeHtml(
    document.path,
  )}</a>
  ${headings ? `<ul class="book-toc__headings">${headings}</ul>` : ''}
</li>`;
    })
    .join('');

  return `<nav class="book-toc" aria-labelledby="book-toc-title">
  <h2 class="book-toc__title" id="book-toc-title">${escapeHtml(
    title ? labels.contentsWithTitle(title) : labels.contents,
  )}</h2>
  <ol class="book-toc__chapters">${chapters}</ol>
</nav>`;
}

function buildChapter(document, labels) {
  const label = labels.chapterAria(document.number, document.path);
  return `<section class="book-chapter" id="${escapeAttr(document.anchor)}" data-doc-path="${escapeAttr(
    document.path,
  )}" aria-label="${escapeAttr(label)}">
  <header class="book-chapter__head">
    <p class="book-chapter__kicker">${escapeHtml(labels.chapter(document.number))}</p>
    <p class="book-chapter__source">${escapeHtml(document.path)}</p>
  </header>
  <div class="book-chapter__body">${document.html}</div>
</section>`;
}

function makeResolvers({ owner, repo, commitSha, documentsByPath }) {
  const imageResolver = ({ resolvedPath }) =>
    buildRawUrl(owner, repo, commitSha, resolvedPath);

  const linkResolver = ({ resolvedPath, repoPath, suffix }) => {
    const target = documentsByPath.get(repoPath);
    if (!target) return buildBlobUrl(owner, repo, commitSha, resolvedPath);
    const fragment = hashFromSuffix(suffix);
    if (fragment) {
      const slug = resolveHeadingAnchor(target.headings, fragment);
      return `#${target.idPrefix}${slug}`;
    }
    return `#${target.anchor}`;
  };

  return { imageResolver, linkResolver };
}

/**
 * Render one explorer file as a standalone preview at a pinned commit.
 *
 * @param {{
 *   document: {path: string, name?: string, markdown: string},
 *   owner: string,
 *   repo: string,
 *   commitSha: string,
 *   sanitize?: (html: string) => string | Promise<string>,
 *   idPrefix?: string,
 *   labels?: ReturnType<import('../../i18n/book-labels.js').makeBookLabels>,
 * }} options
 */
export async function renderDocumentPreview({
  document,
  owner,
  repo,
  commitSha,
  sanitize,
  idPrefix = 'file-preview-',
  labels = defaultBookLabels(),
} = {}) {
  if (!document || typeof document.path !== 'string' || typeof document.markdown !== 'string') {
    throw githubError('INVALID_DOCUMENT', 'That file has no Markdown content to preview.');
  }
  if (!owner || !repo || !commitSha) {
    throw githubError(
      'INTERNAL',
      'A repository and resolved commit are required to preview a file.',
    );
  }

  const headings = extractHeadings(document.markdown);
  const byPath = new Map([
    [
      document.path,
      {
        path: document.path,
        headings,
        idPrefix,
        anchor: 'file-preview',
      },
    ],
  ]);
  const { imageResolver, linkResolver } = makeResolvers({
    owner,
    repo,
    commitSha,
    documentsByPath: byPath,
  });

  const effective = rewriteRelativeUrls(document.markdown, {
    owner,
    repo,
    branch: commitSha,
    readmePath: document.path,
    imageResolver,
    linkResolver,
    anchorResolver: (anchor) => {
      if (!anchor || anchor === '#') return anchor || '#';
      return `#${idPrefix}${resolveHeadingAnchor(headings, anchor)}`;
    },
  });

  const rendered = await renderMarkdownDocument(effective, {
    idPrefix,
    sanitize,
  });
  const label = labels.filePreviewAria(document.path);

  return {
    path: document.path,
    name: document.name || document.path.split('/').pop() || document.path,
    headings: rendered.headings,
    // Sanitised body content without the preview chrome, used by the
    // individual-PDF exporter (the renderer supplies its own chapter header).
    contentHtml: rendered.html,
    html: `<article class="book-file-preview" data-doc-path="${escapeAttr(
      document.path,
    )}" aria-label="${escapeAttr(label)}">
  <header class="book-chapter__head">
    <p class="book-chapter__kicker">${escapeHtml(labels.filePreview)}</p>
    <p class="book-chapter__source">${escapeHtml(document.path)}</p>
  </header>
  <div class="book-chapter__body">${rendered.html}</div>
</article>`,
  };
}

/**
 * Assemble a complete book from a fetch report.
 *
 * @param {{
 *   owner: string, repo: string, commitSha: string, ref?: string,
 *   documents: Array<{path: string, markdown: string, name?: string}>,
 *   complete?: boolean, requested?: number, failures?: Array<object>
 * }} book
 * @param {{
 *   title?: string, subtitle?: string, includeCover?: boolean,
 *   includeToc?: boolean, sanitize?: (html: string) => string | Promise<string>,
 *   labels?: ReturnType<import('../../i18n/book-labels.js').makeBookLabels>
 * }} [options]
 */
export async function assembleBook(book, options = {}) {
  assertBookComplete(book);
  const labels = options.labels ?? defaultBookLabels();

  const owner = cleanMetadata(book.owner);
  const repo = cleanMetadata(book.repo);
  const commitSha = cleanMetadata(book.commitSha);
  const ref = cleanMetadata(book.ref);
  if (!owner || !repo || !commitSha) {
    throw githubError(
      'INTERNAL',
      'A repository owner, repository name, and resolved commit are required to build a book.',
    );
  }

  const title =
    cleanMetadata(options.title) ||
    labels.defaultTitle(`${owner}/${repo}`);
  const subtitle = cleanMetadata(options.subtitle);
  const includeCover = options.includeCover !== false;
  const includeToc = options.includeToc !== false;

  const prepared = book.documents.map((document, index) => ({
    ...document,
    number: index + 1,
    anchor: documentAnchor(index),
    idPrefix: documentIdPrefix(index),
    headings: extractHeadings(document.markdown),
  }));
  const documentsByPath = new Map(
    prepared.map((document) => [document.path, document]),
  );
  const { imageResolver, linkResolver } = makeResolvers({
    owner,
    repo,
    commitSha,
    documentsByPath,
  });

  const renderedDocuments = [];
  for (const document of prepared) {
    const effective = rewriteRelativeUrls(document.markdown, {
      owner,
      repo,
      branch: commitSha,
      readmePath: document.path,
      imageResolver,
      linkResolver,
      anchorResolver: (anchor) => {
        if (!anchor || anchor === '#') return anchor || '#';
        const slug = resolveHeadingAnchor(document.headings, anchor);
        return `#${document.idPrefix}${slug}`;
      },
    });

    const rendered = await renderMarkdownDocument(effective, {
      idPrefix: document.idPrefix,
      sanitize: options.sanitize,
    });
    renderedDocuments.push({
      ...document,
      html: rendered.html,
      headings: rendered.headings,
    });
  }

  const coverHtml = includeCover
    ? buildCover({
        title,
        subtitle,
        owner,
        repo,
        ref,
        commitSha,
        chapterCount: renderedDocuments.length,
        labels,
      })
    : '';
  const tocHtml = includeToc ? buildBookToc(renderedDocuments, title, labels) : '';
  const chaptersHtml = renderedDocuments
    .map((document) => buildChapter(document, labels))
    .join('\n');
  const html = `<div class="book-document" data-book-root>
${coverHtml}
${tocHtml}
<div class="book-chapters">
${chaptersHtml}
</div>
</div>`;

  return {
    html,
    title,
    subtitle,
    includeCover,
    includeToc,
    coverHtml,
    tocHtml,
    chapterCount: renderedDocuments.length,
    documents: renderedDocuments,
    owner,
    repo,
    ref,
    commitSha,
    // Assembly only runs after assertBookComplete, but keep the evidence on the
    // result so print guards can re-check it without the original fetch report.
    complete: true,
    requested: Number.isInteger(book.requested) ? book.requested : renderedDocuments.length,
    failures: [],
  };
}

---
title: "Markdown Table of Contents for PDF: Structure That Prints Well"
description: "How md2pdf builds a table of contents, when to keep it, and how heading discipline makes a printed PDF easier to navigate."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Navigation", "PDF", "Layout"]
locale: "en"
translationKey: "markdown-table-of-contents-pdf"
---

A table of contents is not decoration. In a document longer than a few pages, it is the difference between a reader who can find the installation section and a reader who scrolls through the whole PDF. In Markdown, the contents is also a useful diagnostic: if the headings do not form a coherent outline, the contents will show that immediately.

md2pdf can generate a table of contents for a single document and assemble one for a multi-chapter book. The two features are related but not identical. This guide explains what each one does, how to structure headings so the result is useful, and when to turn the contents off.

For the print workflow, see [How to convert a GitHub README to PDF](/blog/github-readme-to-pdf/). For a multi-file book, see [Build a multi-file Markdown book](/blog/multi-file-markdown-book/).

## What the table of contents actually is

In the single-document preview, the table of contents is an HTML navigation block inserted above the rendered Markdown. It lists the document's headings as links to their sections. The links work in the browser preview, and they may remain clickable in a PDF produced by the browser's print engine, depending on the browser and the export settings.

It is not a PDF outline or a set of bookmarks. A PDF viewer's sidebar outline is a separate structure that the print engine may or may not create. If you need guaranteed PDF bookmarks, check your browser's output; do not assume the on-page contents will become a sidebar outline.

In the book workflow, the contents is assembled from the selected chapters and their headings as part of the book layout. It is a document page, not a floating navigation panel. The book editor can also mark the assembled output as stale when the cover or contents changes, so the printed book cannot silently disagree with its front matter.

## How md2pdf builds it

The single-document contents is generated from the parsed Markdown, not from a hand-written list. The rules are simple:

- The document must contain at least **three headings**. With fewer, no contents block is inserted.
- Headings from **H1 through H4** are included.
- Heading IDs are slugged and de-duplicated, so two headings with the same text get distinct anchors.
- The toggle in the converter controls both the preview and the print output. There is no separate PDF-only setting.

Because the contents comes from the same parse as the preview, it stays in sync with the document. If you add a heading, it appears after the next render. If you remove one, the entry disappears.

A typical outline looks like this:

```markdown
# Project handbook

## Installation

### Requirements

## Configuration

### Environment variables

## Troubleshooting
```

That document has six headings, so the contents is generated. The H1 is the document title, the H2s are major sections, and the H3s are subsections. The hierarchy is visible in the indentation of the contents.

## Write headings that work as entries

A heading has two jobs: it tells a reader what the section contains, and it becomes a line in the contents. A heading that is clever in context but vague out of context makes a poor entry.

Prefer specific nouns and verbs:

```text
Vague:  ## Overview
Useful: ## Configure GitHub access
Vague:  ## Errors
Useful: ## Recover from a failed export
```

The useful version tells a reader what they will find without opening the section. The vague version could describe almost anything.

Keep headings short enough to fit on one line. A contents entry that wraps to three lines is hard to scan. If a heading needs a qualifier, put the qualifier after a colon: `## Export: per-chapter PDFs`.

Avoid using headings for visual emphasis. A heading that says `## Note` or `## Important` adds an entry without telling the reader what the section is about. Use bold text or a blockquote for emphasis instead.

## Start sections at H2

The existing articles on this site use an H1 supplied by the page template and start body sections at H2. That convention works well for a README too: the repository name or document title is the H1, and the major sections are H2.

Starting at H2 has three benefits:

1. **The contents has a clear top level.** The H1 is the document, not one section among many.
2. **Subsections nest naturally.** H3 becomes a child of H2, and H4 becomes a child of H3.
3. **The print stylesheet can size headings predictably.** A page with five H1s looks like five documents stapled together.

If your source already uses H1 for every chapter, the book workflow is a better fit than a single document. The book adds its own chapter boundary, so each file can keep its H1 without competing with the book title.

## Handle duplicates, appendices, and long documents

Duplicate heading text is allowed. The slugger appends a suffix to keep the anchors unique. The contents, however, will show two entries with the same label, which is confusing.

Fix duplicates at the source:

- Add the chapter or product name: `## Install the CLI` and `## Install the desktop app`.
- Use a colon for the qualifier: `## Limits: single document` and `## Limits: book export`.
- Rename generic headings: `## Overview` becomes `## Conversion pipeline`.

For long documents, consider whether every H4 belongs in the contents. The generator includes H1 through H4, so a document with many deep subsections can produce a contents block that is longer than a page. If that happens, promote the important sections to H2 or H3 and move incidental detail into prose.

Appendices are a special case. They are often numbered and referenced from the body. Give them stable headings such as `## Appendix A: Export limits` so the contents entry is useful on its own. Do not rely on a number alone.

## Decide whether to keep it

The contents is on by default in the single-document workflow. Keep it when:

- the document is longer than a few pages,
- the reader may print only part of it,
- the document has clear major sections,
- the PDF will be used as a reference rather than read once.

Turn it off when:

- the document is a one-page handout,
- the source already contains a hand-written contents,
- the headings are few and the block adds more noise than navigation,
- the contents would duplicate a cover page or a book's assembled contents.

For a book, the assembled contents is part of the front matter. Do not also paste a hand-written contents into the first chapter; the reader would see two versions and would not know which one is authoritative.

## Check the contents in the PDF

The preview is not the final check. Open the saved PDF and inspect the contents page:

- **Page breaks.** The contents should not be split so that the last entries sit alone on a new page with no heading.
- **Entry labels.** Long headings may wrap or clip. Shorten the source heading if an entry is unreadable.
- **Link behavior.** Click a few entries. If the PDF viewer supports internal links, they should jump to the section. If not, the page numbers, if any, are the fallback.
- **Hierarchy.** Indentation should make the outline obvious. A flat list of twenty entries is a sign that the heading levels are too uniform.
- **Stale entries.** If you edited the Markdown after building a book, rebuild before exporting. The contents is generated at build time, not updated in the PDF after the fact.
- **Bookmarks.** Check the viewer's outline panel separately. Do not assume the on-page contents created PDF bookmarks.

A contents page is a promise that the document is navigable. If the entries do not match the sections, the promise is worse than no contents at all. Rebuild, re-check, and keep the heading structure boring.

For a document that needs chapters rather than sections, the book workflow gives each file its own boundary and assembles a contents across files. For a single README, a clean H2 outline and the automatic contents are usually enough. Both paths are free to use, run in the browser, and require no account.

---
title: "Build a Multi-File Markdown Book and Export It as PDF"
description: "Turn repository documentation into an ordered, searchable book with a cover, table of contents, browser print, and per-chapter PDF downloads."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Documentation", "Book", "PDF", "Workflow"]
locale: "en"
translationKey: "multi-file-markdown-book"
---

A single README is a good front door. It is a poor container for a manual. Once documentation grows into installation, configuration, operations, and troubleshooting chapters, a long README becomes a document that nobody wants to scroll and a PDF that nobody wants to paginate by hand.

md2pdf includes a documentation book workflow for exactly that shape of content. You point it at a public repository, choose the Markdown files you want, put them in order, add a cover and table of contents, and then print the assembled book or download one PDF per chapter in a ZIP archive. The files are fetched and rendered in the browser; the source is not uploaded to an application server.

This guide explains how the book workflow behaves and how to prepare a repository so the result is predictable. If you only need one document, start with [How to convert a GitHub README to PDF](/blog/github-readme-to-pdf/) instead.

## When a book beats a single README

Use the book workflow when the document has several natural chapters and a reader may need to jump between them. Typical cases:

- **Product documentation** with separate setup, concepts, and reference pages.
- **Course packs** assembled from weekly notes or modules.
- **Runbooks** where each service or incident type has its own file.
- **Release documentation** that combines a changelog, upgrade notes, and a migration guide.

A book is less useful when the content is short, when the files change constantly and the PDF would be stale immediately, or when the reader only needs one page. In those cases, a single document or a repository link is the better format.

The workflow also assumes the source is a **public** repository. Private repositories are not supported, because the browser cannot authenticate against GitHub on your behalf. If the content is private, export it locally from a checkout or paste the chapters into a single document.

## What the scanner does

When you provide a repository URL, the book explorer reads the repository tree through the GitHub API. It then builds a searchable file tree of the Markdown files it finds. Folders have tri-state checkboxes, so selecting a folder selects its visible children, and clearing one child leaves the folder in a mixed state.

The scanner has explicit limits:

- Up to **30 files** in a book.
- Up to **750 KB per file**.
- Up to **6 MB** of Markdown in total.
- A **20-second** content-fetch timeout.
- A bounded GitHub API request budget, with **60 requests** used for the main scan.

Those limits exist to keep the browser responsive and to avoid turning a documentation export into an accidental bulk download. If a repository exceeds them, the explorer reports what was skipped rather than silently producing a partial book.

A directory tree that works well looks like this:

```text
docs/
├── 00-introduction.md
├── 01-installation.md
├── 02-configuration.md
├── 03-operations.md
└── 04-troubleshooting.md
```

Numeric prefixes are not required, but they make the intended reading order obvious in the repository and reduce sorting mistakes. The book editor still lets you reorder chapters after selection.

## Select and order chapters

Select the files in the tree, then review the chapter list. Newly selected files append to the end, which is usually the right default when you select a folder in order. Use the move-up and move-down controls to fix the sequence.

A few habits make the ordering step faster:

1. **Select the smallest useful set.** A 30-chapter limit is generous, but a 12-chapter book is easier to review and print.
2. **Put front matter first.** Introduction, audience, and conventions belong before installation.
3. **Keep reference material last.** Appendices and API tables are easier to use at the end.
4. **Do not duplicate the README.** If the README is also a chapter, decide whether it is the introduction or a summary, not both.
5. **Remove generated files.** Changelogs and release notes can be useful, but generated duplicates add noise.

The order in the editor is the order in the printed book and in the ZIP paths. If a chapter is in the wrong place, fix it before building; rebuilding after a change is cheap, but reviewing a misordered PDF is not.

## Prepare the source files

The book renderer treats each selected file as a chapter. It adds a chapter heading from the file title or path, then renders the Markdown inside it. That means each file should be a coherent chapter, not a fragment that depends on the previous file's headings.

A chapter can start with its own heading:

```markdown
# Installation

This chapter assumes a supported Node.js version and a local clone.
```

If every file starts with an H1, the assembled book has a clear chapter boundary. If files start with H2, the chapter heading still provides the top level, but the internal hierarchy may look shallow. Pick one convention across the repository and keep it.

Also check:

- **Relative links.** Links between chapters should point to files that exist in the repository. A link to a file outside the selected set still resolves to GitHub, but it is not part of the PDF.
- **Images.** Relative images are resolved against the repository during the fetch. A path that only works in a local checkout may not resolve.
- **Code fences.** Long lines still need the same print review as a single document.
- **Tables.** Wide tables are harder to fit in a book because the page layout is fixed. See [Markdown tables to PDF](/blog/markdown-tables-to-pdf/).
- **Duplicate headings.** Identical headings in different chapters are fine, but they make the table of contents harder to scan. Add a chapter-specific word when the meaning differs.

## Build the cover and table of contents

The book editor lets you set a title, subtitle, and cover text. Use them to answer three questions before the reader reaches chapter one: what is this document, who is it for, and which version does it describe?

A good cover is short. The title names the product or system, the subtitle names the audience or scope, and the cover text gives the version, date, or source repository. Avoid putting a full changelog on the cover; it belongs in a chapter.

The table of contents is assembled from the selected chapters and their headings. It is part of the book, not a separate document. If the contents looks wrong, the cause is usually one of these:

- A chapter has no usable heading, so the entry falls back to the file name.
- A heading is repeated across chapters, so two entries look identical.
- A file was selected but not fetched, so the book is incomplete.
- The chapter order changed after the book was built, so the output is stale.

Editing the title, subtitle, cover, or contents marks the assembled book as stale and disables print and export until you rebuild it. That guard is intentional: it prevents a PDF from claiming to match a cover that was never applied.

For more on heading structure, see [Markdown table of contents for PDF](/blog/markdown-table-of-contents-pdf/).

## Print or export the book

There are two output paths, and they solve different problems.

**Print the assembled book.** This uses the browser's print dialog. The print stylesheet isolates the book from the rest of the page, so the converter UI and the single-document preview do not appear. Choose "Save as PDF", set the page size, and enable background graphics if your browser offers the option. This is the right path when you want one continuous document with a cover, contents, and chapters.

**Export one PDF per chapter.** This produces a ZIP archive containing a separate PDF for each selected chapter. The archive root is named `md2pdf-{owner}-{repo}-{sha8}.zip`, and the PDFs preserve the repository paths and Unicode file names. This is the right path when readers need individual chapters, when the full book is too large for one file, or when another system expects one PDF per document.

The export has its own limits:

- At most **30 PDFs** in one archive.
- At most **32 MB per PDF**.
- At most **128 MB for the ZIP**.

A single chapter that fails to render does not destroy the whole export. The failure is reported, the remaining PDFs are delivered, and the archive is still usable. If every chapter fails, no archive is produced.

Export can be cancelled. A cancelled export downloads nothing and reports the cancellation instead of leaving a partial ZIP.

## Limits, failures, and recovery

Most book failures are visible before export. The scanner warns when it skips a file for size or when the request budget runs out. The build refuses to print an incomplete book. The export reports per-chapter failures.

When something goes wrong:

1. **Re-scan the repository** if the tree looks incomplete. A rate-limited API call can produce a partial listing.
2. **Reduce the selection** if the total exceeds 6 MB. Remove generated files and large assets first.
3. **Fetch the missing chapter again** before rebuilding. A stale selection is not a complete book.
4. **Check the source file** if one chapter fails to render. Unclosed fences and malformed HTML-in-Markdown are common causes.
5. **Try the single-document path** for a chapter that is unusually large or image-heavy.

The book workflow is deliberately conservative. It would rather stop and explain a limit than hand you a PDF with missing chapters. That makes the output less surprising, which is the main thing a documentation archive needs to be.

Everything in the workflow runs in the browser. For the privacy implications of fetching a public repository and rendering it locally, see [Browser-only Markdown to PDF](/blog/browser-only-markdown-to-pdf/).

---
title: "Markdown Tables to PDF: Making Wide Tables Fit the Page"
description: "A practical guide to GitHub-flavored Markdown tables that survive PDF export: column planning, alignment, cell length, pagination, and print checks."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Tables", "PDF", "Layout"]
locale: "en"
translationKey: "markdown-tables-to-pdf"
---

A table is one of the first things readers look for in technical documentation. It is also one of the first things to break when Markdown becomes a PDF. Columns that look fine in a wide browser window become cramped on A4, long cell text pushes the grid past the margin, and rows split across pages in ways that make the header meaningless.

md2pdf renders [GitHub-flavored Markdown](https://github.github.com/gfm/) tables and sends the result to a print stylesheet or, for book exports, an A4 PDF renderer. The tool can keep a reasonable table readable, but it cannot invent space. Most of the work happens in the Markdown source: choosing the right columns, keeping cells short, and deciding what belongs in a table at all.

This guide covers that source-level work first, then the print checks that catch the remaining problems. For the full conversion workflow, see [How to convert a GitHub README to PDF](/blog/github-readme-to-pdf/).

## Why tables break at print time

A browser table is flexible. It can overflow its container, shrink text, or let the reader scroll sideways. A printed page has a fixed width and no scrollbar. When the content is wider than the page, something has to give: the renderer may clip the table, shrink it below a readable size, or push it into a layout that no longer resembles the preview.

Three habits make this worse:

- **Too many columns.** Eight narrow columns are harder to read than four wider ones, even when the data is technically complete.
- **Paragraphs inside cells.** A cell that contains three sentences turns a scan-friendly table into a wall of text.
- **Unbounded code or URLs.** A single long token can set the minimum width for an entire column.

The fix is not a smaller font. It is a table with fewer jobs.

## Start with a table that fits

A useful table has one purpose and a small number of columns. The following example compares print themes without trying to document every CSS property:

```markdown
| Setting | Clean | Business | Academic |
| --- | :--- | :--- | ---: |
| Body type | Sans | Serif | Justified serif |
| Best for | Specs | Reports | Course readers |
| Tone | Neutral | Formal | Editorial |
```

That table fits comfortably on A4 and Letter. It also survives translation, because the cells are short. The alignment markers are optional, but they make the source easier to scan: `:---` for left, `:---:` for center, and `---:` for right-aligned numbers.

Use alignment for meaning, not decoration. Numbers read better right-aligned; short labels read better left-aligned. Center alignment is rarely necessary and can make a column harder to scan.

## Choose columns by the question, not the data

Before adding a column, ask what question the table answers. A migration table might answer "what changes, and what do I do about it?" That produces three columns: the item, the change, and the action. A database export with twelve fields is not a table for a PDF; it is a data dump.

A good test is to read the header row aloud. If the headers do not form a coherent sentence or comparison, the table is probably carrying too much. Split it, or move the detail into prose.

For wide reference data, consider a two-column definition list instead:

```markdown
| Field | Meaning |
| --- | --- |
| `owner` | GitHub user or organization |
| `repo` | Repository name without the host |
| `ref` | Branch, tag, or commit SHA |
```

This format is easier to print and easier to translate than a grid with one column per locale or one column per edge case.

## Keep cells short and scannable

Tables are for comparison, not for exposition. If a cell needs more than two short sentences, move the explanation below the table and leave a summary in the cell.

Practical rules:

1. **Use sentence fragments.** "Requires a public repository" is enough; you do not need a full paragraph.
2. **Put units in the header.** Write `Size (MB)` once instead of repeating "MB" in every row.
3. **Avoid line breaks inside cells.** GFM supports `<br>`, but a cell with forced breaks rarely paginates well.
4. **Keep links short.** Link a short label, not a full URL. Long URLs become unbreakable tokens.
5. **Do not rely on color.** A PDF may be printed in black and white, and themes change the palette.

If a cell must contain a long command or path, put it in a fenced code block below the table and refer to it by name. That keeps the grid narrow.

## Handle wide data before export

Some tables are genuinely wide. When you cannot remove columns, change the shape of the document rather than fighting the page.

**Split by audience.** A table for operators does not need the same columns as a table for developers.

**Split by time.** A changelog table with twenty releases can become one table per major version.

**Transpose the data.** If there are many attributes and few items, list the attributes as rows and the items as columns. The table becomes tall instead of wide, which paginates better.

**Move to a list.** If most cells are empty or repetitive, the table is hiding a list. Prose with subheadings is often clearer.

After restructuring, check the source again for the two common width offenders: a long unbroken URL and a code span with no spaces. Both can force a column wider than the page.

## Check pagination and repeated headers

A table that fits on one page can still fail when it spans two. The header row should repeat, rows should not split mid-cell, and the table should not begin at the very bottom of a page with only one row visible.

The browser print engine and the book PDF renderer handle pagination differently, so check the actual output rather than assuming. In a single-document print, look for a repeated `<thead>` and avoid page breaks immediately before a table. In a book export, the A4 renderer lays out rows in sequence; a very tall row can still create an awkward page.

If a table spans pages, add a short caption above it that names the columns. The caption gives the reader context when the header is on the previous page. Keep the caption in plain prose, not inside the table.

## A pre-export checklist

Before you print or export, run through this list:

- The table has a single purpose and no more than five or six columns.
- Every header is short and includes its unit where relevant.
- Cells contain fragments, not paragraphs.
- No cell contains a full URL or an unbroken token longer than the page.
- Alignment is applied to numbers and short labels, not everywhere.
- The table has a caption if it spans more than one page.
- You have checked the actual PDF, not only the browser preview.

For theme-specific behavior, see [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/). A serif theme with tighter margins may need one fewer column than the default Clean theme.

Tables do not need to be beautiful. They need to be readable after they leave the browser. A narrower, shorter table with a clear caption will almost always beat a complete grid that the reader has to zoom to understand.

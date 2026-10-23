---
title: "Markdown Code Blocks in PDF: Fences, Long Lines, and Page Breaks"
description: "How to write fenced code that stays readable in a PDF, including language tags, line width, manual wrapping, theme choice, and print review."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Markdown", "Code", "PDF", "Layout"]
locale: "en"
translationKey: "markdown-code-blocks-to-pdf"
---

Code is where a Markdown document most often looks fine on screen and falls apart on paper. A line that fits a wide monitor can run past the right margin of an A4 page. A fenced block can land at the bottom of a page with two lines on one side and the rest on the next. And a block without a language tag can render differently from the one next to it.

md2pdf renders fenced code as preformatted text inside the print layout. It does not add syntax highlighting, and it does not reflow source code to fit the page. That is a deliberate limitation: changing code to make it fit can change its meaning. The practical approach is to prepare the source so the printed block is readable without transformation.

This guide covers fenced blocks, language tags, line length, themes, and the checks that catch problems before you send the PDF. For the end-to-end workflow, start with [How to convert a GitHub README to PDF](/blog/github-readme-to-pdf/).

## What the converter does with a fence

GitHub-flavored Markdown supports fenced code blocks delimited by three or more backticks or tildes. md2pdf parses those fences, preserves the text exactly, and renders it in a `<pre><code>` element. The language tag after the opening fence is kept as a class name, but the current renderer does not apply a syntax-highlighting theme.

That means two things:

- Indentation, blank lines, and punctuation survive.
- The visual result is monospaced text with the theme's code background and border, not colored tokens.

If a document depends on color to explain a diff, add a short caption or use `+` and `-` markers in the source. Do not assume the reader can distinguish green from red in a printed copy.

## Use fenced blocks, not indentation

Four-space indentation also creates a code block in Markdown, but fences are easier to control. They make the start and end explicit, they support a language tag, and they do not break when a line inside the block happens to be indented.

A simple fenced block:

```bash
npm install
npm run build
npm test
```

Use a fence longer than any run of backticks inside the content. If the code contains triple backticks, open and close with four. This is especially relevant for documentation about Markdown itself, where a fence may be part of the example.

Avoid mixing tabs and spaces inside the block. The renderer preserves what you wrote, and inconsistent indentation looks like a bug even when the code is correct.

## Tag the language even without highlighting

A language tag is still useful when there is no syntax highlighting. It documents the intended language, helps editors and linters, and gives translators a clear signal that the block must not be translated. It also makes the source easier to search.

Common tags are `bash`, `js`, `ts`, `json`, `yaml`, `python`, `html`, `css`, `sql`, and `text`. Use `text` for output, logs, directory trees, and anything that is not a programming language. A plain fence with no tag is acceptable for a short snippet, but a tag is better for anything a reader may copy.

Do not tag a block with a language just because the highlighter recognizes it. Tag what the content actually is. A shell transcript that contains a prompt and output is `text`, not `bash`, unless the prompt is part of the command.

## Keep lines within a printable width

The most common print failure is a code line that is wider than the page. In the browser preview, the block may scroll horizontally. On paper, there is no scrollbar, so the line is clipped or the whole block shrinks.

There is no single character limit that works for every font and page size, but a practical target for A4 or Letter is around 80 to 90 characters. That is close to the classic terminal width for a reason: it keeps monospaced text comfortable to read.

When a line is too long, change the source rather than the print scale:

```js
const message = buildMessage({ owner, repo, branch, path });
```

That line is readable. If the object had eight more properties, split it across lines:

```js
const message = buildMessage({
  owner,
  repo,
  branch,
  path,
});
```

For shell commands, use a backslash continuation or a variable. For long URLs, put the URL on its own line or use a link reference. For JSON, let the formatter wrap the object. The goal is the same in every case: no line that depends on horizontal scrolling.

## Decide how to handle output and logs

Logs and command output are often wider than source code. They also contain timestamps, paths, and identifiers that cannot be wrapped without changing the text.

Options that work in print:

- **Trim the output.** Show the relevant lines and add an ellipsis in prose, not inside the code block.
- **Split the transcript.** Put the command in one block and the important output in another, with a sentence between them.
- **Use a table for structured output.** If the output is really rows and columns, a table may print better than a monospaced block.
- **Reduce the font size only as a last resort.** Theme changes affect the whole document, and tiny code is harder to read than a shorter example.

Do not paste a 200-line log into a PDF unless the log is the document. A reader who needs the full log can use the repository; the PDF should show the signal.

## Match code treatment to the theme

The four print themes treat code differently. Clean uses a light code background and neutral type. Business uses a darker code block that contrasts with its serif body. Academic keeps code light and secondary to the prose. Dark is a screen-first theme whose print stylesheet forces light ink and a light code background.

Two practical consequences:

1. **Check contrast in the actual theme.** A code block that looks fine in Clean may feel heavy in Business or too faint in Academic.
2. **Enable background graphics when printing.** Without them, the code background disappears and the block relies on its border. The text is still readable, but the visual separation is weaker.

If the document is mostly code, Clean is usually the safest choice. If it is a report with a few snippets, Business can work, but keep the snippets short. For a full comparison, see [Clean vs Business vs Academic vs Dark](/blog/readme-pdf-print-themes/).

## Review the printed page

Open the saved PDF and inspect every code block, not just the first one. Look for:

- **Clipped lines.** Zoom in on the right edge. A line that ends mid-token is a sign that the block is too wide.
- **Orphaned fences.** A block should not start with one line at the bottom of a page. If it does, add a sentence before it or adjust the surrounding content.
- **Broken indentation.** Tabs and spaces should look consistent. A copied block with mixed indentation is a source problem, not a renderer problem.
- **Lost blank lines.** Blank lines inside a block are meaningful. Confirm that the PDF preserves them.
- **Unreadable contrast.** Print a page in grayscale if the document may be photocopied.
- **Language tags in captions.** If the tag matters to the reader, mention the language in the prose. The tag itself is not displayed as a label.

A final check with a different browser is useful if the document will be distributed widely. Print engines differ in how they handle page breaks and background graphics, even when the HTML is the same.

Code blocks are the part of a Markdown document most likely to be copied into another tool. Keep them short, keep them accurate, and keep them inside the page. The PDF does not need to reproduce an IDE; it needs to let a reader understand and reuse the snippet. For more on what stays local during conversion, see [Browser-only Markdown to PDF](/blog/browser-only-markdown-to-pdf/).

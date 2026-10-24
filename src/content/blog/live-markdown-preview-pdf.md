---
title: "Inspect Markdown in Real Time with Live PDF Preview"
description: "How md2pdf's live preview renders GitHub-flavored Markdown, sanitizes HTML, isolates print styles, and reflects formatting changes instantly."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Markdown","Preview","HTML","Security"]
locale: "en"
translationKey: "live-markdown-preview-pdf"
---

Exporting a PDF without a visual preview is an exercise in guesswork. You tweak a table column, click export, wait for compilation, open an external PDF viewer, and discover that a heading is orphaned at the bottom of page three. Repeating that loop for every paragraph edit wastes valuable time.

md2pdf solves this with a real-time, side-by-side preview pane. As you type, paste, or import Markdown, the preview window continuously renders the formatted output with print stylesheets applied. What you inspect on screen matches the geometry, fonts, margins, and layout of the printed PDF.

This guide explores how the live preview engine functions, how DOMPurify safeguards against malicious inputs, and how to verify print readiness. For local drafting tips, read [Paste and edit Markdown for quick PDF generation](/blog/markdown-editor-paste-pdf/).

## Why live preview matters for print-bound documents

Web browsers and PDF print engines interpret CSS layout rules differently. A standard browser viewport flows continuously, but a printed document has rigid boundaries:

- **Page-break constraints**: Tables, images, and code snippets must respect physical paper heights.
- **Font fidelity**: Typographic hierarchies must remain legible at 300 DPI print resolutions.
- **Margin boundaries**: Elements that extend beyond margins are clipped rather than scrolled.

Having a live preview that applies print simulation CSS lets you identify layout flaws before invoking the system print dialog.

## How the client-side preview pipeline renders Markdown

The rendering pipeline in md2pdf transforms Markdown text into styled DOM nodes within milliseconds:

```javascript
const rawHtml = markdownParser.render(markdownSource);
const cleanHtml = DOMPurify.sanitize(rawHtml, sanitizeConfig);
previewElement.innerHTML = cleanHtml;
applyHeadingAnchors(previewElement);
```

The parser adheres to the CommonMark and GitHub-Flavored Markdown specifications, supporting strikethrough, autolinks, nested task lists, and syntax-highlighted code blocks.

## HTML sanitization and safety filters

When pasting Markdown from untrusted sources or public GitHub repositories, security is paramount. Markdown allows raw HTML blocks, which could expose users to Cross-Site Scripting (XSS) vectors.

md2pdf routes every rendered string through DOMPurify with strict rules:

- **Stripped tags**: `<script>`, `<iframe>`, `<object>`, and `<form>` tags are destroyed.
- **Attribute scrubbing**: `onclick`, `onload`, and other JavaScript event handlers are stripped.
- **Protocol validation**: Links starting with `javascript:` or `data:text/html` are rejected.
- **Allowed markup**: Only formatting tags (such as `<b>`, `<code>`, `<table>`, `<img>`) with safe attributes are retained.

This sanitization occurs entirely in your browser before nodes are inserted into the preview document.

## Previewing print themes and theme transitions

md2pdf offers four distinct print themes: Clean, Business, Academic, and Dark. Switching themes in the toolbar instantly updates the preview pane CSS classes:

- **Clean**: Crisp modern typography utilizing system sans-serif fonts.
- **Business**: Structured technical layout with subtle borders and clear section dividers.
- **Academic**: Formal serif typography with numbered headings and compact line spacing.
- **Dark**: High-contrast screen theme that automatically converts to an ink-friendly light palette for printing.

For an in-depth review of each theme's typography, see [Guide to md2pdf print themes](/blog/readme-pdf-print-themes/).

## Differences between screen preview and print output

While the preview closely mimics print output, a few minor distinctions exist between your monitor and physical paper:

- **Viewport width**: The preview adapts responsively to your browser window, while print output locks to standard paper dimensions (A4, Letter, Legal).
- **Page breaks**: Continuous web preview displays document flow, whereas the print engine divides content into physical pages based on CSS `break-inside: avoid`.
- **System color calibration**: Screen RGB colors may print slightly darker on physical toner or inkjet paper.

## Diagnosing preview rendering glitches

- **Preview stops updating**: Check the editor for unclosed HTML tags or massive inline data URIs that might delay DOM rendering.
- **Tables overflowing horizontally**: Wide tables with many columns may extend past the preview margin. Refer to [Markdown tables to PDF](/blog/markdown-tables-to-pdf/) for column-wrapping strategies.
- **Missing images in preview**: Ensure image paths are absolute HTTPS URLs or use the [GitHub README importer](/blog/github-readme-to-pdf/) to automatically resolve repository-relative paths.

Inspect your documents in real time and export with confidence using [md2pdf](/#converter).

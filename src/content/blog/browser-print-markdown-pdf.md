---
title: "Master Browser Print Settings for Perfect Markdown PDFs"
description: "A comprehensive guide to browser print dialog settings for Markdown: margins, paper sizes, background graphics, headers, and footers."
pubDate: 2026-10-24
author: "Girish Lade"
tags: ["Print","Browser","CSS","PDF"]
locale: "en"
translationKey: "browser-print-markdown-pdf"
---

A beautifully rendered Markdown document in your browser window can still emerge from the printer looking terrible if your browser print dialog is misconfigured. Unwanted dates in the margin, truncated code blocks, missing background highlights, or distorted margins are rarely caused by the Markdown itself—they stem from browser print defaults designed for printing general web pages rather than formal publications.

md2pdf uses client-side CSS print media queries (`@media print`) combined with your browser's native print engine. When you click print, the browser applies our print stylesheets, stripping navigation chrome, isolating content, and managing pagination. However, final control over margins, paper size, and background colors remains in your hands inside the print modal.

This guide explains how to configure Chrome, Firefox, Safari, and Edge print settings for optimal fidelity. To adjust visual styles before printing, see [Guide to md2pdf print themes](/blog/readme-pdf-print-themes/).

## Why browser print dialogs require careful configuration

Standard browser printing assumes you want a snapshot of a web page, automatically injecting the current date, page title, and URL into the margins. For a professional technical specification or client deliverable, these browser artifacts look unprofessional.

Furthermore, browsers default to disabling background colors to save physical printer ink. In a technical document, disabling background graphics strips syntax highlighting backgrounds, table header shading, and callout boxes, severely degrading readability.

Understanding how to toggle these settings transforms a raw browser print into a clean, publication-grade PDF.

## Essential print settings: Paper size, margins, and scaling

When the system print modal appears, configure these primary options:

- **Destination**: Choose **Save as PDF** (or Microsoft Print to PDF).
- **Paper Size**: Select **A4** (international standard) or **Letter** (North American standard) based on your target audience.
- **Orientation**: Keep **Portrait** for standard text. Switch to **Landscape** only for documents dominated by wide data tables.
- **Margins**: Select **Default** or **None**. Because md2pdf's CSS stylesheets already embed precise print padding, selecting "Minimum" or custom small margins can cause text to push too close to the paper edge.
- **Scale**: Keep at **100%** (Default). Avoid scaling down below 90% as it compromises font legibility.

## Enabling background graphics for theme fidelity

The most critical toggle in your browser print window is **Background graphics**:

```text
[x] Background graphics (Chrome, Edge, Opera)
[x] Print Backgrounds (Firefox)
[x] Print backgrounds (Safari)
```

When checked:

- Code block backgrounds and syntax highlights render cleanly.
- Alternating zebra stripes and header backgrounds in tables remain visible.
- Badge indicators and callout boxes retain their visual distinction.
- Print theme accents (such as Business theme dividers or Academic borders) are preserved.

If you omit this setting, all code blocks will print with transparent backgrounds, making it difficult to distinguish code from prose.

## Suppressing unwanted browser headers and footers

By default, browsers add their own metadata stamps:

- Header: Page title and current date.
- Footer: Webpage URL and page numbering (e.g., "1/4").

In your print dialog, uncheck **Headers and footers**:

```text
[ ] Headers and footers (Uncheck to remove browser URL and date)
```

Unchecking this box allows md2pdf's custom footer pagination to take precedence, ensuring your printed pages feature clean page numbers without exposing internal URLs or timestamps.

## Page-break control across headings, tables, and code

md2pdf embeds automated CSS page-break rules to prevent awkward layout splits:

```css
h1, h2, h3 { break-after: avoid; }
pre, table, figure { break-inside: avoid; }
```

- **Orphan heading prevention**: Headings will never appear stranded as the last line on a page; they automatically move to the top of the next sheet alongside their following paragraph.
- **Code block integrity**: Fenced code blocks resist splitting across pages unless a single snippet exceeds the full height of a page.
- **Table rows**: Table rows avoid splitting mid-sentence across page folds.

## Browser-specific printing quirks and fixes

- **Google Chrome & Edge**: Deliver the most consistent vector PDF output. Ensure "Background graphics" is enabled and "Headers and footers" is disabled.
- **Mozilla Firefox**: Sometimes applies slightly tighter default margins. Set margins to "Default" rather than "None" if headers clip.
- **Apple Safari**: Select "Show Details" in the print sheet to reveal the "Print backgrounds" checkbox.

Configure your print settings and produce flawless documents using [md2pdf](/#converter).

---
title: "Embedding Multilingual Unicode Fonts in Markdown PDFs without Tofu"
description: "Learn how md2pdf embeds Unicode fonts via fontkit and pdf-lib to render CJK characters, Cyrillic, Turkish, and Latin accents without missing glyphs."
pubDate: 2026-03-24
tags: ["markdown","fonts","multilingual","pdf"]
locale: "en"
translationKey: "multilingual-markdown-pdf-fonts"
---

A major flaw in basic Markdown-to-PDF converters is font corruption when processing international text. When a PDF engine encounters Chinese, Japanese, Korean (CJK), Cyrillic, or accented Latin glyphs without font embedding, it renders empty boxes—commonly called "tofu". With [md2pdf](/#converter), full Unicode font embedding ensures that multilingual technical documentation renders crisply across all devices.

This article explains how client-side font embedding works with `pdf-lib` and `@pdf-lib/fontkit`, how subsetting optimizes file sizes, and how font fallback chains prevent missing glyphs.

## The Challenge of Unicode Typography in Portable Documents

Standard PDF specifications only include a tiny set of basic 14 core fonts (like Helvetica and Times Roman), which only support basic ASCII and Western European characters.

- **The Tofu Problem**: Unmapped Unicode codepoints display as blank rectangles (□).
- **CJK Complexity**: Chinese, Japanese, and Korean character sets contain tens of thousands of glyphs, making full-weight font embedding excessively heavy.
- **Accents and Diacritics**: Turkish (ç, ğ, ı, ö, ş, ü) and Slavic Cyrillic alphabets require specific code page support to maintain legibility.

```text
Multilingual Glyph Coverage in md2pdf:
- Latin & Extended Latin: English, Spanish, French, Portuguese, Turkish
- Cyrillic Alphabets:     Russian, Ukrainian, Bulgarian
- East Asian Ideographs:  Simplified Chinese (简体中文), Japanese (日本語)
- Hangul Syllables:       Korean (한국어)
```

## High-Performance Font Embedding with @pdf-lib/fontkit

md2pdf utilizes `@pdf-lib/fontkit` to parse TrueType (TTF) and OpenType (OTF) font tables directly inside your browser:

1. **Client-Side Font Loading**: High-quality open-source typefaces (including Noto Sans, Source Han Sans, and Roboto Mono) are fetched on-demand based on document language detection.
2. **Custom Glyph Mapping**: `fontkit` inspects the character stream in your Markdown content and matches each codepoint to its exact vector outline in the font table.
3. **PDF Font Embedding**: `pdf-lib` embeds the vector outlines into the final document structure, making the PDF completely self-contained.

## Eliminating Tofu Across All Nine Supported Locales

md2pdf provides native typographic support across nine major languages:

- **English, Spanish, French, Portuguese**: Crisp Latin typography with complete support for acute, grave, circumflex, tilde, and cedilla accents.
- **Turkish**: Flawless rendering of dotted and dotless "i" (`İ` / `i`, `I` / `ı`) and specialized diacritical consonants.
- **Russian (Cyrillic)**: Balanced Cyrillic proportions matching the aesthetic of Latin headings.
- **Japanese, Chinese, and Korean**: Comprehensive CJK font support ensuring complex ideographs and Hangul syllables render with balanced spacing.

## Self-Contained Offline Portability

Because fonts are directly embedded into the PDF file binary:

The generated document looks identical on every operating system, mobile device, or PDF reader, even if the viewer's computer has no Asian or Cyrillic fonts installed.

## Generating Multilingual Documentation in md2pdf

Whether you are converting a Japanese API reference, a Russian architecture guide, or a localized multilingual handbook, md2pdf handles typography automatically. Simply paste or import your content, and export a high-fidelity PDF with zero glyph corruption.

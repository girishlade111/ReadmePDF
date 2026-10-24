---
title: "Resolving Relative Images and Links in Markdown for PDF Conversion"
description: "Learn how md2pdf resolves relative image paths and cross-document markdown links into high-resolution embedded graphics and internal PDF bookmarks."
pubDate: 2026-03-24
tags: ["markdown","images","links","pdf"]
locale: "en"
translationKey: "markdown-relative-images-links-pdf"
---

Markdown documents in source code repositories rely heavily on relative paths. Architecture diagrams live in `./assets/diagram.png`, screenshots reside in `../images/screen.jpg`, and cross-chapter links point to `./getting-started.md`. If a converter does not resolve relative paths against the repository context, images fail to load and links break. With [md2pdf](/#converter), relative paths are resolved and embedded seamlessly.

This article details how md2pdf parses relative paths, fetches remote image assets client-side, and transforms local document links into internal PDF destinations.

## The Problem with Relative Paths in Static Markdown

Markdown files are designed to live alongside local folders in a file system or GitHub web interface:

- **Broken Image Placeholders**: A relative reference like `![Architecture](images/arch.png)` fails when extracted without path context.
- **Dead Cross-Document Links**: Links pointing to neighboring files (`[Setup](setup.md)`) lead nowhere once converted into a static PDF.
- **Traversing Parent Directories**: References containing `../` require relative tree computation to find the correct asset.

```text
Relative Path Resolution Matrix:
Base Document:  docs/guides/installation.md
Image Path:     ../assets/diagram.png
Resolved Asset: docs/assets/diagram.png (Fetched & Inlined)

Link Path:      ./configuration.md
Resolved Link:  Internal PDF Anchor -> Chapter: Configuration
```

## Resolving Image Assets from Repositories

When importing documentation from GitHub, md2pdf tracks the directory path of each Markdown document:

1. **Path Normalization**: Relative paths like `../../images/flow.png` are calculated against the active file's directory.
2. **Raw Asset Fetching**: md2pdf constructs the authenticated or public raw asset URL on GitHub's content delivery network.
3. **In-Memory Conversion**: Images are fetched directly into browser memory, converted to data buffers, and embedded into the PDF using `pdf-lib`.
4. **Format Compatibility**: Standard web image formats (PNG, JPEG, WebP, SVG) are processed with automatic aspect-ratio preservation.

## Transforming File Links into Internal PDF Destinations

Technical document collections rely on extensive cross-referencing between chapters:

- **Local Link Detection**: md2pdf inspects anchor tags targeting `.md` files and maps them against the compilation queue.
- **Destination Anchors**: When the target file is included in your book compilation, md2pdf replaces the external URL with an internal PDF destination link.
- **External Fallbacks**: If the linked file was not selected for inclusion in the PDF book, md2pdf rewrites the link to point to the live GitHub repository page.

## Handling Local File Uploads with Associated Assets

When uploading local Markdown files, md2pdf supports drag-and-drop file bundles:

You can select a Markdown document alongside its associated image assets in the file picker. md2pdf maps local asset names to relative Markdown references in-memory, ensuring your local diagrams render without requiring external hosting.

## Generating PDFs with Reliable Visuals and Links

Resolving images and links eliminates broken formatting and dead ends. When you export with md2pdf, diagrams render at crisp print resolution and cross-references navigate smoothly across your entire compiled technical volume.

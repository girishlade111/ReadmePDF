---
title: "Tri-State Folder Selection for Compiling Markdown PDF Books"
description: "Learn how tri-state checkbox controls and directory-level selection in md2pdf make compiling complex multi-folder Markdown documentation into a PDF effortless."
pubDate: 2026-03-24
tags: ["markdown","pdf","book","documentation"]
locale: "en"
translationKey: "markdown-folder-selection-book"
---

When transforming multi-folder documentation into a single PDF book, selecting or deselecting dozens of individual files by hand is inefficient. A user needs the ability to toggle entire directories with a single click while maintaining granular control over individual chapters. With [md2pdf](/#converter), tri-state folder selection checkboxes make assembling customized technical handbooks intuitive and reliable.

This guide explains how directory-level checkboxes function, how tri-state status indicators work, and how to compile multi-directory Markdown trees into structured PDF volumes.

## Understanding the Three States of Directory Checkboxes

In hierarchical file management, a binary checked/unchecked model cannot accurately describe partial selections. md2pdf implements a standard tri-state checkbox model:

1. **Checked (All Selected)**: Every Markdown file in the folder and all its nested subdirectories is currently marked for export.
2. **Indeterminate / Partial (Some Selected)**: Some files within the folder hierarchy are selected, while others are excluded.
3. **Unchecked (None Selected)**: No files in this directory or its subdirectories are marked for export.

```text
Tri-State Folder Hierarchy:
[-] docs/guides/             (Indeterminate: partially selected)
    [x] getting-started.md   (Selected)
    [ ] advanced-config.md   (Excluded)
[x] docs/api/                (Checked: all files selected)
    [x] endpoints.md         (Selected)
    [x] authentication.md    (Selected)
```

## Cascading Selection Logic

Toggling a directory checkbox triggers automatic cascading logic throughout the tree:

- **Downwards Propagation**: Clicking an unchecked folder marks all of its descendant files and subfolders as checked. Clicking a checked or indeterminate folder deselects all descendants immediately.
- **Upwards Bubble-Up**: Selecting or deselecting an individual child file recalculates the state of all ancestor directories up to the root. If all sibling files become checked, the parent folder automatically switches to the checked state.
- **Visual Feedback**: The indeterminate dash indicator immediately signals that a folder contains mixed selections without requiring you to expand the folder node.

## Crafting Curated Documentation Handbooks

Tri-state folder controls allow you to compose highly specific technical documents in seconds:

- **Module-Specific Handbooks**: Select only the `api/` and `sdk/` directories to produce an external developer guide while excluding internal `admin/` and `ops/` runbooks.
- **Auditing Packages**: Select an entire compliance folder, uncheck draft proposals, and immediately generate a verified audit PDF.
- **Onboarding Guides**: Combine the root `README.md` with a curated subset of introductory tutorials from `tutorials/getting-started/`.

## Preserving Structure During PDF Compilation

When you compile selected folders into a multi-file PDF book, md2pdf maintains the logical hierarchy in the output:

- **Nested Table of Contents**: Folders naturally form top-level parts or sections, while individual Markdown files become structured chapters.
- **Sequential Page Numbering**: The generated PDF applies continuous, uninterrupted page numbers across all included files.
- **Clean Section Dividers**: Page breaks are automatically inserted between documents to ensure professional presentation.

## Exporting Your Curated Book

Once your folder selections are complete, click the compile button to render your document. Your tailored selection is converted into a publication-quality PDF book with crisp typography and clickable internal navigation.

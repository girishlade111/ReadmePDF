# md2pdf — Editorial Manifest & Verified Feature Inventory

Last updated: 2026-10-24
Product: **md2pdf**
Brand: **LadeStack** (`https://ladestack.in`)
Founder & Creator: **Girish Lade** (`admin@ladestack.in`)

---

## 1. Verified Feature Inventory (20 Distinct Features + 1 Editorial Use-Cases Guide)

Every feature below is implemented in client-side code and covered by automated regression tests in `test/`. No speculative or unverified capabilities are published. Every single feature has its own dedicated, authoritative guide in all 9 supported languages.

| Feature ID | Feature Name | Core Implementation Files | Description | Dedicated Guide |
|---|---|---|---|---|
| `feat-file-upload` | Local Markdown File Upload | `src/scripts/converter.js`, `src/lib/sanitize.js` | Direct client-side Markdown file ingestion via File API and drag-and-drop. Zero server transmission. | `markdown-file-upload-to-pdf` |
| `feat-editor-paste` | Markdown Paste & Live Editing | `src/scripts/converter.js`, `src/lib/markdown.js` | In-browser textarea editing, sample loading, character/word counters, and instant PDF compilation. | `markdown-editor-paste-pdf` |
| `feat-live-preview` | Live Split-Screen Markdown Preview | `src/scripts/converter.js`, `src/lib/markdown.js` | Synchronized side-by-side Markdown rendering, layout proofing, and DOMPurify sanitization. | `live-markdown-preview-pdf` |
| `feat-github-import` | Public GitHub README Import | `src/lib/github/urls.js`, `src/lib/github/content.js` | Direct README fetch from public GitHub repos with default-branch discovery and relative asset rewriting. | `github-readme-to-pdf` |
| `feat-repo-tree` | GitHub Repository Tree Exploration | `src/lib/github/discovery.js`, `src/scripts/book-explorer.js` | Recursive Git tree traversal, nested directory navigation, and Markdown file discovery. | `github-repository-markdown-tree` |
| `feat-git-refs` | Branch, Tag & Commit Ref Pinning | `src/lib/github/references.js`, `src/lib/github/urls.js` | Branch switching, release tag targeting, and immutable commit SHA resolution for versioned docs. | `github-branch-tag-commit-pdf` |
| `feat-file-search` | Markdown File Search & Path Filtering | `src/lib/selection.js`, `src/scripts/book-explorer.js` | Real-time in-memory path matching, directory subtree filtering, and fast selection. | `markdown-file-search-filter` |
| `feat-tri-state` | Tri-State Folder Selection | `src/lib/selection.js`, `src/scripts/book-explorer.js` | Cascading directory checkboxes with checked, unchecked, and indeterminate partial states. | `markdown-folder-selection-book` |
| `feat-chapter-order` | Chapter Sequencing & Reordering | `src/lib/selection.js`, `src/scripts/book-explorer.js` | Custom chapter queuing, up/down shifting, auto-sorting, and structural heading normalization. | `chapter-sequencing-reordering-pdf` |
| `feat-book-builder` | Multi-File Combined PDF Book | `src/scripts/book-explorer.js`, `src/lib/pdf/assembly.js` | Stitching multi-chapter documentation into unified PDF volumes with continuous page numbering. | `multi-file-markdown-book` |
| `feat-cover-page` | PDF Book Cover-Page Generation | `src/lib/pdf/assembly.js`, `src/styles/app.css` | Automatic title sheet synthesis with document title, subtitle, author, and generation timestamp. | `markdown-pdf-cover-page` |
| `feat-table-of-contents` | Hierarchical Table of Contents | `src/lib/markdown.js`, `src/lib/pdf/assembly.js` | Auto-generated TOC for documents with 3+ headings (H1-H4) and clickable PDF bookmarks. | `markdown-table-of-contents-pdf` |
| `feat-print-themes` | Four Curated Print Themes | `src/styles/app.css`, `src/styles/blog.css` | Clean (sans-serif), Business (serif), Academic (justified), and Dark (screen contrast with print fallback). | `readme-pdf-print-themes` |
| `feat-code-blocks` | Monospace Code Blocks & Syntax | `src/styles/app.css`, `src/lib/markdown.js` | Fenced code blocks (`<pre><code>`), syntax language tags, print page-break containment. | `markdown-code-blocks-to-pdf` |
| `feat-tables` | GFM Table Rendering & Scaling | `src/styles/app.css`, `src/lib/markdown.js` | GitHub-flavored Markdown tables with column alignments, responsive widths, and print border styles. | `markdown-tables-to-pdf` |
| `feat-relative-assets` | Relative Images & Links Resolution | `src/lib/github/content.js`, `src/lib/pdf/assembly.js` | Computing relative paths, fetching raw assets client-side, and transforming relative links to PDF anchors. | `markdown-relative-images-links-pdf` |
| `feat-zip-export` | Individual PDF ZIP Export | `src/lib/pdf/export.js`, `JSZip` | Compiling multiple Markdown files into standalone PDFs packaged into a single client-side ZIP file. | `markdown-zip-pdf-export` |
| `feat-browser-print` | Native Browser Printing | `src/lib/print.js`, `src/styles/app.css` | Leveraging native browser print dialog, `@media print` CSS, and hardware-accelerated PDF rendering. | `browser-print-markdown-pdf` |
| `feat-multilingual-fonts` | Multilingual Unicode Fonts | `src/lib/pdf/fonts.js`, `@pdf-lib/fontkit` | Full Unicode font embedding for CJK (Chinese, Japanese, Korean), Cyrillic, Turkish, and Latin accents. | `multilingual-markdown-pdf-fonts` |
| `feat-converter-privacy` | Browser-First Privacy & Zero Uploads | `src/lib/sanitize.js`, `src/scripts/converter.js` | 100% browser-side processing, no accounts, zero tracking, strict DOMPurify HTML sanitization. | `browser-only-markdown-to-pdf` |
| `feat-use-cases` | Developer & Team Documentation Workflows | `src/lib/pdf/export.js`, `src/lib/print.js` | Practical publishing workflows for developers, technical writers, course packs, and offline runbooks. | `readme-to-pdf-use-cases` |

---

## 2. Complete Multilingual Matrix (21 Articles × 9 Locales = 189 Files)

Every article key exists in **all 9 supported languages** (`en`, `es`, `ja`, `ko`, `zh`, `ru`, `tr`, `fr`, `pt`) with 100% heading structure parity, identical code blocks, identical external URLs, and consistent metadata:

| Translation Key | en | es | ja | ko | zh | ru | tr | fr | pt |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `browser-only-markdown-to-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `browser-print-markdown-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `chapter-sequencing-reordering-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `github-branch-tag-commit-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `github-readme-to-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `github-repository-markdown-tree` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `live-markdown-preview-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-code-blocks-to-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-editor-paste-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-file-search-filter` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-file-upload-to-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-folder-selection-book` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-pdf-cover-page` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-relative-images-links-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-table-of-contents-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-tables-to-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-zip-pdf-export` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `multi-file-markdown-book` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `multilingual-markdown-pdf-fonts` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `readme-pdf-print-themes` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `readme-to-pdf-use-cases` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Total published article files: **189 files** (21 keys × 9 locales).
Total static site routes: **216 routes** (27 static landing/about/blog pages + 189 article routes).
Total sitemap URLs: **216 URLs** with **2,160 reciprocal alternates**.

---

## 3. Editorial Review Status

- **English (`en`)**: Primary authoritative source copy authored by Girish Lade for md2pdf / LadeStack. Reviewed against UI and source code capabilities.
- **Localized Editions (`es`, `ja`, `ko`, `zh`, `ru`, `tr`, `fr`, `pt`)**: Full localized translations matching native search intent and verified against the automated structural parity test suite (`test/i18n.test.js`).
- **Verdict**: `B. IMPLEMENTED — EDITORIAL REVIEW PENDING` (awaiting DNS resolution and final native editorial review for non-English locales).

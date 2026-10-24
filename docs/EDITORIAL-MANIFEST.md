# md2pdf — Editorial Manifest & Verified Feature Inventory

Last updated: 2026-10-23
Product: **md2pdf**
Brand: **LadeStack** (`https://ladestack.in`)
Founder & Creator: **Girish Lade** (`admin@ladestack.in`)

---

## 1. Verified Feature Inventory

Every feature below is implemented in client-side code and covered by automated regression tests in `test/`. No speculative or unverified capabilities are published.

| Feature ID | Feature Name | Core Implementation Files | Description | Dedicated Guide |
|---|---|---|---|---|
| `feat-converter-browser` | Browser-Only Conversion & Privacy | `src/scripts/converter.js`, `src/lib/sanitize.js`, `src/lib/markdown.js` | 100% browser-based Markdown to PDF conversion. Uses markdown-it and DOMPurify. No accounts, no document uploads, no server rendering. | `browser-only-markdown-to-pdf` |
| `feat-github-import` | Public GitHub README Import | `src/lib/github/urls.js`, `src/lib/github/content.js`, `src/lib/github/references.js` | Direct README fetch from public GitHub repos. Default-branch discovery (`main`/`master`), commit/branch/tag ref resolution, relative image rewriting to `raw.githubusercontent.com`. | `github-readme-to-pdf` |
| `feat-code-blocks` | Monospace Code Blocks & Print Formatting | `src/styles/app.css`, `src/lib/markdown.js` | Preformatted fenced code blocks (`<pre><code>`), syntax language tags, print page-break containment, 80-90 character width guideline. | `markdown-code-blocks-to-pdf` |
| `feat-table-of-contents` | Automatic Table of Contents | `src/lib/markdown.js` (`extractHeadings`, `buildTocHtml`, `injectHeadingIds`) | Auto-generated TOC for documents with 3+ headings (H1-H4). Generates unique anchor IDs for in-page navigation and clickable PDF bookmarks. | `markdown-table-of-contents-pdf` |
| `feat-tables` | Markdown Tables to PDF | `src/styles/app.css`, `src/lib/markdown.js` | GitHub-flavored Markdown tables. Custom print styles for column widths, alignment (`:---`, `:---:`, `---:`), avoiding awkward cell splits across A4 pages. | `markdown-tables-to-pdf` |
| `feat-book-builder` | Multi-File Documentation Book | `src/scripts/book-explorer.js`, `src/lib/selection.js`, `src/lib/pdf/assembly.js` | Git Trees API explorer, tri-state checkboxes, chapter reordering, custom cover page, master table of contents, and print isolation. | `multi-file-markdown-book` |
| `feat-print-themes` | Four Curated Print Themes | `src/styles/app.css`, `src/styles/blog.css` | Clean (sans-serif neutral), Business (serif executive), Academic (justified formal), Dark (screen contrast with high-legibility print fallback). | `readme-pdf-print-themes` |
| `feat-use-cases` | Developer & Team Documentation Workflows | `src/lib/pdf/export.js`, `src/lib/print.js` | Practical documentation publishing for developers, technical writers, course packs, runbooks, offline archiving, and RFC reviews. | `readme-to-pdf-use-cases` |

---

## 2. Article-to-Feature Mapping Matrix

| Translation Key | Primary User Intent | Verified Implemented Capability | Associated Feature IDs | English Word Count / Structure |
|---|---|---|---|---|
| `browser-only-markdown-to-pdf` | Privacy, offline safety, data retention | Client-side File API upload, paste, sample, DOMPurify sanitization, network boundary transparency | `feat-converter-browser` | 120 lines, 7 H2s, 2 code blocks |
| `github-readme-to-pdf` | Exporting GitHub README to PDF | URL parsing, branch discovery, relative link & image rewriting, print trigger | `feat-github-import` | 148 lines, 7 H2s, 4 code blocks |
| `markdown-code-blocks-to-pdf` | Code formatting & legibility in PDF | Fenced code, language tags, line wraps, theme styling, page break controls | `feat-code-blocks` | 114 lines, 7 H2s, 3 code blocks |
| `markdown-table-of-contents-pdf`| Document navigation & structure in PDF | Dynamic heading extraction, anchor generation, TOC toggle, H1-H4 hierarchy | `feat-table-of-contents` | 130 lines, 7 H2s, 2 code blocks |
| `markdown-tables-to-pdf` | Wide tables formatting on A4/Letter | GFM tables, pipe syntax, column alignment, width management, header repetition | `feat-tables` | 113 lines, 7 H2s, 2 code blocks |
| `multi-file-markdown-book` | Multi-file book compiling & ZIP export | Tree explorer, chapter reordering, cover metadata, master TOC, ZIP export of PDFs | `feat-book-builder` | 142 lines, 7 H2s, 2 code blocks |
| `readme-pdf-print-themes` | Typography & aesthetic customization | Clean, Business, Academic, and Dark theme styling and print media queries | `feat-print-themes` | 134 lines, 6 H2s, 2 code blocks |
| `readme-to-pdf-use-cases` | Documentation distribution & archival | Offline reading, student notes, runbooks, client handoffs, regulatory archives | `feat-use-cases` | 158 lines, 7 H2s, 3 code blocks |

---

## 3. Multilingual Coverage Matrix

Every article key exists in **all 9 supported languages** with 100% heading structure parity, identical code blocks, identical external URLs, and consistent metadata:

| Translation Key | en | es | ja | ko | zh | ru | tr | fr | pt |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `browser-only-markdown-to-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `github-readme-to-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-code-blocks-to-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-table-of-contents-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `markdown-tables-to-pdf` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `multi-file-markdown-book` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `readme-pdf-print-themes` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `readme-to-pdf-use-cases` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Total published article files: **72 files** (8 keys × 9 locales).

---

## 4. Editorial Review Status

- **English (`en`)**: Primary authoritative source copy authored by Girish Lade. Reviewed against UI and source code limits.
- **Localized Editions (`es`, `ja`, `ko`, `zh`, `ru`, `tr`, `fr`, `pt`)**: Full localized translations matching native search intent and verified against the automated structural parity test suite (`test/i18n.test.js`). Editorial review by native speakers is recommended as an ongoing quality practice.

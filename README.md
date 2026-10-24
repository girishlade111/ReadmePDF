# md2pdf

**Free, no-login, client-side GitHub README → PDF converter & offline documentation workstation.** Paste a repository URL, preview rendered Markdown, assemble multi-chapter documentation books, save drafts locally with IndexedDB auto-save, and export print-ready PDFs — all processed directly in your browser.

> Built with **Astro 7.4.2** · Markdown by **markdown-it** · Sanitized with **DOMPurify** · PDFs by **pdf-lib + fontkit** · Local storage by **IndexedDB** · Tests on the **Node built-in test runner**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [IndexedDB History & Local Data Management](#indexeddb-history--local-data-management)
- [Design System](#design-system)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [SEO Modes and the Release Gate](#seo-modes-and-the-release-gate)
- [Usage](#usage)
- [Testing](#testing)
- [Privacy and Security](#privacy-and-security)
- [Deployment and Security Headers](#deployment-and-security-headers)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

md2pdf (developed by **LadeStack**, founded by **Girish Lade**) turns public GitHub repositories and local Markdown files into polished documents. It supports two primary workflows:

1. **Single document** — fetch a README, paste Markdown, or upload a local file, then preview, print, or export a single PDF.
2. **Documentation book** — scan a repository, select Markdown files in a searchable tree, reorder chapters, generate a cover and table of contents, print the assembled book, or download a ZIP of per-chapter PDFs.

There is zero application backend. Fetching, Markdown parsing, HTML sanitization, PDF layout, font embedding, image embedding, ZIP creation, and local history management all run exclusively within the user's browser sandbox.

### Why it exists

- Turn a repository README into a shareable PDF without an account, API token, or subscription.
- Assemble several documentation pages into a single printable handbook.
- Work securely and offline without uploading sensitive documentation drafts to remote servers.
- Maintain a versioned local history with auto-save and workspace restoration.

---

## Features

### GitHub import

- Accepts full URLs (`https://github.com/owner/repo`), protocol-less hosts, `owner/repo` shorthand, and tree/blob URLs (`/tree/main/docs`, `/blob/main/README.md`, raw URLs).
- Resolves the default branch through the unauthenticated GitHub API, with graceful fallbacks to `main` and `master`.
- Probes ten README filename candidates, including `.github/README.md`.
- Rewrites relative images to `raw.githubusercontent.com` and relative links to GitHub blob views.
- Traversal clamping at repository root; code blocks are never rewritten.

### Markdown workspace & live preview

- Paste Markdown, load the bundled sample, or upload `.md`, `.markdown`, or `.txt` files up to 2 MB.
- GitHub Flavored Markdown: tables, task lists, strikethrough, syntax-highlighted code blocks, and linkify.
- Live, debounced preview with an optional auto-generated table of contents for documents with three or more headings.
- Four print themes: **Clean**, **Business**, **Academic**, and **Dark** (dark theme lightens for print legibility).
- DOMPurify strips executable and unsafe elements (`script`, `style`, `iframe`, `object`, `form`); external links open in a new tab with `rel="noopener noreferrer"`.

### Documentation book builder

- Scans a repository via the Git Trees API with bounded fallbacks and completeness warnings.
- Searchable file tree with tri-state folder checkboxes, select-all, clear-selection, and per-file preview.
- Chapter ordering controls (move-up, move-down, remove) with a 30-chapter safety cap.
- Generates cover page, master table of contents, and sequentially numbered chapters.
- Cancellation-safe building and isolated print styles.

### PDF layout & ZIP export

- **Single document:** native browser Print → Save as PDF, isolated from UI chrome.
- **Book:** native browser print of the assembled cover, TOC, and chapters.
- **ZIP export:** direct download of one PDF per selected chapter, preserving repository folder paths and Unicode filenames (NFC-normalized).
- PDFs embed images, internal links, external URI annotations, and self-hosted fonts.
- Multi-script Unicode font coverage: DejaVu Sans/Mono (Latin, Cyrillic) and Noto Sans CJK SC (Simplified Chinese, Japanese, Korean).

### Multilingual localization & SEO

- Supported languages: English (`en`), Spanish (`es`), Japanese (`ja`), Korean (`ko`), Simplified Chinese (`zh`), Russian (`ru`), Turkish (`tr`), French (`fr`), and Brazilian Portuguese (`pt`).
- 216 static pages: 9 homepages, 9 book pages, 9 About pages, and 189 localized feature articles (21 translation keys across 9 locales).
- 417 translated dictionary keys per locale with 100% cross-lingual parity.
- Dedicated, localized About pages (`/about/` and `/{locale}/about/`) detailing product mission, LadeStack ownership, and founder Girish Lade.
- Full technical SEO: canonicals, 2,160 reciprocal hreflang alternates (including `x-default`), XML sitemap, and JSON-LD schemas.

---

## IndexedDB History & Local Data Management

md2pdf features a comprehensive, browser-local History Management System backed by W3C IndexedDB (`md2pdf-history-db`, version 1). Full architecture details and specifications are documented in [`docs/INDEXEDDB-HISTORY.md`](./docs/INDEXEDDB-HISTORY.md).

### Key Storage Capabilities

- **Debounced Auto-Save (~1s):** Automatically persists active Markdown editor drafts. An accessible status badge displays real-time state: `"Saving..."`, `"Saved locally"`, `"Unsaved changes"`, `"Auto-save off"`, `"Storage unavailable"`, or `"Save failed"`.
- **Automatic Session Restoration:** Restores in-flight drafts upon tab refresh or revisits, pre-filling the editor, theme settings, and repository context.
- **Versioned Snapshots:** Captures immutable historical checkpoints across manual saves (**Save Version**), file uploads, GitHub README imports, and Book Builder configurations.
- **Deduplication & Safety Limits:** Suppresses duplicate snapshots within 60 seconds; automatically prunes oldest unpinned records past 150 entries (LRU).
- **Accessible History Drawer:** Slide-over modal dialog (`role="dialog"`, `aria-modal="true"`) with keyboard trap, focus restoration, live storage quota bar (`navigator.storage.estimate`), category filters (All, Markdown, GitHub, Books, Exports), full-text search, and four sorting modes (Newest, Oldest, Recent, Pinned).
- **Card Actions:** Restore with unsaved-work confirmation, rename title, pin/unpin (exempts from pruning), view raw Markdown source with copy-to-clipboard, and delete.
- **Local Data Governance:** Clear All data with high-friction confirmation dialog, auto-save preference toggle, and zero server communication.
- **Secure Backup & Migration:** Export complete history as JSON (`md2pdf-history-backup-YYYY-MM-DD.json`). Import backup files with prototype pollution protection, strict schema validation, 25 MB file limit, and selectable Merge vs. Replace modes.
- **Multi-Tab Synchronization:** Uses `BroadcastChannel('md2pdf-sync')` to notify sibling tabs of storage changes and avoid cross-tab edit conflicts.

---

## Design System

The interface adheres to [`design.md`](./design.md) — a warm-neutral, shadow-free system:

- **A six-rung neutral ladder:** Sections are separated by subtle background rungs, avoiding box shadows.
- **One red:** `#c74634` on the md2pdf wordmark.
- **One action colour:** Warm charcoal `#312d2a`, inverting polarity on dark bands.
- **Two type registers:** Georgia for display headings, Inter for UI and reading prose.
- **Self-hosted typography:** Inter variable `woff2` files in `src/fonts/`; Georgia and Consolas use system stacks. Zero third-party web font calls.

---

## How It Works

```
Browser Sandbox
  1. Parse repository URL, local upload, or editor Markdown.
  2. Auto-save active draft to IndexedDB (md2pdf-history-db).
  3. Fetch GitHub metadata / tree / raw content when requested.
  4. Rewrite relative images and links to pinned raw URLs.
  5. Render GFM with markdown-it, extract headings and TOC.
  6. Sanitize the HTML using DOMPurify.
  7. Layout PDF with pdf-lib + fontkit and embed fonts/images.
  8. Bundle per-chapter PDFs into a ZIP with JSZip.
  9. Log export records and snapshots into local IndexedDB.
```

---

## Tech Stack

| Layer | Choice | Purpose |
| ----- | ------ | ------- |
| Framework | [Astro 7.4.2](https://astro.build) (`output: 'static'`) | Fast static site generation with zero unnecessary client JS |
| Local Storage | W3C IndexedDB (`src/lib/history/`) | Browser-local persistence for drafts, snapshots, exports, and preferences |
| Markdown | `markdown-it` + `markdown-it-task-lists` | Extensible GFM parser supporting tables, checklists, and code fences |
| HTML Sanitization | `DOMPurify` | Defense-in-depth XSS protection for rendered Markdown |
| PDF Engine | `pdf-lib` + `@pdf-lib/fontkit` | Client-side vector PDF generation with custom font embedding |
| Archive Packaging | `jszip` | In-memory ZIP packaging for per-chapter PDF downloads |
| Multi-Tab Sync | `BroadcastChannel` API | Instant cross-tab synchronization without server polling |
| Testing | Node.js Built-in Runner (`node:test`) | 247 automated unit, integration, security, and storage tests |
| Release Verification | Custom Node scripts | Fail-closed static artifact, route, and SEO verifier |

---

## Project Structure

```
md2pdf/
├── astro.config.mjs              # Static output, i18n, origin guard
├── design.md                     # Design system specification
├── docs/
│   ├── INDEXEDDB-HISTORY.md      # Authoritative storage architecture & manual
│   ├── EDITORIAL-MANIFEST.md     # Editorial guidelines and topic clusters
│   ├── SECURITY-HEADERS.md       # Production security header specifications
│   └── SEARCH-CONSOLE-CHECKLIST.md
├── public/
│   ├── fonts/                    # PDF fonts (DejaVu, Noto CJK) + licenses
│   └── og/                       # Localized social preview assets
├── scripts/
│   ├── build-release.mjs         # Fail-closed release build
│   └── lib/release-verify.mjs    # Artifact and SEO verification engine
├── src/
│   ├── components/               # Astro UI components (Header, HistoryDrawer, etc.)
│   ├── content/blog/             # 189 localized Markdown articles across 9 languages
│   ├── i18n/                     # Locale registries and 9 translation dictionaries
│   ├── lib/
│   │   ├── history/              # IndexedDB schema, db, repository, auto-save, backup
│   │   ├── github/               # URL parsing, Git Trees API, references
│   │   ├── pdf/                  # Fonts, layouts, assembly, and ZIP packaging
│   │   ├── seo.js, site.js       # Canonicals, hreflang, sitemap, origin rules
│   │   ├── markdown.js           # GFM rendering and TOC generation
│   │   └── sanitize.js           # DOMPurify security policy
│   ├── pages/                    # 216 static routes (home, book, about, blog)
│   ├── scripts/                  # converter.js and book-explorer.js UI controllers
│   └── styles/                   # app.css and blog.css
└── test/                         # 20 test files, 247 tests, 61 suites
    ├── helpers/mock-idb.js       # In-memory W3C IndexedDB mock
    └── history.test.js           # 40 automated tests for storage and auto-save
```

---

## Getting Started

### Prerequisites

- **Node.js ≥ 22.23.4** (tested with Node 26.4.0)
- **npm ≥ 9.6.5**

### Installation

```bash
git clone https://github.com/girishlade111/ReadmePDF.git
cd ReadmePDF
npm install
```

### Development Server

```bash
npm run dev        # Astro dev server → http://localhost:4321
```

### Local Static Build (MODE A)

```bash
npm run build      # static output → dist/
npm run preview    # serve dist/ locally
```

### Production Release Build (MODE B)

```bash
# On Linux / macOS
PUBLIC_SITE_URL=https://md2pdf.ladestack.in npm run build:release

# On Windows PowerShell
$env:PUBLIC_SITE_URL = "https://md2pdf.ladestack.in"
npm run build:release
```

The release verifier validates 216 HTML routes, 2,160 hreflang alternates, sitemap `<loc>` tags, robots.txt, and JSON-LD schema blocks against the official production origin `https://md2pdf.ladestack.in`.

---

## Usage

### Convert a README or Markdown Document

1. Paste a GitHub repository URL or write Markdown directly in the editor.
2. Observe the auto-save indicator transition from **"Saving..."** to **"Saved locally"**.
3. Choose a theme (**Clean**, **Business**, **Academic**, **Dark**) and preview your document.
4. Click **Save Version** to store an immutable snapshot in your local history.
5. Click **Download / Print PDF** to export your document.

### Open and Manage Local History

1. Click the **History** button in the header or editor toolbar.
2. Filter entries by category (**Markdown**, **GitHub**, **Books**, **Exports**) or search by keyword.
3. Click **Restore Draft** to load a previous version into the editor.
4. Click **Backup** to export a portable JSON file of your entire workspace history.

### Assemble a Multi-Chapter Documentation Book

1. Switch to **Documentation book** and enter a repository URL.
2. Select desired chapters using the tree checkboxes.
3. Click **Save Snapshot** to record the book's chapter selection.
4. Click **Print Book** or **Export ZIP** to generate your publication.

---

## Testing

```bash
npm test
```

The test suite runs **247 tests across 61 suites in 20 test files**:

| Area | Suite Details |
| ---- | ------------- |
| **IndexedDB & Storage** | 40 tests: schema versioning, draft CRUD, snapshots, LRU pruning, pins, search, backup export/import, prototype pollution, auto-save controller, dictionary parity |
| **GitHub Parsing & Trees** | URL parsing, branch resolution, relative asset rewriting, Git Trees discovery |
| **Markdown & Sanitization** | GFM tables, checklists, code fences, XSS stripping, URI sanitization |
| **Explorer & Selection** | Tree building, tri-state checkboxes, chapter ordering, limit guards |
| **Book Assembly & Export** | Chapter numbering, cover/TOC styling, cancellation safety, ZIP archives |
| **PDF & Fonts** | DejaVu, Noto CJK glyph coverage, image rendering, link annotations |
| **i18n & Technical SEO** | 417 dictionary keys per locale, 216 static routes, hreflang reciprocals, sitemaps |
| **Production Release Gate** | Fail-closed validation of all generated HTML, XML, and JSON-LD files |

---

## Privacy and Security

- **Zero Remote Storage:** All drafts, history snapshots, and preferences remain strictly inside your browser's IndexedDB database. Nothing is transmitted to LadeStack servers.
- **No Accounts, Trackers, or Cookies:** No registration required; zero third-party tracking scripts.
- **DOMPurify Sanitization:** All Markdown output is filtered against malicious HTML, scripts, iframes, and cross-site scripting vectors.
- **Strict Outbound Boundary:** Network requests are limited to `api.github.com` and `raw.githubusercontent.com` solely for fetching the public repositories you request.

---

## Roadmap

- [x] Direct per-chapter PDF export with images, links, and embedded fonts
- [x] Multi-file documentation books with ZIP export
- [x] Nine locales, 189 localized articles, and URL-first language selection
- [x] Browser-local IndexedDB history, debounced auto-save, and workspace restoration
- [x] Multi-tab sync via `BroadcastChannel` and JSON backup export/import
- [x] Fail-closed production release gate for `https://md2pdf.ladestack.in`
- [ ] Lazy-load CJK fonts on-demand to reduce initial ZIP bundle overhead
- [ ] Private repository support via user-supplied personal access tokens

---

## License

MIT © [LadeStack](https://ladestack.in)

## Credits

**Created by Girish Lade** — [ladestack.in](https://ladestack.in) · [GitHub](https://github.com/girishlade111) · [LinkedIn](https://www.linkedin.com/in/girish-lade/)
Founder of LadeStack, dedicated to crafting fast, open, client-side developer tools.

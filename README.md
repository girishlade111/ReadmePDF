# ReadmePDF

**Free, no-login, client-side GitHub README → PDF converter.**
Paste a repository URL, preview the rendered Markdown, and export a polished PDF — all processed in your browser.

> Built with **Astro 5** · Markdown by **markdown-it** · Sanitized with **DOMPurify** · Tests on the **Node built-in test runner**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Testing](#testing)
- [Privacy & Security](#privacy--security)
- [Error Handling](#error-handling)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

ReadmePDF (part of **LadeStack**) turns any public GitHub repository's README into a print-ready document without requiring an account, an API token, or a server.

Most README-to-PDF tools upload your content to a backend. ReadmePDF does the opposite: the entire conversion pipeline — fetching, path resolution, rendering, sanitizing, and PDF export — runs in the browser. The only network requests made are anonymous reads against `github.com`, `api.github.com`, and `raw.githubusercontent.com`.

### Why it exists

- Generate shareable PDF docs (specs, proposals, reports) from repo READMEs.
- Archive or distribute project documentation offline.
- Produce clean PDFs from hand-written Markdown without leaving the page.

---

## Features

### GitHub fetch
- Accepts full URLs (`https://github.com/owner/repo`), protocol-less hosts, `owner/repo` shorthand, and URLs with extra paths (`/tree/main/docs`, `/blob/main/README.md`).
- Discovers the default branch via the GitHub API, then falls back to `main` and `master`.
- Tries **10 README filename candidates** (`README.md`, `readme.md`, `README.MD`, `Readme.md`, `README.markdown`, `README`, `.github/README.md`, and more).
- Degrades gracefully when the API is rate-limited — raw fetches have an independent quota, so the flow continues instead of aborting.

### Relative-path resolution
- Images and badges (`docs/logo.png`, `./assets/chart.svg`) are rewritten to `raw.githubusercontent.com` so they render in the PDF.
- Document links become `github.com/.../blob/...` so they stay clickable in the exported file.
- Path traversal is clamped at the repo root (`../..` can never escape the repository).
- READMEs located in `.github/` resolve relative paths against their own directory.
- Absolute URLs, anchors (`#section`), and `data:`/`mailto:` links are left untouched.
- Fenced code blocks and inline code spans are never rewritten, so examples stay correct.

### Rendering
- GitHub Flavored Markdown: tables, task lists, strikethrough, fenced code, linkify.
- Auto **table of contents** with stable, unique heading slugs (auto-enabled for documents with 3+ headings; toggleable).
- DOMPurify sanitization in the browser — `script`, `style`, `iframe`, `object`, `embed`, and `form` tags are stripped.
- External links open in a new tab with `rel="noopener noreferrer"`.

### Themes & export
- Four print themes: **Clean**, **Business**, **Academic**, **Dark** (dark auto-lightens for print/PDF to preserve legibility).
- Export uses the browser's native **Print → Save as PDF** — no server-side PDF engine.
- Broken images get a placeholder instead of failing the entire export.

### Input modes
1. Paste a GitHub repository URL and click **Fetch**.
2. Upload a local `.md` / `.markdown` / `.txt` file (2 MB free-tier limit).
3. Paste Markdown directly into the textarea.
4. Load a bundled sample document.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (everything below happens locally)                     │
│                                                                 │
│  1. parseGitHubUrl()      → { owner, repo }                     │
│  2. GET api.github.com    → default_branch                      │
│  3. GET raw.githubusercontent.com/{branch}/{README candidate}   │
│  4. rewriteRelativeUrls() → images → raw, links → blob          │
│  5. extractHeadings()     → TOC entries with slugs              │
│  6. markdown-it render    → HTML (GFM)                          │
│  7. DOMPurify.sanitize()  → safe HTML                           │
│  8. injectHeadingIds()    → matching anchor ids                 │
│  9. window.print()        → user picks "Save as PDF"            │
└─────────────────────────────────────────────────────────────────┘
```

No uploads. No backend. No cookies.

---

## Tech Stack

| Layer | Choice | Why |
| ----- | ------ | --- |
| Framework | [Astro 5](https://astro.build) (`output: 'static'`) | Zero-JS static pages, ships only what runs |
| Markdown | `markdown-it` + `markdown-it-task-lists` | GFM coverage, extensible, fast |
| Sanitization | `dompurify` | Industry-standard XSS defense for HTML-in-Markdown |
| Testing | Node built-in `node:test` + `jsdom` | Zero-config runner, DOM support for widget tests |
| PDF | Browser Print → Save as PDF | 100% client-side, no rendering service |

---

## Project Structure

```
ReadmePDF/
├── astro.config.mjs          # Astro config (static output)
├── package.json
├── .gitignore                # node_modules/, dist/, .astro/
├── src/
│   ├── lib/
│   │   ├── github.js         # URL parsing, README fetch, relative-URL rewriting
│   │   └── markdown.js       # GFM render, sanitization, TOC, heading slugs
│   ├── pages/
│   │   └── index.astro       # Single-page UI (controls + live preview)
│   ├── scripts/
│   │   └── converter.js      # Client controller wiring inputs → render → print
│   └── styles/
│       └── app.css           # Layout, themes, print styles
└── test/
    ├── github.test.js        # URL parsing, path resolution, fetch resilience
    ├── markdown.test.js      # GFM rendering, TOC extraction
    ├── integration.test.js   # Full pipeline with mocked GitHub
    └── features.test.js      # TOC injection, error messaging (jsdom)
```

### Module responsibilities

| Module | Exports |
| ------ | ------- |
| `src/lib/github.js` | `parseGitHubUrl`, `resolveRepoPath`, `buildRawUrl`, `buildBlobUrl`, `rewriteRelativeUrls`, `fetchReadme`, `README_CANDIDATES`, `BRANCH_FALLBACKS` |
| `src/lib/markdown.js` | `renderMarkdown`, `renderMarkdownSync`, `extractHeadings`, `buildTocHtml`, `injectHeadingIds` |
| `src/scripts/converter.js` | `initConverter`, `friendlyError` |

---

## Getting Started

### Prerequisites

- **Node.js ≥ 18** (for `AbortSignal.timeout`, native test runner, ESM)
- **npm** (ships with Node)

### Installation

```bash
git clone https://github.com/girishlade111/ReadmePDF.git
cd ReadmePDF
npm install
```

### Development

```bash
npm run dev        # start Astro dev server → http://localhost:4321
```

### Production build

```bash
npm run build      # static output → dist/
npm run preview    # serve the production build locally
```

---

## Usage

### Convert a GitHub README

1. Paste a repository URL into the **GitHub repo URL** field:
   ```
   https://github.com/owner/repo
   ```
2. Click **Fetch** (or press Enter). The README loads into the editor and the preview updates.
3. Pick a theme: **Clean**, **Business**, **Academic**, or **Dark**.
4. Toggle **Auto table of contents** if you want/avoid the generated Contents block.
5. Click **Download / Print PDF** → choose **Save as PDF** in the print dialog.

### Paste or upload Markdown

- Use the file picker for `.md` / `.markdown` / `.txt` files (≤ 2 MB), or
- Type/paste Markdown directly into the textarea — the preview re-renders as you type (debounced 180 ms).

> **Note:** relative image paths only resolve when a repository URL was fetched first. Uploaded/pasted Markdown has no repo base, so use absolute image URLs in that mode.

### Supported URL forms

```
https://github.com/owner/repo
https://github.com/owner/repo.git
github.com/owner/repo
owner/repo
https://github.com/owner/repo/tree/main/docs
https://github.com/owner/repo/blob/main/README.md
```

---

## Testing

```bash
npm test
```

Runs 27 tests across 10 suites using Node's built-in test runner:

| Suite | Covers |
| ----- | ------ |
| `github.test.js` | URL parsing, `.git`/path stripping, host rejection, path resolution & clamping, raw/blob URL building, relative-URL rewriting (code fences untouched), `fetchReadme` fallbacks with mocked `fetch` |
| `markdown.test.js` | GFM tables, task lists, strikethrough, fences; heading extraction outside code fences; TOC threshold (≥3 headings) |
| `integration.test.js` | End-to-end pipeline: fetch → resolve → render → TOC, with a mocked GitHub |
| `features.test.js` | `injectHeadingIds` slug ordering via jsdom; `friendlyError` mapping for all error codes |

All tests use injectable/mocked `fetch` — no live network calls during CI.

---

## Privacy & Security

- **No accounts, no tokens, no cookies.** Nothing to sign up for.
- **No uploads.** Markdown and PDF generation happen entirely in your browser.
- **Sanitized output.** Rendered HTML passes through DOMPurify with `script`, `style`, `iframe`, `object`, `embed`, and `form` forbidden.
- **Only outbound calls:** `api.github.com` (default branch lookup) and `raw.githubusercontent.com` (README + images) for the public repo you requested.
- **Private repositories are not supported** in the MVP (they would require OAuth — see Roadmap).

---

## Error Handling

`fetchReadme` throws errors carrying a machine-readable `.code`, which `friendlyError()` maps to actionable user messages:

| Code | Meaning | User-facing guidance |
| ---- | ------- | -------------------- |
| `INVALID_URL` | Unparseable or non-github.com URL | Shows the exact parse error |
| `PRIVATE_OR_NOT_FOUND` | Repo 404 (private or typo) | Suggest pasting Markdown manually |
| `NO_README` | No README on `main`/`master` (incl. `.github/`) | Suggest upload or manual paste |
| `RATE_LIMITED` | Unauthenticated API 403/429 | Wait ~1 minute and retry |
| `NETWORK_ERROR` | Fetch failure or 15 s timeout | Retry; manual paste still works |

Every fetch has a **15-second timeout** so the UI never hangs silently.

---

## Roadmap

- [ ] Private repository support via GitHub OAuth (phase 2)
- [ ] Custom CSS / font selection for the PDF
- [ ] Multi-file documentation bundles (docs/ folder → single PDF)
- [ ] Direct PDF export without the print dialog
- [ ] GitHub Pages deployment workflow

---

## License

MIT © LadeStack

## 🙏 Credits

**Built by Girish Lade** — [ladestack.in](https://ladestack.in)

Solo founder of LadeStack, building free tools for everyone.

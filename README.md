# md2pdf

**Free, no-login, client-side GitHub README → PDF converter.** Paste a repository URL, preview the rendered Markdown, assemble a multi-chapter documentation book, and export print-ready PDFs — all processed in your browser.

> Built with **Astro 7.4.2** · Markdown by **markdown-it** · Sanitized with **DOMPurify** · PDFs by **pdf-lib + fontkit** · Tests on the **Node built-in test runner**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
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

md2pdf (part of **LadeStack**) turns public GitHub repositories and local Markdown files into polished documents. It supports two workflows:

1. **Single document** — fetch a README, paste Markdown, or upload a file, then preview, print, or export one PDF.
2. **Documentation book** — scan a repository, choose Markdown files in a searchable tree, reorder chapters, build a cover and table of contents, print the assembled book, or download a ZIP of per-chapter PDFs.

There is no application backend. Fetching, Markdown rendering, sanitization, PDF layout, font embedding, image embedding, and ZIP creation all run in the browser. The static Astro site exists to serve the UI and localized content.

### Why it exists

- Turn a repository README into a shareable PDF without an account or API token.
- Assemble several documentation pages into one printable book.
- Archive documentation offline while keeping links and images intact.
- Produce PDFs from hand-written Markdown without uploading it anywhere.

---

## Features

### GitHub import

- Accepts full URLs (`https://github.com/owner/repo`), protocol-less hosts, `owner/repo` shorthand, and URLs with extra paths (`/tree/main/docs`, `/blob/main/README.md`, raw file URLs).
- Resolves the default branch through the GitHub API, then falls back to `main` and `master` where appropriate.
- Tries ten README filename candidates, including `.github/README.md`.
- Rewrites relative images to `raw.githubusercontent.com` and relative document links to GitHub blob URLs.
- Clamps traversal at the repository root and never rewrites fenced code or inline code.
- Continues with raw fetches when the unauthenticated API is rate-limited, and surfaces localized errors instead of failing silently.

### Markdown workspace

- Paste Markdown, load the bundled sample, or upload `.md` / `.markdown` / `.txt` files up to 2 MB.
- GitHub Flavored Markdown: tables, task lists, strikethrough, fenced code, and linkify.
- Live, debounced preview with an optional auto-generated table of contents for documents with three or more headings.
- Four print themes: **Clean**, **Business**, **Academic**, and **Dark** (dark lightens for print legibility).
- DOMPurify strips `script`, `style`, `iframe`, `object`, `embed`, and `form` elements; external links open in a new tab with `rel="noopener noreferrer"`.
- Broken images degrade to a placeholder rather than aborting the document.

### Documentation book

- Scans a repository through the Git Trees API with bounded fallbacks and explicit completeness warnings.
- Searchable file tree with tri-state folder checkboxes, select-all, clear-selection, per-file preview, and a 30-chapter safety limit.
- Chapter ordering with move-up, move-down, and remove controls; newly selected files append predictably.
- Builds a cover, table of contents, and chapter sequence that preserves the chosen order.
- Cancellation-safe scanning and building: a cancelled build leaves no partial output and cannot be printed.
- Editing the title, subtitle, cover, or TOC marks the assembled book stale and disables print/export until it is rebuilt.
- Print isolation shows either the single document or the assembled book, never both.

### PDF and print

- **Single document:** native browser Print → Save as PDF, isolated from the rest of the page.
- **Book:** native browser print of the assembled cover, TOC, and chapters.
- **ZIP export:** direct download of one PDF per selected chapter, preserving repository paths and Unicode filenames (NFC-normalized).
- ZIP root is `md2pdf-{owner}-{repo}-{sha8}.zip`; exports are capped at 30 PDFs.
- PDFs embed images, internal links, external URI annotations, and self-hosted fonts.
- Unicode coverage includes Latin, Cyrillic, Turkish, and CJK text. DejaVu Sans/Mono cover Latin and Cyrillic; Noto Sans CJK SC covers Chinese, Japanese, and Korean.
- Export can be cancelled at any point; a cancelled export downloads nothing and reports it explicitly.

### Internationalization and blog

- Nine locales: English (`en`), Spanish (`es`), Japanese (`ja`), Korean (`ko`), Simplified Chinese (`zh-Hans`), Russian (`ru`), Turkish (`tr`), French (`fr`), and Brazilian Portuguese (`pt-BR`).
- 45 static pages: nine homepages, nine journal indexes, and 27 localized articles (three translation keys across nine locales).
- 362 translated message keys per locale.
- English keeps unprefixed URLs; every other locale uses a prefix (`/es/`, `/ja/`, `/pt/`, and so on).
- Language selection is URL-first. There is no `Accept-Language`, cookie, or redirect-based guessing.
- Localized articles share a `translationKey` identity for reciprocal hreflang metadata.

### SEO and release safety

- Self-referencing canonicals, reciprocal hreflang links (including `x-default`), localized Open Graph metadata, and JSON-LD.
- A 45-URL sitemap with 450 alternates generated only when a public origin is configured.
- `npm run build` remains a local static build and works without an origin.
- `npm run build:release` fails closed: it requires a valid public HTTPS origin and verifies the generated artifact before the command succeeds.

---

## Design System

The interface follows [`design.md`](./design.md) — a warm-neutral, shadow-free system.

- **A six-rung neutral ladder.** Sections are separated by which background rung they use, not by cards or shadows.
- **One red.** `#c74634` appears on the md2pdf wordmark only.
- **One action colour.** Buttons use the warm charcoal `#312d2a`; polarity flips on dark bands.
- **Two type registers.** Georgia for display headings, Inter for everything else.
- **One ornament.** A gold rule under the hero headline.
- **Focus ring declared once** (`#227e9e`) and applied consistently.

**Page fonts are self-hosted.** Inter ships as variable `woff2` files in `src/fonts/`; Georgia and Consolas use system stacks. The page makes no third-party font requests.

---

## How It Works

```
Browser
  1. Parse the repository URL or read the local Markdown.
  2. Fetch GitHub metadata / README / file tree when needed.
  3. Resolve relative images and document links.
  4. Render GFM with markdown-it, extract headings and TOC.
  5. Sanitize the HTML with DOMPurify.
  6. Preview, print, or lay out PDFs with pdf-lib + fontkit.
  7. Bundle per-chapter PDFs into a ZIP with JSZip.
```

No uploads. No application backend. No cookies.

---

## Tech Stack

| Layer | Choice | Why |
| ----- | ------ | --- |
| Framework | [Astro 7.4.2](https://astro.build) (`output: 'static'`) | Static HTML with only the client code that is needed |
| Markdown | `markdown-it` + `markdown-it-task-lists` | GFM coverage with an extensible renderer |
| Sanitization | `dompurify` | Battle-tested HTML sanitization for HTML-in-Markdown |
| PDF layout | `pdf-lib` + `@pdf-lib/fontkit` | Client-side PDF creation with embedded fonts and images |
| ZIP packaging | `jszip` | Per-chapter PDF bundles without a server |
| Typography | Self-hosted Inter; DejaVu + Noto for PDFs | No third-party page fonts; broad PDF Unicode coverage |
| Testing | Node `node:test` + `jsdom` + `pdfjs-dist` | Fast unit/integration tests and real PDF parsing checks |
| Release verification | Custom Node scripts | Compares `dist/` with the source inventory and one origin |

---

## Project Structure

```
md2pdf/
├── astro.config.mjs              # Static output, i18n, origin guard
├── design.md                     # Design system specification
├── public/
│   ├── fonts/                    # PDF fonts (DejaVu, Noto CJK) + licenses
│   └── og/                       # Social preview image
├── scripts/
│   ├── build-release.mjs         # Fail-closed release build
│   └── lib/release-verify.mjs    # Artifact and SEO verification
├── src/
│   ├── components/               # Home, blog, SEO, language switcher
│   ├── content/blog/             # 27 localized article files
│   ├── i18n/                     # Locale config, dictionaries, formatting
│   ├── lib/
│   │   ├── github/               # URL parsing, API, discovery, references
│   │   ├── pdf/                  # Model, fonts, renderer, assembly, export
│   │   ├── seo.js, site.js       # Canonicals, hreflang, sitemap, origin rules
│   │   ├── markdown.js           # GFM rendering and TOC
│   │   └── sanitize.js           # DOMPurify policy
│   ├── pages/                    # English + prefixed locale routes and blog
│   ├── scripts/                  # converter.js and book-explorer.js
│   └── styles/                   # app.css and blog.css, including print rules
└── test/                         # 19 test files, 201 tests, 59 suites
```

---

## Getting Started

### Prerequisites

- **Node.js ≥ 22.23.4** (Astro 7 requirement; tested with Node 26.4.0)
- **npm ≥ 9.6.5**

### Installation

```bash
git clone https://github.com/girishlade111/ReadmePDF.git
cd md2pdf
npm install
```

### Development

```bash
npm run dev        # Astro dev server → http://localhost:4321
```

### Local production build (MODE A)

```bash
npm run build      # static output → dist/
npm run preview    # serve dist/ locally
```

Without `PUBLIC_SITE_URL`, pages use root-relative canonicals, the sitemap is omitted, and `robots.txt` has no `Sitemap:` directive. This is intentional: a local build must not advertise a fake production origin.

### Release build (MODE B)

```bash
PUBLIC_SITE_URL=https://your-real-domain.example npm run build:release
```

On Windows PowerShell:

```powershell
$env:PUBLIC_SITE_URL = "https://your-real-domain.example"
npm run build:release
```

The command rejects missing, HTTP, loopback/IP, single-label, reserved-TLD, `example.*`, and placeholder hosts. It then runs Astro, verifies the output, and exits non-zero if any check fails. There is no bypass flag.

---

## SEO Modes and the Release Gate

| Behavior | MODE A — `npm run build` | MODE B — `npm run build:release` |
| -------- | ------------------------ | -------------------------------- |
| `PUBLIC_SITE_URL` | Optional | Required, public HTTPS |
| Canonicals | Root-relative, self-referencing | 45 absolute self-canonicals |
| hreflang | Omitted (requires absolute URLs) | 10 links per page, including `x-default` |
| `sitemap.xml` | Omitted | 45 URLs, 450 alternates |
| `robots.txt` | No `Sitemap:` directive | Absolute `Sitemap:` directive |
| JSON-LD | Local-safe | Rejects non-origin deployment URLs |
| Artifact verification | Astro build only | Full page/SEO/artifact inventory |

The release verifier derives the expected routes from the content collection, then checks every HTML page, canonical, hreflang set, Open Graph URL, HTML `lang`, JSON-LD block, sitemap entry, and the robots directive. The only external URL allowed in JSON-LD is the publisher link to `https://ladestack.in`.

---

## Usage

### Convert one README

1. Paste a repository URL into **GitHub repo URL**.
2. Click **Fetch** (or press Enter). The README loads into the editor and preview.
3. Choose a theme and toggle the table of contents.
4. Click **Download / Print PDF** and choose **Save as PDF**.

### Assemble a documentation book

1. Open **Documentation book** and enter a repository URL.
2. Scan the repository.
3. Search or expand the tree; use tri-state folder checkboxes to select Markdown files.
4. Reorder chapters with the up/down controls.
5. Optionally set a title, subtitle, cover, and TOC.
6. Build the book, then print it or export a ZIP of per-chapter PDFs.

Exporting a ZIP preserves the repository hierarchy:

```
md2pdf-octo-demo-c0ffee12/
├── README.pdf
└── docs/
    ├── guide.pdf
    ├── setup.pdf
    └── 日本語ガイド.pdf
```

### Supported URL forms

```text
https://github.com/owner/repo
https://github.com/owner/repo.git
github.com/owner/repo
owner/repo
https://github.com/owner/repo/tree/main/docs
https://github.com/owner/repo/blob/main/README.md
https://raw.githubusercontent.com/owner/repo/main/README.md
```

---

## Testing

```bash
npm test
```

The suite currently runs **201 tests across 59 suites in 19 files**:

| Area | Representative coverage |
| ---- | ----------------------- |
| GitHub parsing and fetching | URL forms, branch fallback, raw/blob URLs, relative-path resolution, rate limits |
| Markdown and sanitization | GFM tables/tasks/fences, TOC slugs, XSS payloads, unsafe URL schemes |
| Explorer and selection | Tree building, tri-state folders, search, chapter ordering, limits |
| Book assembly and UI | Cover/TOC order, stale output, cancellation races, print isolation |
| PDF and export | Font fallback, pagination, images, link annotations, ZIP paths, Unicode names |
| Internationalization and SEO | 362 keys per locale, locale routes, canonicals, hreflang, sitemap, JSON-LD |
| Release gate | Origin policy and 45-route artifact verification fixtures |

Tests use injected or mocked `fetch`; no live GitHub calls are required.

---

## Privacy and Security

- **No accounts, tokens, or cookies.** There is nothing to sign up for.
- **No application uploads.** Markdown and PDF generation happen in the browser.
- **Sanitized previews.** DOMPurify removes executable and embedded content before it reaches the DOM.
- **Outbound requests are limited to GitHub** (`api.github.com`, `raw.githubusercontent.com`, and GitHub pages for link targets) for the public repository the user requests.
- **Private repositories are not supported.** They would require OAuth and are on the roadmap.
- **No production domain is hard-coded.** Canonicals and sitemap URLs come from the validated `PUBLIC_SITE_URL`.

---

## Deployment and Security Headers

This repository does **not** include a hosting-provider configuration and does not assume a provider. Deployment must supply `PUBLIC_SITE_URL` and the platform's security headers. See [`docs/SECURITY-HEADERS.md`](./docs/SECURITY-HEADERS.md) for a provider-neutral checklist.

Real HTTP response-header verification is **pending** until a production domain and host are chosen. Do not treat a local preview as proof of deployed headers.

---

## Roadmap

- [x] Direct per-chapter PDF export with images, links, and embedded fonts
- [x] Multi-file documentation books with ZIP export
- [x] Nine locales, localized blog, and URL-first language selection
- [x] Fail-closed release build and SEO artifact verification
- [ ] Lazy-load the 9.4 MB CJK font only when a document needs it
- [ ] Private repository support via GitHub OAuth
- [ ] Combined single-PDF export in addition to per-chapter ZIPs
- [ ] Deployment automation once the production host is chosen

---

## License

MIT © LadeStack

## Credits

**Built by Girish Lade** — [ladestack.in](https://ladestack.in)

Solo founder of LadeStack, building free tools for everyone.

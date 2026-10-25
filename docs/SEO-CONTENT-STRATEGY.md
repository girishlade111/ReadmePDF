# md2pdf — Production SEO Content Strategy & Multilingual Keyword Mapping

Last Updated: 2026-10-25  
Product: **md2pdf** (`https://md2pdf.ladestack.in`)  
Brand: **LadeStack** (`https://ladestack.in`)  
Author: **Girish Lade**  

---

## 1. Product Positioning & Search Intent Architecture

md2pdf is an in-browser, client-side, privacy-first developer workstation for turning Markdown and GitHub README files into print-ready PDF documents.

### Search Intent Clusters

1. **Transactional / Utility Intent (Primary Homepage)**
   - *Queries*: `markdown to pdf`, `convert markdown to pdf online`, `github readme to pdf`, `md to pdf free no login`
   - *Target URL*: `https://md2pdf.ladestack.in/` (and localized `/es/`, `/ja/`, `/ko/`, `/zh/`, `/ru/`, `/tr/`, `/fr/`, `/pt/`)
   - *Strategy*: Converter experience above-the-fold, instant drag-and-drop file upload, live split-screen preview, zero-upload privacy reassurance, clear CTAs.

2. **Feature & Capability Guides (Informational / Technical Intent)**
   - Each of the 20 distinct client-side features + 1 editorial use-cases guide is mapped to a dedicated authoritative article.
   - Prevents keyword cannibalization by strictly separating single-document operations, repository scanning, multi-file book compiling, print styling, and security.

---

## 2. Verified 21-Guide Inventory & Intent Mapping

| # | Guide Slug | Primary Search Intent | Target User Scenario |
|---|---|---|---|
| 1 | `browser-only-markdown-to-pdf` | Private / Zero-upload Markdown to PDF | Developers converting sensitive internal documentation without cloud upload risks |
| 2 | `browser-print-markdown-pdf` | Native browser printing Markdown | Users printing directly to local printers or browser PDF printer with exact CSS margins |
| 3 | `chapter-sequencing-reordering-pdf` | Markdown chapter reordering for books | Organizing chapters in custom order for technical handbooks |
| 4 | `github-branch-tag-commit-pdf` | Versioned GitHub docs to PDF | Capturing documentation snapshots pinned to release tags or immutable commit SHAs |
| 5 | `github-readme-to-pdf` | GitHub repository README to PDF | Converting a public repo README with relative image resolution |
| 6 | `github-repository-markdown-tree` | GitHub repository tree exploration | Navigating multi-folder documentation structures |
| 7 | `live-markdown-preview-pdf` | Split-screen real-time Markdown preview | Editing Markdown with instant visual feedback and DOMPurify sanitization |
| 8 | `markdown-code-blocks-to-pdf` | Code blocks and syntax in PDF | Monospace formatting and preventing code blocks from splitting across page breaks |
| 9 | `markdown-editor-paste-pdf` | Paste Markdown and edit online | Quick copy-paste conversion without creating files |
| 10 | `markdown-file-search-filter` | Filter and search Markdown files | Searching within large multi-file documentation sets |
| 11 | `markdown-file-upload-to-pdf` | Local `.md` file drag-and-drop to PDF | Converting local files from disk without server transmission |
| 12 | `markdown-folder-selection-book` | Tri-state directory selection | Selecting entire subdirectories of documentation with cascading checkboxes |
| 13 | `markdown-pdf-cover-page` | PDF book cover page generation | Synthesizing executive title sheets with title, author, and timestamp |
| 14 | `markdown-relative-images-links-pdf` | Relative image and link resolution | Ensuring images like `./assets/diagram.png` render properly in PDF |
| 15 | `markdown-table-of-contents-pdf` | Hierarchical TOC generation | Creating structured TOCs with clickable PDF bookmarks for long documents |
| 16 | `markdown-tables-to-pdf` | GitHub Flavored Markdown tables | Fitting wide tables into printable portrait and landscape pages |
| 17 | `markdown-zip-pdf-export` | Batch Markdown to ZIP archive | Packaging individual chapter PDFs into a clean ZIP archive |
| 18 | `multi-file-markdown-book` | Multi-file documentation book builder | Stitching multiple Markdown chapters into a single volume with continuous page numbers |
| 19 | `multilingual-markdown-pdf-fonts` | CJK and Unicode font embedding | Rendering Chinese, Japanese, Korean, Cyrillic, and Turkish without missing glyphs (tofu) |
| 20 | `readme-pdf-print-themes` | Clean, Business, Academic, Dark print themes | Selecting the appropriate visual tone for engineering, client, or academic deliverables |
| 21 | `readme-to-pdf-use-cases` | Practical README to PDF workflows | Real-world applications: client handoffs, release archives, course packs, compliance |

---

## 3. Multilingual Keyword Strategy (9 Locales)

| Locale | Code | Target Keyword | Secondary Keywords |
|---|---|---|---|
| English | `en` | `markdown to pdf` | `github readme to pdf`, `md to pdf`, `markdown book builder` |
| Spanish | `es` | `convertir markdown a pdf` | `readme a pdf`, `markdown a pdf gratis`, `convertidor markdown online` |
| Japanese | `ja` | `markdown pdf 変換` | `github readme pdf`, `markdown 変換ツール`, `ブラウザ markdown pdf` |
| Korean | `ko` | `마크다운 pdf 변환` | `깃허브 리드미 pdf`, `온라인 마크다운 변환기`, `무료 마크다운 pdf` |
| Simplified Chinese | `zh` | `markdown转pdf` | `github readme转pdf`, `在线markdown转pdf`, `markdown生成pdf` |
| Russian | `ru` | `markdown в pdf` | `конвертер markdown в pdf`, `github readme в pdf`, `онлайн md в pdf` |
| Turkish | `tr` | `markdown pdf dönüştürücü` | `github readme pdf yapma`, `online markdown pdf`, `ücretsiz md to pdf` |
| French | `fr` | `convertir markdown en pdf` | `convertisseur markdown pdf`, `github readme en pdf`, `markdown vers pdf` |
| Brazilian Portuguese | `pt` | `converter markdown em pdf` | `readme do github para pdf`, `markdown para pdf online`, `transformar md em pdf` |

---

## 4. Internal Link Architecture

```
                       ┌──────────────────────┐
                       │      Homepage        │
                       │   (Interactive Tool) │
                       └──────────┬───────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   About Page     │    │   Blog Index     │    │  Human Sitemap   │
│ (Founder/Trust)  │    │  (All 21 Guides) │    │ (Deep Links)     │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                     ┌──────────────────────┐
                     │  21 Feature Guides   │
                     │  (Per Locale Graph)  │
                     └──────────┬───────────┘
                                │ (CTA link back)
                                ▼
                     ┌──────────────────────┐
                     │    #converter /      │
                     │    #book Anchors     │
                     └──────────────────────┘
```

1. **Homepage to Guides**: The Homepage links to the Journal index (`/blog/`), About page (`/about/`), and directly to 8 featured guides in the Human Sitemap section.
2. **Guides to Tool**: Every guide features actionable steps that link back to the homepage tool anchors (`/#converter`, `/#book`, `/#themes`).
3. **Cross-Guide Clustering**: Related guides cross-link naturally (e.g., `multi-file-markdown-book` links to `chapter-sequencing-reordering-pdf`, `markdown-folder-selection-book`, and `markdown-pdf-cover-page`).
4. **Locale Isolation**: Links within a language tree strictly target that same language (e.g., `/ja/blog/` links only to `/ja/` routes).

---

## 5. AI Search / Generative Engine Optimization (GEO)

md2pdf optimizes for generative search experiences (Google AI Overviews, Perplexity, ChatGPT Search, Claude Search):
1. **Clear Entity Definition**: md2pdf is explicitly defined in `llms.txt`, Homepage, and About page as a free client-side Markdown to PDF converter created by Girish Lade / LadeStack.
2. **Self-Contained Answer Blocks**: Headings in guides are question-oriented with direct, extractable answer summaries in the first 40–60 words.
3. **Machine-Readable Discovery (`public/llms.txt`)**: All 21 guides, workflows, print themes, and capabilities are indexed in standard `llms.txt` format.
4. **Robots AI Crawler Grouping**: Explicit `User-agent:` groups for `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `PerplexityBot`, `Google-Extended`, and `Applebot-Extended` with `Content-Signal: search=yes, ai-input=yes, ai-train=yes`.

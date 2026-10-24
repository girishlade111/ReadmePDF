# md2pdf — Future Content Publishing Workflow

This guide establishes the mandatory, repeatable engineering workflow for publishing a new feature article in **md2pdf** without breaking sitemap integrity, translation parity, reciprocal hreflang links, or the release gate.

---

## The Rule of 9: Atomic Multilingual Publishing

In md2pdf, an article does not exist in isolation. Because the release verifier (`scripts/lib/release-verify.mjs`) mandates that every locale publishes the exact same set of translation keys, **a new article key must be published simultaneously in all 9 supported locales**:

- `en` (English, default at `src/content/blog/{key}.md`)
- `es` (Spanish at `src/content/blog/es/{key}.md`)
- `ja` (Japanese at `src/content/blog/ja/{key}.md`)
- `ko` (Korean at `src/content/blog/ko/{key}.md`)
- `zh` (Simplified Chinese at `src/content/blog/zh/{key}.md`)
- `ru` (Russian at `src/content/blog/ru/{key}.md`)
- `tr` (Turkish at `src/content/blog/tr/{key}.md`)
- `fr` (French at `src/content/blog/fr/{key}.md`)
- `pt` (Brazilian Portuguese at `src/content/blog/pt/{key}.md`)

If an article is published in English without all 8 localized counterparts, `npm test` and `npm run build:release` will deliberately fail closed.

---

## Step-by-Step Publishing Process

### Step 1: Feature Verification & Key Definition
1. Confirm that the feature is fully implemented and tested in `src/` and `test/`. Never publish speculative or planned features.
2. Choose a hyphenated lowercase `translationKey` (e.g., `markdown-zip-archive-export`).
3. Add the key to `test/i18n.test.js` under `translationKeys`.
4. Update `test/release.test.js` to reflect the updated route count:
   $$\text{Total Routes} = 9 \times (\text{Translation Keys} + 3)$$
   (e.g., for 9 keys: $9 \times (9 + 3) = 108$ routes).

### Step 2: Author the English Master Article
Create `src/content/blog/{key}.md` with YAML frontmatter:
```markdown
---
title: "Precise Title under 90 Characters"
description: "Clear and helpful meta description summarizing the guide under 180 characters."
pubDate: 2026-10-23
author: "Girish Lade"
tags: ["Documentation", "PDF", "Workflow"]
locale: "en"
translationKey: "your-translation-key"
---
```
Ensure:
- `title` is $\le 90$ characters.
- `description` is $\le 180$ characters.
- Body uses `##` for primary sections.
- Code fences have explicit language tags.
- Links are valid and relative links point to published articles.

### Step 3: Author the 8 Localized Editions
For each locale (`es`, `ja`, `ko`, `zh`, `ru`, `tr`, `fr`, `pt`), create `src/content/blog/{locale}/{key}.md`.

**Mandatory Parity Rules (enforced by `test/i18n.test.js`)**:
1. **Heading Structure**: Every translation must have the exact same number of headings and identical heading depths as the English master.
2. **Code Blocks**: Fenced code blocks must match the English master character-for-character.
3. **URLs**: External URLs referenced in prose must match the English master.
4. **Tags**: Must be a JSON array identical to the English tags.
5. **Metadata**: `pubDate` and `updatedDate` must match the English dates.
6. **Localization**: `title` and `description` must be translated and must NOT match the English text.
7. **Encoding**: Must be UTF-8 with zero replacement characters (`\uFFFD`).

### Step 4: Verification Suite
Run the test suite and verify:
```bash
npm test
```
All tests must pass with 0 failures.

### Step 5: Test Release Build
Run a simulated release build with a test origin:
```bash
PUBLIC_SITE_URL=https://release-gate.md2pdf.dev npm run build:release
```
Confirm that:
- HTML route generation succeeds.
- Sitemap contains the new $9 \times 1 = 9$ URLs.
- Reciprocal hreflang graph is validated.
- JSON-LD BlogPosting schema passes verification.

### Step 6: Documentation & Strategy Update
1. Add the new feature and article to `docs/EDITORIAL-MANIFEST.md`.
2. Add keyword targets across all 9 languages to `docs/seo-keyword-strategy.json`.
3. Commit all 9 files and manifest updates in an atomic Git commit.

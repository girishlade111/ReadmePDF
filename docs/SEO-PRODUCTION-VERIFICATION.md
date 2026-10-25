# md2pdf — Production SEO Verification & Release Quality Gate

Last Updated: 2026-10-25  
Product: **md2pdf** (`https://md2pdf.ladestack.in`)  
Repository: `https://github.com/girishlade111/ReadmePDF`  
Author: Technical SEO & Release Engineering  

---

## 1. Automated Quality Gate Architecture

md2pdf implements a strict three-tier quality gate to ensure zero regressions in SEO, accessibility, performance, and application functionality:

```
[ Tier 1: Unit & Integration Tests ]
  └─ 264 automated tests in test/ (github, markdown, i18n, history, seo, release)

[ Tier 2: Build-Time Fail-Closed Release Gate ]
  └─ scripts/build-release.mjs -> scripts/lib/release-verify.mjs
  └─ scripts/audit-seo.mjs (30 SEO checks on dist/)

[ Tier 3: Real Browser CDP & Live Deployment Verification ]
  └─ scripts/real-browser-tests.mjs (Headless Chrome/Edge IndexedDB concurrency)
  └─ scripts/verify-live-deployment.mjs (Live custom domain verification)
```

---

## 2. SEO Release Checklist (30 Criteria)

| # | Check Description | Automated Enforcer | Result |
|---|---|---|:---:|
| 1 | Every indexable page has a valid canonical URL | `scripts/lib/release-verify.mjs`, `scripts/audit-seo.mjs` | PASS |
| 2 | Canonical URLs use the authoritative production origin | `scripts/lib/release-verify.mjs` | PASS |
| 3 | No duplicate canonical tags on any route | `scripts/lib/release-verify.mjs` | PASS |
| 4 | Accurate language metadata (`html lang`) matching CLDR | `scripts/lib/release-verify.mjs`, `test/i18n.test.js` | PASS |
| 5 | Every public page has a non-empty, descriptive title | `scripts/audit-seo.mjs` | PASS |
| 6 | No empty or missing meta descriptions | `scripts/audit-seo.mjs` | PASS |
| 7 | Exactly one primary H1 element per page | `scripts/audit-seo.mjs` | PASS |
| 8 | Logical heading hierarchy (H1 -> H2 -> H3) | `scripts/audit-seo.mjs`, `test/i18n.test.js` | PASS |
| 9 | All sitemap URLs resolve to real generated routes in `dist/` | `scripts/lib/release-verify.mjs` | PASS |
| 10 | No duplicate URLs in sitemap.xml | `scripts/lib/release-verify.mjs` | PASS |
| 11 | Complete 9-language reciprocal hreflang graph (2,160 tags) | `scripts/lib/release-verify.mjs`, `scripts/audit-seo.mjs` | PASS |
| 12 | Valid x-default alternate tag pointing to English canonical | `scripts/lib/release-verify.mjs` | PASS |
| 13 | Portuguese URL `/pt/` and hreflang `pt-BR` consistency | `scripts/lib/release-verify.mjs`, `test/seo.test.js` | PASS |
| 14 | Valid Schema.org JSON-LD structured data on all pages | `scripts/lib/release-verify.mjs` | PASS |
| 15 | Structured data URLs match page canonical origin | `scripts/lib/release-verify.mjs` | PASS |
| 16 | BreadcrumbList rich result schemas present (207 lists) | `scripts/audit-seo.mjs` | PASS |
| 17 | Internal links target actual pages without 404s | `scripts/audit-seo.mjs` | PASS |
| 18 | No orphan feature guides (reachable via sitemap & index) | `scripts/audit-seo.mjs` | PASS |
| 19 | English blog index lists all 21 technical guides | `scripts/lib/release-verify.mjs` | PASS |
| 20 | All 8 localized blog indexes list all 21 translated guides | `scripts/lib/release-verify.mjs` | PASS |
| 21 | No accidental noindex tags on production content | `scripts/audit-seo.mjs` | PASS |
| 22 | Error 404 page has explicit `noindex` tag | `scripts/audit-seo.mjs` | PASS |
| 23 | No private browser-history routes indexed or linked | `scripts/audit-seo.mjs` | PASS |
| 24 | No preview aliases used as canonical origins | `scripts/lib/release-verify.mjs` | PASS |
| 25 | No 404 page in sitemap.xml | `scripts/audit-seo.mjs` | PASS |
| 26 | Robots.txt contains valid sitemap directive | `scripts/lib/release-verify.mjs` | PASS |
| 27 | Explicit AI search crawler directives in robots.txt | `scripts/audit-seo.mjs` | PASS |
| 28 | Content-Signal preference declared in robots.txt | `scripts/audit-seo.mjs` | PASS |
| 29 | llms.txt indexes all 21 technical guides | `scripts/audit-seo.mjs` | PASS |
| 30 | Primary SEO copy is prerendered in static HTML | `scripts/audit-seo.mjs`, `agentic_check.py` | PASS |

---

## 3. Pre-Push Verification Commands

Execute this sequence to confirm full release health before committing or pushing:

```bash
# 1. Run unit & integration test suite (264 tests)
npm test -- --concurrency=4

# 2. Run fail-closed release build & artifact verification
PUBLIC_SITE_URL=https://md2pdf.ladestack.in npm run build:release

# 3. Run comprehensive SEO audit on dist/
npm run audit:seo

# 4. Verify live production custom domain
node scripts/verify-live-deployment.mjs https://md2pdf.ladestack.in
```

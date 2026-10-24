# md2pdf — Search Console & Webmaster Tools Submission Checklist

This document provides a verified, factual deployment and indexing checklist for the site owner (**Girish Lade / LadeStack**) once the production domain is configured.

> **Important**: A sitemap is only generated when `PUBLIC_SITE_URL` is set to an authoritative HTTPS origin (e.g. `https://md2pdf.ladestack.in`). Under local builds, sitemap publication is intentionally omitted to prevent advertising invalid or unverified origins.

---

## Pre-Deployment Verification

- [ ] Confirm the production domain (e.g., `https://md2pdf.ladestack.in`).
- [ ] Ensure DNS A/AAAA and CNAME records are propagated and SSL/TLS is active with HSTS readiness.
- [ ] Build release artifacts using the exact authoritative origin:
  ```bash
  PUBLIC_SITE_URL=https://your-verified-domain.com npm run build:release
  ```
- [ ] Confirm that `build:release` passes with:
  - 99/99 HTML pages verified
  - 99 sitemap URLs verified
  - 990 reciprocal hreflang alternates (10 per URL including x-default) verified
  - 99 JSON-LD structured data blocks verified
- [ ] Verify that `dist/robots.txt` outputs:
  ```text
  User-agent: *
  Allow: /

  Sitemap: https://your-verified-domain.com/sitemap.xml
  ```
- [ ] Verify that `dist/sitemap.xml` is present, valid XML, and contains all 99 indexable URLs.

---

## 1. Google Search Console (GSC) Setup

1. **Sign in to Google Search Console**:
   - Access [https://search.google.com/search-console/](https://search.google.com/search-console/) with the owner account (`admin@ladestack.in`).
2. **Add Property**:
   - Prefer the **Domain property** (`ladestack.in` or `md2pdf.ladestack.in`) via DNS TXT verification.
   - Alternatively, add the **URL prefix property** (`https://your-verified-domain.com/`).
3. **Verify Ownership**:
   - DNS TXT record (recommended) or HTML file / meta tag if using URL prefix.
4. **Submit Sitemap**:
   - In the left sidebar, navigate to **Indexing > Sitemaps**.
   - In the "Add a new sitemap" input, enter `sitemap.xml`.
   - Click **Submit**.
   - Verify that the status turns to **Success** and that 99 discovered URLs are reported.
5. **Inspect Key URLs (URL Inspection Tool)**:
   - Inspect `https://your-verified-domain.com/` (Home).
   - Inspect `https://your-verified-domain.com/about/` (About page).
   - Inspect `https://your-verified-domain.com/blog/` (Journal index).
   - Click **Test Live URL** to confirm Googlebot can fetch the HTML without blockers.
   - Click **Request Indexing** for the primary homepage.
6. **Verify International Targeting & Hreflang**:
   - Ensure GSC detects all 9 language variants (`en`, `es`, `ja`, `ko`, `zh`, `ru`, `tr`, `fr`, `pt`) and `x-default`.

---

## 2. Bing Webmaster Tools Setup

1. **Sign in to Bing Webmaster Tools**:
   - Access [https://www.bing.com/webmasters/](https://www.bing.com/webmasters/).
2. **Import or Add Site**:
   - Fast track: **Import from Google Search Console** (synchronizes verified properties and sitemaps automatically).
   - Manual track: Add `https://your-verified-domain.com/` and verify via CNAME, XML file, or DNS TXT.
3. **Submit Sitemap**:
   - Navigate to **Sitemaps > Submit sitemap**.
   - Enter `https://your-verified-domain.com/sitemap.xml`.
   - Confirm status changes to **Processing** and then **Success**.
4. **URL Inspection**:
   - Test `https://your-verified-domain.com/` with the **URL Inspection tool** to verify crawlability and meta tags.

---

## 3. Post-Indexing Monitoring

- Monitor GSC **Coverage / Page Indexing** report weekly for crawl anomalies or 404s.
- Confirm canonicalization: Google should respect the self-referencing canonical on each localized page.
- Track Core Web Vitals (the static Astro site delivers near-perfect 100/100 performance scores with zero client JS overhead on editorial pages).

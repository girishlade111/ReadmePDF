# Security Headers

Status: **not yet verified against a deployed host.**

This repository is a static Astro build. It does not ship a hosting-provider
configuration (no `_headers`, `netlify.toml`, `vercel.json`, `staticwebapp.config.json`,
or server middleware), and it does not assume a provider. The headers below are a
provider-neutral baseline for whichever static host serves `dist/`.

Nothing in this document proves the production response headers. Verify them against
the real deployment after a domain and host are chosen.

---

## Why headers are not in the build

Astro writes `dist/` but cannot set HTTP response headers for an arbitrary static
host. Setting headers requires provider configuration at the edge, and inventing a
provider file here would silently do nothing on a different host. Add the provider
configuration only when the host is known.

Meta tags are **not** a substitute for response headers. In particular, a
`<meta http-equiv="Content-Security-Policy">` cannot enforce `frame-ancestors`,
`report-uri`, or sandbox behavior, and it does not protect the document before the
meta tag is parsed.

---

## Baseline headers

| Header | Recommended value | Why |
| ------ | ----------------- | --- |
| `Content-Security-Policy` | See [CSP baseline](#csp-baseline) | Restricts script, style, image, font, and network origins |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS after the domain is confirmed HTTPS-only |
| `X-Content-Type-Options` | `nosniff` | Stops MIME sniffing of JS/CSS/font responses |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends only the origin to GitHub and other external links |
| `X-Frame-Options` | `DENY` | Legacy clickjacking defense; keep alongside `frame-ancestors 'none'` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()` | The app uses none of these capabilities |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the browsing context; no OAuth popups are used |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents other sites from embedding this site's assets |
| `X-Permitted-Cross-Domain-Policies` | `none` | Blocks legacy Flash/PDF cross-domain policy loading |

Do **not** send `Cross-Origin-Embedder-Policy: require-corp`: the preview and PDF
pipeline load arbitrary README images from third-party hosts, and COEP would block
them unless every image host opted in with CORP/CORS.

Do **not** enable HSTS before HTTPS is confirmed on the apex and all subdomains.
`includeSubDomains` is irreversible for the `max-age` window in browsers that have
seen it.

---

## CSP baseline

Use this as a starting point, not a blind copy:

```text
default-src 'self';
script-src 'self' 'sha256-REPLACE_WITH_BUILD_HASH';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self';
connect-src 'self' https://api.github.com https://raw.githubusercontent.com https:;
object-src 'none';
base-uri 'none';
form-action 'none';
frame-ancestors 'none';
frame-src 'none';
worker-src 'none';
manifest-src 'self';
```

### Allowlist rationale

- `script-src 'self'` covers Astro's hashed module scripts. The site has exactly one
  inline executable script (the language switcher), so a SHA-256 hash is practical.
  JSON-LD and the i18n JSON block are data blocks, not executable scripts.
- `style-src 'unsafe-inline'` is required because the static HTML contains inline
  `style` attributes (Shiki code blocks and a few spacing utility exceptions).
  Refactoring those to classes would let you drop `'unsafe-inline'`; until then, a
  hash-only style policy would break syntax highlighting. CSS cannot execute script,
  but it can exfiltrate some data through selectors and URLs, so keep the rest of
  the policy tight.
- `img-src https:` is intentional: users paste arbitrary Markdown, and README images
  can live on any HTTPS host. `blob:` covers generated preview/export artifacts.
- `connect-src` must include `https:` because PDF export fetches remote README
  images into the PDF. If you only need GitHub imports and can accept that
  third-party images fail during export, remove the trailing `https:` and keep the
  two GitHub origins. `api.github.com` is the metadata/tree API;
  `raw.githubusercontent.com` serves READMEs and relative images.
- No `worker-src` origin is needed: the app runs no Web Workers. `worker-src 'none'`
  makes that explicit.
- `frame-ancestors 'none'` and `X-Frame-Options: DENY` are both present because
  older browsers ignore the CSP directive.

### Hash the inline script

The hash depends on the built HTML. Recompute it for every release build and put
the result in `script-src`:

```bash
node --input-type=module -e '
import fs from "node:fs";
import crypto from "node:crypto";
const html = fs.readFileSync("dist/index.html", "utf8");
const re = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+json|json)")[^>]*>([\s\S]*?)<\/script>/g;
let m;
const hashes = new Set();
while ((m = re.exec(html))) {
  hashes.add("sha256-" + crypto.createHash("sha256").update(m[1], "utf8").digest("base64"));
}
console.log([...hashes].join(" "));
'
```

For the inspected build the output was:

```text
sha256-uzFpKDZXuUT9fgfwwX05P8zx+cnulS2tNar5i0QajDU=
```

Treat that value as build-specific. If the language-switcher script changes, the hash
changes, and the CSP must change with it. A stale hash blocks the switcher. An
alternative is to move the switcher into an external module; that removes the hash
maintenance entirely.

### Rollout

1. Deploy with `Content-Security-Policy-Report-Only` first.
2. Exercise: language switch, GitHub import, paste/upload preview, book scan/build,
   single print, book print, ZIP export, and PDF export with an external image.
3. Fix or explicitly allow anything reported, then switch to the enforcing header.
4. Re-check the browser console after every dependency or build change.

A report-only policy does not block anything. Do not treat "no visible breakage" as
proof that the enforcing policy is safe.

---

## Verification

Replace `$SITE_URL` with the real HTTPS origin. Do not use the synthetic
`release-gate.md2pdf.dev` origin as if it were production.

```bash
SITE_URL="https://your-real-domain.example"

curl -sSI "$SITE_URL/" | grep -iE \
  '^(strict-transport-security|content-security-policy|x-content-type-options|referrer-policy|x-frame-options|permissions-policy|cross-origin-opener-policy|cross-origin-resource-policy):'
```

Check a deep route and a static asset too, not only the homepage:

```bash
curl -sSI "$SITE_URL/pt/blog/github-readme-to-pdf/" | grep -i '^content-security-policy:'
curl -sSI "$SITE_URL/_astro/" | head -n 20
```

Browser checks:

1. Open DevTools → Network → document request → Response Headers.
2. Open DevTools → Console and confirm there are no CSP violations after loading the
   page, switching languages, importing a repository, previewing, printing, and
   exporting.
3. Confirm the document is not embeddable: `curl -sSI "$SITE_URL/"` includes
   `frame-ancestors 'none'`, and an iframe test from another origin stays blank.
4. Confirm `http://` redirects to `https://` before HSTS is enabled.

Provider notes: if the host supports a `_headers` file, edge middleware, or a header
configuration UI, translate the table above there. Keep the configuration in the
repository once the provider is chosen so the policy is reviewable. This repository
intentionally does not guess that file today.

---

## Pre-launch checklist

- [ ] Production origin chosen and set as `PUBLIC_SITE_URL`
- [ ] `npm run build:release` passes with the real origin
- [ ] HTTPS redirect verified for apex and `www`
- [ ] CSP deployed in report-only mode, exercised, then enforced
- [ ] Inline-script hash matches the deployed build
- [ ] HSTS enabled only after HTTPS is confirmed
- [ ] `frame-ancestors` verified with a cross-origin iframe test
- [ ] Header check repeated on `/`, a locale route, a blog route, and an asset
- [ ] Browser console free of CSP violations
- [ ] No `Server` or `X-Powered-By` version leakage
- [ ] Deployed-header evidence recorded with URL, date, and raw response headers

Until the checklist is complete, the honest status is: **headers specified, not
verified in production.**

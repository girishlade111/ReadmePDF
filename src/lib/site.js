/**
 * Deployment-origin configuration.
 *
 * The public production domain is intentionally not hard-coded in this
 * repository. `PUBLIC_SITE_URL` is the single authoritative source for the
 * canonical origin. It is read at build time by `astro.config.mjs` and by the
 * SEO components/endpoints, so a deployment can never accidentally advertise
 * a domain that belongs to somebody else.
 *
 * Accepted values are bare HTTP(S) origins:
 *   https://readmepdf.example
 *   https://readmepdf.example/
 *
 * A path, query string, fragment, credentials, or non-HTTP protocol is
 * rejected. Hosting under a sub-path would also require Astro's `base`
 * configuration and relative asset rewriting, which this project does not
 * claim to support; failing loudly is safer than emitting broken canonicals.
 *
 * `parseSiteUrl` is intentionally permissive about HTTP and localhost so local
 * development keeps working. Release builds call `parseReleaseSiteUrl`, which
 * adds the public-production requirements (HTTPS, DNS hostname, no reserved
 * or placeholder domains).
 */

/**
 * @typedef {{ origin: string, href: string }} SiteConfig
 */

/**
 * Hostnames that can never be a public production origin. The list is
 * deliberately explicit: a release gate that guessed from a TLD alone would
 * either reject legitimate domains or allow a placeholder through.
 */
const RESERVED_RELEASE_HOSTS = Object.freeze([
  'example.com',
  'example.net',
  'example.org',
  'example.edu',
  'example',
  'localhost',
  'localhost.localdomain',
]);

/**
 * TLDs reserved by RFC 2606/6761 or commonly used only on private networks.
 * `.dev` is a real public TLD (and HSTS-preloaded), so it is not listed here.
 */
const RESERVED_RELEASE_TLDS = new Set([
  'example',
  'invalid',
  'test',
  'localhost',
  'local',
  'internal',
  'lan',
  'home',
]);

/**
 * Labels that are almost always placeholders in a copied example. The check
 * is exact-label based, so a legitimate domain such as `mydomain.com` is not
 * rejected merely because it contains the word "domain".
 */
const PLACEHOLDER_LABELS = new Set([
  'example',
  'placeholder',
  'yourdomain',
  'your-domain',
  'yoursite',
  'your-site',
  'replace-me',
  'changeme',
  'domain',
  'website',
  'mysite',
]);

function isIpLiteral(hostname) {
  if (hostname.startsWith('[') || hostname.includes(':')) return true;
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

/**
 * Parse and validate a deployment origin.
 *
 * @param {unknown} raw
 * @returns {SiteConfig|null} `null` when no value is configured.
 */
export function parseSiteUrl(raw) {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  if (!value) return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(
      'PUBLIC_SITE_URL must be an absolute URL such as https://example.com.',
    );
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError('PUBLIC_SITE_URL must use http:// or https://.');
  }
  if (url.username || url.password) {
    throw new TypeError('PUBLIC_SITE_URL must not contain credentials.');
  }
  if (url.search || url.hash) {
    throw new TypeError('PUBLIC_SITE_URL must not contain a query string or fragment.');
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new TypeError(
      'PUBLIC_SITE_URL must be a bare origin without a path. Configure Astro base separately if deploying under a sub-path.',
    );
  }

  return { origin: url.origin, href: url.origin };
}

/**
 * Parse the origin used by a release build.
 *
 * A release is public by definition, so unlike `parseSiteUrl` this refuses
 * HTTP, loopback/private IP literals, single-label hosts, reserved TLDs, and
 * obvious placeholder domains. The extra rules are enforced only here; local
 * development can still use `http://localhost:4321`.
 *
 * @param {unknown} raw
 * @returns {SiteConfig}
 */
export function parseReleaseSiteUrl(raw) {
  const site = parseSiteUrl(raw);
  if (!site) {
    throw new TypeError('PUBLIC_SITE_URL is required for npm run build:release.');
  }

  const url = new URL(site.origin);
  if (url.protocol !== 'https:') {
    throw new TypeError('Release builds require an https:// PUBLIC_SITE_URL.');
  }

  const hostname = url.hostname.toLowerCase();
  if (isIpLiteral(hostname)) {
    throw new TypeError('Release builds require a public DNS hostname, not an IP address.');
  }
  if (hostname.endsWith('.')) {
    throw new TypeError('PUBLIC_SITE_URL must not include a trailing dot in its hostname.');
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new TypeError('PUBLIC_SITE_URL must not point at localhost.');
  }
  if (!hostname.includes('.')) {
    throw new TypeError('PUBLIC_SITE_URL must use a fully qualified public hostname.');
  }

  const labels = hostname.split('.');
  if (
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
    )
  ) {
    throw new TypeError('PUBLIC_SITE_URL contains an invalid DNS label.');
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2 || RESERVED_RELEASE_TLDS.has(tld)) {
    throw new TypeError(`PUBLIC_SITE_URL uses a reserved or invalid TLD: .${tld}`);
  }
  if (RESERVED_RELEASE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    throw new TypeError(`PUBLIC_SITE_URL uses a reserved example/localhost hostname: ${hostname}`);
  }
  if (labels.some((label) => PLACEHOLDER_LABELS.has(label))) {
    throw new TypeError(`PUBLIC_SITE_URL looks like a placeholder hostname: ${hostname}`);
  }

  return site;
}

/**
 * Read `PUBLIC_SITE_URL` from an Astro/Vite environment object.
 *
 * @param {Record<string, unknown>|undefined} env
 * @returns {SiteConfig|null}
 */
export function siteFromEnv(env) {
  return parseSiteUrl(env?.PUBLIC_SITE_URL);
}

/**
 * Join a root-relative path to the configured origin. When no origin is
 * configured the path is returned unchanged, which remains a valid
 * self-referencing canonical for the current document.
 *
 * @param {SiteConfig|null} site
 * @param {string} path
 */
export function absoluteUrl(site, path) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return site ? `${site.origin}${clean}` : clean;
}

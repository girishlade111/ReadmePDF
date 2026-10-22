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
 */

/**
 * @typedef {{ origin: string, href: string }} SiteConfig
 */

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

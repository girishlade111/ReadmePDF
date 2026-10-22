/**
 * robots.txt for the static deployment.
 *
 * The sitemap reference is emitted only when an absolute deployment origin is
 * configured; a relative `Sitemap:` value is invalid per the robots.txt spec.
 */
import { buildRobotsTxt } from '../lib/seo.js';
import { siteFromEnv } from '../lib/site.js';

export function GET() {
  const site = siteFromEnv(import.meta.env);
  return new Response(buildRobotsTxt(site), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

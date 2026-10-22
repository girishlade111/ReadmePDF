/**
 * Multilingual XML sitemap.
 *
 * The sitemap protocol requires absolute URLs, so this endpoint is only
 * published when `PUBLIC_SITE_URL` is a validated bare origin. Without it the
 * response is an honest 404 instead of a sitemap full of relative URLs that
 * search engines would reject.
 */
import { getCollection } from 'astro:content';
import {
  buildSitemapEntries,
  buildSitemapPages,
  buildSitemapXml,
} from '../lib/seo.js';
import { siteFromEnv } from '../lib/site.js';

export async function GET() {
  const site = siteFromEnv(import.meta.env);
  if (!site) {
    return new Response('Sitemap is not published: PUBLIC_SITE_URL is not configured.\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const pages = buildSitemapPages(posts);
  const entries = buildSitemapEntries(pages, site);

  return new Response(buildSitemapXml(entries), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

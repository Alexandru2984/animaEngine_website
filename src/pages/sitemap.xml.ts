import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * /sitemap.xml, built at compile time. No <lastmod>: the site has no reliable
 * per-page modification date, and a made-up one would mislead crawlers.
 */
export const STATIC_ROUTES = ['/', '/features/', '/showcase/', '/download/', '/docs/', '/changelog/', '/privacy/'];

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://animaengine.eu');
  const docs = (await getCollection('docs')).map((d) => `/docs/${d.id}/`);
  const urls = [...STATIC_ROUTES, ...docs].map((path) => new URL(path, base).href);
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

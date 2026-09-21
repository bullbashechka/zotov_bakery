import type { APIRoute } from 'astro';
import { getCanonicalUrl } from '@/lib/site-origin.mjs';

export const GET: APIRoute = () => {
  const origin = import.meta.env.PUBLIC_WEBSITE_URL;
  const urls = ['/', '/privacy/']
    .map((path) => getCanonicalUrl(origin, path))
    .filter((url): url is string => Boolean(url));
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

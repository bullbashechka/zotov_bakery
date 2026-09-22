import type { APIRoute } from 'astro';
import { getCanonicalUrl, validateSearchIndexing } from '@/lib/site-origin.mjs';

export const GET: APIRoute = () => {
  const production = import.meta.env.PROD;
  const allowIndexing = validateSearchIndexing(import.meta.env.PUBLIC_ALLOW_INDEXING, { required: production });
  const urls = allowIndexing
    ? ['/', '/privacy/'].map((path) =>
      getCanonicalUrl(import.meta.env.PUBLIC_WEBSITE_URL, path, { required: production }),
    )
    : [];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${url}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

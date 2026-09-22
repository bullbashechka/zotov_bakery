import type { APIRoute } from 'astro';
import { getCanonicalUrl, validateSearchIndexing } from '@/lib/site-origin.mjs';

export const GET: APIRoute = () => {
  const production = import.meta.env.PROD;
  const allowIndexing = validateSearchIndexing(import.meta.env.PUBLIC_ALLOW_INDEXING, { required: production });
  const sitemap = allowIndexing
    ? getCanonicalUrl(import.meta.env.PUBLIC_WEBSITE_URL, '/sitemap.xml', { required: production })
    : undefined;
  const sitemapLine = sitemap ? `\nSitemap: ${sitemap}\n` : '';
  return new Response(`User-agent: *\nAllow: /\n${sitemapLine}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

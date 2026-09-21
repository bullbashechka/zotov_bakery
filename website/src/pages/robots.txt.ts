import type { APIRoute } from 'astro';
import { getCanonicalUrl } from '@/lib/site-origin.mjs';

export const GET: APIRoute = () => {
  const sitemap = getCanonicalUrl(import.meta.env.PUBLIC_WEBSITE_URL, '/sitemap.xml');
  const sitemapLine = sitemap ? `\nSitemap: ${sitemap}\n` : '';
  return new Response(`User-agent: *\nAllow: /\n${sitemapLine}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

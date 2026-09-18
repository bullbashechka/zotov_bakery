import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const inlineScriptHashes = [
  './src/scripts/hero-preparation.inline.js',
  './src/scripts/site-header.inline.js',
].map((path) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  return {
    hash: `sha256-${createHash('sha256').update(source).digest('base64')}`,
    kind: 'element',
  };
});

export default defineConfig({
  output: 'static',
  integrations: [react()],
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "base-uri 'none'",
        "connect-src 'self'",
        "font-src 'self'",
        "form-action 'none'",
        "frame-src 'none'",
        "img-src 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        hashes: inlineScriptHashes,
        resources: [
          { resource: "'self'", kind: 'element' },
          { resource: "'none'", kind: 'attribute' },
        ],
      },
      styleDirective: {
        resources: [
          { resource: "'self'", kind: 'element' },
          { resource: "'unsafe-inline'", kind: 'element' },
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()]
  }
});

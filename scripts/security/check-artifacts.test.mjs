import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkHtml, checkArtifacts } from './check-artifacts.mjs';

const script = 'window.safe = true;';
const hash = createHash('sha256').update(script).digest('base64');
const policy = `default-src 'self'; script-src 'self' 'sha256-${hash}'; object-src 'none'; base-uri 'none'; form-action 'none'`;
function html(body = `<script>${script}</script>`, csp = policy, pathname = '/', robots = '') {
  const origin = 'https://test.pages.dev';
  const homepageSeo = pathname === '/'
    ? `<meta property="og:url" content="${origin}/"><meta property="og:image" content="${origin}/social-preview.jpg"><script type="application/ld+json">{"@context":"https://schema.org","@type":["Bakery","LocalBusiness"],"url":"${origin}"}</script>`
    : '';
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"><link rel="canonical" href="${origin}${pathname}">${robots}${homepageSeo}</head><body>${body}</body></html>`;
}

test('allows explicitly hashed code and correct Pages origin', () => {
  checkHtml(html(), 'index.html', 'https://test.pages.dev');
});
test('rejects injected, mutated and remotely sourced executable code', () => {
  for (const body of [`<script>${script}alert(1)</script>`, '<script src="https://example.invalid/evil.js"></script>', '<img src="/x" onerror="alert(1)">', '<a href="java&#9;script:alert(1)">x</a>']) {
    assert.throws(() => checkHtml(html(body), 'index.html', 'https://test.pages.dev'));
  }
});
test('rejects weakened CSP and wrong canonical', () => {
  assert.throws(() => checkHtml(html('', policy.replace("'self' 'sha256-", "'unsafe-inline' 'sha256-")), 'index.html'));
  assert.throws(() => checkHtml(html(), 'index.html', 'https://other.pages.dev'));
  assert.throws(() => checkHtml('<html></html>', 'index.html'));
  assert.throws(() => checkHtml(html('', `script-src 'unsafe-inline'; ${policy}`), 'index.html'));
  assert.throws(() => checkHtml(html('', policy.replace("script-src 'self'", "script-src 'self' https://unexpected.example")), 'index.html'));
  assert.throws(() => checkHtml(html('<style>body{color:red}</style>'), 'index.html'), /inline style missing CSP hash/);
});
test('permits the deliberate style-only inline exception but models hash precedence', () => {
  checkHtml(html('<style>body{color:red}</style>', `${policy}; style-src-elem 'self' 'unsafe-inline'`), 'index.html');
  assert.throws(() => checkHtml(html('<style>body{color:red}</style>', `${policy}; style-src-elem 'unsafe-inline' 'sha256-${hash}'`), 'index.html'), /inline style missing CSP hash/);
});

test('requires noindex when indexing is disabled', () => {
  assert.throws(() => checkHtml(html(), 'index.html', 'https://test.pages.dev', { allowIndexing: false }), /missing noindex/);
  checkHtml(
    html(`<script>${script}</script>`, policy, '/', '<meta name="robots" content="noindex,follow">'),
    'index.html',
    'https://test.pages.dev',
    { allowIndexing: false },
  );
});
test('artifact scanner catches accidental secrets and source maps in publication directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zotov-artifact-test-'));
  try {
    for (const route of ['privacy']) {
      await mkdir(join(dir, route));
      await writeFile(join(dir, route, 'index.html'), html('', policy, `/${route}/`, '<meta name="robots" content="noindex,follow">'));
    }
    await writeFile(join(dir, 'index.html'), html('', policy, '/', '<meta name="robots" content="noindex,follow">'));
    await writeFile(join(dir, '404.html'), html('', policy, '/', '<meta name="robots" content="noindex,follow">'));
    await writeFile(join(dir, 'robots.txt'), 'User-agent: *\nAllow: /\n');
    await writeFile(join(dir, 'sitemap.xml'), '<?xml version="1.0"?><urlset></urlset>');
    await writeFile(join(dir, '_headers'), "/*\n  Content-Security-Policy: frame-ancestors 'none';\n/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n/fonts/*\n  Cache-Control: public, max-age=2592000\n");
    await checkArtifacts(dir, 'https://test.pages.dev', { allowIndexing: false });
    await writeFile(join(dir, '.env'), 'SYNTHETIC_EXAMPLE=not-a-secret');
    await assert.rejects(checkArtifacts(dir), /hidden file/);
    await rm(join(dir, '.env'));
    await writeFile(join(dir, 'client.js.map'), '{}');
    await assert.rejects(checkArtifacts(dir), /Unexpected build file/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

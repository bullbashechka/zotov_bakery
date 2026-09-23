import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkHtml, checkArtifacts, checkSitemap } from './check-artifacts.mjs';

const script = 'window.safe = true;';
const hash = createHash('sha256').update(script).digest('base64');
const policy = `default-src 'self'; script-src 'self' 'sha256-${hash}'; object-src 'none'; base-uri 'none'; form-action 'none'`;
const business = {
  '@context': 'https://schema.org', '@type': ['Bakery', 'LocalBusiness'], url: 'https://test.pages.dev', name: 'ZOTOV bakery',
  address: { '@type': 'PostalAddress', streetAddress: 'ул. Лермонтова, 63', addressLocality: 'Петропавловск', addressCountry: 'KZ' },
  telephone: ['+7 (707) 493-93-63'],
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '09:00', closes: '22:00' }],
};
const contacts = '<section id="contacts">Петропавловск, ул. Лермонтова, 63. пн–вс: 09:00–22:00 <a href="tel:+77074939363">+7 (707) 493-93-63</a></section>';
function html(body = `<script>${script}</script>`, csp = policy, pathname = '/', robots = '') {
  const origin = 'https://test.pages.dev';
  const homepageSeo = pathname === '/'
    ? `<meta property="og:url" content="${origin}/"><meta property="og:image" content="${origin}/social-preview.png"><script type="application/ld+json">${JSON.stringify(business)}</script>`
    : '';
  return `<!doctype html><html><head><title>ZOTOV bakery</title><meta name="description" content="Пекарня в Петропавловске"><meta http-equiv="Content-Security-Policy" content="${csp}"><link rel="canonical" href="${origin}${pathname}">${robots}${homepageSeo}</head><body><h1>ZOTOV bakery</h1>${contacts}${body}</body></html>`;
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
test('rejects missing, empty and duplicate page metadata', () => {
  for (const fragment of ['<title>ZOTOV bakery</title>', '<h1>ZOTOV bakery</h1>', '<meta name="description" content="Пекарня в Петропавловске">']) {
    assert.throws(() => checkHtml(html().replace(fragment, ''), 'index.html'));
    assert.throws(() => checkHtml(html().replace(fragment, fragment + fragment), 'index.html'));
  }
  for (const [from, to] of [['<title>ZOTOV bakery</title>', '<title> </title>'], ['<h1>ZOTOV bakery</h1>', '<h1> </h1>'], ['content="Пекарня в Петропавловске"', 'content=" "']]) {
    assert.throws(() => checkHtml(html().replace(from, to), 'index.html'), /empty/);
  }
});

test('rejects duplicate canonical and contradictory crawler directives', () => {
  assert.throws(() => checkHtml(html().replace('</head>', '<link rel="canonical" href="https://other.example/"> </head>'), 'index.html', business.url), /expected one canonical/);
  const noindex = '<meta name="robots" content="noindex,follow">';
  assert.throws(() => checkHtml(html('', policy, '/', noindex), 'index.html', business.url), /unexpected robots/);
  for (const extra of ['<meta name="robots" content="index">', '<meta name="googlebot" content="index">']) {
    assert.throws(() => checkHtml(html('', policy, '/', noindex + extra), 'index.html', business.url, { allowIndexing: false }), /conflicting robots/);
  }
  checkHtml(html('', policy, '/', noindex), '404.html', business.url);
});

test('schema agrees with visible business information and parses as JSON', () => {
  const options = { requireHomepageSeo: true };
  checkHtml(html(), 'index.html', business.url, options);
  for (const mutate of [
    (value) => { value.name = 'Other bakery'; },
    (value) => { value.address.streetAddress = 'Wrong street'; },
    (value) => { value.telephone = ['+70000000000']; },
    (value) => { value.openingHoursSpecification[0].closes = '23:00'; },
  ]) {
    const changed = structuredClone(business);
    mutate(changed);
    assert.throws(() => checkHtml(html().replace(JSON.stringify(business), JSON.stringify(changed)), 'index.html', business.url, options), /schema/);
  }
  assert.throws(() => checkHtml(html().replace(JSON.stringify(business), '{invalid'), 'index.html', business.url, options), SyntaxError);
});

test('strict XML sitemap contains exactly the canonical indexable URLs', () => {
  const sitemap = (urls) => `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`;
  const urls = [business.url + '/', business.url + '/privacy/'];
  checkSitemap(sitemap(urls), business.url, true);
  checkSitemap(sitemap([]), business.url, false);
  for (const entries of [[urls[0]], [...urls, urls[0]], [...urls, business.url + '/404/'], ['https://other.example/', urls[1]]]) {
    assert.throws(() => checkSitemap(sitemap(entries), business.url, true));
  }
  assert.throws(() => checkSitemap(sitemap(urls), business.url, false), /noindex/);
  for (const xml of [sitemap(urls).replace('</loc>', '</wrong>'), sitemap(urls).replace('http://www.sitemaps.org/schemas/sitemap/0.9', 'https://wrong.example'), sitemap(urls).replace('<url>', '<url><loc>extra</loc>'), '<!DOCTYPE urlset>' + sitemap([])]) {
    assert.throws(() => checkSitemap(xml, business.url, true));
  }
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
    await writeFile(join(dir, 'sitemap.xml'), '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    await writeFile(join(dir, '_headers'), "/*\n  Content-Security-Policy: frame-ancestors 'none';\n/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n/fonts/*\n  Cache-Control: public, max-age=2592000\n");
    await checkArtifacts(dir, 'https://test.pages.dev', { allowIndexing: false });
    for (const name of ['_headers', 'robots.txt']) {
      const contents = await readFile(join(dir, name), 'utf8');
      await writeFile(join(dir, name), contents.replace(/\n/g, '\r\n'));
    }
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

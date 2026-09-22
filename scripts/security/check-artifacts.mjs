import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, relative, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';

export function parsePolicy(value) {
  const entries = value.split(';').map((part) => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values];
  }).filter(([name]) => name);
  assert.equal(new Set(entries.map(([name]) => name)).size, entries.length, 'Duplicate CSP directive');
  return new Map(entries);
}

function elements(node, result = []) {
  if (node.tagName) result.push(node);
  for (const child of node.childNodes ?? []) elements(child, result);
  if (node.content) elements(node.content, result);
  return result;
}
const attribute = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const sources = (policy, name, fallback) => policy.get(name) ?? policy.get(fallback) ?? policy.get('default-src') ?? [];

export function checkHtml(html, file, origin, { allowIndexing = true, requireHomepageSeo = false } = {}) {
  const nodes = elements(parse(html));
  const csp = nodes.find((node) => node.tagName === 'meta' && attribute(node, 'http-equiv')?.toLowerCase() === 'content-security-policy');
  assert(csp, `${file}: missing enforced CSP`);
  const policy = parsePolicy(attribute(csp, 'content') ?? '');
  // Map values contain the directive's sources, not its name.
  for (const name of ['object-src', 'base-uri', 'form-action']) {
    assert.deepEqual(policy.get(name), ["'none'"], `${file}: ${name} must be none`);
  }
  const scripts = sources(policy, 'script-src-elem', 'script-src');
  assert(scripts.length > 0, `${file}: missing script policy`);
  assert(!scripts.some((value) => ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'http:', 'data:'].includes(value)), `${file}: unsafe script policy`);
  assert(scripts.every((value) => ["'self'", "'none'", 'https://mc.yandex.ru', 'https://yastatic.net'].includes(value) || /^'sha(?:256|384|512)-[A-Za-z0-9+/]+=*'$/.test(value)), `${file}: unexpected script source`);
  const styles = sources(policy, 'style-src-elem', 'style-src');
  // Wrapper emits trusted, per-instance CSS; GSAP also updates style attributes.
  // The release policy deliberately permits inline styles, never inline scripts.
  // Browsers ignore unsafe-inline when the same directive contains hashes/nonces.
  const allowsInlineStyles = styles.includes("'unsafe-inline'") && !styles.some((source) => /^'(?:sha|nonce-)/.test(source));
  for (const node of nodes.filter((item) => item.tagName === 'style')) {
    const text = (node.childNodes ?? []).map((child) => child.value ?? '').join('');
    assert(allowsInlineStyles || ['sha256', 'sha384', 'sha512'].some((algorithm) => styles.includes(`'${algorithm}-${createHash(algorithm).update(text).digest('base64')}'`)), `${file}: inline style missing CSP hash`);
  }
  for (const node of nodes.filter((item) => item.tagName === 'script')) {
    const src = attribute(node, 'src');
    if (src) {
      assert(src.startsWith('/') && !src.startsWith('//'), `${file}: script must be a local absolute path`);
      assert(scripts.includes("'self'"), `${file}: local scripts not permitted`);
    } else {
      const type = attribute(node, 'type');
      if (['application/ld+json', 'application/json'].includes(type)) continue;
      const text = (node.childNodes ?? []).map((child) => child.value ?? '').join('');
      assert(['sha256', 'sha384', 'sha512'].some((algorithm) => scripts.includes(`'${algorithm}-${createHash(algorithm).update(text).digest('base64')}'`)), `${file}: inline script missing CSP hash`);
    }
  }
  for (const node of nodes) {
    assert(!['base', 'iframe', 'object', 'embed', 'form'].includes(node.tagName), `${file}: unexpected active element`);
    assert(!(node.attrs ?? []).some(({ name }) => /^on/i.test(name)), `${file}: inline event handler`);
    for (const name of ['href', 'src', 'action', 'formaction']) {
      const value = attribute(node, name);
      assert(!value || !/^(?:javascript|vbscript):/i.test(value.replace(/[\u0000-\u0020]/g, '')), `${file}: unsafe URL scheme`);
    }
  }
  const robots = nodes.find((node) => node.tagName === 'meta' && attribute(node, 'name')?.toLowerCase() === 'robots');
  const expectsNoindex = file === '404.html' || !allowIndexing;
  if (expectsNoindex) {
    assert.equal(attribute(robots ?? {}, 'content'), 'noindex,follow', `${file}: missing noindex,follow`);
  } else {
    assert.equal(attribute(robots ?? {}, 'content'), undefined, `${file}: unexpected robots directive`);
  }
  if (origin && file !== '404.html') {
    const canonical = nodes.find((node) => node.tagName === 'link' && attribute(node, 'rel') === 'canonical');
    const pathname = file === 'index.html' ? '/' : `/${file.replace(/index\.html$/, '')}`;
    assert.equal(attribute(canonical ?? {}, 'href'), new URL(pathname, origin).href, `${file}: wrong canonical`);
  }
  if (requireHomepageSeo && origin && file === 'index.html') {
    const ogUrl = nodes.find((node) => node.tagName === 'meta' && attribute(node, 'property') === 'og:url');
    const ogImage = nodes.find((node) => node.tagName === 'meta' && attribute(node, 'property') === 'og:image');
    assert.equal(attribute(ogUrl ?? {}, 'content'), new URL('/', origin).href, 'index.html: wrong Open Graph URL');
    assert.equal(attribute(ogImage ?? {}, 'content'), new URL('/social-preview.jpg', origin).href, 'index.html: wrong Open Graph image');
    const schema = nodes.find((node) => node.tagName === 'script' && attribute(node, 'type') === 'application/ld+json');
    assert(schema, 'index.html: missing LocalBusiness JSON-LD');
    const structuredData = JSON.parse((schema.childNodes ?? []).map((node) => node.value ?? '').join(''));
    assert.equal(structuredData.url, origin, 'index.html: wrong LocalBusiness URL');
    const types = Array.isArray(structuredData['@type']) ? structuredData['@type'] : [structuredData['@type']];
    assert(types.includes('Bakery') && types.includes('LocalBusiness'), 'index.html: incomplete LocalBusiness types');
  }
}

export async function checkArtifacts(directory = 'website/dist', origin = process.env.PUBLIC_WEBSITE_URL, { allowIndexing = true } = {}) {
  const root = resolve(directory);
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      assert(!(await lstat(full)).isSymbolicLink(), 'Build contains symlink');
      assert(!entry.name.startsWith('.'), 'Build contains hidden file');
      if (entry.isDirectory()) await walk(full);
      else files.push(relative(root, full).replaceAll('\\', '/'));
    }
  }
  await walk(root);
  for (const file of files) {
    assert(!/\.(?:map|ts|tsx|astro|pem|key|toml|ya?ml)$/i.test(file), `Unexpected build file: ${file}`);
    assert(!/^(?:package(?:-lock)?\.json|bun\.lockb?|wrangler\.jsonc?|_worker\.js|_routes\.json|\.dev\.vars.*)$/i.test(basename(file)), `Unexpected build file: ${file}`);
    assert(!/(?:^|\/)(?:node_modules|storybook|storybook-static|functions|\.git)(?:\/|$)/i.test(file), `Unexpected build directory: ${file}`);
  }
  for (const file of ['index.html', 'privacy/index.html', '404.html', 'robots.txt', 'sitemap.xml', '_headers']) assert(files.includes(file), `Missing build file: ${file}`);
  const headers = await readFile(resolve(root, '_headers'), 'utf8');
  assert(/Content-Security-Policy:\s*[^\n]*frame-ancestors 'none'/i.test(headers), 'Missing HTTP frame-ancestors policy');
  assert(/\/_astro\/\*\n\s+Cache-Control:\s*public, max-age=31536000, immutable/i.test(headers), 'Missing immutable cache policy for fingerprinted assets');
  assert(/\/fonts\/\*\n\s+Cache-Control:\s*public, max-age=2592000/i.test(headers), 'Missing cache policy for fonts');
  for (const line of headers.split('\n')) assert(line.length <= 2000, 'Pages header line exceeds limit');
  const pages = files.filter((file) => file.endsWith('.html'));
  for (const file of pages) {
    checkHtml(await readFile(resolve(root, file), 'utf8'), file, origin, {
      allowIndexing,
      requireHomepageSeo: true,
    });
  }
  const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');
  assert.match(robots, /^User-agent: \*\nAllow: \/\n/m, 'robots.txt must allow crawling');
  const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
  if (allowIndexing) {
    assert(origin, 'An indexable artifact requires a canonical origin');
    const sitemapUrl = new URL('/sitemap.xml', origin).href;
    assert.match(robots, new RegExp(`^Sitemap: ${sitemapUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), 'robots.txt: wrong sitemap URL');
    for (const pathname of ['/', '/privacy/']) {
      assert(sitemap.includes(`<loc>${new URL(pathname, origin).href}</loc>`), `sitemap.xml: missing ${pathname}`);
    }
  } else {
    assert.doesNotMatch(robots, /^Sitemap:/m, 'robots.txt must not advertise noindex pages');
    assert(!sitemap.includes('<loc>'), 'sitemap.xml must not include noindex pages');
  }
  console.log(`Artifact security OK: ${files.length} files, ${pages.length} pages.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await checkArtifacts(process.argv[2], process.env.PUBLIC_WEBSITE_URL, {
    allowIndexing: process.env.PUBLIC_ALLOW_INDEXING === 'true',
  });
}

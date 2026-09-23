import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, relative, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';
import sax from 'sax';

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
const textContent = (node) => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(textContent).join('');
const normalizedText = (value) => value.replace(/\s+/g, ' ').trim();

export function checkSitemap(xml, origin, allowIndexing) {
  const parser = sax.parser(true, { xmlns: true });
  const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
  const stack = [];
  const urls = [];
  let location = '';
  let rootCount = 0;
  let locCount = 0;
  parser.ondoctype = () => { throw new Error('sitemap.xml: DTD is not allowed'); };
  parser.onopentag = (node) => {
    assert.equal(node.uri, namespace, 'sitemap.xml: wrong namespace');
    const expected = ['urlset', 'url', 'loc'][stack.length];
    assert.equal(node.local, expected, 'sitemap.xml: unexpected element');
    if (stack.length === 0) rootCount++;
    if (node.local === 'url') locCount = 0;
    if (node.local === 'loc') { locCount++; location = ''; }
    stack.push(node.local);
  };
  const readText = (text) => {
    if (stack.at(-1) === 'loc') location += text;
    else assert(!text.trim(), 'sitemap.xml: unexpected text');
  };
  parser.ontext = readText;
  parser.oncdata = readText;
  parser.onclosetag = () => {
    const tag = stack.pop();
    if (tag === 'loc') urls.push(location.trim());
    if (tag === 'url') assert.equal(locCount, 1, 'sitemap.xml: expected one loc per url');
  };
  parser.write(xml).close();
  assert.equal(rootCount, 1, 'sitemap.xml: expected one urlset');
  assert.equal(new Set(urls).size, urls.length, 'sitemap.xml: duplicate URL');
  if (allowIndexing) assert(origin, 'An indexable artifact requires a canonical origin');
  const expected = allowIndexing ? ['/', '/privacy/'].map((path) => new URL(path, origin).href) : [];
  assert.deepEqual(urls.sort(), expected.sort(), 'sitemap.xml: unexpected URL set (including noindex pages or wrong canonical origin)');
}

export function checkHtml(html, file, origin, { allowIndexing = true, requireHomepageSeo = false } = {}) {
  const nodes = elements(parse(html));
  for (const tag of ['title', 'h1']) {
    const matches = nodes.filter((node) => node.tagName === tag);
    assert.equal(matches.length, 1, `${file}: expected one ${tag}`);
    assert(normalizedText(textContent(matches[0])), `${file}: empty ${tag}`);
  }
  const descriptions = nodes.filter((node) => node.tagName === 'meta' && attribute(node, 'name')?.toLowerCase() === 'description');
  assert.equal(descriptions.length, 1, `${file}: expected one description`);
  assert(attribute(descriptions[0], 'content')?.trim(), `${file}: empty description`);
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
  const robotTags = nodes.filter((node) => node.tagName === 'meta' && ['robots', 'googlebot', 'bingbot', 'yandex'].includes(attribute(node, 'name')?.toLowerCase()));
  assert(robotTags.length <= 1 && robotTags.every((node) => attribute(node, 'name').toLowerCase() === 'robots'), `${file}: duplicate or conflicting robots directives`);
  const robots = robotTags[0];
  const expectsNoindex = file === '404.html' || !allowIndexing;
  if (expectsNoindex) {
    assert.equal(attribute(robots ?? {}, 'content'), 'noindex,follow', `${file}: missing noindex,follow`);
  } else {
    assert.equal(attribute(robots ?? {}, 'content'), undefined, `${file}: unexpected robots directive`);
  }
  if (origin && file !== '404.html') {
    const canonicals = nodes.filter((node) => node.tagName === 'link' && attribute(node, 'rel')?.toLowerCase().split(/\s+/).includes('canonical'));
    assert.equal(canonicals.length, 1, `${file}: expected one canonical`);
    const canonical = canonicals[0];
    const pathname = file === 'index.html' ? '/' : `/${file.replace(/index\.html$/, '')}`;
    assert.equal(attribute(canonical ?? {}, 'href'), new URL(pathname, origin).href, `${file}: wrong canonical`);
  }
  if (requireHomepageSeo && origin && file === 'index.html') {
    const ogUrl = nodes.find((node) => node.tagName === 'meta' && attribute(node, 'property') === 'og:url');
    const ogImage = nodes.find((node) => node.tagName === 'meta' && attribute(node, 'property') === 'og:image');
    assert.equal(attribute(ogUrl ?? {}, 'content'), new URL('/', origin).href, 'index.html: wrong Open Graph URL');
    assert.equal(attribute(ogImage ?? {}, 'content'), new URL('/social-preview.png', origin).href, 'index.html: wrong Open Graph image');
    const schema = nodes.find((node) => node.tagName === 'script' && attribute(node, 'type') === 'application/ld+json');
    assert(schema, 'index.html: missing LocalBusiness JSON-LD');
    const structuredData = JSON.parse((schema.childNodes ?? []).map((node) => node.value ?? '').join(''));
    assert.equal(structuredData.url, origin, 'index.html: wrong LocalBusiness URL');
    const types = Array.isArray(structuredData['@type']) ? structuredData['@type'] : [structuredData['@type']];
    assert(types.includes('Bakery') && types.includes('LocalBusiness'), 'index.html: incomplete LocalBusiness types');
    assert.equal(structuredData['@context'], 'https://schema.org', 'index.html: wrong schema context');
    const visibleText = normalizedText(textContent(nodes.find((node) => node.tagName === 'body')));
    const contacts = nodes.find((node) => attribute(node, 'id') === 'contacts');
    assert(contacts, 'index.html: missing visible contacts');
    const contactText = normalizedText(textContent(contacts));
    for (const [label, value] of Object.entries({ name: structuredData.name, streetAddress: structuredData.address?.streetAddress, addressLocality: structuredData.address?.addressLocality })) {
      assert(typeof value === 'string' && value.trim(), `index.html: missing schema ${label}`);
      assert((label === 'name' ? visibleText : contactText).includes(value), `index.html: schema ${label} differs from visible content`);
    }
    assert.equal(structuredData.address?.['@type'], 'PostalAddress', 'index.html: wrong address type');
    assert.equal(structuredData.address?.addressCountry, 'KZ', 'index.html: wrong address country');
    const phones = elements(contacts).filter((node) => node.tagName === 'a' && attribute(node, 'href')?.startsWith('tel:')).map((node) => attribute(node, 'href').replace(/\D/g, ''));
    assert(Array.isArray(structuredData.telephone), 'index.html: missing schema phones');
    assert.deepEqual(structuredData.telephone.map((phone) => phone.replace(/\D/g, '')).sort(), phones.sort(), 'index.html: schema phones differ from visible contacts');
    const hours = structuredData.openingHoursSpecification;
    assert(Array.isArray(hours) && hours.length === 1, 'index.html: expected one opening hours specification');
    assert.equal(hours[0]['@type'], 'OpeningHoursSpecification');
    assert.deepEqual([...hours[0].dayOfWeek].sort(), ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].sort(), 'index.html: expected daily hours');
    assert.match(hours[0].opens, /^\d{2}:\d{2}$/);
    assert.match(hours[0].closes, /^\d{2}:\d{2}$/);
    assert(contactText.includes(`пн–вс: ${hours[0].opens}–${hours[0].closes}`), 'index.html: schema hours differ from visible contacts');
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
  const headers = (await readFile(resolve(root, '_headers'), 'utf8')).replace(/\r\n/g, '\n');
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
  const robots = (await readFile(resolve(root, 'robots.txt'), 'utf8')).replace(/\r\n/g, '\n');
  assert.match(robots, /^User-agent: \*\nAllow: \/\n/m, 'robots.txt must allow crawling');
  const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
  checkSitemap(sitemap, origin, allowIndexing);
  if (allowIndexing) {
    assert(origin, 'An indexable artifact requires a canonical origin');
    const sitemapUrl = new URL('/sitemap.xml', origin).href;
    assert.match(robots, new RegExp(`^Sitemap: ${sitemapUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), 'robots.txt: wrong sitemap URL');
  } else {
    assert.doesNotMatch(robots, /^Sitemap:/m, 'robots.txt must not advertise noindex pages');
  }
  console.log(`Artifact security OK: ${files.length} files, ${pages.length} pages.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await checkArtifacts(process.argv[2], process.env.PUBLIC_WEBSITE_URL, {
    allowIndexing: process.env.PUBLIC_ALLOW_INDEXING === 'true',
  });
}

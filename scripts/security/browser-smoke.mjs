import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

// Serve only the built files. This checks browser behavior, not Hoster/Apache
// headers, redirects or .htaccess handling; verify those on the live host.
const root = resolve('website/dist');
const types = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html' });
    response.end(await readFile(resolve(root, '404.html')));
  }
});
await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  await mkdir('artifacts/checks', { recursive: true });
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'Local contact handoff fixture' }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', () => errors.push('Resource failed'));
    page.on('response', (response) => {
      if (response.status() >= 400 && response.request().resourceType() !== 'document') errors.push('Asset HTTP error');
    });
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => window.__cspViolations.push(event.effectiveDirective));
    });
    // Keep this local and deterministic: external navigation is never performed.
    await page.route('**/*', (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        errors.push('Unexpected external resource');
        return route.abort();
      }
      return route.continue();
    });
    assert.equal((await page.goto(origin, { waitUntil: 'networkidle' })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    if (await page.locator('[data-cookie-consent]').count()) {
      await page.locator('[data-cookie-deny]').click();
      await page.waitForFunction(() => document.querySelector('[data-cookie-consent]').hidden);
    }
    if (width === 390) {
      await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
      assert.equal(await page.locator('.site-header__menu-toggle').getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.site-header__menu-toggle').getAttribute('aria-expanded'), 'false');
    }
    await page.locator('#zotov-faq-2-question').click();
    assert.equal(await page.locator('#zotov-faq-2-question').getAttribute('aria-expanded'), 'true');
    const activePhoto = page.locator('[data-photo][aria-pressed="true"]');
    const previous = await activePhoto.getAttribute('data-index');
    await activePhoto.focus();
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await activePhoto.getAttribute('data-index'), previous, 'Carousel did not change');
    assert(await page.locator('#contacts a[href^="tel:"]').count(), 'Missing phone contact');
    const whatsapp = page.locator('#conversion a[href^="https://wa.me/"]').first();
    const href = new URL(await whatsapp.getAttribute('href'));
    assert.equal(href.pathname, '/77074939363', 'Wrong WhatsApp contact');
    const popupReady = page.waitForEvent('popup');
    await whatsapp.click();
    const popup = await popupReady;
    await popup.waitForLoadState();
    assert.equal(new URL(popup.url()).pathname, href.pathname, 'Order CTA did not open the contact');
    await popup.close();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow');
    assert.deepEqual(await page.evaluate(() => window.__cspViolations), [], 'CSP blocked homepage behavior');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: `artifacts/checks/home-${width}.png`, fullPage: true });
    for (const path of ['/privacy/', '/missing-check-page']) {
      assert.equal((await page.goto(origin + path, { waitUntil: 'networkidle' })).status(), path === '/privacy/' ? 200 : 404);
      assert(await page.locator('h1').isVisible(), 'Page heading is hidden');
      assert.deepEqual(await page.evaluate(() => window.__cspViolations), [], 'CSP blocked page behavior');
    }
    assert.deepEqual(errors, [], 'Browser errors');
    await context.close();
    console.log(`Critical browser scenarios OK: ${width}px.`);
  }
  // SEO content and contacts must remain usable without JavaScript.
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  await page.goto(origin);
  assert(await page.locator('h1').isVisible(), 'Heading needs JavaScript');
  await page.locator('#contacts').scrollIntoViewIfNeeded();
  assert(await page.locator('#contacts a[href^="tel:"]').first().isVisible(), 'Contacts need JavaScript');
  await context.close();
  if (process.env.PUBLIC_YANDEX_METRIKA_ID) {
    const consentContext = await browser.newContext();
    const consentPage = await consentContext.newPage();
    const analytics = [];
    await consentPage.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      assert.equal(url.origin, 'https://mc.yandex.ru', 'Unexpected analytics origin');
      analytics.push(url.pathname);
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
    await consentPage.goto(origin, { waitUntil: 'networkidle' });
    assert.deepEqual(analytics, [], 'Analytics loaded before consent');
    await consentPage.locator('[data-cookie-allow]').click();
    await consentPage.waitForFunction(() => Boolean(document.querySelector('[data-yandex-metrika]')));
    assert(analytics.includes('/metrika/tag.js'), 'Analytics did not load after consent');
    await consentPage.locator('[data-cookie-settings]').first().click();
    const afterRefusal = analytics.length;
    await consentPage.locator('[data-cookie-deny]').click();
    await consentPage.reload({ waitUntil: 'networkidle' });
    assert.equal(analytics.length, afterRefusal, 'Analytics loaded after consent was revoked');
    await consentContext.close();
  }
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}

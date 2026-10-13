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
      await page.screenshot({ path: `artifacts/checks/consent-${width}.png`, fullPage: false });
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      const banner = await page.locator('[data-cookie-consent]').boundingBox();
      const settings = await page.locator('[data-cookie-settings]').first().boundingBox();
      assert(banner && settings && settings.y + settings.height <= banner.y, 'Consent banner covers footer controls');
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
  if (process.env.PUBLIC_YANDEX_METRIKA_ID || process.env.PUBLIC_GOOGLE_ANALYTICS_ID) {
    const consentContext = await browser.newContext();
    const consentPage = await consentContext.newPage();
    await consentPage.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => window.__cspViolations.push(event.effectiveDirective));
    });
    const analytics = [];
    await consentContext.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      assert(['https://mc.yandex.ru', 'https://www.googletagmanager.com'].includes(url.origin), 'Unexpected analytics origin');
      analytics.push(url.pathname);
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
    await consentPage.goto(origin, { waitUntil: 'networkidle' });
    assert.deepEqual(analytics, [], 'Analytics loaded before consent');
    await consentPage.locator('[data-cookie-deny]').click();
    await consentPage.reload({ waitUntil: 'networkidle' });
    assert.deepEqual(analytics, [], 'Analytics loaded after refusal');
    await consentPage.locator('[data-cookie-settings]').first().click();
    await consentPage.locator('[data-cookie-allow]').click();
    await consentPage.waitForLoadState('networkidle');
    if (process.env.PUBLIC_YANDEX_METRIKA_ID) assert(analytics.includes('/metrika/tag.js'), 'Metrika did not load after consent');
    if (process.env.PUBLIC_GOOGLE_ANALYTICS_ID) {
      assert(analytics.includes('/gtag/js'), 'Google Analytics did not load after consent');
      assert.equal(await consentPage.evaluate((id) => window[`ga-disable-${id}`], process.env.PUBLIC_GOOGLE_ANALYTICS_ID), false, 'Google Analytics remained disabled after permission');
      const commands = () => consentPage.evaluate(() => (window.dataLayer ?? []).map((command) => Array.from(command)));
      const configured = (await commands()).filter((command) => command[0] === 'config');
      assert.equal(configured.length, 1, 'Duplicate Google page configuration');
      assert.equal(configured[0][2].allow_google_signals, false, 'Google signals enabled');
      const defaultConsent = (await commands()).find((command) => command[0] === 'consent' && command[1] === 'default');
      assert.equal(defaultConsent[2].ad_storage, 'denied', 'Advertising storage enabled');
      await consentPage.locator('#contacts a[href^="tel:"]').first().evaluate((link) => {
        link.addEventListener('click', (event) => event.preventDefault(), { once: true });
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      const events = (await commands()).filter((command) => command[0] === 'event');
      assert.equal(events.filter((command) => command[1] === 'phone_click').length, 1, 'Missing or duplicate phone event');
      for (const [kind, goal] of [['bakery', 'map_bakery_click'], ['supermarket', 'map_aimer_click'], ['semeiniy', 'map_semeiniy_click']]) {
        await consentPage.locator(kind === 'bakery' ? '#contacts a[href*="2gis.kz"]' : `.where-to-buy__card[data-kind="${kind}"] a[href*="2gis.kz"]`).first().evaluate((link) => {
          link.addEventListener('click', (event) => event.preventDefault(), { once: true });
          link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        assert.equal((await commands()).filter((command) => command[0] === 'event' && command[1] === goal).length, 1, `Incorrect map event for ${kind}`);
      }
      await consentPage.evaluate(() => { document.cookie = '_ga=consent-test; Path=/'; document.cookie = '_ga_TEST123456=consent-test; Path=/'; });
    }
    await consentPage.reload({ waitUntil: 'networkidle' });
    assert.equal(await consentPage.locator('[data-cookie-consent]').isVisible(), false, 'Permission not remembered');
    const otherTab = await consentContext.newPage();
    await otherTab.goto(origin, { waitUntil: 'networkidle' });
    await consentPage.locator('[data-cookie-settings]').first().click();
    const afterRefusal = analytics.length;
    await consentPage.locator('[data-cookie-deny]').click();
    await otherTab.waitForFunction(() => !document.querySelector('[data-google-analytics], [data-yandex-metrika]'));
    await otherTab.waitForLoadState('networkidle');
    await otherTab.close();
    await consentPage.reload({ waitUntil: 'networkidle' });
    assert.equal(analytics.length, afterRefusal, 'Analytics loaded after consent was revoked');
    assert.doesNotMatch(await consentPage.evaluate(() => document.cookie), /(?:^|;\s*)_ga(?:_|=)/, 'Google cookies survived revocation');
    assert.deepEqual(await consentPage.evaluate(() => window.__cspViolations ?? []), [], 'CSP blocked analytics');
    // Old Yandex permission must not silently grant Google permission, but an
    // old refusal must remain valid without prompting again.
    if (process.env.PUBLIC_GOOGLE_ANALYTICS_ID) {
      for (const choice of ['allowed', 'denied']) {
        await consentPage.evaluate((choice) => localStorage.setItem('zotov:analytics-consent', JSON.stringify({
          choice, version: 1, expiresAt: Date.now() + 60000,
        })), choice);
        await consentPage.reload({ waitUntil: 'networkidle' });
        assert.equal(analytics.length, afterRefusal, 'Old Yandex permission loaded Google');
        assert.equal(await consentPage.locator('[data-cookie-consent]').isVisible(), choice === 'allowed', 'Incorrect consent migration');
      }
    }
    // Existing grants are readable, but writes (and in the second case
    // removals) fail. Withdrawal must stop both already-running tabs and
    // survive storage becoming writable again.
    for (const blockRemoval of [false, true]) {
      const failureContext = await browser.newContext();
      const requests = [];
      await failureContext.route('**/*', (route) => {
        if (new URL(route.request().url()).origin === origin) return route.continue();
        requests.push(route.request().url());
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
      });
      const first = await failureContext.newPage();
      await first.goto(origin, { waitUntil: 'networkidle' });
      await first.locator('[data-cookie-allow]').click();
      await first.waitForLoadState('networkidle');
      const second = await failureContext.newPage();
      await second.goto(origin, { waitUntil: 'networkidle' });
      const failStorage = (blockRemoval) => {
        const set = Storage.prototype.setItem;
        const remove = Storage.prototype.removeItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'zotov:analytics-consent') throw new DOMException('Storage write blocked', 'QuotaExceededError');
          return set.call(this, key, value);
        };
        Storage.prototype.removeItem = function (key) {
          if (blockRemoval && key === 'zotov:analytics-consent') throw new DOMException('Storage removal blocked', 'SecurityError');
          return remove.call(this, key);
        };
      };
      // Fault is current-document only: reload restores normal storage.
      await first.evaluate(failStorage, blockRemoval);
      await second.evaluate(failStorage, blockRemoval);
      const beforeWithdrawal = requests.length;
      await first.locator('[data-cookie-settings]').first().click();
      await first.locator('[data-cookie-deny]').click();
      for (const tab of [first, second]) {
        await tab.waitForFunction(() => !document.querySelector('[data-google-analytics], [data-yandex-metrika]'));
        await tab.waitForLoadState('networkidle');
        await tab.reload({ waitUntil: 'networkidle' });
      }
      assert.equal(requests.length, beforeWithdrawal, 'Failed storage write restored analytics after withdrawal');
      await failureContext.close();
    }
    await consentContext.close();
    console.log('Analytics consent, events and revocation OK (external tags intercepted locally).');
  }
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}

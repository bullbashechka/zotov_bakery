import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { parse, serialize } from 'parse5';

async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const { port } = server.address();
  await new Promise((done) => server.close(done));
  return port;
}

// Report-only is tested against the same artifact through response interception.
// Neither the artifact nor the final enforced policy is modified.
function reportOnlyDocument(html) {
  const document = parse(html);
  let policy = '';
  function visit(node) {
    node.childNodes = (node.childNodes ?? []).filter((child) => {
      if (child.tagName === 'meta' && child.attrs?.some((a) => a.name === 'http-equiv' && a.value.toLowerCase() === 'content-security-policy')) {
        policy = child.attrs.find((a) => a.name === 'content')?.value ?? '';
        return false;
      }
      visit(child);
      return true;
    });
  }
  visit(document);
  assert(policy, 'Missing CSP for report-only smoke');
  return { html: serialize(document), policy };
}

const port = await freePort();
const origin = `http://127.0.0.1:${port}`;
const wrangler = spawn(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), 'pages', 'dev', 'website/dist', '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '0', '--log-level', 'error'], {
  detached: process.platform !== 'win32',
  stdio: 'ignore',
  env: { ...process.env, CLOUDFLARE_SEND_METRICS: 'false', CI: '1' },
});
let browser;
let spawnError;
wrangler.on('error', (error) => { spawnError = error; });
async function stop() {
  await browser?.close();
  if (wrangler.pid) {
    try { process.kill(process.platform === 'win32' ? wrangler.pid : -wrangler.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
}
const interrupted = () => { void stop().finally(() => process.exit(130)); };
process.once('SIGINT', interrupted);
process.once('SIGTERM', interrupted);

try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (spawnError) throw spawnError;
    if (wrangler.exitCode !== null) throw new Error('Local Pages process exited before becoming ready');
    try { const response = await fetch(origin, { signal: AbortSignal.timeout(1000) }); ready = response.ok; await response.body?.cancel(); } catch { /* wait for local Pages */ }
    if (ready) break;
    await delay(250);
  }
  assert(ready, 'Local Pages did not become ready');
  for (const [path, status] of [['/', 200], ['/privacy/', 200], ['/data-processing/', 200], ['/missing-security-page', 404], ['/.env', 404], ['/.git/config', 404], ['/api/test', 404], ['/_astro/missing-security.js', 404], ['/missing-security.png', 404]]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, status, `${path}: wrong HTTP status`);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${path}: missing nosniff`);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', `${path}: missing frame protection`);
    assert(response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"), `${path}: missing frame-ancestors`);
    await response.body?.cancel();
  }
  await mkdir('artifacts/security/after', { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const mode of ['report-only', 'enforce']) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      const requests = [];
      const external = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('requestfailed', (request) => requests.push(request.url()));
      await page.addInitScript(() => {
        window.__securityViolations = [];
        document.addEventListener('securitypolicyviolation', (event) => window.__securityViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI, disposition: event.disposition }));
      });
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
        if (mode === 'report-only' && route.request().resourceType() === 'document') {
          const response = await route.fetch();
          const transformed = reportOnlyDocument(await response.text());
          const headers = { ...response.headers() };
          delete headers['content-security-policy'];
          delete headers['content-length'];
          headers['content-security-policy-report-only'] = `${transformed.policy}; frame-ancestors 'none'`;
          return route.fulfill({ response, headers, body: transformed.html });
        }
        await route.continue();
      });
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // Section spacing settles after font and ResizeObserver callbacks. Avoid
      // capturing the intermediate unadjusted layout or restored scroll offset.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await delay(1200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow');
      if (mode === 'enforce') await page.screenshot({ path: `artifacts/security/after/${width}.png`, fullPage: true });
      if (width === 390) {
        await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
        assert.equal(await page.locator('.site-header__menu-toggle').getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.site-header__menu-toggle').getAttribute('aria-expanded'), 'false');
      }
      await page.locator('#zotov-faq-2-question').click();
      assert.equal(await page.locator('#faq details[open]').count(), 1);
      assert.equal(await page.locator('#zotov-faq-2-question').getAttribute('aria-expanded'), 'true');
      const activePhoto = page.locator('[data-photo][aria-pressed="true"]');
      const previous = await activePhoto.getAttribute('data-index');
      await activePhoto.focus();
      await page.keyboard.press('ArrowRight');
      assert.notEqual(await activePhoto.getAttribute('data-index'), previous, 'Carousel did not change');
      for (const selector of ['#honey-cake', '#history', '#conversion', '#contacts']) await page.locator(selector).scrollIntoViewIfNeeded();
      assert.deepEqual(await page.evaluate(() => window.__securityViolations), [], 'CSP blocked normal page behavior');
      assert.deepEqual(errors, [], 'Runtime errors');
      assert.deepEqual(requests, [], 'Failed resources');
      assert.deepEqual(external, [], 'Unexpected external resource');
      if (mode === 'enforce') {
        await page.evaluate(() => {
          const script = document.createElement('script');
          script.textContent = 'window.__unapprovedScriptRan = true';
          document.body.append(script);
        });
        await page.waitForFunction(() => window.__securityViolations.length > 0);
        assert.equal(await page.evaluate(() => Boolean(window.__unapprovedScriptRan)), false, 'CSP allowed injected script');
        assert((await page.evaluate(() => window.__securityViolations)).some((item) => item.directive.startsWith('script-src') && item.disposition === 'enforce'));
        await page.evaluate(() => {
          const script = document.createElement('script');
          script.src = 'https://csp-probe.invalid/unapproved.js';
          document.body.append(script);
        });
        await page.waitForFunction(() => window.__securityViolations.some((item) => item.blocked.startsWith('https://csp-probe.invalid')));
        assert.deepEqual(external, [], 'CSP allowed an external script request to leave the page');
      }
      requests.length = 0; // Intentional blocked script probes are not normal page failures.
      for (const path of ['/privacy/', '/data-processing/', '/missing-security-page']) {
        await page.goto(origin + path);
        await page.evaluate(() => document.fonts.ready);
        assert.deepEqual(await page.evaluate(() => window.__securityViolations), [], `${path}: CSP violations`);
        assert.deepEqual(errors, [], `${path}: runtime errors`);
        assert.deepEqual(requests, [], `${path}: failed resources`);
        assert.deepEqual(external, [], `${path}: unexpected external resources`);
        if (mode === 'enforce' && path === '/missing-security-page') await page.screenshot({ path: `artifacts/security/after/404-${width}.png`, fullPage: true });
      }
      await context.close();
      console.log(`Browser security OK: ${mode}, ${width}px.`);
    }
  }
  // Exercise animation-enabled behavior separately from deterministic screenshots.
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  const animationErrors = [];
  page.on('pageerror', (error) => animationErrors.push(error.message));
  await page.addInitScript(() => {
    window.__animationViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => window.__animationViolations.push(event.effectiveDirective));
  });
  await page.goto(origin);
  await page.evaluate(() => document.fonts.ready);
  for (const selector of ['#assortment', '#faq', '#conversion']) { await page.locator(selector).scrollIntoViewIfNeeded(); await delay(1300); }
  assert.deepEqual(animationErrors, [], 'Animation runtime errors');
  assert.deepEqual(await page.evaluate(() => window.__animationViolations), [], 'CSP blocked animations');
  await page.close();
} finally {
  process.removeListener('SIGINT', interrupted);
  process.removeListener('SIGTERM', interrupted);
  await stop();
}

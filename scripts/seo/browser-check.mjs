import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Run against an already started local production server; never submit forms.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:4329').origin;
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Use a local production server');
const directory = resolve('artifacts/seo/browser');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const javaScriptEnabled of [true, false]) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled, isMobile: width === 390, hasTouch: width === 390 });
      for (const path of ['/', '/privacy/']) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('requestfailed', (request) => errors.push(`Request failed: ${request.url()}`));
        page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
        assert.equal((await page.goto(origin + path, { waitUntil: 'networkidle' })).status(), 200);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1500);
        for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 800) {
          await page.evaluate((position) => window.scrollTo({ top: position, behavior: 'instant' }), y);
          await page.waitForTimeout(80);
        }
        await page.waitForTimeout(1500);
        const details = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          h1: [...document.querySelectorAll('h1')].map((element) => ({ text: element.textContent.trim(), visible: element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) })),
          brokenAnchors: [...document.querySelectorAll('a[href^="#"]')].filter((link) => link.hash && !document.getElementById(decodeURIComponent(link.hash.slice(1)))).map((link) => link.hash),
          schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map((element) => JSON.parse(element.textContent)),
          contacts: document.querySelector('#contacts')?.textContent.trim(),
          images: [...document.images].map((image) => ({ src: image.currentSrc, loaded: image.complete && image.naturalWidth > 0, broken: Boolean(image.currentSrc) && image.complete && image.naturalWidth === 0 })),
        }));
        const name = `${path === '/' ? 'home' : 'privacy'}-${width}-${javaScriptEnabled ? 'js' : 'no-js'}`;
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForTimeout(1500);
        // ScrollSmoother fixes the desktop wrapper to the viewport: a full-page
        // screenshot would contain blank space outside it, not missing content.
        const fullPage = !await page.evaluate(() => document.documentElement.dataset.smoothScroll === 'true');
        await page.screenshot({ path: resolve(directory, `${name}.png`), fullPage });
        results.push({ name, errors, ...details });
        await page.close();
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(resolve(directory, 'results.json'), JSON.stringify(results, null, 2));
}
for (const result of results) {
  assert.deepEqual(result.errors, [], `${result.name}: browser/resource errors`);
  assert.equal(result.overflow, false, `${result.name}: horizontal overflow`);
  assert.equal(result.h1.length, 1, `${result.name}: expected one H1`);
  assert(result.h1[0].visible && result.h1[0].text, `${result.name}: H1 not visible`);
  assert.deepEqual(result.brokenAnchors, [], `${result.name}: broken anchors`);
  assert(!result.images.some((image) => image.broken), `${result.name}: broken images`);
  if (result.name.startsWith('home')) {
    assert(result.contacts?.includes('Петропавловск'), `${result.name}: missing contacts`);
    assert(result.schema.some((schema) => schema['@type']?.includes('Bakery')), `${result.name}: missing rendered schema`);
  }
}
console.log(`SEO browser checks passed: ${results.length} scenarios. Reports: ${directory}`);

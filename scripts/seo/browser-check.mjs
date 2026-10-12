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
  // Fonts must never gate the hero; intentional failures are isolated here.
  for (const width of [360, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const scriptErrors = [];
    page.on('pageerror', (error) => scriptErrors.push(error.message));
    let releaseFonts;
    const fontsHeld = new Promise((resolve) => { releaseFonts = resolve; });
    await page.route('**/fonts/**', async (route) => {
      await fontsHeld;
      await route.abort();
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const visible = () => page.evaluate(() => {
      const nodes = [...document.querySelectorAll('.hero__title, .hero__intro, .hero__actions a')];
      return nodes.length === 4 && nodes.every((node) => {
        const bounds = node.getBoundingClientRect();
        return node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          && bounds.width > 0 && bounds.height > 0 && getComputedStyle(node).opacity === '1';
      });
    });
    assert(await visible(), `${width}: copy hidden while fonts pending`);
    releaseFonts();
    await page.evaluate(() => document.fonts.ready);
    assert(await visible(), `${width}: copy hidden after failed fonts`);
    await page.screenshot({ path: resolve(directory, `hero-fonts-failed-${width}.png`) });
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(100);
    const entrancesVisible = await page.evaluate(() => [...document.querySelectorAll('[data-motion], [data-selection-dessert]')]
      .filter((node) => node.getBoundingClientRect().width > 0)
      .every((node) => getComputedStyle(node).opacity === '1'));
    assert(entrancesVisible, `${width}: interrupted entrance still transparent`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: width < 768 ? 1440 : 390, height: 900 });
    await page.waitForTimeout(200);
    const readable = await page.evaluate(() => [...document.querySelectorAll('[data-motion="heading"], [data-motion="copy"], [data-motion="card"]')]
      .filter((node) => node.getBoundingClientRect().width > 0)
      .every((node) => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })));
    assert(readable, `${width}: content hidden after interrupted motion/media change`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(origin + '/#contacts', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    assert(await page.locator('#contacts h2').isVisible(), `${width}: hash heading missing`);
    assert.deepEqual(scriptErrors, [], `${width}: script errors during edge cases`);
    await context.close();
  }
  const fontSwapResults = [];
  for (const width of [360, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript(() => {
      window.__fontSwapCLS = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__fontSwapCLS += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route('**/fonts/**', async (route) => { await held; await route.continue(); });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    assert(await page.locator('.hero__actions a').first().isVisible(), `${width}: CTA hidden before font swap`);
    release();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const details = await page.evaluate(() => ({
      cls: window.__fontSwapCLS,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert(details.cls <= 0.1, `${width}: excessive shift after delayed fonts`);
    assert.equal(details.overflow, false, `${width}: font swap overflow`);
    fontSwapResults.push({ width, ...details });
    await page.close();
  }
  await writeFile(resolve(directory, 'font-swap.json'), JSON.stringify(fontSwapResults, null, 2));
  const failureContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const failurePage = await failureContext.newPage();
  await failurePage.route('**/*hero-cake-transparent*', (route) => route.abort());
  await failurePage.goto(origin, { waitUntil: 'networkidle' });
  assert.equal(await failurePage.locator('[data-hero-media]').getAttribute('data-error'), 'true');
  assert(await failurePage.locator('.hero__actions a').first().isVisible(), 'Image failure hides CTA');
  await failurePage.locator('.hero__actions a').first().click();
  await failurePage.waitForTimeout(300);
  assert(await failurePage.evaluate(() => document.activeElement?.matches('#where-to-buy h2')), 'CTA does not focus destination');
  await failurePage.goBack({ waitUntil: 'domcontentloaded' });
  // 1440 physical pixels at 200% browser zoom corresponds to a 720 CSS-pixel viewport.
  await failurePage.setViewportSize({ width: 720, height: 900 });
  assert(await failurePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '200% layout overflows');
  await failurePage.screenshot({ path: resolve(directory, 'zoom-200-layout.png'), fullPage: true });
  await failureContext.close();
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
console.log(`SEO browser checks passed: ${results.length} page scenarios + delayed/failed fonts and font-swap CLS at 4 widths + image failure, CTA/back and zoom layout. Reports: ${directory}`);

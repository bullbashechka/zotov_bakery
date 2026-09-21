import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const dir = 'output/layout-width';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
 for (const width of [390, 1440, 1920, 2400, 2560, 3840]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4330');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  results.push(await page.evaluate(() => ({ viewport: innerWidth, root: getComputedStyle(document.documentElement).fontSize, overflow: document.documentElement.scrollWidth > innerWidth, boxes: ['.site-header__content', '.advantages__content', '.hero__cake', '.conversion-section__line'].map(s => {const r = document.querySelector(s).getBoundingClientRect(); return { selector:s, x:r.x, width:r.width };}) })));
  if ([390,1920,2560].includes(width)) {
   await page.screenshot({path:`${dir}/${width}-hero.png`});
   await page.locator('#advantages').scrollIntoViewIfNeeded();
   await page.screenshot({path:`${dir}/${width}-advantages.png`});
   await page.locator('#conversion').scrollIntoViewIfNeeded();
   await page.screenshot({path:`${dir}/${width}-conversion.png`});
  }
  await page.close();
 }
} finally { await browser.close(); }
await writeFile(`${dir}/measurements.json`, JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
if(results.some(r=>r.overflow)) throw Error('Page overflow');
const capped=results.filter(r=>r.viewport>=1920);
for(const r of capped) if(Math.abs(r.boxes[1].width-capped[0].boxes[1].width)>1) throw Error('Content grew above cap');

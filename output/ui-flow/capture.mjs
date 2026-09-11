// One-off UI walkthrough. Uses an already installed Playwright; no project dependency.
// Run: node output/ui-flow/capture.mjs [http://localhost:4321]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out = fileURLToPath(new URL('./', import.meta.url));
const base = process.argv[2] || 'http://localhost:4321';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const shots = [], checks = [], links = [];
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
try {
for (const [device, width, height] of [['desktop',1440,1000],['mobile',390,844]]) {
 const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
 await page.goto(base); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1500);
 let n = 0;
 const shot = async (label, selector) => {
   const loc = selector ? page.locator(selector) : null;
   if(loc) await loc.scrollIntoViewIfNeeded();
   await page.waitForTimeout(1000);
   const file = `${device}-${String(++n).padStart(2,'0')}.png`;
   if(loc) await loc.screenshot({path:out+file}); else await page.screenshot({path:out+file});
   shots.push({device,label,file}); console.log(device, label);
 };
 await shot('Точка входа: первый экран');
 if(device==='mobile') {
  const menu=page.locator('.site-header__menu-toggle'); await menu.click();
  await shot('Мобильное меню раскрыто');
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'),'false'); checks.push('mobile: меню закрывается по Escape');
 }
 await page.getByRole('link',{name:'Посмотреть ассортимент',exact:true}).first().click();
 await shot('CTA первого экрана → ассортимент, Нежность','#assortment');
 for(const [index,name] of [[1,'Карамельное облако'],[2,'Праздничный букет'],[0,'Нежность']]) {
  // Keyboard navigation avoids the drag gesture handler attached to product photographs.
  const active=page.locator('[data-photo][aria-pressed="true"]');
  await active.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900);
  assert.equal(await page.locator(`[data-photo][data-index="${index}"]`).getAttribute('aria-pressed'),'true');
  checks.push(`${device}: выбран ${name}`);
  await shot(`Выбран товар: ${name}`,'#assortment');
 }
 if(device==='mobile') {
  await page.locator('[data-panel][data-active] summary').click();
  await shot('Состав товара раскрыт','#assortment');
  assert.equal(await page.locator('[data-panel][data-active] details').getAttribute('open'),'');
  await page.locator('[data-panel][data-active] summary').click();
  await shot('Состав товара закрыт','#assortment');
 }
 await shot('Медовик: подсказки закрыты','#honey-cake');
 for(const [id,label] of [['protein-cream','Белковый крем'],['honey-layers','Медовые коржи'],['cream','Крем']]) {
  await page.locator(`#honey-cake-${id}-summary`).click();
  await shot(`Медовик: ${label}`,'#honey-cake');
  assert.equal(await page.locator('#honey-cake details[open]').count(),1);
 }
 await page.keyboard.press('Escape');
 await page.waitForTimeout(400); assert.equal(await page.locator('#honey-cake details[open]').count(),0);
 checks.push(`${device}: подсказки медовика взаимоисключающие, Escape закрывает`);
 await shot('Преимущества','#advantages');
 await page.goto(base); await page.waitForTimeout(1000);
 await page.getByRole('link',{name:'Где купить',exact:true}).filter({visible:true}).last().click();
 await shot('CTA Где купить → три способа покупки','#where-to-buy');
 await shot('Наша история: текущее незавершённое состояние','#history');
 await shot('FAQ: первый ответ открыт по умолчанию','#faq');
 await page.locator('#zotov-faq-1-question').click();
 await shot('FAQ: все ответы закрыты','#faq');
 for(let i=1;i<=5;i++) {
  await page.locator(`#zotov-faq-${i}-question`).click();
  await shot(`FAQ: ответ ${i}`,'#faq');
  assert.equal(await page.locator('#faq details[open]').count(),1);
 }
 checks.push(`${device}: FAQ открывает один ответ или закрывает все`);
 await shot('Помощь в выборе → WhatsApp или ассортимент','#conversion');
 await shot('Контакты и нижняя навигация','footer');
 if(device==='desktop') links.push(...await page.locator('a[href^="https://wa.me"],a[href^="https://2gis"],a[href^="tel:"]').evaluateAll(as=>as.map(a=>({label:a.textContent.trim()||a.getAttribute('aria-label'),url:a.href}))));
 // Reveal every section before the long screenshot; return to the top for the fixed header.
 for(const id of ['advantages','honey-cake','assortment','where-to-buy','history','faq','conversion','contacts']) {
  await page.locator('#'+id).scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
 }
 await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(1200);
 const full=`${device}-full.png`; await page.screenshot({path:out+full,fullPage:true}); shots.push({device,label:'Вся страница после прохождения',file:full});
 for(const [path,label] of [['privacy/','Политика конфиденциальности'],['data-processing/','Политика обработки данных']]) {
  await page.goto(new URL(path,base+'/').href); await page.waitForTimeout(700);
  await shot(`${label}: заглушка документа`);
  await page.getByRole('link',{name:'Вернуться на главную',exact:true}).click();
  assert.equal(new URL(page.url()).pathname,'/');
 }
 await page.close();
}
} finally { await browser.close(); }
await writeFile(out+'manifest.json',JSON.stringify({shots,checks,links},null,2));
const notes='Снята текущая локальная реализация 11.09.2026. Desktop 1440×1000, mobile 390×844. Путь: первый экран → ассортимент / медовик → способы покупки → WhatsApp или 2GIS. Заказ и оплата находятся вне сайта. Внешние сообщения не отправлялись. История и юридические документы — заглушки; два десерта содержат временные описания. Кнопка медовика использует общий запрос без названия товара.';
await writeFile(out+'index.html',`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ZOTOV — весь UI flow</title><style>body{font:16px/1.5 system-ui;margin:0;background:#f3eee8;color:#392526}header{padding:32px;max-width:1000px}h1{font-size:32px}nav{position:sticky;top:0;background:#392526;padding:12px 32px;z-index:1}nav a{color:white;margin-right:24px}main{padding:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px}figure{margin:0;background:white;padding:16px;border-radius:12px}figure img{width:100%;max-height:650px;object-fit:contain;object-position:top}figcaption{margin-bottom:12px;font-weight:600}section{padding:24px}a{color:inherit}details{padding:12px}li{margin:8px} .mobile img{max-height:720px}body[data-filter=desktop] .mobile,body[data-filter=mobile] .desktop{display:none}</style><header><h1>ZOTOV: пользовательский путь</h1><p>${notes}</p><p>${shots.length} скриншотов. Нажатие на кадр открывает оригинал.</p></header><nav><a href="#" onclick="document.body.dataset.filter='all';return false">Все</a><a href="#" onclick="document.body.dataset.filter='desktop';return false">Desktop</a><a href="#" onclick="document.body.dataset.filter='mobile';return false">Mobile</a><a href="#checks">Проверки</a></nav><main>${shots.map(s=>`<figure class="${s.device}"><figcaption>${s.device} · ${esc(s.label)}</figcaption><a href="${s.file}" target="_blank"><img loading="lazy" src="${s.file}" alt="${esc(s.label)}"></a></figure>`).join('')}</main><section id="checks"><h2>Проверенные переходы</h2><ul>${checks.map(c=>`<li>${esc(c)}</li>`).join('')}</ul><details><summary>Внешние точки выхода и тексты запросов</summary><ul>${links.map(l=>`<li>${esc(l.label)}<br>${esc(decodeURI(l.url))}</li>`).join('')}</ul></details></section></html>`);
console.log(`Saved ${shots.length} screenshots; ${checks.length} checks passed. Gallery: ${out}index.html`);

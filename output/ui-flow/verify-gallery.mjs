import {chromium} from 'playwright';
import {readFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile(new URL('manifest.json',import.meta.url),'utf8'));
const b=await chromium.launch({headless:true,channel:'chrome'});
try {
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
  const p=await b.newPage({viewport:{width,height}});
  await p.goto('http://localhost:4321/');await p.evaluate(()=>document.fonts.ready);
  for(const id of ['advantages','honey-cake','assortment','where-to-buy','history','faq','conversion','contacts']) {
   await p.locator('#'+id).scrollIntoViewIfNeeded();await p.waitForTimeout(900);
  }
  await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(1200);
  await p.screenshot({path:new URL(name+'-full.png',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
  console.log(name,'full page refreshed');await p.close();
 }
 for(const s of manifest.shots) assert.ok((await stat(new URL(s.file,import.meta.url))).size>1000,s.file);
 const p=await b.newPage({viewport:{width:1440,height:1000}});
 await p.goto(new URL('index.html',import.meta.url).href);
 assert.equal(await p.locator('figure').count(),manifest.shots.length);
 await p.getByRole('link',{name:'Mobile',exact:true}).click();
 assert.equal(await p.locator('figure.desktop:visible').count(),0);
 assert.ok(await p.locator('figure.mobile:visible').count()>0);
 console.log('Gallery files and filters verified:',manifest.shots.length);
} finally {await b.close();}

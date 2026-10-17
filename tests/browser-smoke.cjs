/* Browser smoke — built local Phaser vendor only. No external sprites/CDN permitted. */
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const executablePath = ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium']
  .find(p => fs.existsSync(p));
if (!executablePath) throw Error('Chrome executable unavailable on CI');
const address = 'http://127.0.0.1:4173';
(async function(){
 const browser = await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  for (const mobile of [false,true]) {
    const page = await browser.newPage();
    await page.setViewport(mobile ? {width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2} : {width:1100,height:900});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.setRequestInterception(true);
    page.on('request',request => {
      if (!request.url().startsWith(address)) return request.abort();
      return request.continue();
    });
    await page.goto(address+'/phaser-preview/?demo=1',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-a="council"]',{timeout:12000});
    await page.click('[data-a="council"]');
    await page.waitForSelector('[data-a="policy"]');
    await page.click('[data-a="policy"]');
    await page.waitForSelector('[data-a="prepare"]');
    await page.click('[data-a="prepare"]');
    await page.waitForSelector('[data-a="fight"]');
    await page.click('[data-a="fight"]');
    await page.waitForSelector('#phaser-surface canvas',{timeout:25000});
    await page.waitForFunction(()=>document.body.classList.contains('phaser-live'));
    const before = await page.evaluate(()=> {
      const a=JSON.parse(localStorage.getItem('thargrid_phaser_preview_save_v1'));
      return {enemy:a.battle.foes[0].hp,classic:localStorage.getItem('thargrid_siege_save_v1'),round:a.battle.round};
    });
    assert.equal(before.classic,null);
    const box=await page.$eval('#phaser-surface canvas',el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
    await page.mouse.click(box.x+57*box.width/480,box.y+158*box.height/560);
    await page.waitForFunction(hp => {
      const a=JSON.parse(localStorage.getItem('thargrid_phaser_preview_save_v1'));
      return a.battle.foes[0].hp<hp || a.mode!=='battle';
    },{timeout:10000},before.enemy);
    const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('thargrid_phaser_preview_save_v1')));
    assert.equal(after.version,1);
    assert.equal(await page.evaluate(()=>localStorage.getItem('thargrid_siege_save_v1')),null);
    assert.ok(!errors.length,'Page errors: '+errors.join(' | '));
    console.log((mobile?'MOBILE':'DESKTOP')+' PASS Phaser canvas + council + battle + touch + isolated save');
    await page.close();
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
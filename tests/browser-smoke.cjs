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
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
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
    // Mobile bottom tabs are fixed and may intercept a click near the viewport edge.
    await page.$eval('[data-a="prepare"]',el=>el.scrollIntoView({block:'center',inline:'nearest'}));
    await page.click('[data-a="prepare"]');
    console.log((mobile?'MOBILE':'DESKTOP')+' BEFORE BATTLE', await page.evaluate(()=>({mode:S.mode,tab:S.tab,council:S.flags.council_0, toast:document.querySelector('.toast')?.textContent||'',hasFight:!!document.querySelector('[data-a="fight"]'),hasPrepare:!!document.querySelector('[data-a="prepare"]')})));
    await page.waitForSelector('[data-a="fight"]',{timeout:7000});
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
    assert.equal(await page.evaluate(()=>typeof ThargridCore),'object');
    // Resume the actual Phaser battle from its saved snapshot after browser reload.
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-a="continue"]',{timeout:12000});
    await page.click('[data-a="continue"]');
    await page.waitForSelector('#phaser-surface canvas',{timeout:25000});
    await page.waitForFunction(()=>document.body.classList.contains('phaser-live'));
    const resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem('thargrid_phaser_preview_save_v1')));
    assert.deepEqual(resumed,after,'Reload must not change any battle or campaign state');
    // Controlled in-battle fixture: verify skill and item menus dispatch to canvas targets.
    await page.evaluate(()=>{S.battle.active='eirik';render();});
    await page.click('[data-a="battleSkills"]');
    await page.click('[data-a="battleSkill"][data-v="arcaneBolt"]');
    await page.waitForSelector('.beta-targeting');
    const selectedSpell=await page.$eval('.beta-targeting',el=>el.textContent);
    assert.match(selectedSpell,/Dardo arcano/);
    const spellBefore=await page.evaluate(()=>{
      const foes=S.battle.foes,index=foes.findIndex(e=>e.hp>0),cols=Math.min(foes.length,4);
      if(index<0)throw Error('No living enemy for spell target smoke');
      return {index,uid:foes[index].uid,hp:foes[index].hp,mp:S.heroes.eirik.mp,
        x:cols===1?240:57+(index%cols)*365/(cols-1),
        y:(foes.length>4?157+Math.floor(index/cols)*97:192)-32};
    });
    const targetCanvas=await page.$('#phaser-surface canvas');
    const enemyBox=await targetCanvas.boundingBox();
    console.log((mobile?'MOBILE':'DESKTOP')+' SPELL PRE',spellBefore,await page.evaluate(()=>({
      living:S.battle.foes.map(f=>({uid:f.uid,hp:f.hp})),pending:document.querySelector('.beta-targeting')?.textContent||'',scrollY,
      canvas:document.querySelector('#phaser-surface canvas')?.getBoundingClientRect().toJSON()
    })));
    await targetCanvas.click({offset:{
      x:spellBefore.x*enemyBox.width/480,y:spellBefore.y*enemyBox.height/560
    }});
    console.log((mobile?'MOBILE':'DESKTOP')+' SPELL POST',await page.evaluate(()=>({
      living:S.battle.foes.map(f=>({uid:f.uid,hp:f.hp})),actor:S.battle.active,
      pending:document.querySelector('.beta-targeting')?.textContent||'',scrollY
    })));
    await page.waitForFunction(o=>S.battle.foes[o.index].hp<o.hp,{timeout:10000},spellBefore);
    assert.ok(await page.evaluate(mp=>S.heroes.eirik.mp<mp,spellBefore.mp));
    assert.equal(await page.$('.beta-targeting'),null);

    // Healing and reviving allies by touching their figures, not the old HTML list.
    await page.evaluate(()=>{S.battle.active='serena';S.heroes.brunna.hp=15;render();});
    await page.click('[data-a="battleSkills"]');
    await page.click('[data-a="battleSkill"][data-v="heal"]');
    await page.waitForSelector('.beta-targeting');
    const allyCanvas=await page.$('#phaser-surface canvas');
    const allyBox=await allyCanvas.boundingBox();
    await allyCanvas.click({offset:{x:57*allyBox.width/480,y:377*allyBox.height/560}});
    await page.waitForFunction(()=>S.heroes.brunna.hp>15,{timeout:10000});

    await page.evaluate(()=>{S.battle.active='serena';S.heroes.brunna.hp=0;save();render();});
    const phoenixBefore=await page.evaluate(()=>S.inventory.phoenix);
    await page.click('[data-a="battleItems"]');
    await page.click('[data-a="battleItem"][data-v="phoenix"]');
    await page.waitForSelector('.beta-targeting');
    const reviveCanvas=await page.$('#phaser-surface canvas');
    const reviveBox=await reviveCanvas.boundingBox();
    await reviveCanvas.click({offset:{x:57*reviveBox.width/480,y:377*reviveBox.height/560}});
    await page.waitForFunction(()=>S.heroes.brunna.hp>0,{timeout:10000});
    assert.equal(await page.evaluate(()=>S.inventory.phoenix),phoenixBefore-1);

    await page.evaluate(()=>{S.battle.active='eirik';render();});
    await page.click('[data-a="battleSkills"]');
    await page.click('[data-a="battleSkill"][data-v="arcaneBolt"]');
    await page.waitForSelector('.beta-targeting');
    const cancelMP=await page.evaluate(()=>S.heroes.eirik.mp);
    await page.click('[data-beta-cancel]');
    assert.equal(await page.$('.beta-targeting'),null);
    assert.equal(await page.evaluate(()=>S.heroes.eirik.mp),cancelMP);
    console.log((mobile?'MOBILE':'DESKTOP')+' PASS canvas spell + heal + phoenix + cancel');
    // The classic route still starts independently even with a saved Phaser beta in this browser.
    const classic=await context.newPage();
    const classicErrors=[];
    classic.on('pageerror',e=>classicErrors.push(e.message));
    await classic.goto(address+'/index.html',{waitUntil:'domcontentloaded'});
    await classic.waitForSelector('[data-a="start"]',{timeout:12000});
    assert.equal(await classic.evaluate(()=>typeof ThargridCore),'object');
    assert.equal(await classic.evaluate(()=>localStorage.getItem('thargrid_siege_save_v1')),null);
    assert.ok(!classicErrors.length,'Classic errors: '+classicErrors.join(' | '));
    await classic.close();
    assert.ok(!errors.length,'Page errors: '+errors.join(' | '));
    console.log((mobile?'MOBILE':'DESKTOP')+' PASS Phaser canvas + council + battle + touch + reload + classic isolation');
    await page.close();
    await context.close();
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
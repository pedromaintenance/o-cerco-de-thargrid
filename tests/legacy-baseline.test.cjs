/* node --test tests/legacy-baseline.test.cjs
 * Read-only compatibility tests: no production mutation and no synthetic balancing.
 */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const data = fs.readFileSync(path.join(ROOT,'data.js'),'utf8');
const core = fs.readFileSync(path.join(ROOT,'core/combat.js'),'utf8');
const actions = fs.readFileSync(path.join(ROOT,'core/actions.js'),'utf8');
const effects = fs.readFileSync(path.join(ROOT,'core/effects.js'),'utf8');
const rounds = fs.readFileSync(path.join(ROOT,'core/rounds.js'),'utf8');
const app = fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const serviceWorker = fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
const betaWorker = fs.readFileSync(path.join(ROOT,'phaser-preview/sw.js'),'utf8');

function runtime(seed=7, preview=false) {
  const saved = new Map();
  const nodes = new Map();
  let state = seed >>> 0;
  const random = () => ((state = (Math.imul(state,1664525)+1013904223)>>>0) / 4294967296);
  const math = Object.create(Math);
  math.random = random;
  const element = () => ({innerHTML:'',className:'',textContent:'',remove(){},classList:{add(){},remove(){},toggle(){}},dataset:{}});
  const doc = {
    documentElement:{dataset:preview?{phaserPreview:'true'}:{}},
    getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},
    querySelector(id){return this.getElementById(id);},
    addEventListener(){},
    createElement(){return element();},
    body:{append(){},appendChild(){}}
  };
  const ctx = vm.createContext({Math:math,document:doc,window:{},navigator:{},
    console:{warn(){},log(){},error(){}},
    localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
    setTimeout(){return 1;},clearTimeout(){},
    Blob:class {}, URL:class {}});
  vm.runInContext(data,ctx,{filename:'data.js'});
  vm.runInContext(core,ctx,{filename:'core/combat.js'});
  vm.runInContext(actions,ctx,{filename:'core/actions.js'});
  vm.runInContext(effects,ctx,{filename:'core/effects.js'});
  vm.runInContext(rounds,ctx,{filename:'core/rounds.js'});
  vm.runInContext(app,ctx,{filename:'app.js'});
  const exec = code => vm.runInContext(code,ctx);
  return {exec,saved};
}

test('content baseline: 10 acts, 60 non-skippable raids and 10 bosses', () => {
  const {exec}=runtime();
  const result=exec('({acts:ACTS.length,raids:RAIDS.length,bosses:RAIDS.filter(r=>r.boss).length,days:RAIDS.map(r=>r.day),heroes:HEROES.length,quests:QUESTS.length,projects:PROJECTS.length,fronts:FRONTS.length,professions:PROFESSIONS.length,relics:Object.keys(RELICS).length})');
  assert.equal(result.acts,10);
  assert.equal(result.raids,60);
  assert.equal(result.bosses,10);
  assert.deepEqual(Array.from(result.days),Array.from({length:60},(_,i)=>i+1));
  assert.deepEqual([result.heroes,result.quests,result.projects,result.fronts,result.professions,result.relics],[9,29,12,4,8,6]);
});
test('production and beta use separate stable save namespaces',()=>{
 const classic=runtime(1,false);
 classic.exec("S=fresh('story');save();");
 assert.ok(classic.saved.has('thargrid_siege_save_v1'));
 assert.ok(!classic.saved.has('thargrid_phaser_preview_save_v1'));
 const beta=runtime(1,true);
 beta.exec("S=fresh('story');save();");
 assert.ok(beta.saved.has('thargrid_phaser_preview_save_v1'));
 assert.ok(!beta.saved.has('thargrid_siege_save_v1'));
 assert.equal(JSON.parse(beta.saved.get('thargrid_phaser_preview_save_v1')).version,1);
});
test('the first attack cannot begin before the council or without a party',()=>{
 const {exec}=runtime();
 exec("S=fresh('story');screen='game';beginBattle()");
 assert.equal(exec('S.battle'),null);
 exec("S.flags.council_0=true;S.party=[];beginBattle()");
 assert.equal(exec('S.battle'),null);
 exec("S.party=['brunna','dara','eirik','serena'];beginBattle()");
 assert.equal(exec('S.battle.event'),1);
 assert.equal(exec('S.day'),1);
 assert.equal(exec('S.mode'),'battle');
 assert.ok(exec('S.battle.active'));
});
function replay(seed){
 const {exec,saved}=runtime(seed,true);
 exec("S=fresh('story');screen='game';S.flags.council_0=true;beginBattle()");
 for(let i=0;i<90;i++){
  const phase=exec('S.mode');
  if(phase!=='battle')break;
  const action=exec("S.battle.active&&S.battle.foes.find(e=>e.hp>0)?.uid");
  if(!action)break;
  exec("doSkill('attack',"+JSON.stringify(action)+")");
 }
 return {mode:exec('S.mode'),day:exec('S.day'),state:JSON.parse(saved.get('thargrid_phaser_preview_save_v1'))};
}
test('replayed first siege with seeded random is deterministic and persists its result',()=>{
 const a=replay(11),b=replay(11);
 assert.equal(a.day,1);
 assert.deepEqual(a,b);
 assert.ok(['aftermath','gameover'].includes(a.mode));
 assert.ok(a.state.battle);
 assert.equal(a.state.version,1);
});
test('root and beta cache versions are distinct; root excludes preview path',()=>{
 assert.match(serviceWorker,/thargrid-pwa-v1\.0\.7/);
 assert.match(app,/caches\.open\('thargrid-pwa-v1\.0\.7'\)/);
 assert.match(serviceWorker,/u\.pathname\.startsWith\(previewPath\)/);
 assert.match(betaWorker,/thargrid-phaser-beta-v6/);
 assert.match(betaWorker,/\.\/vendor\/phaser\.min\.js/);
});
test('Phaser adapter never changes damage, status, battle turns or saves',()=>{
 const bridge=fs.readFileSync(path.join(ROOT,'phaser-preview/bridge.js'),'utf8');
 assert.doesNotMatch(bridge,/localStorage\.setItem\(/);
 assert.doesNotMatch(bridge,/\.hp\s*(?:[-+*/]=|=(?!=))/);
 assert.doesNotMatch(bridge,/\.mp\s*(?:[-+*/]=|=(?!=))/);
 assert.match(bridge,/handle\('targetenemy'/);
 assert.match(bridge,/new Phaser\.Game/);
});

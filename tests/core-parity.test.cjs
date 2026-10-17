/* M0b/M1a regression fixtures. Run: node --test tests/core-parity.test.cjs */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const content=fs.readFileSync(path.join(ROOT,'data.js'),'utf8');
const coreSource=fs.readFileSync(path.join(ROOT,'core/combat.js'),'utf8');
const appSource=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const golden=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/raid-golden-v1.json'),'utf8'));

function runtime(seed=42, initialStorage) {
  const saved=initialStorage||new Map();
  const nodes=new Map();
  const document={
    documentElement:{dataset:{phaserPreview:'true'}},
    getElementById(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',className:'',textContent:'',remove(){},classList:{add(){},remove(){},toggle(){}}});return nodes.get(id);},
    querySelector(s){return this.getElementById(s);},
    addEventListener(){},createElement(){return {remove(){},click(){}}},body:{append(){}}
  };
  const math=Object.create(Math),random=seeded(seed);
  math.random=random;
  const ctx=vm.createContext({document,Math:math,localStorage:{
    getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)
  },navigator:{},console:{warn(){},error(){},log(){}},
  setTimeout(){},clearTimeout(){},Blob:class{},URL:class{}});
  for(const [file,source] of [['data.js',content],['core/combat.js',coreSource],['app.js',appSource]]){
    vm.runInContext(source,ctx,{filename:file});
  }
  const exec=code=>vm.runInContext(code,ctx);
  return {exec,saved};
}
function seeded(seed){
  let state=seed>>>0;
  return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
}
function json(value){return JSON.parse(JSON.stringify(value));}
function openBoss(exec,day,difficulty='normal'){
  exec("S=fresh("+JSON.stringify(difficulty)+");screen='game';S.day="+day+";S.flags['council_'+Math.floor((S.day-1)/6)]='povo';beginBattle()");
}

test('golden reference comes from original classic before the extraction',()=>{
 assert.equal(golden.source_commit,'f59272a2dc7c4ead3ffb66acdf2602fbc1622e81');
 assert.equal(golden.fixtures.length,12);
 assert.deepEqual(golden.fixtures.map(x=>x.scenario.day),[1,6,12,18,24,30,36,42,48,54,60,60]);
});

for(const {scenario,expected} of golden.fixtures){
 test('legacy parity: day '+scenario.day+' '+scenario.difficulty+' battle + initial enemy turns',()=>{
  const {exec}=runtime(42);
  openBoss(exec,scenario.day,scenario.difficulty);
  const result=exec("JSON.parse(JSON.stringify({day:S.day,difficulty:S.difficulty,mode:S.mode,foes:S.battle.foes,round:S.battle.round,queue:S.battle.queue,ptr:S.battle.ptr,active:S.battle.active,logs:S.battle.logs,party:S.battle.party.map(id=>({id,hp:S.heroes[id].hp,barrier:S.heroes[id].barrier,status:S.heroes[id].status}))}))");
  assert.deepEqual(json(result),expected);
 });
}

test('injected RNG: reproducible for combat helpers, resettable without changing gameplay default',()=>{
 const core=require('../core/combat.js');
 const restore=core.setRandomSource(core.seededRandom(1234));
 try{
  const a=[core.random(),core.integer(-3,4),core.random()];
  core.setRandomSource(core.seededRandom(1234));
  const b=[core.random(),core.integer(-3,4),core.random()];
  assert.deepEqual(a,b);
  assert.ok(a[0]>=0&&a[0]<1);
 }finally{restore();}
 assert.throws(()=>core.setRandomSource(null),TypeError);
});

test('pure damage helpers conserve shield and never mutate the input',()=>{
 const core=require('../core/combat.js');
 const status={defUp:1,weak:1};
 const before=json(status);
 const amount=core.enemyBaseDamage(25,20,true,2);
 const taken=core.enemyTakenDamage(amount,11,status,'warden',2);
 const absorbed=core.absorbBarrier(taken,20);
 assert.equal(amount,Math.round(25*.67*(1+3*.055)+2));
 assert.equal(taken,Math.max(3,Math.round((amount-11*.31)*.68*1.08*.90*1.1)));
 assert.deepEqual(absorbed,{blocked:Math.min(20,taken),damage:Math.max(0,taken-20),barrier:Math.max(0,20-taken)});
 assert.deepEqual(status,before);
});

test('the Night Queen survives death once at 46% health and dies after stage II',()=>{
 const {exec}=runtime(42);
 openBoss(exec,60,'story');
 assert.equal(exec("S.battle.foes[0].id"),'nightavatar');
 exec("S.battle.active='dara';S.battle.foes[0].hp=1;doSkill('attack','e0')");
 assert.equal(exec('S.battle.foes[0].stage'),2);
 assert.equal(exec('S.battle.foes[0].hp'),exec('Math.round(S.battle.foes[0].maxhp*.46)'));
 // Depending on initiative, the enemy's next activation already consumes one buff turn.
 assert.ok([4,5].includes(exec('S.battle.foes[0].status.atkUp')));
 assert.equal(require('../core/combat.js').secondPhase(0,'nightavatar',1,100).status.atkUp,5);
 assert.equal(exec('S.battle.foes[0].dead'),false);
 assert.equal(exec('S.mode'),'battle');
 exec("S.battle.foes.slice(1).forEach(e=>{e.hp=0;e.dead=true});S.battle.foes[0].hp=1;S.battle.active='dara';doSkill('attack','e0')");
 assert.equal(exec('S.battle.foes[0].dead'),true);
 assert.equal(exec('S.mode'),'aftermath');
 assert.equal(exec('S.victories'),1);
 assert.equal(exec('S.history[0].day'),60);
 exec('nextDay()');
 assert.equal(exec('S.mode'),'ending');
 assert.equal(exec('S.day'),60);
});

test('midbattle save resumes the exact queue, hero state and remaining opponents',()=>{
 const first=runtime(17);
 openBoss(first.exec,24,'normal');
 const before=json(first.exec('S'));
 assert.equal(first.saved.has('thargrid_phaser_preview_save_v1'),true);
 const resumed=runtime(17,new Map(first.saved));
 assert.equal(resumed.exec('load()'),true);
 assert.deepEqual(json(resumed.exec('S')),before);
 const foe=before.battle.foes.find(e=>e.hp>0).uid;
 for (const run of [first,resumed]) {
  // Live saves preserve battle state, not the internal Math.random state.
  // Inject an equal next roll in both runtimes to compare rule outcomes exactly.
  run.exec("ThargridCore.setRandomSource(ThargridCore.seededRandom(888));S.battle.active='dara';doSkill('attack',"+JSON.stringify(foe)+")");
 }
 assert.deepEqual(json(first.exec('S')),json(resumed.exec('S')));
 assert.equal(resumed.saved.has('thargrid_siege_save_v1'),false);
});

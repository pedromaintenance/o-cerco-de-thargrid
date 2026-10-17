/* M1d — golden AI and status parity captured from unmodified M1c main.
 * node --test tests/enemy-turn-parity.test.cjs
 */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const golden=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/enemy-turn-golden-m1c.json'),'utf8'));
function seedRandom(seed){let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function runtime(seed){
 const math=Object.create(Math);math.random=seedRandom(seed);
 const node=()=>({innerHTML:'',className:'',textContent:'',remove(){},click(){},classList:{add(){},remove(){},toggle(){}}});
 const document={documentElement:{dataset:{phaserPreview:'true'}},getElementById:node,querySelector:node,createElement:node,addEventListener(){},body:{append(){}}};
 const ctx=vm.createContext({Math:math,document,navigator:{},setTimeout(){},clearTimeout(){},
  console:{warn(){},error(){},log(){}},Blob:class{},URL:class{},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
 for(const file of ['data.js','core/combat.js','core/actions.js','core/effects.js','app.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx,{filename:file});
 return {exec:code=>vm.runInContext(code,ctx)};
}
function copy(x){return JSON.parse(JSON.stringify(x))}
function prepare(run,sc){
 const payload=JSON.stringify(sc);
 run.exec("var testCase="+payload+";S=fresh('story');screen='game';S.day=testCase.day;S.mode='battle';"+
  "S.party=['brunna','dara','eirik','serena'];"+
  "var enemyFixture={uid:'e0',id:'fixture',name:'Arauto de Teste',icon:'☠',hp:94,maxhp:110,atk:27,spd:11,ai:testCase.ai,type:'shadow',status:{},barrier:0,stage:1,dead:false};"+
  "S.battle={event:testCase.day,foes:[enemyFixture],party:[...S.party],round:testCase.round,"+
  "queue:testCase.kind==='advance'?[{side:'enemy',id:'e0',spd:99},{side:'hero',id:'dara',spd:80}]:[],ptr:0,active:null,"+
  "logs:['Início da prova.'],finished:false,major:false};"+
  "if(testCase.defenses){S.heroes.brunna.barrier=8;S.heroes.brunna.status.defUp=2;S.heroes.brunna.status.weak=2;S.heroes.brunna.injured=1;}"+
  "if(testCase.dot){S.heroes.dara.hp=42;S.heroes.dara.status={burn:2,poison:3,bleed:1,regen:2,stun:2};enemyFixture.status={burn:2,poison:2,bleed:1,regen:2,stun:2};}"+
  "if(testCase.fallen){S.heroes.dara.hp=4;S.heroes.dara.status={burn:2,poison:3,bleed:3,stun:1};}"
 );
}
function digest(exec){return copy(exec("JSON.parse(JSON.stringify({day:S.day,mode:S.mode,battle:{round:S.battle.round,ptr:S.battle.ptr,active:S.battle.active,foes:S.battle.foes,queue:S.battle.queue,logs:S.battle.logs,finished:S.battle.finished},heroes:S.battle.party.map(id=>({id,hp:S.heroes[id].hp,mp:S.heroes[id].mp,status:S.heroes[id].status,barrier:S.heroes[id].barrier,injured:S.heroes[id].injured,alive:S.heroes[id].alive}))}))"));}
test('M1d fixtures originate from M1c main before extraction',()=>{
 assert.equal(golden.source_commit,'9feb1b888370087e8cabc433202c9521238e5a7c');
 assert.equal(golden.fixtures.length,15);
 assert.ok(golden.fixtures.some(e=>e.scenario.kind==='advance'));
});
for(const {scenario,expected} of golden.fixtures){
 test('M1c exact AI/status replay: '+scenario.id,()=>{
  const run=runtime(scenario.seed);prepare(run,scenario);
  const {exec}=run;
  if(scenario.kind==='enemy')exec("enemyAction(S.battle.foes[0])");
  else if(scenario.kind==='tickHero')exec("effectStart(hero('dara'),'hero')");
  else if(scenario.kind==='tickEnemy')exec("effectStart(S.battle.foes[0],'enemy')");
  else if(scenario.kind==='advance')exec("advanceTurn()");
  assert.deepEqual(digest(exec),expected);
 });
}
test('pure AI transition leaves original state untouched and emits real target events',()=>{
 const run=runtime(3);prepare(run,{id:'poison-basic',kind:'enemy',ai:'poison',day:1,round:1});
 const before=copy(run.exec('S'));
 const result=copy(run.exec("ThargridEffects.applyEnemyAction(S,'e0',{heroes:HEROES,classes:CLASSES,core:ThargridCore})"));
 assert.deepEqual(copy(run.exec('S')),before);
 const damages=result.events.filter(e=>e.type==='damage');
 assert.ok(damages.length>=1);
 for(const e of damages){assert.equal(e.side,'hero');assert.ok(e.amount>=0);assert.ok(before.battle.party.includes(e.target));}
 assert.ok(result.events.some(e=>e.type==='log'));
});
test('pure DOT tick conserves target identity and never changes source',()=>{
 const run=runtime(9);prepare(run,{id:'tick',kind:'tickHero',ai:'basic',day:60,round:3,dot:true});
 const before=copy(run.exec('S'));
 const out=copy(run.exec("ThargridEffects.applyTurnStart(S,'hero','dara',{heroes:HEROES,classes:CLASSES})"));
 assert.deepEqual(copy(run.exec('S')),before);
 assert.ok(out.events.some(e=>e.type==='damage'&&e.side==='hero'&&e.target==='dara'&&e.status==='burn'));
 assert.ok(out.events.some(e=>e.type==='heal'&&e.status==='regen'));
 assert.ok(out.state.heroes.dara.hp!==before.heroes.dara.hp);
});
test('enemy events augment existing player feedback rather than overwriting them',()=>{
 const run=runtime(15);prepare(run,{id:'feedback',kind:'enemy',ai:'final',day:60,round:2});
 run.exec("publishCombatFeedback([{type:'damage',side:'enemy',target:'e0',amount:13,key:'attack'}]);enemyAction(S.battle.foes[0])");
 const events=copy(run.exec("combatFeedback.events"));
 assert.equal(events[0].side,'enemy');
 assert.ok(events.some(e=>e.side==='hero'&&e.type==='damage'));
 assert.ok(events.some(e=>e.type==='status'&&e.status==='burn'));
 assert.ok(!events.some(e=>e.type==='log'));
});

/* M1e: exact deterministic parity for old round creation/hazards and immutable events. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const golden=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/rounds-golden-m1d.json'),'utf8'));
function seeded(seed){let state=seed>>>0;return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)}
function runtime(seed){
 const m=Object.create(Math);m.random=seeded(seed);
 const element=()=>({innerHTML:'',className:'',textContent:'',click(){},remove(){},classList:{add(){},remove(){},toggle(){}}});
 const document={documentElement:{dataset:{phaserPreview:'true'}},getElementById:element,querySelector:element,createElement:element,addEventListener(){},body:{append(){}}};
 const ctx=vm.createContext({Math:m,document,navigator:{},console:{error(){},warn(){},log(){}},setTimeout(){},clearTimeout(){},Blob:class{},URL:class{},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
 for(const file of ['data.js','core/combat.js','core/actions.js','core/effects.js','core/rounds.js','app.js']){
  vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx,{filename:file});
 }
 return {exec:s=>vm.runInContext(s,ctx)};
}
function copy(v){return JSON.parse(JSON.stringify(v))}
function prep(run,scenario){
 run.exec("var scenario="+JSON.stringify(scenario)+";S=fresh('normal');screen='game';S.day=scenario.day;S.mode='battle';"+
 "S.party=['brunna','dara','eirik','serena'];"+
 "var foesFixture=["+
 "{uid:'e0',id:'fixture0',name:'Vigia Sombrio',icon:'☠',hp:79,maxhp:90,atk:23,spd:11,ai:'poison',type:'shadow',status:{},barrier:0,stage:1,dead:false},"+
 "{uid:'e1',id:'fixture1',name:'Arcanista da Corte',icon:'🗡',hp:65,maxhp:75,atk:19,spd:15,ai:'mage',type:'shadow',status:{},barrier:0,stage:1,dead:false}];"+
 "S.battle={event:scenario.day,foes:foesFixture,party:[...S.party],round:scenario.round,queue:[],ptr:0,active:null,"+
 "logs:['Registro de partida.'],finished:false,major:false};"+
 "if(scenario.slow){S.heroes.dara.status.slow=3;S.heroes.dara.fatigue=69;S.heroes.brunna.injured=2;S.battle.foes[0].status.slow=2;}"+
 "if(scenario.deadFoe){S.battle.foes[0].hp=0;S.battle.foes[0].dead=true;}"+
 "if(scenario.noSurvivor){S.battle.party.forEach(id=>S.heroes[id].hp=0);}");
}
function digest(exec){
 return copy(exec("JSON.parse(JSON.stringify({day:S.day,mode:S.mode,heroes:S.battle.party.map(id=>{const h=S.heroes[id];return {id,hp:h.hp,mp:h.mp,alive:h.alive,status:h.status,barrier:h.barrier,fatigue:h.fatigue,injured:h.injured}}),battle:{round:S.battle.round,event:S.battle.event,queue:S.battle.queue,ptr:S.battle.ptr,active:S.battle.active,logs:S.battle.logs,foes:S.battle.foes,finished:S.battle.finished},history:S.history||[],victories:S.victories}))"));
}
test('baseline is from M1d main and has independent cases for every active hazard',()=>{
 assert.equal(golden.source_commit,'9758dc92eac35901f3b3cd758734845b1e2f258c');
 assert.equal(golden.fixtures.length,20);
 for(const id of ['poison','siege','cold','shadow','stone','water','fire','machine','court','slow-fatigued','dead-foe','advance-with-hazard','advance-boss-60']){
  assert.ok(golden.fixtures.some(f=>f.scenario.id===id),id);
 }
});
for(const {scenario,expected} of golden.fixtures){
 test('M1d parity for round/initiative '+scenario.id,()=>{
  const run=runtime(scenario.seed);
  prep(run,scenario);
  run.exec(scenario.advance?'advanceTurn()':'createRound()');
  assert.deepEqual(digest(run.exec),expected);
 });
}
test('round engine preserves its source state and emits matching hazard/queue events',()=>{
 const run=runtime(49),scenario={day:43,round:2};
 prep(run,scenario);
 const state=copy(run.exec('S'));
 const result=copy(run.exec("ThargridRounds.applyRoundStart(S,RAIDS[S.day-1].hazard,{core:ThargridCore,effects:ThargridEffects,heroes:HEROES,classes:CLASSES})"));
 assert.deepEqual(copy(run.exec('S')),state,'round creation may not mutate input');
 assert.equal(result.state.battle.round,3);
 assert.equal(result.events.at(-1).type,'round');
 assert.equal(result.events.at(-1).queue.length,6);
 assert.equal(result.events.filter(e=>e.type==='shield'&&e.side==='enemy').length,2);
 assert.ok(result.events.find(e=>e.type==='log'&&e.text.includes('Engrenagens')));
});
test('hazard events are accumulated alongside subsequent combat effects',()=>{
 const run=runtime(47),scenario={day:31,round:2};
 prep(run,scenario);
 run.exec('createRound()');
 const effects=copy(run.exec('combatFeedback.events'));
 assert.ok(effects.find(e=>e.type==='round'&&e.round===3));
 assert.ok(effects.find(e=>e.type==='status'&&e.status==='slow'&&e.source==='hazard'));
 assert.ok(!effects.some(e=>e.type==='log'));
});

/* M1c: pure combat effects are immutable and expose UI-safe semantic events. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const content=['data.js','core/combat.js','core/actions.js','core/effects.js','app.js']
 .map(name=>({name,source:fs.readFileSync(path.join(base,name),'utf8')}));
function runtime(seed=808){
 const saved=new Map();let state=seed>>>0;
 const m=Object.create(Math);
 m.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const node=()=>({innerHTML:'',className:'',textContent:'',remove(){},click(){},classList:{add(){},remove(){},toggle(){}}});
 const doc={documentElement:{dataset:{phaserPreview:'true'}},getElementById:node,querySelector:node,createElement:node,addEventListener(){},body:{append(){}}};
 const ctx=vm.createContext({Math:m,document:doc,navigator:{},console:{warn(){},error(){}},
  localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
  setTimeout(){},clearTimeout(){},Blob:class{},URL:class{}});
 content.forEach(file=>vm.runInContext(file.source,ctx,{filename:file.name}));
 return {exec:code=>vm.runInContext(code,ctx),saved};
}
function snapshot(value){return JSON.parse(JSON.stringify(value));}
function prepared(run,day=1){
 run.exec("S=fresh('story');screen='game';S.day="+day+";S.flags['council_'+Math.floor((S.day-1)/6)]='povo';beginBattle();");
}
function useSkill(run,key,target,actor){
 const {exec}=run;
 exec("S.battle.active="+JSON.stringify(actor||'dara'));
 const before=snapshot(exec("S"));
 const result=exec("ThargridEffects.applySkill(S,ThargridActions.planSkill(S,"+JSON.stringify(key)+","+JSON.stringify(target)+",SKILLS,CLASSES),"+JSON.stringify(key)+",{skills:SKILLS,classes:CLASSES,heroes:HEROES,core:ThargridCore,hazard:raid().hazard})");
 assert.deepEqual(snapshot(exec("S")),before,'pure effect must not mutate source save');
 return {result:snapshot(result),before};
}
test('attack emits target-specific damage and log without affecting input',()=>{
 const run=runtime(88);prepared(run);
 const {result,before}=useSkill(run,'attack','e0','dara');
 const e=result.events.find(e=>e.type==='damage');
 assert.equal(e.side,'enemy');assert.equal(e.target,'e0');
 assert.equal(e.amount,before.battle.foes[0].hp-result.state.battle.foes[0].hp);
 assert.ok(e.amount>0);
 assert.equal(result.state.battle.active,null);
 assert.equal(result.events[result.events.length-1].type,'log');
 assert.equal(result.state.battle.logs[0],result.events[result.events.length-1].text);
});
test('healing and guard emit actual HP/shield delta, without mutating input',()=>{
 const run=runtime(201);prepared(run);
 run.exec("S.heroes.brunna.hp=12");
 const {result,before}=useSkill(run,'heal','brunna','serena');
 const heal=result.events.find(e=>e.type==='heal');
 assert.equal(heal.target,'brunna');
 assert.equal(heal.amount,result.state.heroes.brunna.hp-before.heroes.brunna.hp);
 assert.ok(heal.amount>0);
 const guarded=useSkill(run,'guard',null,'brunna').result;
 const e=guarded.events.find(e=>e.type==='shield');
 assert.equal(e.target,'brunna');assert.ok(e.amount>0);
 assert.equal(guarded.state.heroes.brunna.barrier,result.state.heroes.brunna.barrier+e.amount);
});
test('phoenix returns semantic revive + item events and consumes exactly one item',()=>{
 const run=runtime(301);prepared(run);
 run.exec("S.heroes.brunna.hp=0;S.battle.active='serena'");
 const before=snapshot(run.exec("S"));
 const result=run.exec("ThargridEffects.applyItem(S,ThargridActions.planItem(S,'phoenix','brunna'),'phoenix',{heroes:HEROES,classes:CLASSES,store:STORE})");
 assert.deepEqual(snapshot(run.exec("S")),before);
 const outcome=snapshot(result);
 assert.equal(outcome.events[0].type,'item');
 assert.equal(outcome.events[1].type,'revive');
 assert.ok(outcome.state.heroes.brunna.hp>0);
 assert.equal(outcome.state.inventory.phoenix,before.inventory.phoenix-1);
 assert.equal(outcome.state.heroes.brunna.injured,2);
});
test('boss changes phase exactly once and emits a phase event',()=>{
 const run=runtime(303);prepared(run,60);
 run.exec("S.battle.foes[0].hp=1;S.battle.foes[0].barrier=0");
 const {result}=useSkill(run,'attack','e0','dara');
 assert.equal(result.state.battle.foes[0].stage,2);
 assert.equal(result.state.battle.foes[0].hp,Math.round(result.state.battle.foes[0].maxhp*.46));
 assert.ok(result.events.some(e=>e.type==='phase'&&e.stage===2&&e.target==='e0'));
 assert.match(result.state.battle.logs[0],/Dara/);
});
test('combat feedback sequence advances only when real effects complete',()=>{
 const run=runtime(39);prepared(run);
 run.exec("S.battle.active='eirik';doSkill('arcaneBolt','e0')");
 const seq=run.exec("combatFeedback.seq");
 assert.ok(seq>1,'enemy reactions and status ticks now publish their own effects');
 const events=snapshot(run.exec("combatFeedback.events"));
 assert.ok(events.some(x=>x.type==='damage'&&x.key==='arcaneBolt'));
 assert.ok(!events.some(x=>x.type==='log'));
 run.exec("doSkill('arcaneBolt','nobody')");
 assert.equal(run.exec("combatFeedback.seq"),seq);
});

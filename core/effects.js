/* O Cerco de Thargrid — M1c: pure player combat effects and semantic events.
 * Takes a save-compatible state, an approved action plan and data definitions.
 * Returns {state, events} without changing the input, DOM, storage or scene.
 * Enemy actions/turn scheduling remain in app.js until their own parity suite.
 */
(function(root,factory){
 'use strict';
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.ThargridEffects=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function clone(value){return JSON.parse(JSON.stringify(value));}
 function heroMaxHP(h, data){
  var cls=data.classes[h.klass],base=data.heroes.find(function(e){return e.id===h.id})||h;
  return Math.max(35,Math.round(h.hpBase||h.hpNatural||base.hp+cls.hp+(h.level-1)*11+
   ((h.training&&h.training.vit)||0)*8+(h.personalDone?8:0)));
 }
 function heroMaxMP(state,h,data){
  var cls=data.classes[h.klass],base=(data.heroes.find(function(e){return e.id===h.id})||h).mp;
  return Math.max(7,base+cls.mp+(h.level-1)*3+
   ((h.training&&h.training.mag)||0)*5+
   (state.relics.includes('codex')&&h.id==='eirik'?15:0));
 }
 function stat(state,h,k,data){
  var cls=data.classes[h.klass],base=data.heroes.find(function(e){return e.id===h.id})||h,rb=0;
  if(state.relics.includes('hammer')&&h.id==='gorun'&&k==='atk')rb+=7;
  if(state.relics.includes('axe')&&h.id==='brom'&&k==='atk')rb+=7;
  if(state.relics.includes('bow')&&h.id==='dara'&&(k==='atk'||k==='spd'))rb+=(k==='atk'?6:3);
  if(state.relics.includes('codex')&&h.id==='eirik'&&k==='mag')rb+=8;
  if(state.relics.includes('lamp')&&h.id==='serena'&&k==='mag')rb+=6;
  if(state.relics.includes('banner')&&k==='def')rb+=4;
  var up=k==='atk'?2:k==='mag'?1.5:k==='def'?1.3:k==='spd'?.55:0;
  return Math.round(base[k]+cls[k]+(h.level-1)*up+
   ((h.training&&h.training[k])||0)*2+(h.personalDone?3:0)+rb+
   (state.projects.forge&&k==='atk'?state.projects.forge*2:0));
 }
 function appendLog(s,events,text){
  s.battle.logs.unshift(text);
  s.battle.logs=s.battle.logs.slice(0,26);
  events.push({type:'log',text:text});
 }
 function applySkill(state,plan,key,data){
  if(!plan||!plan.ok)throw new Error('Skill plan must be validated before execution.');
  var s=clone(state),b=s.battle,h=s.heroes[b.active],sk=data.skills[key];
  if(!sk)throw new Error('Missing skill definition: '+key);
  var enemy=plan.type==='enemy'||plan.type==='allEnemies';
  var targets=plan.targets.map(function(id){
    return enemy?b.foes.find(function(f){return f.uid===id}):s.heroes[id];
  });
  var events=[],parts=[];
  h.mp-=sk.cost;
  events.push({type:'mana',side:'hero',target:h.id,amount:-sk.cost,key:key});
  if(key==='guard'){
    var protection=Math.round(19+stat(s,h,'def',data)*.7);
    h.barrier+=protection;
    h.mp=Math.min(heroMaxMP(s,h,data),h.mp+3);
    events.push({type:'shield',side:'hero',target:h.id,amount:protection,key:key});
    parts.push('assume posição defensiva');
  } else if(sk.type==='heal'){
    targets.forEach(function(x){
      var heal=Math.max(7,Math.round((stat(s,h,'mag',data)*1.4+h.level*3+10)*(sk.power||1)));
      var before=x.hp;
      x.hp=Math.min(heroMaxHP(x,data),x.hp+heal);
      if(sk.effect==='cleanse')x.status={};
      events.push({type:'heal',side:'hero',target:x.id,amount:x.hp-before,key:key});
      if(sk.effect==='cleanse')events.push({type:'cleanse',side:'hero',target:x.id,key:key});
      parts.push(x.name+' +'+heal+' PV');
    });
  } else if(sk.type==='revive'){
    targets.forEach(function(x){
      var count=Math.ceil(heroMaxHP(x,data)*.32);
      x.hp=count;x.status={};x.injured=2;
      events.push({type:'revive',side:'hero',target:x.id,amount:count,key:key});
      parts.push(x.name+' retorna com '+count+' PV');
    });
  } else if(sk.type==='support'){
    targets.forEach(function(x){
      if(sk.effect==='shield'){
        var shield=Math.round((sk.power||18)+stat(s,h,'mag',data)*.3);
        x.barrier+=shield;
        events.push({type:'shield',side:'hero',target:x.id,amount:shield,key:key});
        parts.push(x.name+' +'+shield+' de escudo');
      }else{
        x.status[sk.effect]=3;
        events.push({type:'status',side:'hero',target:x.id,status:sk.effect,duration:3,key:key});
        parts.push(x.name+' recebe '+(sk.effect==='atkUp'?'Fúria/Coragem':'Defesa')+' por 3 turnos');
      }
    });
  }else{
    targets.forEach(function(t){
      var dmg=data.core.heroDamage({
        hero:h,skill:sk,target:t,
        attack:stat(s,h,'atk',data),magic:stat(s,h,'mag',data),
        forge:s.projects.forge||0,hazard:data.hazard
      });
      if(t.barrier){
        var absorbed=data.core.absorbBarrier(dmg,t.barrier);
        t.barrier=absorbed.barrier;dmg=absorbed.damage;
      }
      var previous=t.hp;
      t.hp=Math.max(0,t.hp-dmg);
      events.push({type:'damage',side:'enemy',target:t.uid,amount:previous-t.hp,key:key});
      parts.push(t.name+' −'+dmg+' PV');
      if(t.hp<=0){
        var phase=data.core.secondPhase(t.hp,t.id,t.stage,t.maxhp);
        if(phase.triggered){
          t.stage=phase.stage;t.hp=phase.hp;t.status=phase.status;
          events.push({type:'phase',side:'enemy',target:t.uid,stage:2,key:key});
          appendLog(s,events,'A NOITE SE REFAZ! A manifestação entra na segunda fase.');
        }else{
          t.dead=true;
          events.push({type:'defeat',side:'enemy',target:t.uid,key:key});
          appendLog(s,events,t.name+' foi derrotado.');
        }
      } else if(sk.effect&&data.core.random()<(sk.chance||0)){
        var length=sk.effect==='stun'?1:sk.effect==='mark'?4:3;
        t.status[sk.effect]=length;
        events.push({type:'status',side:'enemy',target:t.uid,status:sk.effect,duration:length,key:key});
      }
      if(sk.type==='fire')delete t.status.regen;
    });
  }
  appendLog(s,events,h.name+' usa '+sk.name+': '+parts.join(' · ')+'.');
  b.active=null;
  return {state:s,events:events};
 }
 function applyItem(state,plan,key,data){
  if(!plan||!plan.ok)throw new Error('Item plan must be validated before execution.');
  var s=clone(state),b=s.battle,t=s.heroes[plan.targets[0]],actor=s.heroes[b.active];
  var events=[],detail='';
  s.inventory[key]--;
  events.push({type:'item',key:key,actor:actor.id,target:t.id,amount:-1});
  if(key==='tonic'){
    var hpBefore=t.hp;
    t.hp=Math.min(heroMaxHP(t,data),t.hp+46);
    detail=t.name+' recupera 46 PV';
    events.push({type:'heal',side:'hero',target:t.id,amount:t.hp-hpBefore,key:key});
  }else if(key==='ether'){
    var mpBefore=t.mp;
    t.mp=Math.min(heroMaxMP(s,t,data),t.mp+24);
    detail=t.name+' recupera 24 MP';
    events.push({type:'mana',side:'hero',target:t.id,amount:t.mp-mpBefore,key:key});
  }else if(key==='phoenix'){
    t.hp=Math.ceil(heroMaxHP(t,data)*.28);t.status={};t.injured=2;
    detail=t.name+' regressa ao combate';
    events.push({type:'revive',side:'hero',target:t.id,amount:t.hp,key:key});
  }else if(key==='antidote'){
    t.status={};detail=t.name+' foi purificado';
    events.push({type:'cleanse',side:'hero',target:t.id,key:key});
  }
  appendLog(s,events,actor.name+' usa '+data.store[key].name+': '+detail+'.');
  b.active=null;
  return {state:s,events:events};
 }
 return Object.freeze({applySkill:applySkill,applyItem:applyItem,heroMaxHP:heroMaxHP,heroMaxMP:heroMaxMP,stat:stat});
});

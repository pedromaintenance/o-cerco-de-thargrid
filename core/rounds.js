/* O Cerco de Thargrid — M1e: immutable environmental hazards and rounds.
 * Does not access DOM, storage, Phaser or the mutable game singleton.
 * RNG is supplied by core, preserving the exact original draw order.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.ThargridRounds=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 function applyRoundStart(state,hazard,data){
  if(!state||!state.battle)throw new Error('A battle is required to start a round.');
  if(!data||!data.core||!data.effects||!data.heroes||!data.classes)
   throw new Error('Missing combat rules dependencies.');
  const s=clone(state),b=s.battle,events=[];
  b.round++;
  function writeLog(message){
    b.logs.unshift(message);
    b.logs=b.logs.slice(0,26);
    events.push({type:'log',text:message});
  }
  if(b.round>1&&b.round%3===0){
    // The original code makes one survivor RNG draw even for unknown hazards,
    // and does not select anyone if every defender is at 0 HP.
    const survivors=b.party.map(id=>s.heroes[id]).filter(h=>h.hp>0);
    if(survivors.length){
      const v=survivors[data.core.integer(0,survivors.length-1)];
      function status(key,message){
        v.status[key]=2;
        writeLog(message);
        events.push({type:'status',side:'hero',target:v.id,status:key,duration:2,source:'hazard'});
      }
      if(hazard==='cold'){
        const previous=v.mp;
        v.mp=Math.max(0,v.mp-4);
        writeLog('Nevasca: '+v.name+' perde 4 MP.');
        events.push({type:'mana',side:'hero',target:v.id,amount:v.mp-previous,source:'hazard'});
      }else if(hazard==='poison'){
        status('poison','Esporos venenosos contaminam '+v.name+'.');
      }else if(hazard==='shadow'||hazard==='court'){
        status('weak','Sombra da Corte enfraquece '+v.name+'.');
      }else if(hazard==='machine'){
        b.foes.filter(f=>f.hp>0).forEach(f=>{
          f.barrier+=5;
          events.push({type:'shield',side:'enemy',target:f.uid,amount:5,source:'hazard'});
        });
        writeLog('Engrenagens do cerco reforçam a hoste inimiga.');
      }else if(hazard==='water'){
        status('slow','Correnteza atrasa '+v.name+'.');
      }else if(hazard==='fire'){
        status('burn','Faíscas do cerco queimam '+v.name+'.');
      }else if(hazard==='stone'||hazard==='siege'){
        const before=v.barrier;
        v.barrier=Math.max(0,v.barrier-8);
        writeLog('Estilhaços atingem as defesas da companhia.');
        events.push({type:'shield',side:'hero',target:v.id,amount:v.barrier-before,source:'hazard'});
      }
    }
  }
  // The original initiative draw uses survivors in party order, followed by
  // living enemies in foe order. Each unit consumes exactly one random draw.
  const units=[
    ...b.party.filter(id=>{
      const h=s.heroes[id];return !!h&&h.alive&&h.hp>0;
    }).map(id=>{
      const h=s.heroes[id];
      const penalty=Math.ceil((h.injured?3:0)+h.fatigue/23);
      return {side:'hero',id,spd:data.effects.stat(s,h,'spd',{heroes:data.heroes,classes:data.classes})-
        penalty+(h.status.slow?-7:0)};
    }),
    ...b.foes.filter(e=>e.hp>0&&!e.dead).map(e=>({
      side:'enemy',id:e.uid,spd:e.spd+(e.status.slow?-6:0)
    }))
  ];
  b.queue=data.core.initiativeOrder(units);
  b.ptr=0;
  b.logs.push('— Rodada '+b.round+' —');
  events.push({type:'round',round:b.round,queue:b.queue.map(item=>({side:item.side,id:item.id,spd:item.spd}))});
  return {state:s,events};
 }
 return Object.freeze({applyRoundStart});
});

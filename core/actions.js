/* O Cerco de Thargrid — M1b: deterministic action validation/target planning.
 * No DOM, storage, graphics, RNG, or mutations. The classic and Phaser preview share it.
 * Execution/effects remain in app.js until verified reducer parity is available.
 */
(function(root,factory){
 'use strict';
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.ThargridActions=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function failure(reason){return {ok:false,reason:reason,targets:[]};}
 function success(targets,type){return {ok:true,reason:null,targets:targets,type:type};}
 function fighter(state,id){return state&&state.heroes&&state.heroes[id];}
 function aliveParty(state){return state.battle.party.map(function(id){return fighter(state,id)}).filter(function(h){return h&&h.alive});}
 function selectableTargets(state,type){
  if(!state||state.mode!=='battle'||!state.battle||state.battle.finished)return [];
  var b=state.battle;
  if(type==='enemy'||type==='allEnemies')return b.foes.filter(function(e){return e.hp>0}).map(function(e){return e.uid});
  var allies=aliveParty(state);
  if(type==='self')return b.active?[b.active]:[];
  if(type==='fallen')return allies.filter(function(h){return h.hp<=0}).map(function(h){return h.id});
  if(type==='ally'||type==='allAllies')return allies.filter(function(h){return h.hp>0}).map(function(h){return h.id});
  return [];
 }
 function planSkill(state,key,target,skills,classes){
  var b=state&&state.battle;
  if(!b||b.finished||!b.active)return failure(null); // original silently ignores idle actions
  var h=fighter(state,b.active),sk=skills&&skills[key];
  if(!h||h.hp<=0||!sk)return failure(null);
  var cls=classes&&classes[h.klass];
  var allowed=key==='attack'||key==='guard'||(h.learned||[]).includes(key)||
    !!(cls&&cls.skills.includes(key)&&h.level>=(sk.level||1));
  if(!allowed)return failure('Técnica ainda não aprendida.');
  if(h.mp<sk.cost)return failure('Mana insuficiente.');
  var valid=selectableTargets(state,sk.target);
  var targets=[],error=null;
  switch(sk.target){
   case 'self':case 'allEnemies':case 'allAllies':targets=valid;break;
   case 'enemy':if(valid.includes(target))targets=[target];else error='Selecione um inimigo válido.';break;
   case 'ally':if(valid.includes(target))targets=[target];else error='Selecione um aliado vivo.';break;
   case 'fallen':if(valid.includes(target))targets=[target];else error='Selecione um aliado caído.';break;
  }
  if(error)return failure(error);
  return targets.length?success(targets,sk.target):failure('Não há alvo válido.');
 }
 function planItem(state,key,target){
  var b=state&&state.battle;
  if(!b||!b.active||!state.inventory||!(state.inventory[key]>0))return failure('Item indisponível.');
  var h=fighter(state,target);
  if(!h||!b.party.includes(target)||!h.alive)return failure('Escolha um membro da equipe.');
  if(key==='tonic'&&h.hp<=0)return failure('Use a Cinza da Chama num aliado caído.');
  if(key==='ether'&&h.hp<=0)return failure('Aliado caído.');
  if(key==='phoenix'&&h.hp>0)return failure('O aliado não está caído.');
  if(key==='antidote'&&h.hp<=0)return failure('Não afeta aliados caídos.');
  return success([target],key==='phoenix'?'fallen':'ally');
 }
 function skillTargetType(key,skills){return skills&&skills[key]&&skills[key].target||null;}
 function itemTargetType(key){return key==='phoenix'?'fallen':'ally';}
 return Object.freeze({selectableTargets:selectableTargets,planSkill:planSkill,planItem:planItem,skillTargetType:skillTargetType,itemTargetType:itemTargetType});
});

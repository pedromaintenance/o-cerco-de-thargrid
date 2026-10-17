/* O Cerco de Thargrid — núcleo mecânico compartilhado (M1a).
 * No browser DOM, no localStorage, no Phaser, no game state singleton.
 * The classic and the Phaser beta call the same functions.
 * Combat balance deliberately mirrors app.js v1, including rounding and RNG order.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ThargridCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var randomSource = function () { return Math.random(); };

  function random() { return randomSource(); }
  function integer(min, max) { return Math.floor(random() * (max - min + 1)) + min; }
  function setRandomSource(source) {
    if (typeof source !== 'function') throw new TypeError('A fonte de aleatoriedade precisa ser uma função.');
    var previous = randomSource;
    randomSource = source;
    return function restore() { randomSource = previous; };
  }
  function seededRandom(seed) {
    var state = seed >>> 0;
    return function () {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function enemyStats(monster, day, difficulty, uid, id) {
    var diff = ({ story: 0.80, normal: 1, hard: 1.22 })[difficulty] || 1;
    var chapter = Math.floor((day - 1) / 6);
    var scale = (1 + chapter * .14) * (1 + Math.max(0, day - 1) * .004) * diff;
    return {
      uid: uid, id: id, name: monster[0], icon: monster[1],
      hp: Math.round(monster[2] * scale), maxhp: Math.round(monster[2] * scale),
      atk: Math.round(monster[3] * (1 + chapter * .125) * diff),
      spd: monster[4] + Math.floor(day / 12),
      ai: monster[5], type: monster[6], status: {}, barrier: 0, stage: 1, dead: false
    };
  }

  /* Input is an array of {side,id,spd}. No mutation; exactly one draw per unit. */
  function initiativeOrder(units) {
    return units.map(function (unit) {
      return Object.assign({}, unit, { spd: unit.spd + random() * 6 });
    }).sort(function (a, z) { return z.spd - a.spd; });
  }

  function heroDamage(p) {
    var sk = p.skill, h = p.hero, t = p.target;
    var out = sk.type === 'physical' ? p.attack : p.magic * 1.22;
    var val = (out + 4 + h.level * 1.35) * (sk.power || 1);
    if (sk.type === 'physical') val -= ((t.ai === 'guard' || t.ai === 'boss') ? Math.ceil(t.atk * .27) : Math.ceil(t.atk * .12));
    else val -= Math.ceil(t.atk * .05);
    if (h.status.atkUp) val *= 1.22;
    if (h.status.weak) val *= .73;
    if (t.status.mark) val *= 1.2;
    if (t.status.defUp) val *= .75;
    if (h.fatigue > 65) val *= .80;
    else if (h.fatigue > 38) val *= .90;
    if (h.injured) val *= .90;
    if ((sk.type === 'holy' && ['shadow', 'undead'].some(function () {
      return ['shadow', 'drain', 'curse'].includes(t.ai) || t.type === 'shadow';
    })) || (sk.type === 'lightning' && ['machine', 'water'].includes(p.hazard))) val *= 1.35;
    if (sk.type === 'fire' && ['nature', 'regenerate'].includes(t.ai)) val *= 1.28;
    if (sk.type === 'ice' && t.type === 'fire') val *= 1.36;
    if (sk.type === 'shadow' && t.type === 'shadow') val *= .70;
    if (p.forge) val *= 1 + .03 * p.forge;
    return Math.max(2, Math.round(val * (.89 + random() * .22)));
  }

  function enemyBaseDamage(attack, round, area, offset) {
    return Math.round(attack * (area ? .67 : 1) * (1 + Math.max(0, round - 17) * .055) + offset);
  }
  function enemyTakenDamage(amount, defense, status, klass, injured) {
    var mult = 1;
    if (status.defUp) mult *= .68;
    if (status.weak) mult *= 1.08;
    if (klass === 'warden') mult *= .90;
    if (injured) mult *= 1.1;
    return Math.max(3, Math.round((amount - defense * .31) * mult));
  }

  /* Pure damage absorption: caller owns the mutation/HP clamping. */
  function absorbBarrier(damage, barrier) {
    var blocked = Math.min(barrier, damage);
    return {blocked: blocked, damage: damage - blocked, barrier: barrier - blocked};
  }

  function secondPhase(hp, id, stage, maxhp) {
    if (hp <= 0 && id === 'nightavatar' && stage === 1) {
      return {triggered: true, hp: Math.round(maxhp * .46), stage: 2, status: {atkUp: 5}};
    }
    return {triggered: false, hp: hp, stage: stage};
  }

  return Object.freeze({
    random: random, integer: integer, setRandomSource: setRandomSource,
    seededRandom: seededRandom, enemyStats: enemyStats, initiativeOrder: initiativeOrder,
    heroDamage: heroDamage, enemyBaseDamage: enemyBaseDamage,
    enemyTakenDamage: enemyTakenDamage, absorbBarrier: absorbBarrier,
    secondPhase: secondPhase
  });
});

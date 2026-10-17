/* O Cerco de Thargrid — Phaser 4 visual bridge.
 * All rules, combat turns, rewards and persistence remain in ../app.js.
 * This bridge never calculates damage or directly writes a save.
 */
(function () {
  'use strict';
  var engineReady = false, loading = false, game = null, host = null;
  var originalRender = render;
  var originalBattle = renderBattle;
  var previous = {};
  var RENDER_W = 480, RENDER_H = 560;

  function info(message, warning) {
    var label = document.getElementById('beta-status');
    if (label) { label.textContent = message; label.classList.toggle('warning', !!warning); }
  }

  renderBattle = function () {
    var html = originalBattle();
    return html.replace('<div class="battle-wrap">',
      '<div class="battle-wrap"><section class="beta-battle" aria-label="Campo de batalha em Phaser">' +
      '<div class="beta-caption"><strong>CAMPO DE BATALHA · PHASER 4</strong><span>Toque no inimigo para atacar no turno do herói</span></div>' +
      '<div id="phaser-mount-slot"></div></section>');
  };

  function stateOf() {
    if (!S || S.mode !== 'battle' || !S.battle) return null;
    return S.battle;
  }

  function BattleScene() {
    Phaser.Scene.call(this, { key: 'SiegeBattle' });
  }
  BattleScene.prototype = Object.create(Phaser.Scene.prototype);
  BattleScene.prototype.constructor = BattleScene;

  BattleScene.prototype.create = function () {
    var g = this.add.graphics();
    g.fillGradientStyle(0x070b15, 0x070b15, 0x243b4c, 0x243b4c, 1);
    g.fillRect(0, 0, RENDER_W, RENDER_H);
    g.fillStyle(0x17222f, 1);
    g.fillTriangle(-40, 285, 110, 75, 265, 285);
    g.fillTriangle(155, 285, 365, 45, 540, 285);
    g.fillStyle(0x2a3740, 1);
    g.fillTriangle(-25, 317, 168, 152, 295, 317);
    g.fillTriangle(197, 317, 387, 146, 540, 317);
    g.fillStyle(0xd2ced3, 0.62);
    g.fillTriangle(52, 157, 110, 75, 168, 157);
    g.fillTriangle(290, 130, 365, 45, 436, 130);
    g.fillStyle(0x090d13, 0.92);
    g.fillRect(0, 300, 480, 260);
    g.fillStyle(0x343b45, 1);
    g.fillRect(0, 470, 480, 9);
    g.fillStyle(0x1b252d, 1);
    for (var i = 0; i < 12; i++) {
      g.fillRoundedRect(i * 44 - 8, 293 + ((i % 3) * 7), 33, 25, 3);
      g.fillStyle(i % 2 ? 0x29333e : 0x343c48, 1);
    }
    for (var j = 0; j < 5; j++) {
      g.fillStyle(0x4f3432, 0.8); g.fillTriangle(j * 106 - 3, 299, j * 106 + 34, 225, j * 106 + 55, 299);
      g.fillStyle(0xa34d45, 0.86); g.fillTriangle(j * 106 + 12, 242, j * 106 + 55, 252, j * 106 + 26, 268);
    }
    g.fillStyle(0x0e141d, 0.9); g.fillRoundedRect(10, 8, 460, 38, 4);
    g.lineStyle(1, 0x706459, 0.8); g.strokeRoundedRect(10, 8, 460, 38, 4);
    g.fillStyle(0x19202a, 0.9); g.fillRoundedRect(10, 486, 460, 63, 4);
    g.lineStyle(1, 0x786958, 0.6); g.strokeRoundedRect(10, 486, 460, 63, 4);
    this.units = this.add.container(0, 0);
    this.battleInfo = this.add.text(240, 27, '', {fontFamily:'Georgia, serif',fontSize:'17px',color:'#f3d8a4',align:'center'}).setOrigin(0.5);
    this.footer = this.add.text(24, 505, '', {fontFamily:'Arial, sans-serif',fontSize:'15px',color:'#ece6d7',wordWrap:{width:425}});
    this.sync();
  };

  function bar(scene, node, x, y, w, ratio, color) {
    var back = scene.add.graphics();
    back.fillStyle(0x080c13, 1); back.fillRoundedRect(x, y, w, 6, 2);
    back.fillStyle(color, 1); back.fillRoundedRect(x, y, Math.max(0, w * Math.max(0, Math.min(1, ratio))), 6, 2);
    node.add(back);
  }

  BattleScene.prototype.fighterNode = function (unit, index, count, side, row) {
    var isEnemy = side === 'enemy';
    var cols = Math.min(count, 4);
    var col = index % cols;
    var spacing = cols === 1 ? 0 : 365 / (cols - 1);
    var x = cols === 1 ? 240 : 57 + col * spacing;
    var y = isEnemy ? (count > 4 ? 157 + row * 97 : 192) : 409;
    var dead = unit.hp <= 0;
    var active = !isEnemy && S.battle.active === unit.id;
    var color = isEnemy ? 0x974d57 : 0x83a7a4;
    var node = this.add.container(x, y);
    var g = this.add.graphics();
    g.fillStyle(0x070c12, 0.55); g.fillEllipse(0, 11, 72, 14);
    if (active) {
      g.lineStyle(2, 0xebc983, 1); g.strokeEllipse(0, 10, 84, 25);
    }
    g.fillStyle(isEnemy ? 0x3b2535 : 0x28464b, dead ? 0.33 : 1);
    g.fillTriangle(-25, 0, 0, -74, 24, 0);
    g.fillStyle(color, dead ? 0.25 : 1);
    g.fillRoundedRect(-18, -59, 36, 39, 7);
    g.fillStyle(isEnemy ? 0x3c333d : 0xc1aba1, dead ? 0.23 : 1);
    g.fillCircle(0, -70, 16);
    g.fillStyle(isEnemy ? 0xf9b2a0 : 0x26313f, dead ? 0.22 : 1);
    g.fillRect(-10, -73, 7, 3); g.fillRect(4, -73, 7, 3);
    g.lineStyle(4, isEnemy ? 0x76727e : 0xcbb78b, dead ? 0.18 : 1);
    g.lineBetween(18, -45, 30, -14);
    g.lineStyle(3, 0x3f3737, dead ? 0.15 : 1);
    g.lineBetween(-10, -20, -16, 7); g.lineBetween(10, -20, 16, 7);
    if (!isEnemy) { g.fillStyle(0xa1afbe, dead ? 0.2 : 1); g.fillRoundedRect(-35, -38, 21, 30, 3); }
    node.add(g);
    var name = unit.name.length > 14 ? unit.name.slice(0, 12) + '…' : unit.name;
    node.add(this.add.text(0, 19, name, {fontFamily:'Arial, sans-serif', fontSize:'12px', color:dead ? '#7f858e' : '#f5e6d4',stroke:'#090c11',strokeThickness:3}).setOrigin(0.5));
    var max = isEnemy ? unit.maxhp : maxHP(unit);
    bar(this, node, -39, 38, 78, max ? unit.hp / max : 0, isEnemy ? 0xd96f74 : 0x72cbb0);
    if (!isEnemy) {
      bar(this, node, -39, 47, 78, maxMP(unit) ? unit.mp / maxMP(unit) : 0, 0x8a9de3);
    }
    if (unit.barrier) node.add(this.add.text(37, -55, '◆' + unit.barrier, {fontSize:'11px',color:'#c5dfff'}).setOrigin(0.5));
    var effects = Object.keys(unit.status || {}).filter(function (k) { return !!unit.status[k]; }).slice(0, 3).join(' · ');
    if (effects) node.add(this.add.text(0, isEnemy ? 49 : 58, effects, {fontSize:'10px',color:'#ebc485'}).setOrigin(0.5));
    if (isEnemy && !dead) {
      var hit = this.add.zone(x, y - 32, Math.max(84, spacing || 105), 116).setInteractive({useHandCursor:true});
      hit.on('pointerdown', function () {
        if (S && S.mode === 'battle' && S.battle && S.battle.active) handle('targetenemy', unit.uid);
      });
      this.units.add(hit);
    }
    this.units.add(node);
    return {x:x, y:y-45};
  };

  BattleScene.prototype.sync = function () {
    var b = stateOf();
    if (!b || !this.units) return;
    var old = previous;
    var next = {};
    this.units.removeAll(true);
    var allEnemies = b.foes;
    var cols = Math.min(allEnemies.length, 4);
    var current = b.active ? S.heroes[b.active] : null;
    this.battleInfo.setText('DIA ' + S.day + '   ·   RODADA ' + b.round + '   ·   ' + raid().front.toUpperCase());
    this.footer.setText(current ? '▶ ' + current.name + ' — escolha sua ação abaixo.' : 'A Corte movimenta suas hostes…');
    for (var i = 0; i < allEnemies.length; i++) {
      var e = allEnemies[i], p = this.fighterNode(e, i, allEnemies.length, 'enemy', Math.floor(i / cols));
      next[e.uid] = {hp:e.hp, x:p.x, y:p.y};
    }
    for (var n = 0; n < b.party.length; n++) {
      var h = S.heroes[b.party[n]], q = this.fighterNode(h, n, b.party.length, 'hero', 0);
      next[h.id] = {hp:h.hp, x:q.x, y:q.y};
    }
    var self = this;
    Object.keys(next).forEach(function (id) {
      if (!old[id] || old[id].hp === next[id].hp) return;
      var delta = next[id].hp - old[id].hp;
      var label = self.add.text(next[id].x, next[id].y - 42,
        (delta > 0 ? '+' : '') + delta, {
          fontFamily:'Arial, sans-serif', fontSize:'23px', fontStyle:'bold',
          color:delta > 0 ? '#82e8b6' : '#ff8c83', stroke:'#14131c',strokeThickness:4
        }).setOrigin(0.5);
      self.tweens.add({targets:label,y:label.y-35,alpha:0,duration:850,onComplete:function(){label.destroy();}});
    });
    previous = next;
  };

  function start() {
    if (game || !host || !host.isConnected || !engineReady || !stateOf()) return;
    try {
      game = new Phaser.Game({
        type:Phaser.AUTO, parent:host, width:RENDER_W, height:RENDER_H,
        backgroundColor:'#090e16',
        render:{pixelArt:true,antialias:false},
        scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
        scene:[BattleScene]
      });
      document.body.classList.add('phaser-live');
      info('Phaser 4.2.1 ativo · ações calculadas pelo motor original');
    } catch (error) {
      info('Não foi possível iniciar Phaser. O combate clássico permanece disponível.', true);
      console.error(error);
    }
  }

  function wrapRender() {
    if (host && host.isConnected) host.remove();
    originalRender();
    var slot = document.getElementById('phaser-mount-slot');
    if (slot) {
      if (!host) {
        host = document.createElement('div');
        host.id = 'phaser-surface';
      }
      slot.appendChild(host);
      if (engineReady) {
        if (!game) start();
        else {
          try { game.scene.getScene('SiegeBattle').sync(); } catch (_) { /* scene starting */ }
        }
      }
    } else {
      if (game) { game.destroy(true); game = null; }
      host = null; previous = {};
      document.body.classList.remove('phaser-live');
    }
  }

  render = wrapRender;

  function loadEngine(src, fallback) {
    var script = document.createElement('script');
    script.src = src;
    script.onload = function () {
      if (!window.Phaser) { if (fallback) fallback(); else info('Biblioteca Phaser indisponível.', true); return; }
      engineReady = true;
      loading = false;
      start();
    };
    script.onerror = function () {
      if (fallback) fallback();
      else { loading = false; info('Sem Phaser. Use os comandos clássicos abaixo.', true); }
    };
    document.head.appendChild(script);
  }

  if (new URLSearchParams(location.search).get('demo') === '1' &&
      !localStorage.getItem('thargrid_phaser_preview_save_v1')) {
    S = fresh('story'); screen = 'game'; save();
  }
  wrapRender();
  if (!loading) {
    loading = true;
    loadEngine('./vendor/phaser.min.js', function () {
      info('Engine local indisponível: carregando CDN (requer internet).', true);
      loadEngine('https://cdnjs.cloudflare.com/ajax/libs/phaser/4.2.1/phaser.min.js');
    });
  }
})();
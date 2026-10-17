# ROADMAP — O Cerco de Thargrid → Phaser 4.2.1

**Data do diagnóstico:** 17/10/2026  
**Situação atual (17/10/2026):** migração incremental em andamento; M0b com fixtures e M1a parcial em validação, sem substituir o clássico  
**Rota de produção:** [jogo clássico](https://pedromaintenance.github.io/o-cerco-de-thargrid/)  
**Estratégia:** extração progressiva do motor de regras + prévia independente em `/phaser-preview/` + substituição apenas após paridade demonstrada.

> **Decisão principal:** Phaser é o motor de apresentação/interação, **não** um novo conjunto de regras. Não converter o Cerco em um jogo de movimentação em grade só porque Ironwood usa grade: o Cerco é um RPG de grupo por iniciativa, com estratégia econômica entre batalhas. **60 dias, 60 ofensivas obrigatórias e as consequências políticas e humanas do cerco são invariantes.**

## 1. Inventário verificado da versão clássica

No inventário inicial (antes dos PRs Phaser), o repositório em `main` tinha `index.html`, `style.css`, `data.js`, `app.js`, `sw.js`, `manifest.webmanifest`, ícones e documentação. Naquele inventário ainda não havia Phaser, testes automatizados nem workflow de CI. **Estado atual:** há prévia Phaser 4.2.1, workflow, testes e núcleo mecânico compartilhado. Consulte a seção de implementação.

| Domínio | Fonte atual | Contrato a preservar |
|---|---|---|
| Campanha | `data.js`: `ACTS`, `RAID_SETS`, `RAIDS`, `COUNCILS`, `RAID_OUTCOMES` | 10 atos × 6 ataques = **60 dias/60 combates**, ataque noturno obrigatório, conselho a cada início de ato |
| Personagens | `HEROES`, `CLASSES`, `PROFESSIONS`, `SKILLS` | 9 heróis (4 iniciais, 5 recrutáveis), equipe até 4, nível/XP, troca de classe, treino, 8 ofícios, fadiga, lesões e morte permanente |
| Reino | `FRONTS`, `PROJECTS`, `RESN`; `construct`, `reinforce`, `nextDay` | 4 frentes, 12 projetos com até 3 níveis, 3 ordens por dia, 8 recursos/indicadores, produção, manutenção, consumo e moral |
| Exploração | `QUESTS`, `RELICS`, `questRun` | 29 missões (inclusive pessoais, alianças e lendárias), pré-requisitos, riscos, recompensas, recrutamento e 6 relíquias |
| Batalha | `beginBattle`, `createRound`, `advanceTurn`, `enemyAction`, `doSkill`, `useCombatItem`, `victory`, `gameOver` | iniciativa individual, IA, PV/MP, barreiras, status, dano/resistências, cura, ressurreição, perigos por rodada, chefes em fases, derrota definitiva |
| Apresentação | `render*`, `show*`, `handle`, `index.html`, `style.css` | telas título, conselho, heróis, missões, reino, crônica, preparação, batalha, resultados e finais; acessibilidade e navegação touch |
| Persistência | `fresh`, `save`, `load`, `triggerExport`, `triggerImport` | JSON v1 e chave **`thargrid_siege_save_v1`**; salvar/importar inclusive durante batalha, continuar do mesmo turno |
| Publicação | `sw.js`, `manifest.webmanifest` | PWA no GitHub Pages, instalação, escopo correto, atualização de cache e jogo real 100% offline após primeira instalação |

**Observação técnica confirmada:** `sw.js` grava `thargrid-pwa-v1.0.1`, enquanto `registerOffline()` em `app.js` procura `thargrid-pwa-v1.0.0`. Isso pode gerar um falso “não instalado offline”; corrigir com contrato de versão único em marco específico, sem usar uma mudança de engine para esconder o defeito.

**Outra característica central:** `renderBattle()` refaz o DOM das fichas e usa emojis como representações, e `handle()` despacha comandos por `data-a`. A lógica de regras e o DOM estão acoplados dentro de `app.js`: é essa fronteira, não os dados narrativos, que deve ser desfeita primeiro.

## 2. Referências comparadas: o que copiar e o que evitar

| Referência analisada | Aprendizado reaproveitável | Armadilha a evitar |
|---|---|---|
| [A Revolta dos Mendigos](https://github.com/pedromaintenance/a-revolta-dos-mendigos/blob/main/ROADMAP-PHASER.md) | Inserção incremental do canvas na batalha; `app.js` segue como autoridade; laboratório e modo clássico convivem | Dependências de Phaser/sprites por CDN em `phaser-battle.js` inviabilizam garantir o modo Phaser offline; remontar a Scene em cada atualização pode gerar flicker e problemas de sincronização |
| [Catacumbas de Golzdov](https://github.com/pedromaintenance/catacumbas-de-golzdov/blob/main/docs/ROADMAP_PHASER.md) | `core/` separado do renderer, `dispatch` retornando eventos, RNG e fixtures reproduzíveis, testes de paridade, Vite + Phaser 4.2.1, prévia `/phaser/` paralela e CI | Prévia funcional não é automaticamente paridade completa; separar save e medir resultados reais, não apenas compilar |
| [Ironwood — A Última Resistência](https://github.com/pedromaintenance/ironwood-a-ultima-resistencia/blob/main/ROADMAP_IRONWOOD_PHASER.md) | Phaser 4.2.1, beta `/phaser-preview/`, gates de CI, missões jogadas de ponta a ponta sem fixtures artificiais, build publicado sem sobrescrever clássico | Provar apenas um combate isolado ou apenas testes unitários não demonstra que o fluxo inteiro da campanha funciona; manter deploy autorizado por build/commit verificado |

**Síntese:** adotar a disciplina de **núcleo determinístico, replay e CI** de Golzdov, a **beta paralela e testes de jornada** de Ironwood, e a **integração gradual de batalha** de Revolta. Para o Cerco, a economia de guerra e as decisões de conselho merecem a mesma prioridade de preservação que o combate.

## 3. Decisões de arquitetura

- **Engine-alvo:** `phaser@4.2.1` fixada no `package-lock.json`, Vite com dependências locais, JavaScript ES Modules para reduzir risco de reescrita simultânea em TypeScript. Reavaliar upgrade de versão somente após compatibilidade e testes; não depender de `latest` nem de CDN de runtime.
- **A versão antiga continua viva:** `/index.html` permanece intacto e jogável; protótipo inicial em `/phaser-preview/`, claramente rotulado **BETA** e com atalho para a versão clássica.
- **Única fonte de regras:** extrair funções de `app.js` para módulos independentes de `window`, `document`, `localStorage`, Phaser e relógio. `data.js` permanece inicialmente como catálogo autoral; converter exportações só com verificação de conteúdo.
- **Fluxo de dados:** entrada → `dispatch(state, action, rng)` → novo estado / eventos semânticos (`damage`, `heal`, `status`, `turn`, `victory`, `defeat`, `resource`, `log`) → animações no Phaser → persistência em serviço próprio. A animação **nunca** rola números, tira PV ou avança turno.
- **RNG:** o código atual usa `Math.random()` em iniciativa, dano, IA, perigos, missões e despesas. Injetar fonte reprodutível para testes/replays, respeitando ordem de chamadas e fórmulas existentes; mudanças de resultado exigem análise explícita, jamais “rebalanceamento acidental”.
- **Salvamentos:** o clássico é intocável até o gate final. Preview usa **`thargrid_phaser_preview_save_v1`** e uma cópia validada do save clássico em modo leitura/importação. **Nunca gravar automaticamente `thargrid_siege_save_v1` a partir da beta**. Um adaptador posterior poderá ler v1 sem perda de campos desconhecidos; alterar formato requer versão nova, validação e migração reversível com backup.
- **Renderização:** canvas responsivo em retrato, referência lógica inicial **480 × 800** com `Phaser.Scale.FIT`, `CENTER_BOTH` e `pixelArt: true`; revisar em Android real, telas estreitas e zoom. UI de texto e formulários poderá permanecer em HTML sobre/ao lado do canvas para legibilidade/acessibilidade.
- **Combate:** apresentação JRPG em camadas (hostes, 1–4 heróis, HUD e comandos), sem movimentação tática inventada. Batalhas exibem unidades persistentes por `uid/id`; sincronizar diferenças de estado sem reiniciar a Scene a cada golpe.
- **Interação:** comandos acessíveis por toque e mouse, foco de teclado, alvos válidos destacados; bloquear toques duplicados somente durante a transição de ações e permitir encurtar animações. Remover listeners no `shutdown/destroy` da Scene.
- **Identidade visual:** reino de pedra, osso, metal e forjas; resistência anã e refugiados contra a aristocracia shadow fey. Pixel art original/coerente, efeitos sombrios contidos, tipografia legível. A estética não altera o cânone, a geografia ou o sentido político da campanha.
- **Licenças:** reutilizar a [galeria de assets](free-asset-gallery.md) como diretório de pesquisa, não como permissão automática. Registrar origem, licença, autoria, atribuição exigida e disponibilidade offline; preferir arte autoral ou CC0, nunca incluir páginas/assets de manuais comerciais.

### Estrutura proposta (criar progressivamente; não existe ainda)

```text
/                              # jogo clássico e PWA atual; não substituir
  app.js, data.js, index.html, style.css, sw.js
  ROADMAP-PHASER.md
  core/                        # regras sem DOM/Phaser (migradas em pequenos PRs)
    state.js
    rng.js
    economy.js
    progression.js
    quests.js
    battle.js
    actions.js
    save-schema.js
  tests/
    fixtures/
    *.test.cjs                 # ou runner equivalente fixado em package.json
  phaser-src/                  # fontes da beta, Vite + Phaser 4.2.1
    package.json
    package-lock.json
    vite.config.js
    index.html
    src/
      main.js
      bridge/
      scenes/BootScene.js
      scenes/TitleScene.js
      scenes/SiegeBattleScene.js
      scenes/KingdomScene.js
      scenes/ResultsScene.js
      ui/
      art/
    public/assets/
  phaser-preview/              # somente build testado, publicado separadamente
  .github/workflows/          # checks + publicação controlada da beta
```

A pasta `core/` será compartilhada pela interface clássica e pela beta **somente depois de cada extração passar pelos testes**. Inicialmente, o adaptador pode chamar o legado sob controles estritos; remover funções antigas somente após comparação.

### Esboço de contrato (não implementado)

```js
const action = { type: 'BATTLE_SKILL', skillId: 'attack', targetId: 'e0' };
const { state: next, events, status } = dispatch(current, action, rng);
// UI renderiza next e anima events; não calcula dano nem salva sozinha.
```

## 4. Marcos, gates e entregas

**Status de todas as etapas abaixo: PLANEJADO.** Nenhum teste, build ou recurso Phaser está sendo declarado como concluído por este documento.

| Marco | Entrega principal | Gate de aceite / evidência esperada | Prioridade |
|---|---|---|---|
| **M0 — Baseline** | Inventário e snapshot de regras; fixtures/saves anônimos de dias-chave; scripts de verificação; mapa de estados | G0: testes do legado, captura de situações reprodutíveis e backup/exportação validados; 60 eventos e tabelas íntegros | P0 |
| **M1 — Core separado** | `rng`, `state`, economia, heróis, missões, combate e `dispatch` extraídos gradualmente | G1: replays clássico × core iguais em PV/MP, RNG, XP, recursos, status, journal e consequências sem render | P0 |
| **M2 — Fundação Phaser** | `phaser-src` com versão fixa + Vite, BootScene, pixel-art de teste, beta própria em `/phaser-preview/` | G2: beta abre no Pages/localhost, clássica intacta, sem fetch runtime a CDN, sem afetar save PWA | P0 |
| **M3 — Fatia vertical de batalha** | Dia 1 real: preparar 1–4 heróis, carregar encontro do `RAIDS`, selecionar alvos, executar ataque/defesa/uma magia/item, IA, resultados | G3: vitória e derrota reais no canvas com o MESMO estado e recompensas do core; reload no turno salvo; nenhuma lógica de dano na Scene | P0 |
| **M4 — Paridade completa de combate** | Todas classes/técnicas, estados, barreiras, ressurreição, hazards, habilidades em área, chefes de múltiplas fases, permadeath e registros | G4: testes para cada habilidade/tipo/status e os **10 chefes** (dias 6, 12, …, 60); combate completo e vitória/derrota com estado idêntico | P0 |
| **M5 — Conselho e reino** | Menus/telas de conselho, ordens, construção/fortes, missões, heróis, ofícios, loja, crônica, preparação, pós-batalha e epílogos; híbrido HTML/Phaser se vantajoso | G5: execução consecutiva da rotina dia → ordens → batalha obrigatória → aftermath → novo dia; facções, recursos, missões e finais sem regressão | P0 |
| **M6 — Artes e experiência** | Spritesheets/atlas locais, classes e inimigos visualmente distintos, ataques, VFX, cenários por ato, feedback, áudio opcional e controles | G6: nenhuma sobreposição em 360/390/480 px, diálogos legíveis, seleção confortável, efeitos não bloqueiam ações, desempenho medido em celular | P1 |
| **M7 — Offline/CI/beta pública** | Build reproduzível, testes automatizados e de browser, pré-cache local da engine/assets, manifest/escopo da beta, atualização segura de SW | G7: instalação/reabertura offline REAL em celular, reload pós-deploy sem bundle misturado, importação/exportação íntegra, main clássica estável | P0 |
| **M8 — Certificação e corte** | Campanha inteira revisada, backup/migração opcional de saves, comparação de versões, docs finais; decidir substituição da rota principal | G8: 60 dias concluídos numa campanha legítima na beta + rotas de derrota + regressões e QA físico documentados; rollback testado; só então autorizar corte | P0 |

**Ordem de execução:** M0 → M1 → M2 → M3 → M4 → M5 → M6/M7 (podem avançar em paralelo após M3, sem liberar release incompleto) → M8. Entregar em PRs pequenos e auditáveis, não em uma substituição maciça. Não presumir que “CI verde” prova interação confortável num telefone.

## 5. Casos de regressão obrigatórios

### Regras e campanha

- [ ] Conferir 10 atos, 60 encontros, 4 frentes, 9 heróis, 29 missões, 12 projetos, 8 ofícios, 6 relíquias, conselhos e finais com contagens e IDs invariantes.
- [ ] Testar dias **1, 2, 6, 7, 12, 30, 54 e 60**, além dos 10 encontros de chefe, em 3 dificuldades; dano escalonado e inimigos corretos.
- [ ] Provar que não existe caminho de “pular ofensiva” nem avanço de dia antes do resultado do combate.
- [ ] Testar consumo de 3 ordens, custos de materiais, construção de frentes, retorno econômico, fome, moral e consequências de decisões do conselho.
- [ ] Testar recrutamentos, missões pessoais/lendárias, mudança de classe, habilidades por nível, ofícios e relíquias.
- [ ] Testar IA e seus efeitos, início de rodada, iniciativa, barreiras, debuffs, recuperação, ressuscitação, segundo estágio do avatar noturno e mortes definitivas.
- [ ] Testar sequência completa de **dia 1 até dia 60** sem injetar estado artificial na execução de aceitação; usar fixture/replay apenas em testes unitários e cenários isolados.
- [ ] Comparar logs/eventos e resultados sob a mesma seed e as mesmas ações; verificar que animações rápidas/lentas não mudam resultado nem consomem RNG adicional.

### Saves, PWA e interface

- [ ] Importar JSON v1 de dia 1, entre dias, durante `mode='battle'` (`queue`, `ptr`, `active`, `foes`), após vitória, derrota e final; exportar e reimportar sem perdas.
- [ ] Preview nunca sobrescreve `thargrid_siege_save_v1`; opção clara de voltar ao clássico e de fazer cópia do save.
- [ ] Validar save inválido, ausente, sem armazenamento disponível, recarga em tela modal e atualização de versão sem corrupção.
- [ ] Rotas clássica e beta no mesmo origin do Pages: escopos SW distintos; **SW da raiz não deve interceptar/cachear silenciosamente assets versionados da beta**. Definir exceção explícita ou política de atualização controlada.
- [ ] Eliminar desencontro `thargrid-pwa-v1.0.1` × `v1.0.0` e criar teste de contrato de cache/ASSETS.
- [ ] Testar via HTTPS, cold load, segundo carregamento, modo avião, atualização de build e `404` de asset; engine e sprites locais (sem `raw.githubusercontent`, jsDelivr ou fontes remotas obrigatórias).
- [ ] Mobile Android Chrome PWA + navegador, iOS Safari quando disponível, desktop Chrome/Edge: toque/mouse/teclado, pausa/reabertura, rotação, zoom, legibilidade e preferência por reduzir movimento.
- [ ] Acessibilidade: comandos nomeados, foco visível, alternativa textual para informações críticas, nunca depender apenas de cor/efeito visual.

## 6. Publicação, segurança de alterações e recuperação

1. Manter raiz do Pages e arquivos `index.html`, `app.js`, `data.js` e `sw.js` da produção ativos enquanto a beta é desenvolvida.
2. Fixar dependências, base Vite compatível com GitHub Pages (preferir `base: './'`), validar caminhos em subdiretório e compilar localmente/CI antes da publicação.
3. CI mínimo: validação JS, unitários/replay determinístico, build Vite, verificação do artefato final, smoke Chromium desktop/mobile e segurança de cache. Testes E2E de jornada conforme as fases.
4. A beta terá manifesto/ícones/identidade PWA próprios caso instalável, para não conflitar com o `id` e escopo do jogo raiz. Evitar reusar sem análise `sw.js` da produção.
5. Publicar `phaser-preview/` apenas de commit identificado e testes verdes; registrar hash e relatório. Manter builds anteriores recuperáveis e link da rota clássica.
6. Antes de qualquer alteração do formato do save: exportação de backup, migrador separado, testes ida/volta e documentação de rollback.
7. Não habilitar instalação da beta como offline até comprovar cache integral dos bundles e assets. Se a beta só estiver online, exibir a limitação claramente.

## 7. Riscos prioritários e contramedidas

| Risco | Motivo concreto | Contenção |
|---|---|---|
| Deriva de regras | `app.js` mistura cálculo, `save()`, `render()` e DOM | Extração incremental com comparação de estado, replays e origem única |
| RNG divergente | `Math.random()` aparece em iniciativa, IA, dano, missões e eventos | Injeção de RNG e inspeção de ordem/chamadas |
| Save inválido ou alterado pela beta | Mesmo origin de `localStorage` para raiz e subdiretórios | Namespace preview distinto; leitura do legado com cópia e backup |
| Tela de combate que “pisca” ou some | Remontagem completa de Scene e listeners em cada ação | Atualizar entidades por ID/diff, cena persistente, eventos `shutdown` |
| Offline “verde” mas quebrado | Cache v1.0.0 × v1.0.1; CDN nos exemplos; SW raiz intercepta subrotas | Contrato único de cache, engine empacotada e teste offline físico |
| Pular consequências | Migração concentrada só no visual do combate | G5 inclui ordens, moral, missões, conselho, economia e história |
| Escopo visual explode | 60 ofensivas e muitos personagens | Biblioteca reutilizável de cenários por bioma/ato e animações por classe; não desenhar 60 jogos diferentes |
| Licença de assets | Fontes gratuitas com termos variados | `ASSET_LICENSES.md`, comprovação de licença e atribuição, sem assets sem procedência |
| Testes enganosos | Simulação por fixtures pode mascarar caminho impossível | Replay via ações reais; smoke browser; campanha completa para G8 |

## 8. Design inicial de batalha (hipótese a validar no protótipo)

- **Topo:** dia, setor/frente, nome da ofensiva, round, perigo da rodada e indicação de fase de chefe.
- **Campo visual:** composição vertical com corte/hostes acima e companhia abaixo; até 4 aliados e inimigos do evento, com barras PV, barreira, ícones de status e animações de reação. Personagens não flutuam sobre o HUD nem ocultam alvos.
- **Rodapé fixo e legível:** ator ativo, ataque, técnicas, itens, defender; seleção contextual do alvo por toque + confirmação/cancelamento se necessário.
- **Feedback:** telegráficos de magia, números de dano e cura, status e log, sem esconder resultados importantes; acessibilidade no painel de texto.
- **Direção:** fantasia sombria de cerco, ferrarias, muralhas calcificadas de Golzdov, neve, runas, refugiados e estandartes; diferenças entre frentes e atos, sem aumentar complexidade mecânica. A crise de abastecimento e os sacrifícios do povo devem permanecer visíveis na interface do reino.

Um primeiro protótipo gráfico **não** prova a paridade: a primeira entrega jogável precisa aceitar uma ação real, produzir o resultado pelo core e preservar exatamente esse resultado ao recarregar.

## 9. Próximo PR recomendado (M0 — antes de criar o Phaser)

**Escopo:** adicionar `tests/` e fixtures, script de verificação, documentação de baseline da lógica atual, testes de leitura/escrita v1 e um teste de contrato de cache; não mudar fórmula, balanceamento ou interface. Registrar casos de batalha do dia 1, primeiro chefe (dia 6), segundo estágio do chefe final (dia 60), derrota e dias com falta de alimento.

**Aceite:** corpus de dados inalterado; testes reproduzíveis executam local e CI; evidência de partidas existentes compatíveis. **Depois** abrir M1 e M2 em PRs separados. Não adotar a beta como release por conveniência.

## 10. Referências técnicas consultadas

- [Phaser 4.2.1 — release oficial (09/07/2026)](https://phaser.io/download/release/v4.2.1)
- [Phaser — modelos oficiais Vite / TypeScript / JavaScript](https://docs.phaser.io/phaser/getting-started/project-templates)
- [Phaser — Scenes e ciclo de vida](https://docs.phaser.io/phaser/concepts/scenes)
- [Phaser — Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager)
- [Phaser — Input (toque, mouse, teclado e gamepad)](https://docs.phaser.io/phaser/concepts/input)
- [Phaser — Loader e assets locais](https://docs.phaser.io/phaser/concepts/loader)
- [Phaser — Animations](https://docs.phaser.io/phaser/concepts/animations)
- [Phaser — Eventos e limpeza de Scene](https://docs.phaser.io/phaser/concepts/events)
- [Revolta: roadmap e `phaser-battle.js`](https://github.com/pedromaintenance/a-revolta-dos-mendigos)
- [Golzdov: roadmap, `core/actions.js` e `phaser-src/`](https://github.com/pedromaintenance/catacumbas-de-golzdov)
- [Ironwood: roadmap e publicação beta](https://github.com/pedromaintenance/ironwood-a-ultima-resistencia)

---

### Histórico

- **17/10/2026 — planejamento inicial:** auditoria do repositório clássico, comparação de três ports da Carcaça, consulta à documentação oficial e definição de marcos. **Somente documentação; nenhum código de produção ou save foi alterado.**


## Implementação — 17/10/2026 — M0 parcial + M2 inicial + M3a visual jogável

**Branch:** [feat/phaser-preview-m0-m3a](https://github.com/pedromaintenance/o-cerco-de-thargrid/tree/feat/phaser-preview-m0-m3a) · **PR:** [#2](https://github.com/pedromaintenance/o-cerco-de-thargrid/pull/2).  
**CI inicial verde:** [GitHub Actions run #39026102179](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39026102179) — **6/6 testes** e validação da instalação de Phaser **4.2.1** no runner.  
**URL planejada da beta após publicação:** https://pedromaintenance.github.io/o-cerco-de-thargrid/phaser-preview/?demo=1  
**Produção preservada:** https://pedromaintenance.github.io/o-cerco-de-thargrid/

### O que foi implementado de verdade

- [x] Página **beta paralela**, própria, em \`phaser-preview/index.html\`, com banner/rota de retorno ao clássico, manifesto distinto e explicação de isolamento do save.
- [x] **Phaser 4.2.1 como viewport de batalha**: cenário procedural de montanhas/muralhas, combatentes desenhados no canvas, PV e MP visíveis, barreiras, efeitos de status, iniciativa/ator corrente, animação de dano/cura e **toque no inimigo para atacar**. Alvos de magia/item continuam selecionáveis no modal HTML existente.
- [x] **Adaptação não invasiva:** \`phaser-preview/bridge.js\` mantém os objetos Phaser vivos entre mudanças de DOM, atualiza combatentes pela snapshot do estado e chama o dispatcher legado \`handle('targetenemy')\`. O cálculo de resultado permanece exclusivamente em \`app.js\`.
- [x] **Beta usa todas as telas e regras atuais** da campanha por compartilhar \`../data.js\`, \`../app.js\` e \`../style.css\`. O campo é Phaser; menus/conselho/reino/preparação ainda são HTML.
- [x] O atributo explícito \`data-phaser-preview="true"\` ativa **\`thargrid_phaser_preview_save_v1\`** em lugar de \`thargrid_siege_save_v1\`. Importação/exportação legadas persistem na beta sem sobrescrever progresso clássico.
- [x] Corrigida divergência do cache clássico \`thargrid-pwa-v1.0.0\` vs \`v1.0.1\`: ambos os lados agora usam \`v1.0.2\`. O SW raiz não intercepta a pasta da beta; beta tem SW/manifest próprios.
- [x] \`.github/workflows/phaser-preview.yml\` verifica sintaxe, executa testes e baixa \`phaser@4.2.1\` para gerar um arquivo **vendor local** destinado a \`phaser-preview/vendor/phaser.min.js\` depois do merge. O fallback CDN existe apenas para situações em que o vendor ainda não foi servido: se usado, **não há garantia offline**.
- [x] \`tests/legacy-baseline.test.cjs\`: seis verificações com Node \`vm\` e RNG reproduzível (tabelas; save beta × clássico; conselho obrigatório; replay real de batalha do dia 1; caches; adaptador visual).
- [x] Em PR, CI verde com **6/6**; engine instalada e artefato vendor testado, antes de incorporar documentação desta entrega.

### Gates e status reais

| Gate | Situação em 17/10/2026 | Falta para encerrar |
|---|---|---|
| G0 / M0 | **Parcial**: baseline de conteúdo, isolamento de save e replay de batalha automatizado | Fixtures de dias críticos, 10 chefes, save em múltiplas fases, perícias/projetos, robustez e sequência de 60 dias |
| G1 / M1 | **Pendente** | Extração de regras sem DOM, injeção de RNG no core e comparação clássica × core |
| G2 / M2 | **Parcial avançado**: fonte/viewport Phaser, SW beta e workflow de vendor | Confirmar vendor persistido em main, Pages entregue, navegador e offline reais |
| G3 / M3 | **Parcial (M3a)**: interface de batalha usa Phaser, toque para ataque, ações clássicas compartilhadas | QA visual em Android e desktop, efeitos de habilidades variados, fluxo completo com save/reload, navegação inteiramente no canvas |
| G4–G8 | **Pendente** | Não afirmar paridade completa por causa de seis testes verdes |

### Teste manual recomendado (após Pages estar atualizado)

1. Abra a [beta](https://pedromaintenance.github.io/o-cerco-de-thargrid/phaser-preview/?demo=1). Um jogo novo de dificuldade História é criado **somente se a beta ainda não tiver um save**.
2. Abra o **Conselho** do primeiro ato, selecione uma decisão, prepare a equipe e toque **Soar o sino**. Não há atalho para ignorar a decisão obrigatória.
3. O cenário Phaser deve substituir os cartões de unidades; os **botões clássicos abaixo do canvas** seguem disponíveis e continuam resolvendo ações pelo motor original.
4. No turno de um herói, toque em um inimigo no canvas para atacar. Confirme queda de PV, fila de iniciativa, rodadas, habilidades, itens, proteção, cura, conclusão e pós-batalha.
5. Exporte o JSON da beta, entre na versão clássica e confirme que o save clássico não foi afetado.
6. Após confirmado que \`vendor/phaser.min.js\` está acessível e que o SW beta instalou, repita **em modo avião**. Se a tela avisar uso de CDN, ainda **não** declare suporte offline.
7. Registre modelo de celular/navegador, data do teste e qualquer discrepância; **não há certificação de QA físico** nesta entrega.

### Próxima atividade

Executar **M0b → M1a**: criar snapshots verificados de combates de chefes (especialmente dias 6 e 60), extração de RNG e \`dispatch\` de batalha sem dependência de DOM. Incrementar teste de campo visual com Playwright Chromium mobile/desktop, verificando tamanho de canvas e seleção, antes de expandir artes. Evitar substituir a rota clássica por entusiasmo com o primeiro canvas.


### Publicação validada pelo GitHub Actions — 17/10/2026

- **PR #2 integrado à \`main\`** por squash: \`f59272a2dc7c4ead3ffb66acdf2602fbc1622e81\`. Raiz clássica mantida.
- **Verificação de engenharia e navegador:** [CI #39026640475](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39026640475), verde, com **6/6 testes Node** e fluxos Chrome **DESKTOP PASS / MOBILE PASS**. O teste executou conselho → equipe → primeira batalha → ataque real pelo canvas → verificação do save separado. Foi necessário rolar o botão de preparação para o centro da viewport mobile devido à barra inferior fixa; testes agora exercitam esse cuidado de layout.
- **Vendor local incluído na \`main\`:** \`phaser-preview/vendor/phaser.min.js\` (**1.375.976 bytes**), gerado por [CI #39026696583](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39026696583) a partir de \`phaser@4.2.1\`. O teste Chromium já carregou essa mesma distribuição local, bloqueando dependências externas durante a execução.
- **GitHub Pages:** [build/deploy #39026715979](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39026715979) concluído com sucesso incluindo o vendor. **[ABRIR BETA PHASER](https://pedromaintenance.github.io/o-cerco-de-thargrid/phaser-preview/?demo=1)**. A verificação independente do endereço por HTTP externo não foi possível nesta sessão; o resultado atesta a implantação reportada pelo GitHub, não uma certificação em aparelho físico.
- **Escopo homologado:** MVP do primeiro combate visual e isolamento de saves. **Não** declarar M1, G3 completo, campanha de 60 dias ou offline físico concluídos.
- **Próximo PR:** M0b/M1a — fixtures de 10 chefes e saves intercalados; extração de RNG e dispatcher sem DOM. Acrescentar QA real de toque e offline no Pages e validar mais que o dia 1.


## Implementação — continuidade M0b/M1a (17/10/2026)

**PR:** [#3 — núcleo determinístico de combate](https://github.com/pedromaintenance/o-cerco-de-thargrid/pull/3)  
**Prévia:** [Beta Phaser no Pages](https://pedromaintenance.github.io/o-cerco-de-thargrid/phaser-preview/?demo=1)

### Entregas

- [x] Módulo compartilhado `core/combat.js`, independente de DOM, Phaser e salvamento.
- [x] RNG injetável: `setRandomSource()` e `seededRandom()` para testes repetíveis; no jogo a fonte padrão permanece `Math.random()`.
- [x] Extraídas escala dos inimigos, iniciativa, dano dos heróis, mitigação do dano inimigo, absorção de escudos e fase II de `nightavatar`. Orquestração segue no `app.js`.
- [x] Doze snapshots canônicos capturados **antes** da extração, em `tests/fixtures/raid-golden-v1.json`, provenientes do commit clássico `f59272a2`: dia 1 em História, os dez chefes nos dias 6/12/18/24/30/36/42/48/54/60 em Normal e dia 60 em Difícil. Incluem inimigos, iniciativa, estado da companhia e logs iniciais.
- [x] Testes de paridade exata dos snapshots, aleatoriedade injetável, escudos, segunda fase da Rainha, save em batalha e recuperação. A produção **não** persiste o estado interno do RNG; após recarregar, o resultado dos próximos sorteios pode ser diferente.
- [x] Caches versionados: clássico `thargrid-pwa-v1.0.3` e beta `thargrid-phaser-beta-v2`, incluindo `core/combat.js` na instalação offline.
- [x] CI sintático/Node e Chromium reforçado: desktop/mobile percorrem Conselho, batalha, ataque pelo canvas, reload no meio da luta, continuar e abertura independente do clássico.

### Gates remanescentes

| Marco | Estado nesta etapa | Pendente |
|---|---|---|
| M0b | **Parcial avançado:** snapshots da abertura das 10 lutas de chefe | Testes dos chefes até vitória, missões/decisões, efeitos ao longo das 60 ofensivas |
| M1a | **Parcial:** fórmulas e RNG em core puro | Reducer/dispatcher completo de ações e eventos, sem DOM |
| M2 | **Funcional na CI:** versão local de Phaser, preview e workers separados | Confirmação em dispositivo físico e instalação offline |
| M3a | **Beta jogável** | Seleção Phaser de técnicas/aliados, efeitos e arte próprios, acessibilidade |

**Limitação importante:** os testes dos dez chefes verificam seus estados iniciais — **não** garantem que todas as dez batalhas foram vencidas nem o percurso completo de 60 dias. Mudanças de balanceamento devem ser explícitas.

**Próxima etapa M1b:** extrair planejamento, validação e execução de comandos para funções puras; assegurar o contrato estado + comando → novo estado e eventos. Comparar efeitos reais de magias, itens, status e vitórias nos dias 1, 6 e 60 antes de migrar mais telas.


### Publicação M0b/M1a — homologação CI (17/10/2026)

- **PR #3:** [integrado à `main`](https://github.com/pedromaintenance/o-cerco-de-thargrid/pull/3), commit de merge squash `9ac70fda7ae3f92d6484e7b94214768b33228459`.
- **23/23 testes Node aprovados** (seis originais + dezesseis cenários da nova suíte, incluindo 12 snapshots, e um teste extra): [CI da PR #39029177872](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39029177872).
- **Chromium desktop e mobile aprovados**: ataques Phaser, recuperação de save no meio do combate e abertura da rota clássica com namespace próprio. A confirmação também ocorreu na [CI da main #39029331344](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39029331344) após o merge.
- **GitHub Pages:** [build e deploy #39029331015](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39029331015) concluídos com sucesso; **[jogar a beta](https://pedromaintenance.github.io/o-cerco-de-thargrid/phaser-preview/?demo=1)**. O acesso HTTP público não foi verificável por uma segunda fonte nesta sessão; build/deploy atestados pelo próprio GitHub.
- **Não homologado:** gameplay completo dos dias 1–60, todos os chefes até a vitória, importação de campanhas legadas, offline em dispositivo real, geração de cena Phaser para todo o jogo e reducer/dispatcher puro completo. Permanecem M1b/M3 futuros.


## Implementação M1b/M3b — seleção de ações e alvos no Phaser (17/10/2026)

**PR:** [#4 — planejador puro e alvos Phaser](https://github.com/pedromaintenance/o-cerco-de-thargrid/pull/4)
**CI do PR:** [GitHub Actions #39033872977](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39033872977) — **41/41 testes de regras e Chromium desktop/mobile aprovados**.
**Rota após publicação:** [beta Phaser 4](https://pedromaintenance.github.io/o-cerco-de-thargrid/phaser-preview/?demo=1).

### Entregas

- [x] **Planejador puro `core/actions.js`:** `planSkill`, `planItem`, `selectableTargets`, `skillTargetType` e `itemTargetType`. Recebe estado e conteúdos; não lê DOM, não escreve save, não usa RNG e não altera objetos.
- [x] **Validação compartilhada entre o clássico e o Phaser:** `app.js` usa o planejador para validar técnica aprendida, mana, inventário e alvos antes da execução antiga. Nenhum reequilíbrio de dano, IA ou progressão foi introduzido.
- [x] **14 snapshots de resultados antes do refactor:** `tests/fixtures/actions-golden-m1a.json` extraído do commit `9ac70fda` da versão pré-M1b, incluindo ataque, proteção, magia, cura, itens e alvos inválidos. Testes de paridade e pureza em `tests/actions-parity.test.cjs`.
- [x] **M3b: seleção de magias e itens no campo Phaser.** Após escolher o comando no menu HTML, o jogador toca no inimigo ou aliado; cura e ressurreição podem direcionar os membros da equipe no canvas.
- [x] **Interface acessível:** destaques dos alvos válidos, indicação da técnica selecionada, Cancelar sem custo e botão **Lista de alvos** que mantém modal HTML utilizável por teclado/leitores de tela.
- [x] **Correção real do input mobile:** depois de scroll e modal, `pointer.y` interno do Phaser apresentou deslocamento de aproximadamente 77 pixels lógicos no Chromium emulado. A seleção agora usa `pointer.event.clientX/Y` ajustados pelo `getBoundingClientRect()` do canvas e recebe eventos num handler estável da cena.
- [x] **Caches PWA:** clássico `thargrid-pwa-v1.0.4`; beta `thargrid-phaser-beta-v3`, incluindo `core/actions.js` e `core/combat.js`. Chaves de salvamento separadas continuam preservadas.
- [x] **Testes reais de navegador:** decisões do Conselho, preparação, batalha, ataque, reload/Continuar, magia ofensiva por toque, cura no canvas, ressurreição com Cinza da Chama, cancelamento sem MP gasto, lista alternativa e isolamento do clássico, tanto no desktop quanto no mobile.

### Gates e limites

| Marco | Estado | Pendente |
|---|---|---|
| M0 | **Parcial reforçado** — snapshots de chefes e de ações | Cobrir derrotas, decisões e campanha completa de 60 dias |
| M1b | **Parcial** — validação/planejamento puros, efeitos ainda em `app.js` | Executor puro de efeitos, reducer de estado e eventos |
| M3b | **Beta jogável** — mira por toque no canvas + lista acessível | Arte de personagens, efeitos, animações e interface inteiramente Phaser |
| M2 | **CI e preview automatizados** | Homologar GitHub Pages em aparelhos físicos e offline real |

**Escopo não homologado:** fim a fim dos dez chefes, campanha completa de 60 dias, execução totalmente pura das regras, navegador físico Android/iOS e instalação PWA offline. A beta ainda usa menus HTML para escolher habilidades/itens.

**Próximo M1c:** extrair a execução de efeitos de combate e publicar eventos observáveis para Phaser sem recalcular regras. Depois, validar cenários completos de chefes e retomar persistência de RNG.


### Publicação confirmada do M1b/M3b — GitHub Pages

- **PR #4 integrado à `main`:** [comparar entrega](https://github.com/pedromaintenance/o-cerco-de-thargrid/pull/4), squash `ea77a4bbab08a1cef3c84894daf8388ae964e9ea`.
- **Validação pré-merge:** [CI #39033872977](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39033872977) — 41/41 testes Node, Chromium desktop e mobile aprovados com alvos Phaser e lista alternativa.
- **Validação na main:** [CI #39034015796](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39034015796) — sucesso.
- **GitHub Pages:** [deploy #39034015663](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39034015663) concluído com sucesso. [**Abrir beta Phaser**](https://pedromaintenance.github.io/o-cerco-de-thargrid/phaser-preview/?demo=1). A confirmação é do GitHub Actions; QA em dispositivo físico continua pendente.
- **Rollback:** a versão clássica em `/` mantém save `thargrid_siege_save_v1` e permanece separada; beta em `/phaser-preview/` usa `thargrid_phaser_preview_save_v1`.


## Implementação M1c — efeitos imutáveis e eventos de combate (17/10/2026)

**PR:** [#5 — núcleo de efeitos e eventos](https://github.com/pedromaintenance/o-cerco-de-thargrid/pull/5).
**CI verificado:** [#39035378089](https://github.com/pedromaintenance/o-cerco-de-thargrid/actions/runs/39035378089): **46/46 testes Node e Chromium desktop/mobile aprovados**. Verificação posterior também exige que eventos de ataque mágico sejam entregues à camada visual.
**Beta para testar após integração:** https://pedromaintenance.github.io/o-cerco-de-thargrid/phaser-preview/?demo=1

### Implementado

- [x] **Módulo `core/effects.js`**: `applySkill` e `applyItem` aplicam uma ação previamente aprovada por `core/actions.js` sobre **cópia profunda do estado**, retornando `{state, events}`. Sem DOM, Phaser, armazenamento, alteração direta do save original ou UI. Suas dependências (classes, heróis, habilidades, loja, núcleo de combate e hazard) são recebidas como argumentos.
- [x] **Efeitos extraídos de `app.js`:** ataque e dano, absorção de barreiras, defesa, cura, limpeza, ressurreição, bônus de status, efeitos de fogo, consumíveis, primeira transição de morte da Rainha para a fase II, custos em MP e itens e mensagens de combate. Continua válido o fluxo clássico de turnos após a aplicação do novo estado.
- [x] **Eventos explícitos, derivados dos resultados mecânicos:** `damage`, `heal`, `revive`, `shield`, `status`, `phase`, `cleanse`, `mana`, `item`, `defeat` e `log`. **Eventos não resolvem ataques ou curas na UI**; só comunicam o que a regra já fez, com side/target/amount/key e duração quando aplicável.
- [x] **Feedback Phaser por evento:** etiqueta transitória com ação/efeito na cena; a animação de variação de PV existente permanece. As ações inimigas ainda são representadas por comparação entre snapshots, porque seu executor não migrou.
- [x] **Testes da extração:** 14 golden fixtures de resultados de magia/itens capturadas antes da extração de M1b; 12 snapshots de batalha inicial (dez chefes inclusos); cinco novos testes de estado imutável, barreira/ação defensiva, cura, cinza da chama, mudança de fase da Rainha e emissão dos eventos. Total preliminar: **46 testes**.
- [x] **CI Chromium mobile e desktop:** continua passando pela abertura da campanha, Conselho, ataques Phaser, save/reload, magia, cura, ressurreição e lista de alvos. Foi acrescentada verificação de evento semântico de dano produzido por magia lançada via toque.
- [x] **SW/Cache atualizados:** clássico `thargrid-pwa-v1.0.5`, beta `thargrid-phaser-beta-v4`, incluindo `core/effects.js` nos recursos locais. Chave de salvamento clássico e chave da beta continuam independentes.

### Gates e pendências

| Marco | Resultado atual | Ainda falta |
|---|---|---|
| M1c | **Parcial avançado:** habilidades e itens com executor imutável + eventos | Extrair ações da IA, dano/status inicial de turno, escalonamento de rodadas, vitórias e derrota num reducer único |
| M3c | **Parcial:** feedback da cena ligado a eventos reais de ações dos jogadores | Eventos de inimigos, timeline/animações específicas por magia, sprites e UI completa Phaser |
| M0 | **Baseline ampliada:** 46 testes automatizados + golden de chefes/ações | Simulação completa dos dez chefes e 60 dias em cenários econômicos plausíveis |
| M2 | **PWA versionada + CI** | Instalação/offline em dispositivos físicos e homologação visual manual |

**Precisão de escopo:** `core/effects.js` não é ainda um reducer integral de combate; o `app.js` ainda coordena turnos, IA, resultado da batalha e persistência. `ThargridCore` permanece como fonte da aleatoriedade durante a execução de habilidades; a sequência interna de RNG não é gravada no save nesta etapa. O resultado numérico das ações não foi intencionalmente rebalanceado.

### Próximo marco M1d

Extrair **efeitos de status e ataque inimigo** para uma transição pura e eventos, com fixtures multi-rodadas e simulações de chefes, mantendo os tempos e a ordem de sorteios. Em paralelo, experimentar efeitos visuais por categoria de magia, mas sem duplicar regras no Phaser.

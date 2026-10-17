# O CERCO DE THARGRID — RPG offline da Carcaça

PWA completo e estático, projetado para tela de celular e para funcionar totalmente offline após a primeira instalação.

**Migração Phaser 4 em desenvolvimento:** [ROADMAP-PHASER.md](ROADMAP-PHASER.md) — auditoria, referências, marcos M0–M8 e registro da execução. **Prévia de batalha em Phaser:** [Abrir a beta separada](https://pedromaintenance.github.io/o-cerco-de-thargrid/phaser-preview/?demo=1). A versão clássica da raiz segue em produção e o save da beta é separado. A beta ainda não possui paridade certificada nem teste em dispositivo físico. O núcleo `core/combat.js` passa a ser compartilhado entre ambas as versões, com doze snapshots de regressão das batalhas iniciais dos chefes; detalhes no roadmap.

## Publicar no GitHub Pages
1. Extraia este ZIP. Envie **todos os arquivos** (inclusive `icons/`) para a **raiz** de um repositório público no GitHub. O arquivo inicial precisa se chamar `index.html`.
2. Em Settings → Pages, escolha **Deploy from a branch**, `main`, `/(root)` e Save.
3. Abra o site publicado no Chrome (Android) ou Safari (iPhone) enquanto há internet.
4. Aguarde aparecer **✓ INSTALADO PARA USO OFFLINE** na tela inicial.
5. Instale em **Adicionar à tela inicial / Instalar app**. Abra pelo ícone para jogar no modo avião.
6. Se atualizar os arquivos, conecte-se novamente e recarregue para receber a atualização. O cache usa versão própria.

## Sistemas
- Campanha longa de 60 dias, 10 atos e **60 ofensivas roteirizadas**, cada uma com contexto, setor atacado, inimigos e tática relevante.
- 9 heróis (4 iniciais, 5 recrutáveis); níveis, atributos, magia, mudança de classe, 8 ofícios, treino, fadiga, lesões e morte permanente.
- 12 projetos com 3 níveis; quatro fronteiras fortificáveis; economia diária de alimentos, minério, madeira, pedra, moedas e essência.
- 29 missões alternativas, inclusive **nove pessoais**, alianças e **seis missões lendárias**.
- Batalha por turnos em estilo RPG clássico: iniciativa, ações individuais, habilidades com custo de MP, cura, status, resistência de tipos, itens, ressuscitação e chefes especiais.
- **A Rainha ataca todos os dias**: não é possível pular uma ofensiva.
- **Derrota final:** quando todos os defensores enviados ao confronto ficam caídos.
- Três dificuldades e desfechos distintos segundo o estado da população.
- Salva automaticamente em armazenamento local (localStorage); opção de exportar/importar JSON via Crônica.

## Licenciamento e fontes
O cenário da Carcaça deriva dos arquivos de ambientação fornecidos pelo criador. Os episódios de cerco e os personagens novos constituem adaptações ficcionais adicionais, não fatos cronológicos estabelecidos previamente.

Mecânicas e estatísticas autorais. Algumas espécies e nomes de criaturas fazem referência a monstros clássicos de RPG de fantasia e à linha **Tome of Beasts**, da Kobold Press, usada como inspiração. O jogo não contém texto, estatísticas reproduzidas, artes ou arquivos dos manuais comerciais. Final Fantasy é uma referência de gênero (ritmo de combate por turnos), não uma licença ou adaptação oficial.

## Arquivos
- index.html — documento principal
- style.css — interface mobile e telas
- data.js — arcos, invasões, inimigos, personagens e conteúdo narrativo
- app.js — sistemas e motor de jogo
- manifest.webmanifest — metadados de instalação
- sw.js — cache offline
- icons/ — imagens locais
- .nojekyll — configuração estática do GitHub Pages

## Limitações
O save local pode ser apagado ao limpar dados do navegador ou desinstalar o app. Exporte seus saves periodicamente. Não existe multiplayer, servidor, conta online ou sincronização entre aparelhos. Preferencialmente, instale em contexto HTTPS via GitHub Pages, não por `file://`, pois Service Workers não funcionam no acesso direto a arquivos locais.

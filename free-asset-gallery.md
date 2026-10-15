# Free Asset Gallery 🎮

> Catálogo de repositórios públicos com recursos para desenvolvimento de jogos. **Este arquivo é um índice de referências, não uma autorização geral para reutilização.** Verifique a licença e a autoria dos arquivos específicos antes de incluí-los no jogo.
>
> Atualizado em 14/10/2026. Idioma: português (PT-BR).

## Índice de bibliotecas e referências

| Repositório | O que encontrar | Palavras-chave para busca | Licença e cuidados |
| --- | --- | --- | --- |
| [Tiddybub/2d-assets](https://github.com/Tiddybub/2d-assets) | Biblioteca organizada por gênero: sprites, personagens, monstros, terrenos, tilesets, efeitos e interfaces; inclui pastas `fantasy`, `effects`, `ui` e `vehicles`. | `pixel-art`, `2d`, `sprites`, `tilesets`, `fantasy`, `rpg`, `pirate`, `ships`, `ui`, `vfx` | O projeto declara que seus packs são **CC0** e inclui informações de origem por pacote em `SOURCE.md`. Conferir a origem se houver dúvida. |
| [shorepine/kenney](https://github.com/shorepine/kenney) | Espelho organizado de assets da Kenney: sprites 2D, tiles, ícones, UI e modelos 3D. | `kenney`, `cc0`, `2d`, `3d`, `gltf`, `icons`, `ui`, `prototype`, `tiles` | Apresentado como coleção de assets **CC0** da Kenney; conferir documentação de cada pacote. Site original: [kenney.nl](https://kenney.nl/assets). |
| [series-ai/jam-ready-assets](https://github.com/series-ai/jam-ready-assets) | Coletânea de pacotes para game jams, gráficos, interface, fontes e áudio. | `game-jam`, `sprites`, `pixel-art`, `ui`, `fonts`, `audio`, `sound`, `2d` | **Licenças variáveis por pacote**; alguns podem ter restrições. Não presumir CC0 para o conjunto inteiro. |
| [eturner58/game-assets](https://github.com/eturner58/game-assets) | Catálogo/índice para localizar pacotes de arte, sobretudo Kenney e referências LimeZu; útil para explorar por categoria. | `catalog`, `asset-index`, `kenney`, `limezu`, `pixel-art`, `tilesets`, `rpg`, `browse` | **Catálogo, não banco de downloads livres**: os arquivos e suas licenças pertencem às fontes originais. Navegador: [eturner58.github.io/game-assets](https://eturner58.github.io/game-assets/). |
| [CuriousCrow123/PirateShipGame](https://github.com/CuriousCrow123/PirateShipGame) | Projeto de jogo naval top-down em pixel art com referências para navios, canhões, explosões, água, shaders e efeitos. | `pirate`, `ship`, `naval-combat`, `top-down`, `pixel-art`, `water-shader`, `cannon`, `godot`, `vfx` | É um **jogo de referência**, não um asset pack. Consultar a licença e a procedência de cada recurso, inclusive dependências/terceiros. |
| [rapidpunches/ocean](https://github.com/rapidpunches/ocean) | Recursos e experimentos ligados ao oceano, animais marinhos e ambientes aquáticos. | `ocean`, `underwater`, `marine`, `sea-creatures`, `fish`, `environment`, `sprites`, `svg` | **Licença de reutilização não confirmada para todos os conteúdos**. Não copiar sem verificar o arquivo e a permissão correspondente. |

## Uso rápido por necessidade

| Necessidade | Onde procurar primeiro | Termos úteis |
| --- | --- | --- |
| Navios e combate naval | PirateShipGame; Tiddybub/2d-assets | `ship`, `pirate`, `cannon`, `naval-combat` |
| Mar, fauna e cenários costeiros | rapidpunches/ocean; Tiddybub/2d-assets | `ocean`, `water`, `fish`, `coast`, `tileset` |
| RPG medieval, fantasia e masmorras | Tiddybub/2d-assets; game-assets | `fantasy`, `rpg`, `dungeon`, `medieval` |
| Interfaces, inventário e ícones | shorepine/kenney; Tiddybub/2d-assets | `ui`, `icons`, `inventory`, `buttons`, `panels` |
| Partículas, fumaça e explosões | Tiddybub/2d-assets; PirateShipGame | `vfx`, `smoke`, `particle`, `explosion` |
| Sons, música e fontes | series-ai/jam-ready-assets | `audio`, `sound`, `font`, `game-jam` |
| Protótipos rápidos | shorepine/kenney; series-ai/jam-ready-assets | `prototype`, `cc0`, `2d`, `3d` |

## Prioridade estética para *O Mar de Sangue*

Para uma identidade **pixel art sombria, fantasia náutica e horror lovecraftiano**, começar por:

1. **PirateShipGame** — estudar sistemas e apresentação visual de navegação, água e combate; não presumir direito de copiar todo o conteúdo.
2. **Tiddybub/2d-assets** — procurar sprites marítimos, terrenos, efeitos, UI e peças de fantasia CC0 para adaptação.
3. **rapidpunches/ocean** — usar como referência para ecossistemas marinhos, verificando permissões antes de importar arquivos.
4. **shorepine/kenney** — acelerar protótipos e criar placeholders de interface sem comprometer a direção artística.
5. **game-assets / jam-ready-assets** — descobrir outras coleções e checar cada licença antes da integração.

**Direção artística:** priorizar assets originais para navios importantes, monstros, cultistas, elementos feéricos, mapas narrativos e interfaces de identidade própria. Assets externos ajudam principalmente na prototipagem e em elementos secundários.

## Checklist antes de importar

- [ ] Confirmar o autor e a origem do arquivo.
- [ ] Ler a licença aplicável ao **asset específico**, não só ao repositório.
- [ ] Verificar uso comercial, modificações e atribuição obrigatória.
- [ ] Registrar URL, autor, licença, nome e versão/data de obtenção.
- [ ] Guardar avisos de copyright e atribuições exigidas.
- [ ] Adaptar resolução, escala, paleta, animação e estilo ao jogo.
- [ ] Não importar automaticamente pastas inteiras de terceiros para o repositório.

### Modelo de registro de asset

```yaml
nome: exemplo-sprite-navio
origem: https://github.com/autor/repositorio/caminho/do/asset
autor: Nome do autor
licenca: CC0 # confirmar na fonte
atribuicao_obrigatoria: false
modificacoes: recolorido e adaptado para 32x32
utilizado_em: prototipo
```

> **CC0** geralmente permite usar, modificar e redistribuir sem atribuição. **MIT** normalmente exige preservar avisos de licença/copyright. **CC BY** exige atribuição. Um repositório público sem licença explícita **não é automaticamente livre para uso**.

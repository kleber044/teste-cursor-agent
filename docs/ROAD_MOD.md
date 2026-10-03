# Road mod

O asfalto do FGM é gerado, não extraído de outro mod e não é um arquivo da Rockstar.

Origem: `src/engine/roads.js`, a partir de `roadDetail` em `src/engine/pipeline.js`. O padrão junta agregado, rachadura curta e variação de umidade. Não há faixa de centro repetida, porque uma faixa em textura pequena aparece a cada poucos metros.

Arquivos:

| Perfil | Arquivo mestre | Pacote |
| --- | --- | --- |
| Ultra | `src/roads/FGM_RoadAlbedo_2048.png` | `dist/ultra/roads/` e `release/FGM-v2.0.0/Ultra/roads/` |
| High | `FGM_RoadAlbedo_1024.png` | `dist/high/roads/` e `High/roads/` |
| Medium | `FGM_RoadAlbedo_512.png` | `dist/medium/roads/` e `Medium/roads/` |
| Low | `FGM_RoadAlbedo_256.png` | `dist/low/roads/` e `Low/roads/` |

A cópia que o ReShade lê está em `Textures/FGM_RoadAlbedo.png` do mesmo nível. O instalador manda só essa cópia para o FiveM. Trocar de Ultra para Low substitui o arquivo; os dois tamanhos não ficam carregados juntos.

`FGM_Road` amostra a textura em tela, só onde a máscara reconhece asfalto na parte de baixo do quadro. Fora isso o pixel passa intacto. Não há normal map: sem profundidade, um normal só aumentaria VRAM.

Substituir o asfalto dentro de `update.rpf` ou de um YTD não é feito. Isso exigiria escrever um arquivo proprietário do jogo.

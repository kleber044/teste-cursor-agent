# Arquitetura

`src/profiles/profiles.json` é a fonte dos quatro níveis. O motor em `src/engine` gera a mesma matemática usada nos testes. `src/shaders/FGM.fx` é a versão ReShade dessa matemática. `tools/build.mjs` grava LUT, asfalto, presets, previews e `release/FGM-v2.0.0`.

Ordem das techniques:

`FGM_Exposure`, `FGM_HighlightRecovery`, `FGM_Tonemap`, `FGM_Shadows`, `FGM_ClearView`, `FGM_Lamps`, `FGM_ReflectionsEnhance`, `FGM_Road`, `FGM_Bloom`, `FGM_Day`, `FGM_Night`, `FGM_Contrast`, `FGM_Color`, `FGM_Lut`, `FGM_AmbientTone`, `FGM_ColorProtection`, `FGM_Sharp`, `FGM_Vignette`, `FGM_FilmGrain`, `FGM_ChromaticAberration`, `FGM_Rain`.

As três últimas ficam de fora da lista ativa. Os valores calibrados continuam no `.ini` para quem quiser ligar uma delas à mão.

`FGM_Exposure` faz, antes da cor, uma medição 4×4 num alvo de 1×1. Dia é média `>= 0.42`. Isso evita quatro leituras em tela cheia. O motor de teste usa a média do quadro inteiro depois do tom; a decisão dia/noite coincide nas cenas de referência.

Cada technique tem um papel:

| Technique | Papel |
| --- | --- |
| Exposure | viés de exposição |
| HighlightRecovery | ombro dos highlights |
| Tonemap | comprime só acima de 0,84 |
| Shadows | levanta preto sem lavar o meio |
| ClearView | separa estrutura do véu, mais forte de dia |
| Lamps | núcleo e rastro quente vão para branco |
| ReflectionsEnhance | reflexo curto no asfalto |
| Road | microdetalhe da textura própria |
| Bloom | brilho só acima do limiar |
| Day | saturação contida e highlight de dia |
| Night | piso de preto e corte do véu noturno |
| Contrast | contraste em volta de 0,5 |
| Color | vibrance com teto na vegetação |
| Lut | mistura da LUT 32³ |
| AmbientTone | sombra levemente quente de dia e fria de noite |
| ColorProtection | pele, teto 0,96 e branco sem cor falsa |
| Sharp | nitidez com freio em borda dura |
| Vignette | canto escuro, sem atingir céu claro |
| FilmGrain | grão mínimo, desligado |
| ChromaticAberration | desvio de um pixel, desligado |
| Rain | gotas manuais, desligado |

Máscaras separam pele, vegetação, neon/sinal/lanterna, poste, véu e asfalto. O asfalto só entra abaixo de 62% da tela e não pega pele nem folha.

# Desempenho

O custo abaixo é a conta do catálogo: um passe por technique ligada, mais as amostras daquele passe. A medição de dia/noite entra nos 17 do Exposure e acontece uma vez por quadro, num alvo de 1×1.

| Perfil | Passes | Amostras |
| --- | --- | --- |
| Ultra | 18 | 100 |
| High | 18 | 92 |
| Medium | 18 | 84 |
| Low | 14 | 72 |

Low não roda reflexo, bloom, ambiente nem vinheta.

Custo por technique quando está ligada:

| Technique | Amostras |
| --- | --- |
| Exposure | 17 |
| Highlight, Tonemap, Shadows, Lamps, Contrast, Color, Ambient, Protection, Vignette, Grain, Rain | 1 |
| ClearView | 1 + taps |
| Reflections | 1 + taps |
| Road | 2 |
| Bloom | 1 + taps |
| Day, Night | 17 |
| Lut | 2 |
| Sharp | 5 |
| Chromatic | 3 |

VRAM da textura de asfalto, RGBA8, uma por instalação:

| Perfil | Lado | Memória aproximada |
| --- | --- | --- |
| Ultra | 2048 | 16 MB |
| High | 1024 | 4 MB |
| Medium | 512 | 1 MB |
| Low | 256 | 0,25 MB |

A LUT é 1024×32, cerca de 128 KB, igual em todos. O nível leve não recebe o PNG de 2048.

Não há passe de profundidade. Chuva, grão e aberração não entram no quadro até alguém colocar a technique na lista.

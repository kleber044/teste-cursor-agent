# FGM 2.0.0

FGM é um pacote gráfico **local** para quem joga FiveM no próprio PC.

Comprar, abrir o instalador, escolher o nível, instalar, abrir o FiveM e jogar. Não há resource no servidor, não há `fxmanifest.lua` e não é preciso ser dono da cidade.

```
Instalar-Ultra.cmd
Instalar-High.cmd
Instalar-Medium.cmd
Instalar-Low.cmd
Desinstalar.cmd
Reparar.cmd
```

`Quality` é o mesmo que Ultra. `Performance` é o mesmo que Low.

## O que o pacote faz

- Correção de cor, LUT, exposição, sombras e proteção de tons de pele
- ClearView com tratamento diferente para dia e noite
- Postes e rastros de luz neutros, sem apagar neon, semáforo ou lanterna
- Asfalto próprio em quatro resoluções
- Bloom, reflexo e nitidez com custo diferente em cada nível
- Chuva, grão e aberração cromática prontos, porém desligados

## O que ele não faz

- Não contorna Pure Mode, anticheat nem qualquer proteção do servidor
- Não lê memória do jogo e não usa a build Addon do ReShade
- Não altera `FiveM.exe`, `GTA5.exe`, `update.rpf` ou `CitizenFX.ini`
- Não substitui o `update.rpf` da Rockstar. O asfalto é uma textura de tela original
- Não redistribui o binário do ReShade. O instalador baixa o setup oficial 6.8.0 e confere o SHA-256

Se o servidor bloqueia mods gráficos locais, o FGM respeita esse bloqueio.

## Começar

O guia de instalação está em [docs/INSTALACAO.md](docs/INSTALACAO.md). Os quatro níveis estão em [docs/PERFIS.md](docs/PERFIS.md).

O pacote pronto para distribuição fica em `release/FGM-v2.0.0/` depois de `npm run build`.

# Testes

`npm test` cobre perfis, regressões, LUT, asfalto, presets, shaders e o instalador em PowerShell quando o release já foi gerado.

`npm run build` gera:

- `src/roads/FGM_RoadAlbedo_*.png`
- `dist/<perfil>/`
- `release/FGM-v2.0.0/`
- `release/FGM-v2.0.0/Previews/compare-*.png`

As comparações são OFF, LOW, MEDIUM, HIGH e ULTRA para dia, noite, rua, vegetação, poste, chuva e cidade distante. A faixa de chuva força o efeito só na prévia. O preset continua com `FGM_Rain` fora da lista.

Regressões cobertas sem abrir o FiveM:

- chuva no quadro padrão e numa prévia de menu
- poste e rastro amarelos
- neon, semáforo e lanterna
- saturação de dia, pele, folha e roupa
- highlight de parede e asfalto
- preto da noite e horizonte leitoso
- prédio distante contra véu
- halo de nitidez
- Low sem bloom
- alias Quality igual a Ultra

Isso não substitui uma sessão dentro do jogo. A lista única dessa sessão está no final do relatório da versão.

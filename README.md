# Arena do Eclipse

Jogo web 3D em terceira pessoa. Você entra num círculo de pedra, enfrenta dois caçadores com IA e usa ataque e esquiva para sobreviver.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Controles

- `WASD` ou setas — mover
- `Q` / `E` ou arrastar com o botão direito — câmera
- `J`, `K` ou clique esquerdo — ataque
- `Espaço` ou `Shift` — esquiva com invulnerabilidade
- `R` — reiniciar a luta
- `Enter` — entrar na arena ou confirmar o fim da partida

Os inimigos perseguem, telegrafam o golpe com um anel no chão e causam dano. A barra de vida fica na base da tela. Quando alguém cai, a luta pode recomeçar.

## Testes

```bash
npm test
npm run build
```

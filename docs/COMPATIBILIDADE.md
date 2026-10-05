# Compatibilidade

O FGM é client-side. Não usa ESX, QBCore, vRP, resource de servidor nem permissão de administrador da cidade.

Funciona em servidores que permitem mod gráfico local. Pure Mode e restrições do servidor continuam valendo: se o cliente bloqueia ReShade ou textura local, o FGM não tenta passar por cima.

O shader lê só o buffer de cor. Profundidade fica desligada, como o ReShade faz em multiplayer. Não há hook de clima, então a chuva não liga sozinha no menu nem com céu limpo.

Não há suporte à build Addon do ReShade.

Arquivos que nunca são abertos para escrita: `FiveM.exe`, `GTA5.exe`, `update.rpf`, `CitizenFX.ini`.

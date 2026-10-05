# Instalação

1. Feche o FiveM.
2. Abra o arquivo do nível escolhido:
   - `Instalar-Ultra.cmd`
   - `Instalar-High.cmd`
   - `Instalar-Medium.cmd`
   - `Instalar-Low.cmd`
3. Se o ReShade ainda não estiver ao lado do `FiveM.exe`, o instalador baixa somente `https://reshade.me/downloads/ReShade_Setup_6.8.0.exe`, confere o SHA-256 `207aea16205fbf952bc8fe1879966672454cf04002e7ad34237c7990a5b3c0b4` e abre o instalador oficial. Escolha o FiveM e a API que você já usa. Não use a versão Addon. Rode o instalador do FGM de novo depois disso.
4. O FGM copia só os shaders, a LUT e a textura de asfalto daquele nível para `reshade-shaders` e aponta o preset.
5. Se existir `Documents/Rockstar Games/GTA V/settings.xml`, o arquivo é copiado para `%LOCALAPPDATA%\FGM\backups` e só então as chaves conhecidas são trocadas. Se o arquivo não existir, nada é criado.
6. Abra o FiveM e jogue.

Trocar de nível é rodar outro `Instalar-*.cmd`. O nível anterior sai do manifesto e a textura grande não fica instalada junto com a leve.

`Reparar.cmd` recoloca os arquivos do nível que já estava instalado. `Desinstalar.cmd` remove os arquivos do manifesto e devolve o backup.

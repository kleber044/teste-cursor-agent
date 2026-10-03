# Desinstalação

Rode `Desinstalar.cmd`.

O que sai:

- shaders, LUT, textura de asfalto e preset que o manifesto registrou
- o preset do nível que ficou para trás numa troca

O que volta:

- `settings.xml` original, se o FGM tinha feito backup
- `ReShade.ini` original, se ele já existia

O que fica:

- `dxgi.dll` do ReShade, porque o FGM não copia e não apaga esse binário
- qualquer arquivo que não esteja no manifesto, inclusive shaders de outras pessoas
- `FiveM.exe`, `GTA5.exe`, `update.rpf` e `CitizenFX.ini`

Se o `settings.xml` não existia antes, a desinstalação também não cria um.

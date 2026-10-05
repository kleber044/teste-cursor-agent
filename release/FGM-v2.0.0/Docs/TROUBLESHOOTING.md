# Problemas comuns

**O instalador diz que o FiveM não foi encontrado.**  
O padrão é `%LOCALAPPDATA%\FiveM\FiveM.app\FiveM.exe`. Rode o PowerShell com `-FiveMRoot` apontando para a pasta que contém o `FiveM.exe`.

**O hash do ReShade não fecha.**  
Apague o arquivo em `%LOCALAPPDATA%\FGM\cache` e deixe o instalador baixar de novo. Não substitua a URL pela build Addon.

**O preset não aparece.**  
Confirme `reshade-shaders\Presets\FGM-Ultra.ini` (ou High, Medium, Low) e a linha `PresetPath` em `ReShade.ini`. `Reparar.cmd` regrava isso.

**A chuva apareceu no menu.**  
Ela não faz parte de nenhum preset. Se foi ligada na mão, retire `FGM_Rain@FGM.fx` da linha `Techniques`.

**O asfalto do jogo não mudou como um texture pack.**  
O FGM não edita `update.rpf`. O detalhe de rua é de tela e usa a textura do nível instalado. Troque o nível para trocar a resolução.

**O servidor bloqueou o mod.**  
Isso é esperado em Pure Mode. Não há modo alternativo.

**Quero voltar atrás.**  
`Desinstalar.cmd`. Os gráficos do GTA voltam do backup. O ReShade em si permanece até você removê-lo pelo instalador oficial.

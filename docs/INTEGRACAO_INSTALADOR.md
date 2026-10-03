# Integração do instalador

A lógica está em `installer/FGM-Install.ps1`. Os `.cmd` só escolhem a ação e o perfil.

```
powershell -NoProfile -ExecutionPolicy Bypass -File FGM-Install.ps1 -Action install -Profile ultra
```

Ações: `install`, `uninstall`, `repair`.

Parâmetros úteis para um app futuro: `-PackageRoot`, `-FiveMRoot`, `-DocumentsRoot`, `-StateRoot`, `-DryRun`, `-SkipDownload`, `-SkipLaunch`.

Fluxo de `install`:

1. Recusa URL com `Addon`.
2. Exige `FiveM.exe` na pasta informada.
3. Se não houver `ReShade.ini` nem `dxgi.dll`, baixa o setup oficial, confere o SHA-256 e abre a interface oficial. Não copia `dxgi.dll`.
4. Faz backup do `settings.xml` existente e troca só chaves da lista segura.
5. Copia `Shaders`, `Textures` e o preset do nível.
6. Apaga caminhos do manifesto que o nível novo não usa.
7. Atualiza `PresetPath` sem remover os caminhos de shader que já estavam no ini.
8. Grava o manifesto.

Um aplicativo com quatro botões pode chamar o mesmo script. Os valores recomendados vêm de `profiles.json`, copiado para `Installer/` no release.

Código de saída: `0` pronto, `2` FiveM ausente, `3` hash do ReShade inválido.

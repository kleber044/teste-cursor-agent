# Backup

Estado em `%LOCALAPPDATA%\FGM\`.

| Arquivo | Conteúdo |
| --- | --- |
| `installed-manifest.json` | versão, perfil e caminhos instalados |
| `backups/settings-map.json` | de onde veio cada `settings.xml` |
| `backups/settings-*.xml` | cópia anterior à primeira aplicação |
| `backups/original-ReShade.ini` | cópia do ini, se ele já existia |

A primeira instalação guarda o XML intacto. Uma troca de perfil parte dessa cópia, aplica o nível novo e não empilha valores em cima de valores. A desinstalação devolve a cópia.

Chaves que o FGM pode alterar, e só se já existirem no XML: `TextureQuality`, `ShaderQuality`, `ShadowQuality`, `ReflectionQuality`, `ParticleQuality`, `GrassQuality`, `PostFX`, `AnisotropicFiltering`, `SSAO`, `LodScale`.

Chaves que ficam só como recomendação, sem gravação: `Shadow_SoftShadows`, `UltraShadows_Enabled`, `Shadow_Distance`, `PopulationDensity`, `PopulationVariety`, `MotionBlurStrength`.

# Checklist da V2

| Requisito | Estado |
| --- | --- |
| Produto local, sem resource de servidor | OK |
| Sem bypass, Pure Mode respeitado, sem leitura de memória | OK |
| Conteúdo original; ReShade só por download oficial com hash | OK |
| Quatro níveis e aliases Quality/Performance | OK |
| Ultra, High, Medium e Low com custo diferente | OK |
| Gráficos do GTA com backup, aplicação e restauração | OK nas chaves seguras |
| Chaves de sombra suave, população e motion blur | PENDENTE como automação: ficam só como recomendação porque nem todo `settings.xml` as expõe do mesmo jeito |
| Road mod próprio em 2048/1024/512/256 | OK como textura de tela |
| Troca do asfalto dentro de `update.rpf` | PENDENTE: exigiria escrever arquivo proprietário, e isso está fora do produto |
| Vegetação sem verde neon | OK no grading, sem mexer em geometria |
| Postes e rastros menos amarelos, neon e sinais preservados | OK no motor e nas prévias |
| Dia, noite, pele, highlight e ClearView | OK nos testes de regressão |
| Chuva desligada no preset | OK |
| Chuva ligando sozinha com o clima | PENDENTE: não há leitura segura de clima sem hook |
| Bloom, nitidez e reflexo por nível | OK |
| Vinte techniques, cada uma com uma função | OK, num único `FGM.fx` para a medição de dia/noite ser 1×1 |
| Presets gerados do catálogo | OK |
| Custo e VRAM documentados | OK. Não houve perfil em GPU |
| Instalador, reparo, desinstalação e troca de perfil | OK em teste local com FiveM falso |
| Compilação do `.fx` pelo ReShade | PENDENTE neste ambiente: não há o compilador do ReShade aqui. A matemática espelha o motor testado |
| Pastas de asfalto, release, hashes e licenças | OK |
| Suíte visual offline e comparativos | OK, cenas sintéticas |
| Sessão real dentro do FiveM | PENDENTE: fica para uma rodada só, descrita em `TESTE_FIVEM.md` |

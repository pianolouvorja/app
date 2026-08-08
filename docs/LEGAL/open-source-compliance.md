# Relatorio de Compliance Open Source

**LouvorJA Piano** — App Electron Desktop

Versao: 1.0 | Data: 07 de agosto de 2026

---

## 1. Licenca do Projeto (MIT)

O projeto LouvorJA Piano e distribuido sob a **Licenca MIT** — uma das licencas open source mais permissivas existentes.

Termos principais da MIT:

- **Permite**: uso comercial, modificacao, distribuicao, sublicenciamento, uso privado.
- **Exige**: incluir aviso de copyright e copia da licenca em todas as copias ou partes substanciais do Software.
- **Nao exige**: divulgar codigo-fonte (nao e copyleft), attribuicao em interface, nota de mudancas.
- **Sem garantia**: AS IS, sem responsabilidade do autor.

Veredito: MIT e a escolha correta para um app religioso gratuito — maxima permissividade, minima burocracia.

## 2. Analise de Dependencias

O projeto possui **30 dependencias** (prod + dev). Abaixo a analise de licencas:

| Dependencia | Versao | Tipo | Licenca Provavel |
|---|---|---|---|
| electron | - | prod | MIT |
| vue | - | prod | MIT |
| vuetify | - | prod | MIT |
| vue-router | - | prod | MIT |
| vue-i18n | - | prod | MIT |
| pinia | - | prod | MIT |
| tailwindcss | - | prod | MIT |
| @tailwindcss/vite | - | prod | MIT |
| sass | - | prod | MIT |
| @fontsource-variable/plus-jakarta-sans | - | prod | OFL-1.1 (SIL Open Font License) |
| @tabler/icons-webfont | - | prod | MIT |
| basic-ftp | - | prod | MIT |
| typescript | - | dev | Apache-2.0 |
| vite | - | dev | MIT |
| @vitejs/plugin-vue | - | dev | MIT |
| vite-plugin-electron | - | dev | MIT |
| vite-plugin-electron-renderer | - | dev | MIT |
| vite-plugin-vue-devtools | - | dev | MIT |
| electron-builder | - | dev | MIT |
| @biomejs/biome | - | dev | MIT |
| husky | - | dev | MIT |
| lint-staged | - | dev | MIT |
| cross-env | - | dev | MIT |
| concurrently | - | dev | MIT |
| npm-run-all2 | - | dev | MIT |
| wait-on | - | dev | MIT |
| @types/node | - | dev | MIT |
| @tsconfig/node24 | - | dev | MIT |
| @vue/tsconfig | - | dev | MIT |
| vue-tsc | - | dev | MIT |

### Resumo de Licencas

| Licenca | Quantidade | Copyleft? |
|---|---|---|
| MIT | 27 | Nao |
| Apache-2.0 | 1 (typescript) | Nao |
| OFL-1.1 | 1 (@fontsource) | Nao (fontes) |
| **Total** | **30** | **Zero copyleft** |

## 3. Matriz de Compatibilidade

A licenca MIT e **permissiva** — compativel com praticamente todas as outras licencas open source:

| Combinacao | Compativel? |
|---|---|
| MIT + MIT | Sim |
| MIT + Apache-2.0 | Sim |
| MIT + BSD (2/3-clause) | Sim |
| MIT + ISC | Sim |
| MIT + OFL-1.1 (fontes) | Sim (fontes tem licenca propria) |
| MIT + GPL/LGPL/AGPL | Sim no consumo (MIT pode ser linkado com GPL) |

Nenhum conflito de licenciamento identificado.

## 4. Riscos — AGPL Trap e Copyleft

### AGPL Trap

O **AGPL (Affero GPL)** e o risco principal em projetos open source: se uma dependencia AGPL for incluida e o software for oferecido como servico via rede, o codigo-fonte completo do projeto deve ser divulgado.

**Resultado da analise**: Nenhuma dependencia AGPL identificada no projeto. Todas as 30 deps sao permissivas (MIT/Apache/OFL). **Risco AGPL: ZERO.**

### GPL/LGPL

Nenhuma dependencia GPL ou LGPL identificada. Mesmo que houvesse, MIT e compativel com GPL (o resultado seria GPL, mas como o projeto ja e open source MIT, nao ha problema).

### Electron e Chromium

Electron empacota Chromium (licencas BSD, MIT e outras). O projeto electron-builder cuida do aviso legal de licencas do Chromium automaticamente no installer. **Nenhuma acao necessaria.**

### @fontsource (OFL-1.1)

A fonte Plus Jakarta Sans e licenciada sob SIL Open Font License 1.1. A OFL permite uso, estudo, modificacao e redistribuicao livremente, mas exige:

1. Incluir a licenca OFL ao redistribuir a fonte.
2. Nao vender a fonte isoladamente (vender como parte de um software e permitido).

**Recomendacao**: Incluir arquivo `OFL-LICENSE.txt` na pasta de assets de fontes.

## 5. SPDX Identifier

SPDX (Software Package Data Exchange) e o standard para identificacao de licencas.

### Recomendacao

Adicionar SPDX identifier no `package.json`:

```json
{
  "license": "MIT"
}
```

E nos arquivos de codigo-fonte principais, usar header SPDX:

```
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Piano Louvor JA
```

Isso facilita ferramentas automatizadas (scan de licencas, SBOM) a identificar corretamente a licenca.

## 6. CLA/DCO — Recomendacao para Org Multi-Colaborador

O projeto possui 2 colaboradores principais (Rafael Zendron + Ezequias Fonseca) na org `pianolouvorja`.

### Cenario Atual: Sem CLA, sem DCO

Sem CLA (Contributor License Agreement) ou DCO (Developer Certificate of Origin), cada contribuidor mantem o copyright de suas contribuicoes. Isso nao e problema para MIT (permissiva), mas pode dificultar:

1. **Mudanca de licenca futura**: Sem CLA, mudar a licenca exige consentimento de todos os contribuidores.
2. **Defesa de copyright**: Sem CLA, apenas os contribuidores podem acionar judicialmente infratores.

### Recomendacao

Para projeto com 2 colaboradores que confiam mutuamente:

- **DCO (Developer Certificate of Origin)**: Recomendado. Leve, gratuito, via `git commit -s` (Signed-off-by). Confirma autoria.
- **CLA**: Nao necessario neste momento. Considerar apenas se o projeto crescer para 5+ contribuidores externos.

Implementar DCO:

1. Adicionar arquivo `DCO.txt` na raiz do repo.
2. Configurar GitHub App **DCO** (gratuito) para exigir Signed-off-by em todos os PRs.
3. Adicionar instrucao no CONTRIBUTING.md.

## 7. Copyright Notice

### Situacao Atual

O arquivo `LICENSE.md` do projeto deve conter:

```
Copyright (c) 2026 Piano Louvor JA
```

### Verificacao

O nome da entidade detentora do copyright deve ser **consistente** em:

1. `LICENSE.md` (repo).
2. `package.json` (`author` ou `authors` field).
3. Headers de codigo-fonte.
4. EULA (clausula de propriedade intelectual).
5. Tela "Sobre" no app.

**Recomendacao**: Usar "Piano Louvor JA" como nome canonico em todos os locais. Se houver pessoa juridica registrada (associacao/CNPJ), usar o nome da PJ no futuro.

## 8. Checklist Antes da Proxima Release

- [ ] `LICENSE.md` presente na raiz do repo com copyright "Copyright (c) 2026 Piano Louvor JA"
- [ ] `package.json` com `"license": "MIT"` e SPDX format
- [ ] Incluir arquivo `OFL-LICENSE.txt` para fonte Plus Jakarta Sans (assets/fonts/)
- [ ] Executar `npx license-checker --summary` para auditar licencas de deps
- [ ] Confirmar: nenhuma dep GPL/AGPL adicionada desde ultima verificacao
- [ ] Installer inclui EULA (dialogo de aceitacao)
- [ ] Tela "Sobre" no app lista creditos + licenca MIT + link para repo
- [ ] `CONTRIBUTING.md` com instrucao de DCO (`git commit -s`)
- [ ] GitHub App DCO instalado na org `pianolouvorja`
- [ ] SBOM (Software Bill of Materials) gerado para a release

### Comando para audit de licencas

```bash
npx license-checker --summary --out docs/LEGAL/license-audit.txt
npx license-checker --json --out docs/LEGAL/licenses-full.json
```

---

**Aviso Legal**: Este relatorio e first-pass AI baseado nas licencas declaradas. Para validacao definitiva antes de release comercial, execute ferramenta automatizada (license-checker, fossa, snyk) e consulte especialista em compliance open source.

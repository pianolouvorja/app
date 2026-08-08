# SPEC: Apresentação e Aceite de EULA — LouvorJA Piano

## Contexto

O app LouvorJA Piano é distribuído em 3 formatos: **NSIS** (Windows), **AppImage** (Linux) e **DMG** (macOS). Apenas o NSIS possui installer com capacidade de exibir acordo de licença nativamente. AppImage e DMG são "mount-and-run" — não há installer, então o usuário executa o app sem nunca ver o EULA.

O documento `docs/LEGAL/EULA.md` (v1.0, 139 linhas) já existe e é o contrato legal aprovado. Precisamos garantir que **todo usuário aceite o EULA antes de usar o app**, independentemente do formato de distribuição ou plataforma.

**Problema atual:** Sem mecanismo de aceite, o EULA existe apenas como documento no repo. Usuário de AppImage/DMG nunca vê o termo. Windows NSIS pode exibir no installer, mas não há camada runtime.

---

## Estado Atual (Baseline Audit)

### O que EXISTE
- `docs/LEGAL/EULA.md` — EULA v1.0, 139 linhas, em PT-BR
- `electron/main.mjs` — entry point Electron (265 linhas, ESM ativo)
  - `app.whenReady().then(() => { ... createWindow() })` — insert point identificado
  - `app.setPath('userData', path.join(app.getPath('appData'), APP_USER_DATA_DIR))` — userData configurado
- `electron/constants.mjs` — `APP_USER_DATA_DIR = 'LouvorJA-PIANO'`
- `electron/preload.mjs` — expõe `window.louvorja` com IPC (workspace, dialog, etc.)
- `electron/paths.mjs` — `getWorkspacePaths()` retorna `root` = `app.getPath('userData')`
- `electron/workspace.mjs` — `readWorkspaceRecord(filename)` / `writeWorkspaceRecord(filename, data)` — le/escrive JSON no userData
- `package.json` build config: NSIS `oneClick: false`, `allowToChangeInstallationDirectory: true`, **sem `license` field**
- `src/router/index.ts` — Vue Router com `createWebHashHistory` em Electron
- IPC workspace ja existente: `workspace:get-record` / `workspace:save-record`

### O que FALTA
- Mecanismo de aceite de EULA no Electron (main process, antes de `createWindow()`)
- Arquivo `EULA.txt` (plain text) para campo `license` do NSIS
- Campo `license` na config `nsis` do `package.json`
- Tela de EULA no renderer (Vue) como fallback/complemento

---

## Requisitos Funcionais

### RF-01: Aceite obrigatório na primeira execução (Electron)

**User Story:** Como usuário, ao abrir o app pela primeira vez, quero ver o EULA e poder aceitar ou recusar, para que meu uso esteja em conformidade legal.

**Critérios de Aceite (EARS):**
- WHEN o app é iniciado E `eula_accepted.json` não existe OU `version !== EULA_VERSION` THEN THE SYSTEM SHALL exibir um dialog modal nativo com o texto completo do EULA
- WHEN o usuário clica "Aceitar" THEN THE SYSTEM SHALL gravar `{ "version": "1.0", "acceptedAt": "<ISO timestamp>" }` em `eula_accepted.json` no userData E prosseguir para `createWindow()`
- WHEN o usuário clica "Recusar" THEN THE SYSTEM SHALL chamar `app.quit()` sem criar nenhuma janela
- WHEN o usuário já aceitou a versão atual THEN THE SYSTEM SHALL pular o dialog e ir direto para `createWindow()`
- IF o EULA é atualizado (versão incrementada) THEN THE SYSTEM SHALL re-exibir o dialog na próxima execução

### RF-02: Versionamento do aceite

**User Story:** Como mantenedor, quando eu atualizar o EULA, quero que todos os usuários existentes vejam a nova versão, para manter conformidade.

**Critérios de Aceite:**
- THE SYSTEM SHALL ter uma constante `EULA_VERSION` (valor inicial `"1.0"`)
- WHEN `eula_accepted.json.version !== EULA_VERSION` THEN THE SYSTEM SHALL considerar EULA não-aceito e re-exibir
- THE SYSTEM SHALL gravar a versão aceita (não apenas um boolean) para auditoria

### RF-03: Camada NSIS no installer do Windows

**User Story:** Como usuário Windows, durante a instalação, quero ver o EULA no assistente NSIS, para ter uma camada adicional de aceite.

**Critérios de Aceite:**
- WHEN o installer NSIS é executado THEN THE SYSTEM SHALL exibir o texto da licença na tela de aceitação
- THE SYSTEM SHALL usar `docs/LEGAL/EULA.txt` (plain text, não Markdown) como fonte
- IF o usuário recusa no installer THEN o instalador não prossegue (comportamento nativo do NSIS)
- Note: Esta é uma camada ADICIONAL. O dialog runtime (RF-01) ainda executa na primeira abertura, cobrindo AppImage/DMG.

### RF-04: Persistência do aceite no workspace

**User Story:** Como sistema, o aceite do EULA deve ser persistido no userData, para sobreviver reinicializações.

**Critérios de Aceite:**
- THE SYSTEM SHALL gravar o aceite em `eula_accepted.json` no diretório userData
- THE SYSTEM SHALL usar o workspace IPC existente (`workspace:save-record` / `workspace:get-record`) para manter consistência com o resto do app
- THE SYSTEM SHALL tratar graciosamente arquivo corrompido/inexistente (considerar como não-aceito)

---

## Requisitos Não-Funcionais

### RNF-01: Performance
- O dialog de EULA deve aparecer em < 500ms após `app.whenReady()`
- A leitura do arquivo `eula_accepted.json` deve ser síncrona (arquivo pequeno, < 200 bytes)

### RNF-02: Plataforma
- Funciona em Windows (NSIS + runtime), Linux (AppImage + runtime), macOS (DMG + runtime)
- O dialog nativo (`dialog.showMessageBoxSync`) funciona em todas as 3 plataformas
- O arquivo `eula_accepted.json` vai para o userData de cada SO:
  - Linux: `~/.config/LouvorJA-PIANO/eula_accepted.json`
  - Windows: `%APPDATA%/LouvorJA-PIANO/eula_accepted.json`
  - macOS: `~/Library/Application Support/LouvorJA-PIANO/eula_accepted.json`

### RNF-03: Zero dependências externas
- Usar apenas APIs nativas do Electron (`dialog`, `app`, `fs`)
- Não introduzir novos pacotes npm

### RNF-04: Não bloquear dev
- Em modo dev (`VITE_DEV_SERVER_URL` definido), o EULA ainda executa — é legalmente necessário
- Não adicionar flag de bypass (seria brecha legal)

### RNF-05: Internacionalização (i18n)

**Estado atual dos repos:**
- App e web ja tem `vue-i18n` v11 instalado e configurado (`src/plugins/i18n.ts`, `createI18n`)
- Apenas `pt-BR.ts` existe. Nao ha EN ou ES ainda
- O renderer tem vue-i18n, mas o Electron **main process** (onde roda o dialog) NAO tem acesso ao vue-i18n

**Requisitos:**
- O EULA deve ser arquitetado para multi-idioma desde o inicio (PT-BR, EN, ES)
- O texto do EULA em cada idioma fica em `docs/LEGAL/eula/pt-BR.txt`, `en.txt`, `es.txt`
- O dialog do Electron (main process) detecta o idioma via `app.getLocale()` e carrega o arquivo correspondente
- Fallback: se o idioma detectado nao tem traducao, usa PT-BR (idioma padrao)
- Os botoes do dialog ("Aceitar"/"Recusar") tambem sao traduzidos
- O EULA.txt do NSIS sera em PT-BR (limitacao do formato — installer nao tem deteccao de idioma dinamica)
- No web app (renderer), usa `vue-i18n` existente com keys `eula.title`, `eula.body`, `eula.accept`, `eula.decline`

---

## Arquitetura

### Decisão: Dialog nativo no main process (não Vue)

```
app.whenReady()
  └─ ensureWorkspaceDirectories()
  └─ registerWorkspaceIpc()
  └─ ...outras configurações...
  └─ checkEulaAcceptance()     ← NOVO: bloqueia antes de createWindow()
      ├─ já aceito? → return true → createWindow()
      └─ não aceito? → showEulaDialog()
          ├─ Aceitar → writeAcceptance() → createWindow()
          └─ Recusar → app.quit()
```

**Por que dialog nativo e não tela Vue:**
1. O EULA precisa aparecer ANTES de qualquer interação — `createWindow()` ainda não rodou
2. `dialog.showMessageBoxSync` é modal, bloqueia o thread, e funciona em todas as plataformas
3. Se exibíssemos dentro da janela Vue, o usuário veria a UI antes do aceite — brecha legal
4. NSIS `license` cobre apenas Windows installer; AppImage/DMG precisam do runtime dialog

### Camadas de aceite (defense in depth)

```
Camada 1: NSIS License (apenas Windows installer)
  └─ Exibe EULA.txt durante instalação
  └─ Recusar = instalação cancelada

Camada 2: Runtime Dialog (TODAS as plataformas)
  └─ Executa na primeira abertura (ou quando EULA_VERSION muda)
  └─ Aplica a Windows, Linux AppImage, macOS DMG
  └─ Recusar = app fecha
```

### Arquivos novos/modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `docs/LEGAL/eula/pt-BR.txt` | **CRIAR** | EULA em PT-BR (plain text, convertido do EULA.md existente) |
| `docs/LEGAL/eula/en.txt` | **CRIAR** | EULA em Ingles (plain text) |
| `docs/LEGAL/eula/es.txt` | **CRIAR** | EULA em Espanhol (plain text) |
| `electron/eula.mjs` | **CRIAR** | Módulo com `checkEulaAcceptance()`, `showEulaDialog()`, `EULA_VERSION`, `getEulaText(locale)` |
| `electron/main.mjs` | **MODIFICAR** | Adicionar `await checkEulaAcceptance()` antes de `createWindow()` |
| `docs/LEGAL/EULA.txt` | **CRIAR** | Symlink ou copia de `eula/pt-BR.txt` para campo `license` do NSIS |
| `package.json` | **MODIFICAR** | Adicionar `"license": "docs/LEGAL/EULA.txt"` em `build.nsis` |

---

## Fora de Escopo

- **Tela de EULA em Vue (renderer)** — dialog nativo é suficiente; tela Vue só faria sentido se houvesse rich text/imagem, o que não é o caso
- **EULA no web app (PWA)** — tratado em spec separada (`pianolouvorja/web#91`). O web usa vue-i18n do renderer (mais simples que o Electron)
- **Traducao automatica do EULA** — as traducoes (EN, ES) devem ser feitas por humano/revisao juridica, nao por IA automatica
- **Telemetria de aceite** — não enviar dados do usuário para nenhum servidor
- **Revogação de aceite pelo usuário** — o aceite é irrevogável permite uso; se não aceitar, deve desinstalar

---

## Dependências

- Electron `dialog` API (nativo, sem pacote adicional)
- `fs` node (nativo)
- `electron-builder` NSIS `license` field (nativo da config existente)
- Workspace IPC já implementado (`workspace:get-record` / `workspace:save-record`)

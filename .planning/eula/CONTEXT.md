# CONTEXT: EULA Implementation — LouvorJA Piano

## Repositório

- **Repo:** `pianolouvorja/app` (local: `/home/ubuntu/piano-app`)
- **Branch atual:** `feat/ci-labeler-issues`
- **Main branch:** `main`
- **Licença:** MIT (`LICENSE.md`)
- **Docs legais:** `docs/LEGAL/` (4 arquivos: README.md, EULA.md, direitos-autorais-musicais.md, open-source-compliance.md)

## Estrutura do Electron Main Process

```
electron/
├── main.mjs              # Entry point ativo (265 linhas, ESM)
├── main.ts               # Stub inativo (5 linhas) — NÃO USAR
├── constants.mjs         # APP_USER_DATA_DIR, API_BASE_URL, WORKSPACE_DIRS, etc.
├── workspace.mjs         # readWorkspaceRecord(filename) / writeWorkspaceRecord(filename, data)
├── paths.mjs             # getWorkspacePaths() → { root: app.getPath('userData') }
├── preload.mjs           # Expõe window.louvorja com IPC para o renderer
├── app-icon.mjs          # Ícone do app por plataforma
├── protocol.mjs          # registerLocalFileProtocol()
├── window-state.mjs      # Persistência de posição/tamanho da janela
├── youtube-embed.mjs     # Headers para embeds do YouTube
├── eula.mjs              # NOVO — a ser criado
└── ipc/
    ├── register.mjs      # registerWorkspaceIpc(), registerWindowIpc()
    └── window.mjs        # Handlers de janela (minimize, maximize, close)
```

## Fluxo de Inicialização (main.mjs)

```javascript
// Ordem ATUAL (antes do EULA):
app.whenReady().then(() => {
  ensureLinuxTaskbarIntegration()   // Linux: ícone da taskbar
  ensureWorkspaceDirectories()       // Cria dirs do workspace no userData
  registerWorkspaceIpc()             // ipcMain.handle('workspace:*')
  registerWindowIpc(() => mainWindow)  // ipcMain.handle('window:*')
  registerLocalFileProtocol()        // Protocolo file:// custom
  registerYoutubeEmbedHeaders()      // session.webRequest.onHeadersReceived
  createWindow()                     // Cria BrowserWindow + carrega app
  // ... auto-updater, tray, etc.
})

// Ordem DEPOIS do EULA:
app.whenReady().then(async () => {
  ensureLinuxTaskbarIntegration()
  ensureWorkspaceDirectories()
  
  // >>> EULA CHECK AQUI <<<
  const eulaOk = await checkEulaAcceptance()
  if (!eulaOk) { app.quit(); return }
  
  registerWorkspaceIpc()
  registerWindowIpc(() => mainWindow)
  registerLocalFileProtocol()
  registerYoutubeEmbedHeaders()
  createWindow()
})
```

## Workspace (persistência)

O app usa `workspace.mjs` para gravar/ler JSON no userData:

```javascript
// workspace.mjs (simplificado)
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { getWorkspacePaths } from './paths.mjs'

export function readWorkspaceRecord(filename) {
  const filePath = path.join(getWorkspacePaths().root, `${filename}.json`)
  try {
    const data = readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null  // Arquivo inexistente ou corrompido = null
  }
}

export function writeWorkspaceRecord(filename, data) {
  const filePath = path.join(getWorkspacePaths().root, `${filename}.json`)
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
```

**EULA usará:** `readWorkspaceRecord('eula_accepted')` / `writeWorkspaceRecord('eula_accepted', { version, acceptedAt })`

**Arquivo no disco:** `eula_accepted.json` no userData:
- Linux: `~/.config/LouvorJa-PIANO/eula_accepted.json`
- Windows: `%APPDATA%/LouvorJa-PIANO/eula_accepted.json`
- macOS: `~/Library/Application Support/LouvorJA-PIANO/eula_accepted.json`

## electron-builder Config (package.json)

```json
{
  "build": {
    "appId": "com.louvorja.piano",
    "productName": "LouvorJA Piano",
    "directories": { "output": "dist-electron" },
    "files": ["dist/**/*", "electron/**/*"],
    "win": {
      "icon": "build/icon.ico",
      "target": ["nsis"]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
      // >>> ADICIONAR: "license": "docs/LEGAL/EULA.txt" <<<
    },
    "linux": {
      "icon": "build/icon.png",
      "target": ["AppImage"]
    },
    "mac": {
      "icon": "build/icon.icns",
      "target": ["dmg"]
    }
  }
}
```

## Formatos de Distribuição x Mecanismo EULA

| Formato | Plataforma | Installer? | Mecanismo EULA |
|---------|-----------|------------|----------------|
| NSIS | Windows | Sim | Installer license + Runtime dialog |
| AppImage | Linux | Não (mount-and-run) | Runtime dialog apenas |
| DMG | macOS | Não (mount-and-run) | Runtime dialog apenas |

**Conclusão:** Runtime dialog (Task 2-3) cobre TODOS os formatos. NSIS license (Task 4) é camada adicional apenas para Windows.

## Documentos Legais Existentes

| Arquivo | Linhas | Conteúdo |
|---------|--------|----------|
| `docs/LEGAL/README.md` | 101 | Índice e visão geral legal |
| `docs/LEGAL/EULA.md` | 139 | EULA completo v1.0 (PT-BR) |
| `docs/LEGAL/direitos-autorais-musicais.md` | 159 | Análise de direitos autorais musicais (Lei 9.610/98, ECAD) |
| `docs/LEGAL/open-source-compliance.md` | 199 | Compliance de licenças OSS (MIT) |
| `docs/LEGAL/EULA.txt` | — | A CRIAR (plain text do EULA.md para NSIS) |

## Ambiente de Testes

- **Runner:** Vitest (config em `vitest.config.ts`)
- **Pattern:** `electron/__tests__/*.test.mjs`
- **Mocks necessários:** `electron` (app, dialog), `./workspace.mjs` (readWorkspaceRecord, writeWorkspaceRecord)
- **Coverage:** v8 provider, meta de 100% para `eula.mjs`
- **Comando:** `npx vitest run electron/__tests__/eula.test.mjs`

## Dependências Relevantes

```
electron          — runtime main process
electron-builder  — build NSIS/AppImage/DMG
vitest            — testes unitários
vue-router        — router do renderer (não usado no EULA, mas presente)
```

Nenhuma nova dependência deve ser adicionada.

## Colaboradores

- **Ezequias Fonseca** (`@ezequiasfonseca`) — criador/mantenedor, CODEOWNER obrigatório
- **Rafael Zendron** (`@rafaumeu`) — contribuidor (push + triage, sem admin)

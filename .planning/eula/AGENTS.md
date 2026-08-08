# AGENTS: EULA Implementation — LouvorJA Piano

## Stack

- **Runtime:** Electron (main process = Node.js ESM `.mjs`)
- **Dialog API:** `dialog.showMessageBoxSync()` (nativo, síncrono, modal)
- **Persistência:** `workspace.mjs` (`readWorkspaceRecord` / `writeWorkspaceRecord`) → JSON no userData
- **Build:** electron-builder (NSIS para Windows, AppImage para Linux, DMG para macOS)
- **Testes:** Vitest + vi.mock para mockar Electron e workspace.mjs

## Convenções do projeto

- **ESM (.mjs) no electron/** — TODOS os módulos do main process usam `.mjs`, não `.ts` nem `.cjs`. O `electron/main.ts` é um stub inativo de 5 linhas — ignorar.
- **Imports absolutos/relativos** — sem path aliases no main process. Usar `import { x } from './module.mjs'`
- **IPC pattern** — `ipcMain.handle('namespace:action', handler)` no register, `ipcRenderer.invoke('namespace:action')` no preload. Ver `ipc/register.mjs`.
- **Constants centralizadas** — `electron/constants.mjs` tem `APP_USER_DATA_DIR`, `API_BASE_URL`, etc. Nova constante `EULA_VERSION` pode ficar em `eula.mjs` (escopo local) ou em `constants.mjs` se other modules precisarem.
- **Error handling** — try/catch com `console.error('[ipc] namespace:action', error)` é o padrão. Para EULA, errors de leitura devem ser tratados silenciosamente (return false = não aceito).
- **Commits** — usar `--no-verify` (lint-staged local quebrado neste repo)

## O que NÃO fazer

1. **NÃO usar `dialog.showMessageBox()` (async)** — o dialog async permitiria `createWindow()` rodar antes do aceite. Usar SEMPRE `showMessageBoxSync()` que bloqueia o thread.

2. **NÃO ler `EULA.md` do disco em runtime** — em produção (packaged app), o path do arquivo muda. Embutir o texto do EULA como string no módulo, ou usar uma versão resumida com referência ao arquivo.

3. **NÃO usar `fs` diretamente para o aceite** — usar `workspace.mjs` (`readWorkspaceRecord` / `writeWorkspaceRecord`). Isso mantém o aceite no mesmo diretório e formato que o resto do app.

4. **NÃO adicionar flag de bypass para dev** — seria uma brecha legal. O EULA executa em dev e produção.

5. **NÃO criar tela Vue de EULA no renderer** — o dialog nativo no main process é suficiente e mais seguro (bloqueia antes da janela existir).

6. **NÃO usar `app.getPath('userData')` diretamente** — o app já configura `app.setPath('userData', ...)` com `APP_USER_DATA_DIR`. O workspace.mjs já usa o path correto.

## Pitfalls

### 1. Ordem no app.whenReady()
`ensureWorkspaceDirectories()` DEVE rodar antes de `checkEulaAcceptance()`. Se o workspace não existir, `readWorkspaceRecord` pode lançar em vez de retornar null.

### 2. Button order no dialog.showMessageBoxSync
```javascript
buttons: ['Recusar', 'Aceitar']  // índice 0 = Recusar, índice 1 = Aceitar
cancelId: 0   // ESC ou X = Recusar
defaultId: 1  // Enter = Aceitar
```
Se inverter a ordem, inverter também cancelId/defaultId. O resultado `=== 1` significa "Aceitar".

### 3. NSIS license path
O campo `"license"` em `build.nsis` deve ser relativo à raiz do projeto (onde `package.json` está). Não usar path absoluto nem `~`.

### 4. Vitest mock de Electron
O Electron não pode ser importado em ambiente de teste (precisa do runtime Electron). Mockar TODOS os imports:
```javascript
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/mock') },
  dialog: { showMessageBoxSync: vi.fn() }
}))
vi.mock('./workspace.mjs', () => ({
  readWorkspaceRecord: vi.fn(),
  writeWorkspaceRecord: vi.fn()
}))
```

### 5. EULA_VERSION como string
Usar SEMPRE string (`'1.0'`), não número (`1.0`). Comparação de float pode ter problemas de precisão. `'1.0' !== '1.00'` também — manter formato consistente (sem trailing zeros).

### 6. app.whenReady() já retorna Promise
O callback `.then()` precisa virar `async` para usar `await checkEulaAcceptance()`. Sem o `async`, o `app.quit()` dentro do `checkEulaAcceptance` pode não bloquear a execução restante.

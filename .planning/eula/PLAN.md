# PLAN: Apresentação e Aceite de EULA — LouvorJA Piano

Referência: `SPEC.md` neste diretório.

**Princípio norteador:** TDD incremental. Cada task entrega um teste que falha (RED), depois a implementação mínima para passar (GREEN). Começamos com o esqueleto mais simples possível e expandimos. O repo hoje tem ZERO testes — este plano introduz a infra de testes do Electron main process como efeito colateral.

---

## Fase 0: Infra de testes (pré-requisito)

O projeto nao tem vitest nem nenhum teste. Precisamos instalar e configurar antes de escrever a primeira linha de EULA.

**Instalar:**
```
npm install -D vitest
```

**Criar `vitest.config.ts`** (ou adicionar a chave `test` no `vite.config.ts` existente):
```typescript
// Adicionar dentro de defineConfig no vite.config.ts:
test: {
  include: ['electron/__tests__/**/*.test.mjs'],
  pool: 'forks',
},
```

Usar `pool: 'forks'` (nao threads) porque os testes do Electron main process importam modulos nativos.

**Verificação:**
- `npx vitest run` executa sem erro (mesmo que sem testes ainda)
- `npm test` funciona se adicionarmos script `"test": "vitest run"` no package.json

---

## Task 1: EULA.txt plain text (3 idiomas)

**Arquivos:**
- `docs/LEGAL/eula/pt-BR.txt` — CRIAR (converter do EULA.md existente)
- `docs/LEGAL/eula/en.txt` — CRIAR (tradução)
- `docs/LEGAL/eula/es.txt` — CRIAR (traducción)
- `docs/LEGAL/EULA.txt` — CRIAR (copia de pt-BR.txt para NSIS)

**O que fazer:**
Converter `docs/LEGAL/EULA.md` para plain text. Remover sintaxe Markdown (`#`, `**`, `---`, links). Manter numeração de seções e texto idêntico. NSIS exibe RTF/TXT na página de licença.

As traduções EN e ES são necessárias para o i18n (RNF-05). Devem ser revisadas juridicamente antes do release.

**Verificação:**
- `file docs/LEGAL/eula/pt-BR.txt` → "UTF-8 text"
- Arquivo nao contem `#`, `**`, `[`, `]`, backticks
- `wc -l` tem pelo menos 100 linhas de conteúdo

---

## Task 2: Skeleton `eula.mjs` + primeiro teste (RED → GREEN)

**Objetivo:** Criar o modulo vazio com assinaturas de funções, e o primeiro teste que falha.

**Arquivo:** `electron/eula.mjs` (NOVO)

```javascript
import { readWorkspaceRecord, writeWorkspaceRecord } from './workspace.mjs'

export const EULA_VERSION = '1.0'
const EULA_RECORD_FILENAME = 'eula_accepted'

/**
 * Verifica se o usuário já aceitou a versão atual do EULA.
 * @returns {boolean}
 */
export function isEulaAccepted() {
  const record = readWorkspaceRecord(EULA_RECORD_FILENAME)
  if (!record) return false
  return record.version === EULA_VERSION
}
```

**Teste:** `electron/__tests__/eula.test.mjs` (NOVO)

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock workspace ANTES de importar eula.mjs
vi.mock('../workspace.mjs', () => ({
  readWorkspaceRecord: vi.fn(),
  writeWorkspaceRecord: vi.fn(),
}))

import { isEulaAccepted, EULA_VERSION } from '../eula.mjs'
import { readWorkspaceRecord } from '../workspace.mjs'

describe('isEulaAccepted', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna false quando workspace vazio (sem record)', () => {
    readWorkspaceRecord.mockReturnValue(null)
    expect(isEulaAccepted()).toBe(false)
  })

  it('retorna true quando version === EULA_VERSION', () => {
    readWorkspaceRecord.mockReturnValue({ version: EULA_VERSION, acceptedAt: '2024-01-01T00:00:00Z' })
    expect(isEulaAccepted()).toBe(true)
  })
})
```

**Fluxo TDD:**
1. Escrever teste → `npx vitest run` → RED (modulo nao existe)
2. Criar `eula.mjs` com `isEulaAccepted()` → `npx vitest run` → GREEN
3. Refatorar se necessário

**Verificação:**
- 2 testes passando
- `isEulaAccepted` retorna boolean correto nos 2 casos

---

## Task 3: Expandir `isEulaAccepted` — casos de borda (RED → GREEN)

**Objetivo:** Adicionar testes para os casos de borda antes de implementar.

**Teste:** Adicionar a `eula.test.mjs`:

```javascript
  it('retorna false quando version !== EULA_VERSION (EULA atualizado)', () => {
    readWorkspaceRecord.mockReturnValue({ version: '0.9', acceptedAt: '2024-01-01T00:00:00Z' })
    expect(isEulaAccepted()).toBe(false)
  })

  it('retorna false quando record corrompido (JSON inválido)', () => {
    readWorkspaceRecord.mockReturnValue({ junk: 'data' })
    expect(isEulaAccepted()).toBe(false)
  })

  it('retorna false quando record null', () => {
    readWorkspaceRecord.mockReturnValue(null)
    expect(isEulaAccepted()).toBe(false)
  })
```

**Implementação:** A implementação de Task 2 ja cobre esses casos (`record.version === EULA_VERSION` retorna false para qualquer valor diferente). Os testes devem passar imediatamente — confirmam que o codigo esta correto.

**Fluxo TDD:**
1. Escrever 3 testes novos → podem passar de imediato (GREEN) ou expor bug
2. Se algum falhar, corrigir `isEulaAccepted()`

**Verificação:**
- 5 testes passando no total

---

## Task 4: `acceptEula()` (RED → GREEN)

**Teste:** Adicionar a `eula.test.mjs`:

```javascript
import { acceptEula } from '../eula.mjs'
import { writeWorkspaceRecord } from '../workspace.mjs'

describe('acceptEula', () => {
  beforeEach(() => vi.clearAllMocks())

  it('grava { version: EULA_VERSION, acceptedAt: ISO string }', () => {
    acceptEula()
    expect(writeWorkspaceRecord).toHaveBeenCalledTimes(1)
    expect(writeWorkspaceRecord).toHaveBeenCalledWith(
      'eula_accepted',
      expect.objectContaining({ version: EULA_VERSION })
    )
  })

  it('acceptedAt é uma data ISO válida', () => {
    acceptEula()
    const call = writeWorkspaceRecord.mock.calls[0]
    const acceptedAt = call[1].acceptedAt
    expect(() => new Date(acceptedAt).toISOString()).not.toThrow()
    expect(new Date(acceptedAt).getFullYear()).toBeGreaterThanOrEqual(2024)
  })
})
```

**Implementação:** Adicionar a `eula.mjs`:

```javascript
export function acceptEula() {
  writeWorkspaceRecord(EULA_RECORD_FILENAME, {
    version: EULA_VERSION,
    acceptedAt: new Date().toISOString(),
  })
}
```

**Verificação:**
- 7 testes passando

---

## Task 5: `getEulaText(locale)` — i18n (RED → GREEN)

**Objetivo:** Carregar o texto do EULA no idioma correto.

**Teste:** Adicionar a `eula.test.mjs`:

```javascript
import { getEulaText } from '../eula.mjs'
import { readFileSync } from 'node:fs'

// Mock fs
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}))

describe('getEulaText', () => {
  beforeEach(() => vi.clearAllMocks())

  it('carrega pt-BR quando locale = pt-BR', () => {
    readFileSync.mockReturnValue('EULA em português')
    const text = getEulaText('pt-BR')
    expect(text).toBe('EULA em português')
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('pt-BR.txt'),
      'utf8'
    )
  })

  it('carrega en quando locale = en-US (mapeia para en)', () => {
    readFileSync.mockReturnValue('EULA in English')
    const text = getEulaText('en-US')
    expect(text).toBe('EULA in English')
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('en.txt'),
      'utf8'
    )
  })

  it('fallback para pt-BR quando locale desconhecido', () => {
    readFileSync.mockReturnValue('EULA em português')
    const text = getEulaText('ja-JP')
    expect(text).toBe('EULA em português')
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('pt-BR.txt'),
      'utf8'
    )
  })
})
```

**Implementação:** Adicionar a `eula.mjs`:

```javascript
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const EULA_DIR = path.join(__dirname, '..', 'docs', 'LEGAL', 'eula')

const LOCALE_MAP = {
  'pt': 'pt-BR',
  'pt-BR': 'pt-BR',
  'pt-PT': 'pt-BR',
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'es': 'es',
  'es-ES': 'es',
  'es-MX': 'es',
}

/**
 * Carrega o texto do EULA no idioma detectado.
 * @param {string} locale - ex: 'pt-BR', 'en-US', 'es-ES'
 * @returns {string}
 */
export function getEulaText(locale) {
  const mapped = LOCALE_MAP[locale] || 'pt-BR'
  const filePath = path.join(EULA_DIR, `${mapped}.txt`)
  return readFileSync(filePath, 'utf8')
}
```

**Verificação:**
- 10 testes passando
- Mapeamento de locale funciona para os 3 idiomas
- Fallback retorna pt-BR

---

## Task 6: `showEulaDialog()` com i18n (RED → GREEN)

**Objetivo:** Dialog nativo com texto no idioma do sistema.

**Teste:** Adicionar a `eula.test.mjs`:

```javascript
import { showEulaDialog } from '../eula.mjs'

// Mock electron
vi.mock('electron', () => ({
  app: { getLocale: vi.fn(() => 'pt-BR') },
  dialog: { showMessageBoxSync: vi.fn() },
}))

import { app, dialog } from 'electron'

describe('showEulaDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna true quando usuário clica Aceitar (índice 1)', () => {
    vi.mocked(getEulaText).mockReturnValue('EULA texto') // ou mockar readFileSync
    dialog.showMessageBoxSync.mockReturnValue(1)
    expect(showEulaDialog()).toBe(true)
  })

  it('retorna false quando usuário clica Recusar (índice 0)', () => {
    dialog.showMessageBoxSync.mockReturnValue(0)
    expect(showEulaDialog()).toBe(false)
  })

  it('usa locale do app para selecionar idioma', () => {
    vi.mocked(app.getLocale).mockReturnValue('en-US')
    dialog.showMessageBoxSync.mockReturnValue(1)
    showEulaDialog()
    expect(app.getLocale).toHaveBeenCalled()
  })
})
```

**Implementação:** Adicionar a `eula.mjs`:

```javascript
import { app, dialog } from 'electron'

const BUTTONS = {
  'pt-BR': { accept: 'Aceitar', decline: 'Recusar', title: 'Licença de Uso — LouvorJA Piano' },
  'en':    { accept: 'Accept', decline: 'Decline', title: 'License Agreement — LouvorJA Piano' },
  'es':    { accept: 'Aceptar', decline: 'Rechazar', title: 'Acuerdo de Licencia — LouvorJA Piano' },
}

/**
 * Mostra dialog nativo de EULA no idioma do sistema.
 * @returns {boolean} true se aceito, false se recusado
 */
export function showEulaDialog() {
  const locale = app.getLocale()
  const mapped = LOCALE_MAP[locale] || 'pt-BR'
  const btns = BUTTONS[mapped]
  const eulaText = getEulaText(locale)

  const result = dialog.showMessageBoxSync({
    type: 'none',
    title: btns.title,
    message: btns.title,
    detail: eulaText,
    buttons: [btns.decline, btns.accept],
    cancelId: 0,
    defaultId: 1,
  })

  return result === 1
}
```

**Verificação:**
- 13 testes passando
- Dialog usa idioma correto via `app.getLocale()`
- Botoes traduzidos

---

## Task 7: `checkEulaAcceptance()` orquestração (RED → GREEN)

**Objetivo:** Função que orquestra tudo — chamada antes de `createWindow()`.

**Teste:** Adicionar a `eula.test.mjs`:

```javascript
import { checkEulaAcceptance } from '../eula.mjs'

describe('checkEulaAcceptance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna true imediatamente se ja aceito (nao mostra dialog)', () => {
    readWorkspaceRecord.mockReturnValue({ version: EULA_VERSION, acceptedAt: '2024-01-01' })
    dialog.showMessageBoxSync.mockReturnValue(1)
    
    const result = checkEulaAcceptance()
    
    expect(result).toBe(true)
    expect(dialog.showMessageBoxSync).not.toHaveBeenCalled()
  })

  it('mostra dialog se nao aceito e retorna true + grava se aceitar', () => {
    readWorkspaceRecord.mockReturnValue(null)
    dialog.showMessageBoxSync.mockReturnValue(1)
    
    const result = checkEulaAcceptance()
    
    expect(result).toBe(true)
    expect(dialog.showMessageBoxSync).toHaveBeenCalledTimes(1)
    expect(writeWorkspaceRecord).toHaveBeenCalledWith(
      'eula_accepted',
      expect.objectContaining({ version: EULA_VERSION })
    )
  })

  it('retorna false se dialog recusado (nao grava nada)', () => {
    readWorkspaceRecord.mockReturnValue(null)
    dialog.showMessageBoxSync.mockReturnValue(0)
    
    const result = checkEulaAcceptance()
    
    expect(result).toBe(false)
    expect(writeWorkspaceRecord).not.toHaveBeenCalled()
  })
})
```

**Implementação:** Adicionar a `eula.mjs`:

```javascript
/**
 * Orquestra o check completo. Chamar antes de createWindow().
 * @returns {boolean} true se pode prosseguir, false se deve sair
 */
export function checkEulaAcceptance() {
  if (isEulaAccepted()) return true

  const accepted = showEulaDialog()
  if (!accepted) return false

  acceptEula()
  return true
}
```

**Verificação:**
- 16 testes passando
- Coverage de `eula.mjs` proximo de 100%
- Orquestração completa

---

## Task 8: Integrar no `main.mjs`

**Arquivo:** `electron/main.mjs` (MODIFICAR)

**O que fazer:**

1. Adicionar import:
```javascript
import { checkEulaAcceptance } from './eula.mjs'
```

2. Modificar `app.whenReady().then(...)`:

**ANTES:**
```javascript
app.whenReady().then(() => {
  ensureLinuxTaskbarIntegration()
  ensureWorkspaceDirectories()
  registerWorkspaceIpc()
  registerWindowIpc(() => mainWindow)
  registerLocalFileProtocol()
  registerYoutubeEmbedHeaders()
  createWindow()
})
```

**DEPOIS:**
```javascript
app.whenReady().then(() => {
  ensureLinuxTaskbarIntegration()
  ensureWorkspaceDirectories()

  // EULA check — bloqueia antes de criar qualquer janela
  const eulaOk = checkEulaAcceptance()
  if (!eulaOk) {
    app.quit()
    return
  }

  registerWorkspaceIpc()
  registerWindowIpc(() => mainWindow)
  registerLocalFileProtocol()
  registerYoutubeEmbedHeaders()
  createWindow()
})
```

**Nota:** `checkEulaAcceptance()` é sincrono (usa `showMessageBoxSync`), nao precisa de `async/await`.

**Verificação:**
- App inicia normalmente quando EULA ja aceito
- App fecha quando EULA recusado
- App exibe dialog na primeira execução

---

## Task 9: Campo `license` no NSIS config

**Arquivo:** `package.json` (MODIFICAR key `build.nsis`)

```json
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "license": "docs/LEGAL/EULA.txt"
}
```

**Verificação:**
- Build NSIS exibe pagina de licença
- `docs/LEGAL/EULA.txt` existe e é plain text

---

## Resumo da progressão TDD

```
Fase 0: Instalar vitest + config          (infra, sem teste)
Task 1: Criar EULA.txt x3 idiomas          (dados, sem teste)
Task 2: isEulaAccepted + 2 testes          (RED→GREEN, esqueleto)
Task 3: isEulaAccepted + 3 testes borda    (GREEN, confirmar corretude)
Task 4: acceptEula + 2 testes              (RED→GREEN, escrita)
Task 5: getEulaText + 3 testes i18n        (RED→GREEN, locale)
Task 6: showEulaDialog + 3 testes          (RED→GREEN, dialog+mock electron)
Task 7: checkEulaAcceptance + 3 testes     (RED→GREEN, orquestração)
Task 8: Integrar main.mjs                  (sem teste novo, verificaçao manual)
Task 9: NSIS license config                (config, sem teste)
```

A cada task o modulo cresce 1 função de cada vez, sempre com teste primeiro ou junto. 16 testes no total ao final.

---

## Estimativa

| Task | Esforço |
|------|---------|
| Fase 0: Infra vitest | 10 min |
| Task 1: EULA.txt x3 | 30 min |
| Task 2: isEulaAccepted skeleton + 2 testes | 20 min |
| Task 3: 3 testes de borda | 10 min |
| Task 4: acceptEula + 2 testes | 15 min |
| Task 5: getEulaText + 3 testes i18n | 25 min |
| Task 6: showEulaDialog + 3 testes | 25 min |
| Task 7: checkEulaAcceptance + 3 testes | 20 min |
| Task 8: Integrar main.mjs | 10 min |
| Task 9: NSIS config | 5 min |
| **Total** | **~3h** |

---

## Riscos

1. **vi.mock hoisting** — `vi.mock` é hoisted para o topo do arquivo pelo Vitest. Se o mock de `workspace.mjs` nao estiver correto, o import de `eula.mjs` falha. Mitigação: sempre declarar todos os mocks antes dos imports.

2. **Electron import em ambiente de teste** — Importar de `electron` fora do runtime do Electron lança erro. Mitigação: mockar `electron` com `vi.mock('electron', ...)` antes de qualquer import que dependa dele.

3. **readWorkspaceRecord usa criptografia (.bin)** — O workspace gravado é obfuscado/criptografado. O EULA grava via `writeWorkspaceRecord` que ja faz a criptografia. Para testes, mockamos `workspace.mjs` inteiro — nao testamos a criptografia (isso é responsabilidade do workspace, nao do EULA).

4. **Path dos arquivos .txt em produção** — Em build de produção (asar), os arquivos de `docs/` podem nao estar acessíveis via `__dirname`. Alternativa: embutir o texto do EULA como string no modulo, ou copiar os .txt para `resources/` no build. Decidir na Task 5.

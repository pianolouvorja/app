/**
 * Hotkey global de alternância Operador ↔ Projeção (Ctrl+Alt+P).
 *
 * Problema (30/08): com UM monitor, a janela de projeção fullscreen +
 * setAlwaysOnTop('screen-saver') cobre o app do operador permanentemente —
 * o usuário tinha que fechar o aplicativo para voltar. A hotkey global
 * funciona independente de foco, então o operador sempre consegue alternar.
 *
 * ESC na janela de projeção continua encerrando (comportamento existente);
 * esta hotkey só alterna visibilidade operador↔projeção sem encerrar nada.
 *
 * SINGLETON com providers: há DOIS fluxos de janela de projeção —
 * (a) video/pdf/ppt/site via web-projection.mjs e (b) hinos/slides via
 * window.open no main.mjs. Só PODE existir UM globalShortcut.register por
 * atalho (o segundo retorna false), então o registro é único e as janelas
 * vêm de providers registrados por cada fluxo.
 */

import { appendFileSync } from 'node:fs'
function hlog(msg) {
  try { appendFileSync('/tmp/hotkey-debug.log', new Date().toISOString().slice(11,19) + ' ' + msg + '\n') } catch {}
}

export const PROJECTION_HOTKEY = 'Control+Alt+P'

const windowProviders = new Set()

/** Registra uma fonte de janelas de projeção (retorna array de BrowserWindow). */
export function addProjectionWindowProvider(provider) {
  windowProviders.add(provider)
}

export function removeProjectionWindowProvider(provider) {
  windowProviders.delete(provider)
}

/** Todas as janelas de projeção vivas de todos os fluxos. */
export function collectAliveProjectionWindows() {
  const alive = []
  for (const provider of windowProviders) {
    try {
      for (const win of provider() ?? []) {
        if (win && !win.isDestroyed()) alive.push(win)
      }
    } catch {
      /* provider de fluxo não anexado */
    }
  }
  return alive
}

/**
 * Decide a ação do toggle a partir do estado atual das janelas de projeção
 * e da janela do operador. Função PURA (testável).
 *
 * @param {{anyAlive: boolean, anyVisible: boolean, operatorVisible: boolean}} state
 * @returns {'show-operator' | 'show-projection' | 'none'}
 */
export function decideToggleAction({ anyAlive, anyVisible, operatorVisible }) {
  if (!anyAlive) return 'none'
  // Projeção visível (ou nenhum dos dois visíveis — ex.: operador minimizado
  // e projeção em outra área) → operador assume.
  if (anyVisible || !operatorVisible) return 'show-operator'
  return 'show-projection'
}

let state = null

function getController(deps) {
  if (state) return state
  const { globalShortcut } = deps
  state = {
    registered: false,
    ensureRegistered() {
      if (state.registered) return true
      try {
        const ok = globalShortcut.register(PROJECTION_HOTKEY, () => toggle(deps))
        state.registered = ok
        if (!ok) { hlog('FALHA register'); console.warn('[projection-hotkey] falha ao registrar', PROJECTION_HOTKEY, '(atalho em uso por outro app?)') }
        else { hlog('REGISTRADA ok'); console.info('[projection-hotkey] registrada:', PROJECTION_HOTKEY) }
        return ok
      } catch (error) {
        console.error('[projection-hotkey] erro ao registrar', error)
        return false
      }
    },
    unregister() {
      if (!state.registered) return
      try {
        globalShortcut.unregister(PROJECTION_HOTKEY)
        state.registered = false
        hlog('LIBERADA'); console.info('[projection-hotkey] liberada:', PROJECTION_HOTKEY)
      } catch (error) {
        console.error('[projection-hotkey] erro ao liberar', error)
      }
    },
    isRegistered: () => state.registered,
  }
  return state
}

function toggle(deps) {
  try {
    const alive = collectAliveProjectionWindows()
    const operator = deps.getOperatorWindow?.()
    const snap = {
      anyAlive: alive.length > 0,
      anyVisible: alive.some((win) => win.isVisible()),
      operatorVisible: Boolean(operator && !operator.isDestroyed() && operator.isVisible()),
    }
    const action = decideToggleAction(snap)
    hlog('TOGGLE ' + action); console.info('[projection-hotkey] toggle →', action, JSON.stringify(snap))

    if (action === 'show-operator') {
      for (const win of alive) win.hide()
      if (operator && !operator.isDestroyed()) {
        if (operator.isMinimized?.()) operator.restore()
        operator.show()
        operator.focus()
      }
    } else if (action === 'show-projection') {
      for (const win of alive) {
        win.show()
        win.focus()
      }
    }
  } catch (error) {
    console.error('[projection-hotkey] erro no toggle', error)
  }
}

/**
 * Inicializa o singleton (uma única vez, no boot do main). Idempotente.
 * @param {{ globalShortcut: import('electron').GlobalShortcut, getOperatorWindow: () => import('electron').BrowserWindow | null }} deps
 */
export function initProjectionHotkey(deps) {
  hlog('initProjectionHotkey chamado')
  getController(deps)
  hlog('controller criado')
}

/** Registra a hotkey (idempotente). Chamar quando qualquer projeção nasce. */
export function ensureProjectionHotkey() {
  hlog('ensureProjectionHotkey chamado; state=' + (state ? 'ok' : 'NULL'))
  if (!state) {
    console.warn('[projection-hotkey] initProjectionHotkey() não chamado — ignorando')
    return
  }
  state.ensureRegistered()
}

/** Libera a hotkey (idempotente). Chamar quando TODA projeção fecha. */
export function releaseProjectionHotkey() {
  if (!state) return
  state.unregister()
}

export function isProjectionHotkeyRegistered() {
  return state?.isRegistered() ?? false
}

/** Hint de atalhos da projeção. Função pura (testável). */
export function buildShortcutHintLines() {
  return [
    { key: 'ESC', label: 'encerra a projeção' },
    { key: 'Ctrl+Alt+P', label: 'alterna com a tela do operador' },
  ]
}

/**
 * Hint de atalhos exibido nos primeiros 6s de cada load de janela de
 * projeção (spec 30/08 — descoberta). JS puro: injeta DOM no documento
 * da projeção via executeJavaScript. Usado pelos DOIS fluxos de janela.
 */
export function injectProjectionShortcutHint(win) {
  if (!win || win.isDestroyed()) return
  const hintJs = `(() => {
    try {
      if (document.getElementById('__lj_hotkey_hint')) return
      const el = document.createElement('div')
      el.id = '__lj_hotkey_hint'
      el.textContent = 'ESC encerra a projeção  ·  Ctrl+Alt+P alterna com a tela do operador'
      el.style.cssText = 'position:fixed;right:2vmin;bottom:2vmin;z-index:2147483000;' +
        'font:500 13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;color:#fff;' +
        'background:rgba(10,14,26,0.72);padding:8px 14px;border-radius:10px;' +
        'box-shadow:0 6px 20px rgba(0,0,0,0.4);opacity:0;transition:opacity .6s ease;' +
        'pointer-events:none;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis'
      ;(document.body || document.documentElement).appendChild(el)
      requestAnimationFrame(() => { el.style.opacity = '1' })
      setTimeout(() => {
        el.style.opacity = '0'
        setTimeout(() => { el.remove() }, 800)
      }, 6000)
    } catch (_) {}
  })()`
  try {
    void win.webContents.executeJavaScript(hintJs).catch(() => {})
  } catch {
    /* ignore */
  }
}

/** A URL é de popup de projeção do app (hinos/slides via window.open)? */
export function isProjectionPopupWindow(url) {
  if (typeof url !== 'string') return false
  return url.includes('#/popup') || /\/popup(\?|$)/.test(url)
}

/** Reset do singleton — SOMENTE para testes (módulo ESM é cacheado entre testes). */
export function __resetProjectionHotkeyForTests() {
  state = null
  windowProviders.clear()
}



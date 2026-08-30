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
 */

const HOTKEY = 'Control+Alt+P'

/**
 * Coleção as janelas de projeção vivas (fonte + espelhos + shields).
 * @param {{getSource: () => any, getMirrors: () => any[], getShields: () => any[]}} windows
 * @returns {any[]} janelas vivas (não destruídas)
 */
export function collectAliveProjectionWindows(windows) {
  const alive = []
  const source = windows.getSource()
  if (source && !source.isDestroyed()) alive.push(source)
  for (const win of windows.getMirrors()) {
    if (win && !win.isDestroyed()) alive.push(win)
  }
  for (const shield of windows.getShields()) {
    if (shield && !shield.isDestroyed()) alive.push(shield)
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

/**
 * Registra/gerencia a hotkey global enquanto houver projeção viva.
 * Mantido num módulo próprio para poder unregister em TODOS os caminhos de
 * fechamento (closeWebProjectionWindows, will-quit) sem duplicar lógica.
 */
export function createProjectionHotkeyController(deps) {
  const {
    globalShortcut,
    BrowserWindow,
    getSource,
    getMirrors,
    getShields,
    getOperatorWindow,
  } = deps

  let registered = false

  function hasLiveProjection() {
    return collectAliveProjectionWindows({
      getSource,
      getMirrors,
      getShields,
    }).length > 0
  }

  function ensureRegistered() {
    if (registered) return true
    try {
      const ok = globalShortcut.register(HOTKEY, () => toggle())
      registered = ok
      if (!ok) console.warn('[projection-hotkey] falha ao registrar', HOTKEY, '(atalho em uso por outro app?)')
      else console.info('[projection-hotkey] registrada:', HOTKEY)
      return ok
    } catch (error) {
      console.error('[projection-hotkey] erro ao registrar', error)
      return false
    }
  }

  function unregister() {
    if (!registered) return
    try {
      globalShortcut.unregister(HOTKEY)
      registered = false
      console.info('[projection-hotkey] liberada:', HOTKEY)
    } catch (error) {
      console.error('[projection-hotkey] erro ao liberar', error)
    }
  }

  function toggle() {
    try {
      const alive = collectAliveProjectionWindows({ getSource, getMirrors, getShields })
      const operator = getOperatorWindow?.()
      const state = {
        anyAlive: alive.length > 0,
        anyVisible: alive.some((win) => win.isVisible()),
        operatorVisible: Boolean(operator && !operator.isDestroyed() && operator.isVisible()),
      }
      const action = decideToggleAction(state)
      console.info('[projection-hotkey] toggle →', action, JSON.stringify(state))

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

  return { ensureRegistered, unregister, toggle, isRegistered: () => registered, HOTKEY }
}

/** Ação para o hint exibido na projeção. Função pura (testável). */
export function buildShortcutHintLines(platform) {
  const toggleKey = 'Ctrl+Alt+P'
  return [
    { key: 'ESC', label: 'encerra a projeção' },
    { key: toggleKey, label: 'alterna com a tela do operador' },
  ]
}

/**
 * Seleção de monitor e bounds das janelas de projeção.
 *
 * No Linux, `setFullScreen(true)` é EWMH (_NET_WM_STATE_FULLSCREEN): o window
 * manager decide o monitor e vários WMs (Cinnamon, GNOME, XFCE) ignoram o
 * posicionamento pré-show, jogando o fullscreen no monitor primário. Por isso
 * a projeção no Linux usa a mesma estratégia do Windows: janela borderless
 * com bounds do monitor alvo + alwaysOnTop (fullscreen "fake"), imune ao
 * comportamento do WM. Bug: "não projeta no segundo monitor" — v1.8.9+.
 */

const WINDOWED_WIDTH = 800
const WINDOWED_HEIGHT = 600

/**
 * Resolve o display alvo da projeção.
 * @param {{ monitorId?: number | null, displays: Array<import('electron').Display>, primary: import('electron').Display }} args
 * @returns {import('electron').Display}
 */
export function resolveProjectionDisplay({ monitorId, displays, primary }) {
  if (monitorId != null && Number.isFinite(monitorId)) {
    const found = displays.find((display) => display.id === monitorId)
    if (found) return found
  }
  return primary
}

/**
 * Bounds da janela de projeção.
 * - fullscreen: bounds totais do monitor alvo (cobre barra de tarefas).
 * - janela com monitor explícito: 800x600 centrado no workArea do monitor.
 * - janela sem monitor explícito: null (posição livre, o WM decide).
 * @param {{ fullscreen: boolean, monitorId?: number | null, displays: Array<import('electron').Display>, primary: import('electron').Display }} args
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
export function buildProjectionWindowBounds({ fullscreen, monitorId, displays, primary }) {
  const target = resolveProjectionDisplay({ monitorId, displays, primary })

  if (fullscreen) {
    return {
      x: target.bounds.x,
      y: target.bounds.y,
      width: target.bounds.width,
      height: target.bounds.height,
    }
  }

  if (monitorId == null || !Number.isFinite(monitorId)) return null

  const work = target.workArea
  return {
    x: work.x + Math.round((work.width - WINDOWED_WIDTH) / 2),
    y: work.y + Math.round((work.height - WINDOWED_HEIGHT) / 2),
    width: WINDOWED_WIDTH,
    height: WINDOWED_HEIGHT,
  }
}

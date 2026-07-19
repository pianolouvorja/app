import { app, screen } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_WIDTH = 1440
const DEFAULT_HEIGHT = 900
const MIN_VISIBLE = 64

function stateFilePath() {
  return path.join(app.getPath('userData'), 'window-state.json')
}

/**
 * @typedef {{ x: number, y: number, width: number, height: number, isMaximized?: boolean }} WindowState
 */

/** @returns {WindowState | null} */
function readState() {
  try {
    const raw = fs.readFileSync(stateFilePath(), 'utf8')
    const data = JSON.parse(raw)
    if (
      typeof data?.x !== 'number' ||
      typeof data?.y !== 'number' ||
      typeof data?.width !== 'number' ||
      typeof data?.height !== 'number'
    ) {
      return null
    }
    return {
      x: Math.round(data.x),
      y: Math.round(data.y),
      width: Math.round(data.width),
      height: Math.round(data.height),
      isMaximized: Boolean(data.isMaximized),
    }
  } catch {
    return null
  }
}

/** @param {WindowState} state */
function writeState(state) {
  try {
    fs.writeFileSync(stateFilePath(), JSON.stringify(state, null, 2), 'utf8')
  } catch (error) {
    console.error('[window-state] falha ao salvar', error)
  }
}

/**
 * Garante que pelo menos MIN_VISIBLE px da janela fiquem em algum monitor.
 * @param {WindowState} state
 * @returns {WindowState | null}
 */
function ensureOnScreen(state) {
  const displays = screen.getAllDisplays()
  if (displays.length === 0) return null

  const overlaps = displays.some((display) => {
    const { x, y, width, height } = display.workArea
    const overlapX = Math.max(
      0,
      Math.min(state.x + state.width, x + width) - Math.max(state.x, x),
    )
    const overlapY = Math.max(
      0,
      Math.min(state.y + state.height, y + height) - Math.max(state.y, y),
    )
    return overlapX >= MIN_VISIBLE && overlapY >= MIN_VISIBLE
  })

  if (overlaps) return state

  // Monitor desconectado / rearranjado — centra no primário
  const primary = screen.getPrimaryDisplay().workArea
  return {
    x: Math.round(primary.x + (primary.width - state.width) / 2),
    y: Math.round(primary.y + (primary.height - state.height) / 2),
    width: Math.min(state.width, primary.width),
    height: Math.min(state.height, primary.height),
    isMaximized: false,
  }
}

/**
 * Carrega bounds salvos (ou defaults) para criar a BrowserWindow.
 * @returns {{ x?: number, y?: number, width: number, height: number, isMaximized: boolean }}
 */
export function loadWindowState() {
  const saved = readState()
  if (!saved) {
    return {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      isMaximized: false,
    }
  }

  const safe = ensureOnScreen({
    ...saved,
    width: Math.max(saved.width, 1024),
    height: Math.max(saved.height, 640),
  })

  if (!safe) {
    return {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      isMaximized: false,
    }
  }

  return safe
}

/**
 * Persiste posição/tamanho/maximizado e reage a move/resize/close.
 * @param {import('electron').BrowserWindow} win
 * @param {{ isMaximized?: boolean }} initial
 */
export function trackWindowState(win, initial = {}) {
  /** @type {WindowState} */
  let state = {
    x: win.getBounds().x,
    y: win.getBounds().y,
    width: win.getBounds().width,
    height: win.getBounds().height,
    isMaximized: Boolean(initial.isMaximized),
  }

  const persist = () => {
    if (win.isDestroyed()) return

    const maximized = win.isMaximized()
    const fullScreen = win.isFullScreen()

    if (!maximized && !fullScreen && !win.isMinimized()) {
      const bounds = win.getBounds()
      state = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: false,
      }
    } else {
      state = {
        ...state,
        isMaximized: maximized,
      }
    }

    writeState(state)
  }

  // Debounce leve para move/resize contínuos
  let timer = null
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(persist, 200)
  }

  win.on('resize', schedule)
  win.on('move', schedule)
  win.on('maximize', persist)
  win.on('unmaximize', persist)
  win.on('close', persist)

  // maximize é aplicado em main.mjs no ready-to-show
}

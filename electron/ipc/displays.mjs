import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { BrowserWindow, ipcMain, screen } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IDENTIFY_OVERLAY_HTML = path.join(__dirname, '../player/identify-overlay.html')

/** Duração do overlay de identificação (ms). */
const IDENTIFY_DURATION_MS = 3000

function mapDisplay(display, primaryId) {
  return {
    id: display.id,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    isPrimary: display.id === primaryId,
  }
}

function listSystemDisplays() {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((display) => mapDisplay(display, primaryId))
}

/**
 * Overlay fullscreen por monitor — layout Stitch `docs/stitch/identifyScreen`.
 * @param {Electron.Display} display
 * @param {string} label
 */
function openIdentifyOverlay(display, label) {
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    backgroundColor: '#131313',
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.setIgnoreMouseEvents(true)
  win.setMenuBarVisibility(false)

  const overlayUrl = new URL(pathToFileURL(IDENTIFY_OVERLAY_HTML).href)
  overlayUrl.searchParams.set('n', String(label))

  void win.loadURL(overlayUrl.href)

  setTimeout(() => {
    if (!win.isDestroyed()) win.close()
  }, IDENTIFY_DURATION_MS)
}

export function registerDisplayIpc() {
  ipcMain.handle('displays:list', () => {
    try {
      return listSystemDisplays()
    } catch (error) {
      console.error('[ipc] displays:list', error)
      return []
    }
  })

  ipcMain.handle('displays:identify', () => {
    try {
      const displays = screen.getAllDisplays()
      displays.forEach((display, index) => {
        openIdentifyOverlay(display, String(index + 1))
      })
      return true
    } catch (error) {
      console.error('[ipc] displays:identify', error)
      return false
    }
  })
}

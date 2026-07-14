import { app, BrowserWindow, screen, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { APP_PRODUCT_NAME } from './constants.mjs'
import { registerWorkspaceIpc } from './ipc/register.mjs'
import { ensureWorkspaceDirectories } from './paths.mjs'
import { registerLocalFileProtocol, registerLocalScheme } from './protocol.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = Boolean(VITE_DEV_SERVER_URL)
const PRELOAD_PATH = path.join(__dirname, 'preload.mjs')

registerLocalScheme()

/** Garante pasta userData = "Central Adoração" (independente do name do package.json). */
app.setName(APP_PRODUCT_NAME)
app.setPath('userData', path.join(app.getPath('appData'), APP_PRODUCT_NAME))

/** Chromium não permite root sem sandbox (dev containers / CI) */
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  app.commandLine.appendSwitch('no-sandbox')
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let mainWindow = null

function isProjectionPopupUrl(url) {
  try {
    const parsed = new URL(url)
    if (parsed.hash.startsWith('#/popup')) return true
    const path = parsed.pathname.replace(/\/+$/, '')
    return path === '/popup' || path.endsWith('/popup')
  } catch {
    return typeof url === 'string' && (url.includes('#/popup') || url.includes('/popup'))
  }
}

function buildPopupWindowOptions(features = '') {
  const isFullscreen = features.includes('fullscreen=yes')

  /** @type {import('electron').BrowserWindowConstructorOptions} */
  const windowConfig = {
    width: 800,
    height: 600,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  }

  if (!isFullscreen) return windowConfig

  const displays = screen.getAllDisplays()
  const monitorMatch = features.match(/monitor=(\d+)/)
  const targetMonitorId = monitorMatch ? Number.parseInt(monitorMatch[1], 10) : null

  let targetDisplay = null
  if (targetMonitorId != null && Number.isFinite(targetMonitorId)) {
    targetDisplay = displays.find((display) => display.id === targetMonitorId) ?? null
  }

  if (!targetDisplay && displays.length > 1) {
    const primary = screen.getPrimaryDisplay()
    targetDisplay = displays.find((display) => display.id !== primary.id) ?? null
  }

  if (!targetDisplay) {
    targetDisplay = screen.getPrimaryDisplay()
  }

  windowConfig.x = targetDisplay.bounds.x
  windowConfig.y = targetDisplay.bounds.y
  windowConfig.width = targetDisplay.bounds.width
  windowConfig.height = targetDisplay.bounds.height
  windowConfig.resizable = false
  windowConfig.frame = false
  windowConfig.thickFrame = false
  windowConfig.hasShadow = false
  windowConfig.skipTaskbar = true

  return windowConfig
}

function attachProjectionWindowHandlers(parentWindow) {
  parentWindow.webContents.setWindowOpenHandler(({ url, features }) => {
    if (isProjectionPopupUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: buildPopupWindowOptions(features),
      }
    }

    void shell.openExternal(url)
    return { action: 'deny' }
  })

  parentWindow.webContents.on('did-create-window', (childWindow) => {
    childWindow.once('ready-to-show', () => {
      if (!childWindow.isResizable()) {
        if (process.platform === 'win32') {
          const bounds = childWindow.getBounds()
          const display = screen.getDisplayMatching(bounds)
          childWindow.setFullScreen(false)
          childWindow.setBounds(display.bounds)
          childWindow.setAlwaysOnTop(true, 'screen-saver')
        } else {
          childWindow.setFullScreen(true)
        }
      }
      childWindow.show()
    })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#12121c',
    title: APP_PRODUCT_NAME,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/ico/favicon.png'),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      // false: garante preload/IPC no AppImage empacotado (first-boot / splash)
      sandbox: false,
      spellcheck: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (isDev && process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  attachProjectionWindowHandlers(mainWindow)

  if (isDev && VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  ensureWorkspaceDirectories()
  registerWorkspaceIpc()
  registerLocalFileProtocol()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

import { app, BrowserWindow, screen, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  APP_DESKTOP_ID,
  ensureLinuxTaskbarIntegration,
  loadAppIconImage,
  resolveAppIconPath,
} from './app-icon.mjs'
import { APP_PRODUCT_NAME, APP_USER_DATA_DIR } from './constants.mjs'
import { registerWorkspaceIpc } from './ipc/register.mjs'
import { attachWindowStateEvents, registerWindowIpc } from './ipc/window.mjs'
import { ensureWorkspaceDirectories } from './paths.mjs'
import { registerLocalFileProtocol, registerLocalScheme } from './protocol.mjs'
import { loadWindowState, trackWindowState } from './window-state.mjs'
import { registerYoutubeEmbedHeaders } from './youtube-embed.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = Boolean(VITE_DEV_SERVER_URL)
const PRELOAD_PATH = path.join(__dirname, 'preload.mjs')

registerLocalScheme()

/**
 * Linux: app name = WM_CLASS = StartupWMClass do .desktop (ícone na barra).
 * Título da janela continua sendo APP_PRODUCT_NAME.
 */
if (process.platform === 'linux') {
  app.setName(APP_DESKTOP_ID)
  app.commandLine.appendSwitch('class', APP_DESKTOP_ID)
} else {
  app.setName(APP_PRODUCT_NAME)
}

app.setPath('userData', path.join(app.getPath('appData'), APP_USER_DATA_DIR))

if (process.platform === 'win32') {
  app.setAppUserModelId('com.louvorja.piano')
}

/** Chromium não permite root sem sandbox (dev containers / CI) */
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  app.commandLine.appendSwitch('no-sandbox')
}

/** Permite autoplay com áudio nas janelas de projeção (YouTube). */
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let mainWindow = null

function applyWindowIcon(win) {
  if (!win || win.isDestroyed()) return
  const iconPath = resolveAppIconPath()
  const iconImage = loadAppIconImage()
  if (iconImage) {
    win.setIcon(iconImage)
  } else if (iconPath) {
    win.setIcon(iconPath)
  }
  if (process.platform === 'win32' && iconPath) {
    try {
      win.setAppDetails({
        appId: 'com.louvorja.piano',
        appIconPath: iconPath,
        appIconIndex: 0,
        relaunchDisplayName: APP_PRODUCT_NAME,
      })
    } catch (error) {
      console.warn('[icon] setAppDetails falhou', error)
    }
  }
}

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
    childWindow.webContents.setAudioMuted(false)

    childWindow.once('ready-to-show', () => {
      childWindow.webContents.setAudioMuted(false)
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
  const iconPath = resolveAppIconPath()
  const windowState = loadWindowState()

  mainWindow = new BrowserWindow({
    ...(typeof windowState.x === 'number' ? { x: windowState.x } : {}),
    ...(typeof windowState.y === 'number' ? { y: windowState.y } : {}),
    width: windowState.width,
    height: windowState.height,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#12121c',
    title: APP_PRODUCT_NAME,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      // false: garante preload/IPC no AppImage empacotado (first-boot / splash)
      sandbox: false,
      spellcheck: false,
    },
  })

  applyWindowIcon(mainWindow)
  attachWindowStateEvents(mainWindow)
  trackWindowState(mainWindow, { isMaximized: windowState.isMaximized })

  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault()
  })

  mainWindow.once('ready-to-show', () => {
    applyWindowIcon(mainWindow)
    if (windowState.isMaximized && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.maximize()
    }
    mainWindow?.show()
    // Reaplica após show — alguns WMs só pegam o ícone com a janela visível
    applyWindowIcon(mainWindow)
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
  ensureLinuxTaskbarIntegration()
  ensureWorkspaceDirectories()
  registerWorkspaceIpc()
  registerWindowIpc(() => mainWindow)
  registerLocalFileProtocol()
  registerYoutubeEmbedHeaders()
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

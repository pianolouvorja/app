import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { APP_PRODUCT_NAME } from './constants.mjs'
import { registerWorkspaceIpc } from './ipc/register.mjs'
import { ensureWorkspaceDirectories } from './paths.mjs'
import { registerLocalFileProtocol, registerLocalScheme } from './protocol.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
const isDev = Boolean(VITE_DEV_SERVER_URL)

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
      preload: path.join(__dirname, 'preload.mjs'),
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

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

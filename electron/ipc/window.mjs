import { BrowserWindow, ipcMain } from 'electron'

/**
 * Controles da titlebar customizada (frame: false) — espelha o legado.
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 */
export function registerWindowIpc(getMainWindow) {
  ipcMain.handle('window:control', (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null

    if (action === 'minimize') {
      win.minimize()
      return true
    }
    if (action === 'maximize') {
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
      return true
    }
    if (action === 'close') {
      const main = getMainWindow()
      if (main && win.id === main.id) {
        win.close()
      } else {
        win.close()
      }
      return true
    }
    if (action === 'is-maximized') {
      return win.isMaximized()
    }
    return null
  })
}

/** @param {import('electron').BrowserWindow} win */
export function attachWindowStateEvents(win) {
  win.on('maximize', () => {
    win.webContents.send('window:maximized-state', true)
  })
  win.on('unmaximize', () => {
    win.webContents.send('window:maximized-state', false)
  })
}

import { BrowserWindow, ipcMain, screen } from 'electron'

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

function openIdentifyOverlay(display, label) {
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.setIgnoreMouseEvents(true)

  const html = `
    <html>
      <body style="margin:0;overflow:hidden;display:flex;align-items:center;justify-content:center;height:100vh;background:rgba(0,0,0,0.55);">
        <div style="font-family:system-ui,sans-serif;font-size:28vw;font-weight:700;color:#fff;text-shadow:0 10px 30px rgba(0,0,0,0.8);">
          ${label}
        </div>
      </body>
    </html>
  `

  void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  setTimeout(() => {
    if (!win.isDestroyed()) win.close()
  }, 3000)
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

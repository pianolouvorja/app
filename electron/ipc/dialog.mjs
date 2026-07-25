import { BrowserWindow, dialog, ipcMain } from 'electron'

/**
 * @typedef {{ name: string, extensions: string[] }} FileFilter
 * @typedef {{ title?: string, filters?: FileFilter[], multiple?: boolean }} OpenFileDialogOptions
 */

export function registerDialogIpc() {
  ipcMain.handle('dialog:open-file', async (event, options = {}) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const multiple = Boolean(options?.multiple)
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: options?.title || (multiple ? 'Selecionar Arquivos' : 'Selecionar Arquivo'),
        filters: Array.isArray(options?.filters) && options.filters.length > 0
          ? options.filters
          : [{ name: 'Todos', extensions: ['*'] }],
        properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      })
      if (result.canceled || !result.filePaths?.length) return null
      return multiple ? result.filePaths : result.filePaths[0]
    } catch (error) {
      console.error('[ipc] dialog:open-file', error)
      return null
    }
  })
}

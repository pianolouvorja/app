import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('louvorja', {
  platform: process.platform,
  isElectron: true,
})

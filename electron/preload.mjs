import { contextBridge, ipcRenderer, webFrame } from 'electron'

/**
 * @template T
 * @param {string} channel
 * @param {(payload: T) => void} callback
 */
function subscribe(channel, callback) {
  /** @param {Electron.IpcRendererEvent} _event @param {T} payload */
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

/** Zoom nativo Chromium (mesmo motor do Ctrl+/Ctrl−). */
const ZOOM_FACTOR_MIN = 0.7
const ZOOM_FACTOR_MAX = 1.5
const ZOOM_LEVEL_STEP = 0.5

function clampZoomFactor(factor) {
  const value = Number(factor)
  if (!Number.isFinite(value)) return 1
  const clamped = Math.min(ZOOM_FACTOR_MAX, Math.max(ZOOM_FACTOR_MIN, value))
  // 99–101% → 100% (Chromium pode reportar ~101% no nível neutro)
  const percent = Math.round(clamped * 100)
  if (percent >= 99 && percent <= 101) return 1
  return clamped
}

function readZoomFactor() {
  try {
    return webFrame.getZoomFactor()
  } catch {
    return 1
  }
}

function applyZoomFactor(factor) {
  const next = clampZoomFactor(factor)
  try {
    webFrame.setZoomFactor(next)
  } catch {
    // ignore
  }
  return readZoomFactor()
}

function stepZoomLevel(delta) {
  try {
    const current = webFrame.getZoomLevel()
    webFrame.setZoomLevel(current + delta)
    // Reaplica clamp via factor (nível pode passar do range)
    return applyZoomFactor(webFrame.getZoomFactor())
  } catch {
    return readZoomFactor()
  }
}

contextBridge.exposeInMainWorld('louvorja', {
  platform: process.platform,
  isElectron: true,

  // Controle remoto (APK via WS :7071): comandos chegam do main.
  remote: {
    onCommand: (callback) => subscribe('remote:command', callback),
    onStateRequest: (callback) => subscribe('remote:request-state', callback),
    sendAck: (ack) => ipcRenderer.send('remote:ack', ack),
    sendState: (state) => ipcRenderer.send('remote:state', state),
    pairingInfo: () => ipcRenderer.invoke('remote:pairing-info'),
    onClients: (callback) => subscribe('remote:clients', callback),
  },

  // Palco (cast p/ TV — receiver conecta em WS :7081, HTTP :7080)
  palco: {
    start: () => ipcRenderer.invoke('palco:start'),
    stop: () => ipcRenderer.invoke('palco:stop'),
    status: () => ipcRenderer.invoke('palco:status'),
    send: (msg) => ipcRenderer.invoke('palco:send', msg),
    serveMedia: (name, mime, base64) =>
      ipcRenderer.invoke('palco:serve-media', { name, mime, base64 }),
    servePath: (filePath) =>
      ipcRenderer.invoke('palco:serve-path', { path: filePath }),
    clearMedia: () => ipcRenderer.invoke('palco:clear-media'),
    onEvent: (callback) => subscribe('palco:event', callback),
    onReceiverConnected: (callback) => subscribe('palco:receiver-connected', callback),
    onReceiverDisconnected: (callback) => subscribe('palco:receiver-disconnected', callback),
  },

  window: {
    control: (action) => ipcRenderer.invoke('window:control', action),
    onMaximizedState: (callback) => subscribe('window:maximized-state', callback),
  },

  zoom: {
    getFactor: () => readZoomFactor(),
    setFactor: (factor) => applyZoomFactor(factor),
    zoomIn: () => stepZoomLevel(ZOOM_LEVEL_STEP),
    zoomOut: () => stepZoomLevel(-ZOOM_LEVEL_STEP),
    onChanged: (callback) => subscribe('zoom:changed', callback),
  },

  workspace: {
    readBinaryFile: (path) => ipcRenderer.invoke('dialog:read-binary-file', path),
    getRecord: (filename) => ipcRenderer.invoke('workspace:get-record', filename),
    saveRecord: (filename, data) => ipcRenderer.invoke('workspace:save-record', filename, data),
    clear: () => ipcRenderer.invoke('workspace:clear'),
  },

  catalog: {
    downloadDatabase: () => ipcRenderer.invoke('catalog:download-database'),
    extractDatabase: () => ipcRenderer.invoke('catalog:extract-database'),
    onDownloadProgress: (callback) => subscribe('catalog:download-progress', callback),
    onExtractProgress: (callback) => subscribe('catalog:extract-progress', callback),
  },

  media: {
    download: (url, mediaType, filename) =>
      ipcRenderer.invoke('media:download', url, mediaType, filename),
    check: (mediaType, filename) => ipcRenderer.invoke('media:check', mediaType, filename),
    delete: (mediaType, filename) => ipcRenderer.invoke('media:delete', mediaType, filename),
    probeDuration: (path) => ipcRenderer.invoke('media:probe-duration', path ?? ''),
  },

  displays: {
    list: () => ipcRenderer.invoke('displays:list'),
    identify: () => ipcRenderer.invoke('displays:identify'),
    onChanged: (callback) => subscribe('displays:changed', callback),
  },

  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:open-file', options ?? {}),
  },

  presentation: {
    detectOffice: () => ipcRenderer.invoke('presentation:detect-office'),
  },

  projection: {
    openUrl: (payload) => ipcRenderer.invoke('projection:open-url', payload),
    closeUrl: () => ipcRenderer.invoke('projection:close-url'),
    getSourceMediaId: () => ipcRenderer.invoke('projection:get-source-media-id'),
    publishPlaybackSync: (payload) => {
      ipcRenderer.send('projection:playback-sync', payload)
    },
    onPlaybackSync: (callback) => subscribe('projection:playback-sync', callback),
    remotePlay: () => ipcRenderer.invoke('projection:remote-play'),
    remotePause: () => ipcRenderer.invoke('projection:remote-pause'),
    remoteSeek: (seconds) => ipcRenderer.invoke('projection:remote-seek', seconds),
    remoteToggleMute: () => ipcRenderer.invoke('projection:remote-toggle-mute'),
    remoteSetVolume: (volume) =>
      ipcRenderer.invoke('projection:remote-set-volume', volume),
    getPlaybackState: () => ipcRenderer.invoke('projection:get-playback-state'),
    getNavigationState: () => ipcRenderer.invoke('projection:get-navigation-state'),
    remoteGoBack: () => ipcRenderer.invoke('projection:remote-go-back'),
    remoteGoForward: () => ipcRenderer.invoke('projection:remote-go-forward'),
    remoteReload: () => ipcRenderer.invoke('projection:remote-reload'),
    toggleSiteScreens: () => ipcRenderer.invoke('projection:toggle-site-screens'),
    toggleVideoScreens: () => ipcRenderer.invoke('projection:toggle-video-screens'),
    // Player HTML (local-video/youtube) avisa que o vídeo acabou → autoclose.
    notifyVideoEnded: () => ipcRenderer.send('projection:video-ended'),
    remoteImageNext: () => ipcRenderer.invoke('projection:remote-image-next'),
    remoteImagePrev: () => ipcRenderer.invoke('projection:remote-image-prev'),
    getImageSlideState: () =>
      ipcRenderer.invoke('projection:get-image-slide-state'),
    remotePdfNext: () => ipcRenderer.invoke('projection:remote-pdf-next'),
    remotePdfPrev: () => ipcRenderer.invoke('projection:remote-pdf-prev'),
    getPdfPageState: () => ipcRenderer.invoke('projection:get-pdf-page-state'),
    remotePptNext: () => ipcRenderer.invoke('projection:remote-ppt-next'),
    remotePptPrev: () => ipcRenderer.invoke('projection:remote-ppt-prev'),
    getPptSlideState: () =>
      ipcRenderer.invoke('projection:get-ppt-slide-state'),
    getSiteTargetMonitors: () =>
      ipcRenderer.invoke('projection:get-site-target-monitors'),
    setSiteTargetMonitors: (ids) =>
      ipcRenderer.invoke('projection:set-site-target-monitors', ids),
    getVideoTargetMonitors: () =>
      ipcRenderer.invoke('projection:get-video-target-monitors'),
    setVideoTargetMonitors: (ids) =>
      ipcRenderer.invoke('projection:set-video-target-monitors', ids),
    setSiteControlPanelOpen: (open) =>
      ipcRenderer.invoke('projection:set-site-control-panel-open', open),
    onSiteTargetsChanged: (callback) =>
      subscribe('projection:site-targets-changed', callback),
    onVideoTargetsChanged: (callback) =>
      subscribe('projection:video-targets-changed', callback),
  },

  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onAvailable: (cb) => {
      const listener = (_event, data) => cb(_event, data)
      ipcRenderer.on('updater:available', listener)
    },
    onProgress: (cb) => {
      const listener = (_event, data) => cb(_event, data)
      ipcRenderer.on('updater:progress', listener)
    },
    onDownloaded: (cb) => {
      const listener = () => cb()
      ipcRenderer.on('updater:downloaded', listener)
    },
    onError: (cb) => {
      const listener = (_event, data) => cb(_event, data)
      ipcRenderer.on('updater:error', listener)
    },
  },
})

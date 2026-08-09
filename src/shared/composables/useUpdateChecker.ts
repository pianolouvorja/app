import { ref } from 'vue'

export interface UpdateInfo {
  available: boolean
  version: string | null
  releaseNotes: string | null
  progress: number
  downloaded: boolean
  error: string | null
}

interface ElectronUpdaterAPI {
  check: () => Promise<{ available: boolean; version?: string; releaseNotes?: string }>
  download: () => Promise<{ success: boolean; error?: string }>
  install: () => void
  onAvailable: (cb: (_: unknown, data: { version: string; releaseNotes: string }) => void) => void
  onProgress: (cb: (_: unknown, data: { progress: number }) => void) => void
  onDownloaded: (cb: () => void) => void
  onError: (cb: (_: unknown, data: { message: string }) => void) => void
}

interface ElectronAPI {
  updater?: ElectronUpdaterAPI
}

/**
 * Lê o electronAPI do window de forma type-safe.
 * Retorna undefined em browser (web) ou quando preload não expõe.
 */
function getElectronUpdaterAPI(): ElectronUpdaterAPI | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { electronAPI?: ElectronAPI }
  return w.electronAPI?.updater
}

function createUpdateState() {
  const hasUpdate = ref(false)
  const newVersion = ref<string | null>(null)
  const releaseNotes = ref<string | null>(null)
  const downloadProgress = ref(0)
  const isDownloading = ref(false)
  const isDownloaded = ref(false)
  const error = ref<string | null>(null)
  const dismissed = ref(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('update-dismissed') === 'true',
  )

  function dismiss() {
    dismissed.value = true
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('update-dismissed', 'true')
    }
  }

  function reset() {
    hasUpdate.value = false
    newVersion.value = null
    releaseNotes.value = null
    downloadProgress.value = 0
    isDownloading.value = false
    isDownloaded.value = false
    error.value = null
    dismissed.value =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem('update-dismissed') === 'true'
  }

  return {
    hasUpdate,
    newVersion,
    releaseNotes,
    downloadProgress,
    isDownloading,
    isDownloaded,
    error,
    dismissed,
    dismiss,
    reset,
  }
}

/**
 * Estado global singleton — compartilhado entre todas as chamadas
 * do composable. Garante que App.vue (init), UpdateBanner (display)
 * e UpdateDialog (download/install) operem sobre o mesmo estado.
 */
const state = createUpdateState()

/**
 * Composable que gerencia o ciclo de atualização do Electron.
 * Escuta IPC events do main process e expõe estado reativo.
 * Usa estado global para todas as instâncias compartilharem.
 */
export function useUpdateChecker() {
  function getAPI(): ElectronUpdaterAPI | undefined {
    return getElectronUpdaterAPI()
  }

  async function checkForUpdates() {
    const api = getAPI()
    if (!api) return

    try {
      const result = await api.check()
      if (result.available) {
        state.hasUpdate.value = true
        state.newVersion.value = result.version ?? null
        state.releaseNotes.value = result.releaseNotes ?? null
      }
    } catch {
      // Silencioso — offline ou erro, não propaga
    }
  }

  async function downloadUpdate() {
    if (!state.hasUpdate.value) return

    const api = getAPI()
    if (!api) return

    state.isDownloading.value = true
    state.error.value = null

    try {
      const result = await api.download()
      if (!result.success) {
        state.error.value = result.error ?? 'Falha no download'
        state.isDownloading.value = false
      }
    } catch {
      state.error.value = 'Falha no download'
      state.isDownloading.value = false
    }
  }

  function installUpdate() {
    if (!state.isDownloaded.value) return
    getAPI()?.install()
  }

  /** Registra IPC listeners. Chamar dentro de onMounted/setup. */
  function init() {
    const api = getAPI()
    if (!api) return

    api.onAvailable((_, data) => {
      state.hasUpdate.value = true
      state.newVersion.value = data.version
      state.releaseNotes.value = data.releaseNotes
    })

    api.onProgress((_, data) => {
      state.downloadProgress.value = data.progress
    })

    api.onDownloaded(() => {
      state.isDownloading.value = false
      state.isDownloaded.value = true
      state.downloadProgress.value = 100
    })

    api.onError((_, data) => {
      state.error.value = data.message
      state.isDownloading.value = false
    })

    setTimeout(checkForUpdates, 3000)
  }

  return {
    ...state,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    init,
  }
}

import {
  listExtendedDisplays,
  listSystemDisplays,
} from '@modules/settings/services/display-service'
import { loadProjectionSettings } from '@modules/settings/services/projection-preferences'

type ProjectionWindow = Window & { monitorId?: number }

type MonitorTargets = {
  monitorIds: number[]
  fullscreen: boolean
}

let openWindows: ProjectionWindow[] = []
let activeModule: string | null = null

function pruneWindows() {
  openWindows = openWindows.filter((win) => win && !win.closed)
  if (openWindows.length === 0) {
    activeModule = null
  }
}

function buildPopupUrl(moduleId: string): string {
  const params = `module=${encodeURIComponent(moduleId)}`
  const useHash =
    window.location.protocol === 'file:' ||
    window.location.href.includes('#/') ||
    Boolean(window.louvorja?.isElectron) ||
    /Electron/i.test(navigator.userAgent)

  if (useHash) {
    const base = window.location.href.split('#')[0]
    return `${base}#/popup?${params}`
  }

  return `${window.location.origin}/popup?${params}`
}

async function resolveMonitorTargets(): Promise<MonitorTargets> {
  const settings = loadProjectionSettings()
  const displays = await listSystemDisplays()
  const extendedIds = new Set(listExtendedDisplays(displays).map((display) => display.id))
  const selected = settings.targetDisplayIds.filter((id) => extendedIds.has(id))

  if (selected.length > 0) {
    return { monitorIds: selected, fullscreen: true }
  }

  return {
    monitorIds: [],
    fullscreen: settings.openFullscreenOnPrimary !== false,
  }
}

function openOnMonitor(
  url: string,
  moduleId: string,
  monitorId: number | null,
  fullscreen: boolean,
): ProjectionWindow | null {
  const features = [
    'width=800',
    'height=600',
    monitorId != null ? `monitor=${monitorId}` : null,
    fullscreen ? 'fullscreen=yes' : null,
  ]
    .filter(Boolean)
    .join(',')

  const name =
    monitorId != null
      ? `Projection_${moduleId}_${monitorId}`
      : `Projection_${moduleId}`

  const win = window.open(url, name, features) as ProjectionWindow | null
  if (!win) return null

  if (monitorId != null) {
    win.monitorId = monitorId
  }

  return win
}

export function isProjectionModuleOpen(moduleId?: string): boolean {
  pruneWindows()
  if (openWindows.length === 0) return false
  if (!moduleId) return true
  return activeModule === moduleId
}

export function closeProjectionModule(): void {
  pruneWindows()
  for (const win of openWindows) {
    try {
      win.close()
    } catch {
      // janela já fechada
    }
  }
  openWindows = []
  activeModule = null
}

export async function openProjectionModule(moduleId: string): Promise<boolean> {
  pruneWindows()

  if (activeModule === moduleId && openWindows.length > 0) {
    openWindows[0]?.focus()
    return true
  }

  closeProjectionModule()

  const url = buildPopupUrl(moduleId)
  const targets = await resolveMonitorTargets()
  const nextWindows: ProjectionWindow[] = []

  if (targets.monitorIds.length > 0) {
    for (const monitorId of targets.monitorIds) {
      const win = openOnMonitor(url, moduleId, monitorId, true)
      if (win) nextWindows.push(win)
    }
  } else {
    const win = openOnMonitor(url, moduleId, null, targets.fullscreen)
    if (win) nextWindows.push(win)
  }

  openWindows = nextWindows
  activeModule = nextWindows.length > 0 ? moduleId : null
  return nextWindows.length > 0
}

export async function toggleProjectionModule(moduleId: string): Promise<boolean> {
  if (isProjectionModuleOpen(moduleId)) {
    closeProjectionModule()
    return false
  }

  return openProjectionModule(moduleId)
}

export function useProjectionWindow() {
  return {
    open: openProjectionModule,
    closeAll: closeProjectionModule,
    isOpen: isProjectionModuleOpen,
    toggle: toggleProjectionModule,
  }
}

import {
  listExtendedDisplays,
  listSystemDisplays,
} from '@modules/settings/services/display-service'
import { loadProjectionSettings } from '@modules/settings/services/projection-preferences'
import { getDesktopBridge } from '@shared/services/desktop-bridge'

type ProjectionWindow = Window & { monitorId?: number }

type MonitorTargets = {
  monitorIds: number[]
  fullscreen: boolean
}

let openWindows: ProjectionWindow[] = []
let activeModule: string | null = null
/** Último módulo projetado — permite reabrir após close acidental no reapply. */
let lastProjectedModule: string | null = null
/** Evita que o watch trate o fechamento temporário do reapply como “parou de projetar”. */
let reapplyingTargets = false
/** Nome único a cada open — reusar o mesmo nome após close falha no Chromium/Electron. */
let projectionWindowSeq = 0

function pruneWindows() {
  openWindows = openWindows.filter((win) => win && !win.closed)
  if (openWindows.length === 0 && !reapplyingTargets) {
    activeModule = null
    lastProjectedModule = null
  }
}

function closeWebUrlProjection() {
  void getDesktopBridge()?.projection?.closeUrl?.()
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

async function resolveMonitorTargets(
  preferredIds?: number[] | null,
): Promise<MonitorTargets> {
  const displays = await listSystemDisplays()
  const extendedIds = new Set(listExtendedDisplays(displays).map((display) => display.id))

  // null/undefined = ler settings; array (mesmo vazio) = seleção explícita (como YouTube/site).
  if (preferredIds != null) {
    const selected = preferredIds.filter((id) => extendedIds.has(id))
    if (selected.length > 0) {
      return { monitorIds: selected, fullscreen: true }
    }
    return { monitorIds: [], fullscreen: false }
  }

  const settings = loadProjectionSettings()
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
  projectionWindowSeq += 1
  const features = [
    'width=800',
    'height=600',
    monitorId != null ? `monitor=${monitorId}` : null,
    fullscreen ? 'fullscreen=yes' : null,
  ]
    .filter(Boolean)
    .join(',')

  // Sequência no nome evita falha ao reabrir após close (mesmo targetName).
  const name =
    monitorId != null
      ? `Projection_${moduleId}_${monitorId}_${projectionWindowSeq}`
      : `Projection_${moduleId}_${projectionWindowSeq}`

  const win = window.open(url, name, features) as ProjectionWindow | null
  if (!win || win.closed) return null

  if (monitorId != null) {
    win.monitorId = monitorId
  }

  return win
}

function notifyProjectionReapplied(moduleId: string, open: boolean) {
  try {
    window.dispatchEvent(
      new CustomEvent('louvorja:projection-reapplied', {
        detail: { moduleId, open },
      }),
    )
  } catch {
    // ignore
  }
}

export function isProjectionModuleOpen(moduleId?: string): boolean {
  if (reapplyingTargets && activeModule) {
    if (!moduleId) return true
    return activeModule === moduleId
  }

  pruneWindows()
  if (openWindows.length === 0) return false
  if (!moduleId) return true
  return activeModule === moduleId
}

export function closeProjectionModule(): void {
  reapplyingTargets = false
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
  lastProjectedModule = null
  closeWebUrlProjection()
}

export async function openProjectionModule(moduleId: string): Promise<boolean> {
  pruneWindows()
  closeWebUrlProjection()

  if (activeModule === moduleId && openWindows.length > 0) {
    openWindows[0]?.focus()
    return true
  }

  // fecha só as janelas de módulo (não chamar closeProjectionModule: reentraria no closeUrl)
  for (const win of openWindows) {
    try {
      win.close()
    } catch {
      // janela já fechada
    }
  }
  openWindows = []
  activeModule = null

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
  lastProjectedModule = activeModule
  return nextWindows.length > 0
}

/**
 * Reabre/ajusta as janelas do módulo ativo nas telas selecionadas.
 * Espelha setVideoTargetMonitors / setSiteTargetMonitors: troca as telas
 * sem “desligar” a projeção.
 */
export async function reapplyProjectionTargets(
  preferredIds?: number[] | null,
): Promise<boolean> {
  pruneWindows()
  const moduleId = activeModule ?? lastProjectedModule
  if (!moduleId) return false

  // Garante que o watch continue vendo a projeção como ativa durante a troca.
  activeModule = moduleId
  lastProjectedModule = moduleId
  reapplyingTargets = true
  try {
    const targets = await resolveMonitorTargets(preferredIds)
    const desiredIds = targets.monitorIds
    const desiredSet = new Set(desiredIds)
    const url = buildPopupUrl(moduleId)

    // Mantém janelas das telas que continuam selecionadas (como o espelho do YouTube).
    const kept: ProjectionWindow[] = []
    const alreadyOpen = new Set<number>()

    for (const win of openWindows) {
      const id = win.monitorId
      if (id != null && desiredSet.has(id) && !win.closed) {
        kept.push(win)
        alreadyOpen.add(id)
      } else {
        try {
          win.close()
        } catch {
          // janela já fechada
        }
      }
    }

    // Pequena pausa após closes para o Chromium liberar o slot da janela.
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 50)
    })

    for (const monitorId of desiredIds) {
      if (alreadyOpen.has(monitorId)) continue
      const win = openOnMonitor(url, moduleId, monitorId, true)
      if (win) kept.push(win)
    }

    openWindows = kept.filter((win) => win && !win.closed)

    if (desiredIds.length === 0) {
      activeModule = null
      lastProjectedModule = null
      notifyProjectionReapplied(moduleId, false)
      return false
    }

    // Se alguma abertura falhou, tenta recriar todas com nomes novos.
    if (openWindows.length < desiredIds.length) {
      for (const win of openWindows) {
        try {
          win.close()
        } catch {
          // ignore
        }
      }
      openWindows = []
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 50)
      })
      for (const monitorId of desiredIds) {
        const win = openOnMonitor(url, moduleId, monitorId, true)
        if (win) openWindows.push(win)
      }
    }

    const opened = openWindows.length > 0
    activeModule = opened ? moduleId : null
    if (opened) lastProjectedModule = moduleId
    notifyProjectionReapplied(moduleId, opened)
    return opened
  } finally {
    reapplyingTargets = false
  }
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
    reapplyTargets: reapplyProjectionTargets,
  }
}

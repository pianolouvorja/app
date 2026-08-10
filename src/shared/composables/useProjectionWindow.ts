import {
  listExtendedDisplays,
  listSystemDisplays,
} from '@modules/settings/services/display-service'
import {
  loadProjectionSettings,
  reconcileTargetDisplays,
  saveProjectionSettings,
} from '@modules/settings/services/projection-preferences'
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

function buildPopupUrl(
  moduleId: string,
  options?: { monitorId?: number | null; fullscreen?: boolean },
): string {
  const params = new URLSearchParams()
  params.set('module', moduleId)
  if (options?.monitorId != null) {
    params.set('monitorId', String(options.monitorId))
  }
  if (options?.fullscreen) {
    // Canal confiável para o main process (além do features do window.open)
    params.set('fs', '1')
  }
  const query = params.toString()
  const useHash =
    window.location.protocol === 'file:' ||
    window.location.href.includes('#/') ||
    Boolean(window.louvorja?.isElectron) ||
    /Electron/i.test(navigator.userAgent)

  if (useHash) {
    const base = window.location.href.split('#')[0]
    return `${base}#/popup?${query}`
  }

  return `${window.location.origin}/popup?${query}`
}

async function resolveMonitorTargets(
  preferredIds?: number[] | null,
): Promise<MonitorTargets> {
  const displays = await listSystemDisplays()
  const extended = listExtendedDisplays(displays)
  const extendedIds = new Set(extended.map((display) => display.id))
  const primary = displays.find((display) => display.isPrimary) ?? null

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

  // Sem alvos estendidos: só abre no primário se a setting permitir e
  // (não há estendidos) OU (disablePrimaryWhenExtended está desligado).
  const hasExtended = extended.length > 0
  const openOnPrimary = settings.openFullscreenOnPrimary !== false
  const primaryBlockedByExtended =
    hasExtended && settings.disablePrimaryWhenExtended !== false

  if (openOnPrimary && !primaryBlockedByExtended && primary) {
    return { monitorIds: [primary.id], fullscreen: true }
  }

  return { monitorIds: [], fullscreen: false }
}

function openOnMonitor(
  moduleId: string,
  monitorId: number | null,
  fullscreen: boolean,
): ProjectionWindow | null {
  projectionWindowSeq += 1
  const url = buildPopupUrl(moduleId, { monitorId, fullscreen })
  // frame=no é opção reconhecida pelo Electron; fullscreen/monitor também na URL
  const features = [
    'width=800',
    'height=600',
    'frame=no',
    'autoHideMenuBar=yes',
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

  const targets = await resolveMonitorTargets()
  const nextWindows: ProjectionWindow[] = []

  if (targets.monitorIds.length > 0) {
    for (const monitorId of targets.monitorIds) {
      const win = openOnMonitor(moduleId, monitorId, true)
      if (win) nextWindows.push(win)
    }
  }
  // Sem alvos: não abre janela “órfã” (antes caía no 1º estendido no main).

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
      const win = openOnMonitor(moduleId, monitorId, true)
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
        const win = openOnMonitor(moduleId, monitorId, true)
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

/**
 * Reage a hotplug de monitores (legado App.vue onDisplaysChanged):
 * - 0 telas estendidas → fecha projeção Vue + web
 * - senão reconcilia settings e reaplica janelas abertas
 */
export async function syncProjectionAfterDisplayChange(): Promise<void> {
  const displays = await listSystemDisplays()
  const extended = listExtendedDisplays(displays)
  const extendedIds = extended.map((display) => display.id)

  let settings = loadProjectionSettings()
  settings = reconcileTargetDisplays(settings, extendedIds)
  settings = {
    ...settings,
    targetDisplayIds: settings.targetDisplayIds.filter((id) =>
      extendedIds.includes(id),
    ),
  }
  saveProjectionSettings(settings)

  // Legado: se sobrou só a tela principal, encerra popups.
  if (extendedIds.length === 0) {
    closeProjectionModule()
    return
  }

  if (!isProjectionModuleOpen()) return

  await reapplyProjectionTargets(settings.targetDisplayIds)
}

export function useProjectionWindow() {
  return {
    open: openProjectionModule,
    closeAll: closeProjectionModule,
    isOpen: isProjectionModuleOpen,
    toggle: toggleProjectionModule,
    reapplyTargets: reapplyProjectionTargets,
    syncAfterDisplayChange: syncProjectionAfterDisplayChange,
  }
}

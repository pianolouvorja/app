import { getDesktopBridge, isDesktopApp } from '@shared/services/desktop-bridge'
import type { SystemDisplayInfo } from '@shared/types/desktop-bridge'

import type { SystemDisplay } from '../types/projection'

/** Fallback para preview no browser (sem Electron). */
const PREVIEW_DISPLAYS: SystemDisplay[] = [
  {
    id: 1,
    bounds: { x: 0, y: 0, width: 2560, height: 1080 },
    workArea: { x: 0, y: 0, width: 2560, height: 1040 },
    scaleFactor: 1,
    isPrimary: true,
  },
  {
    id: 2,
    bounds: { x: -2560, y: 0, width: 2560, height: 1080 },
    workArea: { x: -2560, y: 0, width: 2560, height: 1080 },
    scaleFactor: 1,
    isPrimary: false,
  },
  {
    id: 3,
    bounds: { x: 2560, y: 0, width: 1920, height: 1080 },
    workArea: { x: 2560, y: 0, width: 1920, height: 1080 },
    scaleFactor: 1,
    isPrimary: false,
  },
]

function toSystemDisplay(info: SystemDisplayInfo): SystemDisplay {
  return {
    id: info.id,
    bounds: { ...info.bounds },
    workArea: { ...info.workArea },
    scaleFactor: info.scaleFactor,
    isPrimary: info.isPrimary,
  }
}

/** Lista monitores físicos via IPC; no browser usa preview estático. */
export async function listSystemDisplays(): Promise<SystemDisplay[]> {
  if (!isDesktopApp()) return PREVIEW_DISPLAYS.map((display) => ({ ...display }))

  const bridge = getDesktopBridge()
  if (!bridge?.displays?.list) return []

  try {
    const displays = await bridge.displays.list()
    return (displays ?? []).map(toSystemDisplay)
  } catch (error) {
    console.error('[projection] falha ao listar monitores', error)
    return []
  }
}

/** Exibe overlay numerado em cada monitor por alguns segundos. */
export async function identifySystemDisplays(): Promise<boolean> {
  if (!isDesktopApp()) return false

  const bridge = getDesktopBridge()
  if (!bridge?.displays?.identify) return false

  try {
    return Boolean(await bridge.displays.identify())
  } catch (error) {
    console.error('[projection] falha ao identificar monitores', error)
    return false
  }
}

export function formatDisplayResolution(display: SystemDisplay): string {
  return `${display.bounds.width} × ${display.bounds.height}`
}

/** Monitores estendidos (não primários) elegíveis para projeção multi-tela. */
export function listExtendedDisplays(displays: SystemDisplay[]): SystemDisplay[] {
  return displays.filter((display) => !display.isPrimary)
}

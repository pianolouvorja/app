import type {
  DisplayBounds,
  MonitorArrangementSlot,
  SystemDisplay,
} from '../types/projection'

export type MonitorLayoutTile = {
  id: number
  index: number
  label: string
  resolutionLabel: string
  isPrimary: boolean
  /** Posição renderizada no canvas (px). */
  left: number
  top: number
  width: number
  height: number
  /** Bounds virtuais usados no layout (sistema ou arranjo customizado). */
  virtual: DisplayBounds
}

export type MonitorLayoutPlan = {
  tiles: MonitorLayoutTile[]
  canvasWidth: number
  canvasHeight: number
  scale: number
  worldMinX: number
  worldMinY: number
}

const CANVAS_PADDING = 28
const MIN_TILE = 64
/** Deixa margem no canvas para o operador poder remanejar. */
const FIT_FACTOR = 0.68
const PRIMARY_SCALE_BOOST = 1.04

function resolveVirtualBounds(
  display: SystemDisplay,
  arrangement: MonitorArrangementSlot[],
): DisplayBounds {
  const custom = arrangement.find((slot) => slot.displayId === display.id)
  if (!custom) return { ...display.bounds }

  return {
    ...display.bounds,
    x: custom.x,
    y: custom.y,
  }
}

function computeWorldBox(boundsList: DisplayBounds[]) {
  const minX = Math.min(...boundsList.map((b) => b.x))
  const minY = Math.min(...boundsList.map((b) => b.y))
  const maxX = Math.max(...boundsList.map((b) => b.x + b.width))
  const maxY = Math.max(...boundsList.map((b) => b.y + b.height))
  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

/**
 * Monta o arranjo visual dos monitores a partir dos bounds físicos
 * (ou posições customizadas persistidas após arrastar).
 */
export function buildMonitorLayout(
  displays: SystemDisplay[],
  arrangement: MonitorArrangementSlot[],
  stageWidth: number,
  stageHeight: number,
): MonitorLayoutPlan {
  if (displays.length === 0 || stageWidth <= 0 || stageHeight <= 0) {
    return {
      tiles: [],
      canvasWidth: stageWidth,
      canvasHeight: stageHeight,
      scale: 1,
      worldMinX: 0,
      worldMinY: 0,
    }
  }

  const virtualBounds = displays.map((display) =>
    resolveVirtualBounds(display, arrangement),
  )
  const world = computeWorldBox(virtualBounds)

  const availableW = Math.max(1, stageWidth - CANVAS_PADDING * 2)
  const availableH = Math.max(1, stageHeight - CANVAS_PADDING * 2)
  const scale =
    Math.min(availableW / world.width, availableH / world.height) * FIT_FACTOR

  const contentW = world.width * scale
  const contentH = world.height * scale
  const offsetX = (stageWidth - contentW) / 2
  const offsetY = (stageHeight - contentH) / 2

  const tiles: MonitorLayoutTile[] = displays.map((display, index) => {
    const virtual = resolveVirtualBounds(display, arrangement)
    let width = Math.max(MIN_TILE, virtual.width * scale)
    let height = Math.max(MIN_TILE * (virtual.height / virtual.width), virtual.height * scale)

    if (display.isPrimary) {
      width *= PRIMARY_SCALE_BOOST
      height *= PRIMARY_SCALE_BOOST
    }

    const centerX =
      offsetX + (virtual.x - world.minX + virtual.width / 2) * scale
    const centerY =
      offsetY + (virtual.y - world.minY + virtual.height / 2) * scale

    return {
      id: display.id,
      index: index + 1,
      label: `Monitor ${index + 1}`,
      resolutionLabel: `${display.bounds.width} × ${display.bounds.height}`,
      isPrimary: display.isPrimary,
      left: centerX - width / 2,
      top: centerY - height / 2,
      width,
      height,
      virtual,
    }
  })

  return {
    tiles,
    canvasWidth: stageWidth,
    canvasHeight: stageHeight,
    scale,
    worldMinX: world.minX,
    worldMinY: world.minY,
  }
}

/** Converte delta de ponteiro (px no canvas) em unidades virtuais do desktop. */
export function canvasDeltaToVirtual(
  deltaX: number,
  deltaY: number,
  scale: number,
): { x: number; y: number } {
  if (scale <= 0) return { x: 0, y: 0 }
  return {
    x: deltaX / scale,
    y: deltaY / scale,
  }
}

export function upsertArrangementSlot(
  arrangement: MonitorArrangementSlot[],
  displayId: number,
  x: number,
  y: number,
): MonitorArrangementSlot[] {
  const next = arrangement.filter((slot) => slot.displayId !== displayId)
  next.push({ displayId, x, y })
  return next
}

/** Gera arranjo inicial espelhando os bounds do sistema. */
export function arrangementFromSystemBounds(
  displays: SystemDisplay[],
): MonitorArrangementSlot[] {
  return displays.map((display) => ({
    displayId: display.id,
    x: display.bounds.x,
    y: display.bounds.y,
  }))
}

/** Remove slots de monitores que não existem mais. */
export function pruneArrangement(
  arrangement: MonitorArrangementSlot[],
  displayIds: number[],
): MonitorArrangementSlot[] {
  const valid = new Set(displayIds)
  return arrangement.filter((slot) => valid.has(slot.displayId))
}

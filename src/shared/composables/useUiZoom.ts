import { computed, ref } from 'vue'

import { USER_PREFERENCE_KEYS } from '@shared/constants/storage-keys'
import {
  getUserPreference,
  setUserPreference,
} from '@shared/services/user-preferences'

const ZOOM_MIN = 0.7
const ZOOM_MAX = 1.5
const ZOOM_STEP = 0.1
const ZOOM_DEFAULT = 1

function clampZoom(value: number): number {
  const stepped = Math.round(value / ZOOM_STEP) * ZOOM_STEP
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(stepped.toFixed(1))))
}

function readStoredZoom(): number {
  const stored = getUserPreference<unknown>(USER_PREFERENCE_KEYS.uiZoom)
  if (typeof stored === 'number' && Number.isFinite(stored)) {
    return clampZoom(stored)
  }
  if (typeof stored === 'string') {
    const parsed = Number.parseFloat(stored)
    if (Number.isFinite(parsed)) return clampZoom(parsed)
  }
  return ZOOM_DEFAULT
}

const zoom = ref(readStoredZoom())

function applyZoom(value: number): void {
  if (typeof document === 'undefined') return
  const next = clampZoom(value)
  const root = document.documentElement
  root.style.zoom = String(next)
  root.style.setProperty('--ui-zoom', String(next))
}

function persistZoom(value: number): void {
  if (typeof localStorage === 'undefined') return
  setUserPreference(USER_PREFERENCE_KEYS.uiZoom, value)
}

/** Aplica o zoom persistido (chamar no boot). */
export function initUiZoom(): void {
  applyZoom(zoom.value)
}

export function useUiZoom() {
  const zoomPercent = computed(() => Math.round(zoom.value * 100))
  const canZoomIn = computed(() => zoom.value < ZOOM_MAX - 1e-9)
  const canZoomOut = computed(() => zoom.value > ZOOM_MIN + 1e-9)

  function setZoom(value: number): void {
    const next = clampZoom(value)
    zoom.value = next
    applyZoom(next)
    persistZoom(next)
  }

  function zoomIn(): void {
    if (!canZoomIn.value) return
    setZoom(zoom.value + ZOOM_STEP)
  }

  function zoomOut(): void {
    if (!canZoomOut.value) return
    setZoom(zoom.value - ZOOM_STEP)
  }

  function resetZoom(): void {
    setZoom(ZOOM_DEFAULT)
  }

  return {
    zoom,
    zoomPercent,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    min: ZOOM_MIN,
    max: ZOOM_MAX,
    step: ZOOM_STEP,
  }
}

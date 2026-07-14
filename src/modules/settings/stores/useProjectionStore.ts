import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  formatDisplayResolution,
  identifySystemDisplays,
  listExtendedDisplays,
  listSystemDisplays,
} from '../services/display-service'
import {
  pruneArrangement,
  upsertArrangementSlot,
} from '../services/monitor-layout'
import {
  loadProjectionSettings,
  readImageAsDataUrl,
  reconcileTargetDisplays,
  saveProjectionSettings,
  toggleTargetDisplay,
} from '../services/projection-preferences'
import type {
  LyricFontWeight,
  LyricVerticalAlign,
  MonitorArrangementSlot,
  ProjectionMonitorOption,
  ProjectionSettings,
  SystemDisplay,
} from '../types/projection'
import { DEFAULT_PROJECTION_SETTINGS } from '../types/projection'

export const useProjectionStore = defineStore('settings-projection', () => {
  const displays = ref<SystemDisplay[]>([])
  const settings = ref<ProjectionSettings>({ ...DEFAULT_PROJECTION_SETTINGS })
  const isLoadingDisplays = ref(false)
  const isIdentifying = ref(false)
  const lastErrorKey = ref<string | null>(null)

  const extendedDisplays = computed(() => listExtendedDisplays(displays.value))

  const hasCustomArrangement = computed(
    () => settings.value.monitorArrangement.length > 0,
  )

  const monitorOptions = computed<ProjectionMonitorOption[]>(() =>
    displays.value.map((display, index) => ({
      id: display.id,
      index: index + 1,
      label: `Monitor ${index + 1}`,
      resolutionLabel: formatDisplayResolution(display),
      isPrimary: display.isPrimary,
      isSelected: settings.value.targetDisplayIds.includes(display.id),
    })),
  )

  const extendedMonitorOptions = computed(() =>
    monitorOptions.value.filter((monitor) => !monitor.isPrimary),
  )

  const hasExtendedDisplays = computed(() => extendedDisplays.value.length > 0)

  function persist(next: ProjectionSettings) {
    settings.value = next
    saveProjectionSettings(next)
  }

  function patch(partial: Partial<ProjectionSettings>) {
    persist({ ...settings.value, ...partial })
  }

  async function hydrate() {
    settings.value = loadProjectionSettings()
    await refreshDisplays()
  }

  async function refreshDisplays() {
    isLoadingDisplays.value = true
    lastErrorKey.value = null

    try {
      displays.value = await listSystemDisplays()
      const displayIds = displays.value.map((d) => d.id)
      const extendedIds = listExtendedDisplays(displays.value).map((d) => d.id)
      let next = reconcileTargetDisplays(settings.value, extendedIds)
      const pruned = pruneArrangement(next.monitorArrangement, displayIds)
      if (pruned.length !== next.monitorArrangement.length) {
        next = { ...next, monitorArrangement: pruned }
      }
      if (next !== settings.value) {
        persist(next)
      }
    } catch (error) {
      console.error('[projection] refreshDisplays', error)
      lastErrorKey.value = 'settings.projection.errors.loadDisplays'
    } finally {
      isLoadingDisplays.value = false
    }
  }

  async function identifyMonitors() {
    if (isIdentifying.value) return
    isIdentifying.value = true
    lastErrorKey.value = null

    try {
      const ok = await identifySystemDisplays()
      if (!ok) {
        lastErrorKey.value = 'settings.projection.errors.identifyDesktopOnly'
      }
    } catch (error) {
      console.error('[projection] identifyMonitors', error)
      lastErrorKey.value = 'settings.projection.errors.identify'
    } finally {
      isIdentifying.value = false
    }
  }

  function setMonitorArrangement(arrangement: MonitorArrangementSlot[]) {
    patch({ monitorArrangement: arrangement })
  }

  function moveMonitorInArrangement(displayId: number, x: number, y: number) {
    const base =
      settings.value.monitorArrangement.length > 0
        ? settings.value.monitorArrangement
        : displays.value.map((display) => ({
            displayId: display.id,
            x: display.bounds.x,
            y: display.bounds.y,
          }))

    patch({
      monitorArrangement: upsertArrangementSlot(base, displayId, x, y),
    })
  }

  function resetMonitorArrangement() {
    patch({ monitorArrangement: [] })
  }

  function toggleExtendedMonitor(displayId: number) {
    persist(toggleTargetDisplay(settings.value, displayId))
  }

  function setOpenFullscreenOnPrimary(value: boolean) {
    patch({ openFullscreenOnPrimary: value })
  }

  function setDisablePrimaryWhenExtended(value: boolean) {
    patch({ disablePrimaryWhenExtended: value })
  }

  function setAutoMinimizePlayer(value: boolean) {
    patch({ autoMinimizePlayer: value })
  }

  function setLyricAlign(value: LyricVerticalAlign) {
    patch({ lyricAlign: value })
  }

  function setShowSongTitle(value: boolean) {
    patch({ showSongTitle: value })
  }

  function setCustomTextFormat(value: boolean) {
    patch({ customTextFormat: value })
  }

  function setCustomBackground(value: boolean) {
    patch({ customBackground: value })
  }

  function setFontSizePercent(value: number) {
    patch({ fontSizePercent: Math.min(200, Math.max(50, value)) })
  }

  function setFontColor(value: string) {
    patch({ fontColor: value })
  }

  function setFontWeight(value: LyricFontWeight) {
    patch({ fontWeight: value })
  }

  function setBackgroundColor(value: string) {
    patch({ backgroundColor: value })
  }

  function setBackgroundOpacity(value: number) {
    patch({ backgroundOpacity: Math.min(100, Math.max(0, value)) })
  }

  async function setBackgroundImageFromFile(file: File | null) {
    if (!file) {
      patch({ backgroundImage: null })
      return
    }

    try {
      const dataUrl = await readImageAsDataUrl(file)
      patch({ backgroundImage: dataUrl })
    } catch (error) {
      console.error('[projection] background image', error)
      lastErrorKey.value = 'settings.projection.errors.backgroundImage'
    }
  }

  function clearBackgroundImage() {
    patch({ backgroundImage: null })
  }

  function resetToDefaults() {
    persist({ ...DEFAULT_PROJECTION_SETTINGS })
    const extendedIds = listExtendedDisplays(displays.value).map((d) => d.id)
    persist(reconcileTargetDisplays(settings.value, extendedIds))
  }

  return {
    displays,
    settings,
    isLoadingDisplays,
    isIdentifying,
    lastErrorKey,
    extendedDisplays,
    hasCustomArrangement,
    monitorOptions,
    extendedMonitorOptions,
    hasExtendedDisplays,
    hydrate,
    refreshDisplays,
    identifyMonitors,
    setMonitorArrangement,
    moveMonitorInArrangement,
    resetMonitorArrangement,
    toggleExtendedMonitor,
    setOpenFullscreenOnPrimary,
    setDisablePrimaryWhenExtended,
    setAutoMinimizePlayer,
    setLyricAlign,
    setShowSongTitle,
    setCustomTextFormat,
    setCustomBackground,
    setFontSizePercent,
    setFontColor,
    setFontWeight,
    setBackgroundColor,
    setBackgroundOpacity,
    setBackgroundImageFromFile,
    clearBackgroundImage,
    resetToDefaults,
  }
})

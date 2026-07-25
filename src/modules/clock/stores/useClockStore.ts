import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  closeProjectionModule,
  isProjectionModuleOpen,
  openProjectionModule,
} from '@shared/composables/useProjectionWindow'

import {
  loadClockConfig,
  saveClockConfig,
} from '../services/clock-preferences'
import {
  DEFAULT_CLOCK_CONFIG,
  type ClockConfig,
  type ClockStyle,
} from '../types/clock'

export const useClockStore = defineStore('clock', () => {
  const config = ref<ClockConfig>({ ...DEFAULT_CLOCK_CONFIG })
  const isProjecting = ref(false)
  const configOpen = ref(false)
  const hydrated = ref(false)

  let projectionWatchTimer: ReturnType<typeof setInterval> | null = null

  const isAnalog = computed(() => config.value.style === 'analog')

  function stopProjectionWatch() {
    if (!projectionWatchTimer) return
    clearInterval(projectionWatchTimer)
    projectionWatchTimer = null
  }

  function startProjectionWatch() {
    stopProjectionWatch()
    projectionWatchTimer = setInterval(() => {
      if (!isProjectionModuleOpen('clock')) {
        isProjecting.value = false
        stopProjectionWatch()
      }
    }, 400)
  }

  function hydrate() {
    if (hydrated.value) return
    config.value = loadClockConfig()
    isProjecting.value = isProjectionModuleOpen('clock')
    if (isProjecting.value) startProjectionWatch()
    hydrated.value = true
  }

  function persist() {
    saveClockConfig(config.value)
  }

  function setStyle(style: ClockStyle) {
    config.value = { ...config.value, style }
    persist()
  }

  function setShowSeconds(showSeconds: boolean) {
    config.value = { ...config.value, showSeconds }
    persist()
  }

  function setFormat24h(format24h: boolean) {
    config.value = { ...config.value, format24h }
    persist()
  }

  function setBgColor(bgColor: string) {
    config.value = { ...config.value, bgColor }
    persist()
  }

  function setTextColor(textColor: string) {
    config.value = { ...config.value, textColor }
    persist()
  }

  function resetToDefault() {
    config.value = { ...DEFAULT_CLOCK_CONFIG }
    persist()
  }

  function openConfig() {
    configOpen.value = true
  }

  function closeConfig() {
    configOpen.value = false
  }

  async function syncProjection() {
    const opened = await openProjectionModule('clock')
    isProjecting.value = opened
    if (opened) startProjectionWatch()
    else stopProjectionWatch()
  }

  function clearProjection() {
    closeProjectionModule()
    isProjecting.value = false
    stopProjectionWatch()
  }

  async function toggleProjection() {
    if (isProjecting.value && isProjectionModuleOpen('clock')) {
      clearProjection()
      return
    }
    await syncProjection()
  }

  return {
    config,
    isProjecting,
    configOpen,
    hydrated,
    isAnalog,
    hydrate,
    setStyle,
    setShowSeconds,
    setFormat24h,
    setBgColor,
    setTextColor,
    resetToDefault,
    openConfig,
    closeConfig,
    toggleProjection,
    syncProjection,
    clearProjection,
  }
})

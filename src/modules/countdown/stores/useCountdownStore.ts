import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  closeProjectionModule,
  isProjectionModuleOpen,
  openProjectionModule,
} from '@shared/composables/useProjectionWindow'

import {
  computeElapsedMs,
  computeRemainingMs,
} from '../services/countdown-format'
import {
  loadCountdownDisplayConfig,
  saveCountdownDisplayConfig,
} from '../services/countdown-preferences'
import {
  publishCountdownRuntime,
  readCountdownRuntimeFromStorage,
} from '../services/countdown-runtime'
import {
  DEFAULT_COUNTDOWN_DISPLAY_CONFIG,
  DEFAULT_COUNTDOWN_DURATION_MS,
  DEFAULT_COUNTDOWN_RUNTIME,
  type CountdownDisplayConfig,
  type CountdownRuntimeState,
  type CountdownTimeFormat,
} from '../types/countdown'

export const useCountdownStore = defineStore('countdown', () => {
  const config = ref<CountdownDisplayConfig>({ ...DEFAULT_COUNTDOWN_DISPLAY_CONFIG })
  const runtime = ref<CountdownRuntimeState>({
    ...DEFAULT_COUNTDOWN_RUNTIME,
    savedTimesMs: [],
    durationMs: DEFAULT_COUNTDOWN_DURATION_MS,
  })
  const isProjecting = ref(false)
  const configOpen = ref(false)
  const hydrated = ref(false)

  let projectionWatchTimer: ReturnType<typeof setInterval> | null = null
  let finishWatchTimer: ReturnType<typeof setInterval> | null = null

  const isRunning = computed(() => runtime.value.status === 'running')
  const isPaused = computed(() => runtime.value.status === 'paused')
  const canStart = computed(
    () => runtime.value.durationMs > 0 && !runtime.value.finished,
  )

  function stopProjectionWatch() {
    if (!projectionWatchTimer) return
    clearInterval(projectionWatchTimer)
    projectionWatchTimer = null
  }

  function startProjectionWatch() {
    stopProjectionWatch()
    projectionWatchTimer = setInterval(() => {
      if (!isProjectionModuleOpen('countdown')) {
        isProjecting.value = false
        stopProjectionWatch()
      }
    }, 400)
  }

  function stopFinishWatch() {
    if (!finishWatchTimer) return
    clearInterval(finishWatchTimer)
    finishWatchTimer = null
  }

  function checkFinished() {
    if (runtime.value.status !== 'running' || runtime.value.finished) return

    const remaining = computeRemainingMs(
      runtime.value.durationMs,
      runtime.value.accumulatedMs,
      runtime.value.segmentStartedAt,
      'running',
      Date.now(),
    )

    if (remaining > 0) return

    const elapsed = computeElapsedMs(
      runtime.value.accumulatedMs,
      runtime.value.segmentStartedAt,
      'running',
      Date.now(),
    )

    runtime.value = {
      ...runtime.value,
      status: 'paused',
      segmentStartedAt: null,
      accumulatedMs: Math.min(elapsed, runtime.value.durationMs),
      finished: true,
    }
    syncRuntime()
    stopFinishWatch()
  }

  function startFinishWatch() {
    stopFinishWatch()
    finishWatchTimer = setInterval(checkFinished, 50)
  }

  function syncRuntime() {
    publishCountdownRuntime(runtime.value)
  }

  function hydrate() {
    if (hydrated.value) return
    config.value = loadCountdownDisplayConfig()
    runtime.value = readCountdownRuntimeFromStorage()
    isProjecting.value = isProjectionModuleOpen('countdown')
    if (isProjecting.value) startProjectionWatch()
    if (runtime.value.status === 'running') startFinishWatch()
    hydrated.value = true
  }

  function persistConfig() {
    saveCountdownDisplayConfig(config.value)
  }

  function setTimeFormat(timeFormat: CountdownTimeFormat) {
    config.value = { ...config.value, timeFormat }
    persistConfig()
  }

  function setBgColor(bgColor: string) {
    config.value = { ...config.value, bgColor }
    persistConfig()
  }

  function setTextColor(textColor: string) {
    config.value = { ...config.value, textColor }
    persistConfig()
  }

  function resetDisplayToDefault() {
    config.value = { ...DEFAULT_COUNTDOWN_DISPLAY_CONFIG }
    persistConfig()
  }

  function openConfig() {
    configOpen.value = true
  }

  function closeConfig() {
    configOpen.value = false
  }

  function setDurationMs(durationMs: number) {
    if (runtime.value.status === 'running') return

    const next = Math.max(0, Math.floor(durationMs))
    runtime.value = {
      ...runtime.value,
      durationMs: next,
      accumulatedMs: 0,
      segmentStartedAt: null,
      status: 'idle',
      finished: false,
    }
    syncRuntime()
  }

  function start() {
    if (runtime.value.status === 'running') return
    if (runtime.value.durationMs <= 0 || runtime.value.finished) return

    const remaining = computeRemainingMs(
      runtime.value.durationMs,
      runtime.value.accumulatedMs,
      null,
      'paused',
      Date.now(),
    )
    if (remaining <= 0) {
      runtime.value = { ...runtime.value, finished: true, status: 'idle' }
      syncRuntime()
      return
    }

    runtime.value = {
      ...runtime.value,
      status: 'running',
      segmentStartedAt: Date.now(),
      finished: false,
    }
    syncRuntime()
    startFinishWatch()
  }

  function pause() {
    if (runtime.value.status !== 'running' || runtime.value.segmentStartedAt == null) {
      return
    }

    const elapsed = computeElapsedMs(
      runtime.value.accumulatedMs,
      runtime.value.segmentStartedAt,
      'running',
      Date.now(),
    )

    runtime.value = {
      ...runtime.value,
      status: 'paused',
      segmentStartedAt: null,
      accumulatedMs: Math.min(elapsed, runtime.value.durationMs),
    }
    syncRuntime()
    stopFinishWatch()
  }

  function reset() {
    const keepRunning = runtime.value.status === 'running'

    runtime.value = {
      ...runtime.value,
      status: keepRunning ? 'running' : 'idle',
      segmentStartedAt: keepRunning ? Date.now() : null,
      accumulatedMs: 0,
      finished: false,
    }
    syncRuntime()
    if (keepRunning) startFinishWatch()
    else stopFinishWatch()
  }

  function saveMark() {
    const remaining = computeRemainingMs(
      runtime.value.durationMs,
      runtime.value.accumulatedMs,
      runtime.value.segmentStartedAt,
      runtime.value.status,
      Date.now(),
    )

    runtime.value = {
      ...runtime.value,
      savedTimesMs: [...runtime.value.savedTimesMs, remaining],
    }
    syncRuntime()
  }

  function removeSavedMark(index: number) {
    runtime.value = {
      ...runtime.value,
      savedTimesMs: runtime.value.savedTimesMs.filter((_, i) => i !== index),
    }
    syncRuntime()
  }

  function clearSavedMarks() {
    runtime.value = {
      ...runtime.value,
      savedTimesMs: [],
    }
    syncRuntime()
  }

  async function syncProjection() {
    syncRuntime()
    const opened = await openProjectionModule('countdown')
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
    if (isProjecting.value && isProjectionModuleOpen('countdown')) {
      clearProjection()
      return
    }
    await syncProjection()
  }

  return {
    config,
    runtime,
    isProjecting,
    configOpen,
    hydrated,
    isRunning,
    isPaused,
    canStart,
    hydrate,
    setTimeFormat,
    setBgColor,
    setTextColor,
    resetDisplayToDefault,
    openConfig,
    closeConfig,
    setDurationMs,
    start,
    pause,
    reset,
    saveMark,
    removeSavedMark,
    clearSavedMarks,
    toggleProjection,
    syncProjection,
    clearProjection,
  }
})

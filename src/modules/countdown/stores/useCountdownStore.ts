import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  closeProjectionModule,
  hasSelectedExtendedProjectionTargets,
  isProjectionModuleOpen,
  openProjectionModule,
} from '@shared/composables/useProjectionWindow'
import { isPalcoTvOnlyRoute } from '../../settings/services/palco-routing'

import {
  computeCountdownRemainingMs,
  computeElapsedMs,
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
  type CountdownMode,
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
  const projectingTvsOnly = ref(false)
  /** Preview no operador (1 monitor / sem tela de projeção marcada). */
  const inAppPreview = ref(false)
  const configOpen = ref(false)
  const hydrated = ref(false)

  let projectionWatchTimer: ReturnType<typeof setInterval> | null = null
  let finishWatchTimer: ReturnType<typeof setInterval> | null = null

  const isRunning = computed(() => runtime.value.status === 'running')
  const isPaused = computed(() => runtime.value.status === 'paused')
  /** Pode iniciar/retomar — inclusive em overtime pausado. */
  const canStart = computed(() => {
    if (runtime.value.status === 'running') return false
    if (runtime.value.mode === 'until') return true
    return runtime.value.durationMs > 0
  })

  const isUntilMode = computed(() => runtime.value.mode === 'until')

  function stopProjectionWatch() {
    if (!projectionWatchTimer) return
    clearInterval(projectionWatchTimer)
    projectionWatchTimer = null
  }

  function startProjectionWatch() {
    stopProjectionWatch()
    projectionWatchTimer = setInterval(() => {
      if (projectingTvsOnly.value || inAppPreview.value) return
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

  /** Marca esgotado ao cruzar zero, mas segue rodando em negativo. */
  function checkFinished() {
    if (runtime.value.status !== 'running' || runtime.value.finished) return

    const remaining = computeCountdownRemainingMs(runtime.value, Date.now())

    if (remaining > 0) return

    runtime.value = {
      ...runtime.value,
      finished: true,
    }
    syncRuntime()
  }

  function startFinishWatch() {
    stopFinishWatch()
    finishWatchTimer = setInterval(checkFinished, 50)
  }

  function syncRuntime() {
    publishCountdownRuntime({ ...runtime.value, projecting: isProjecting.value })
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
      mode: 'duration',
      durationMs: next,
      accumulatedMs: 0,
      segmentStartedAt: null,
      status: 'idle',
      finished: false,
      pausedRemainingMs: null,
    }
    syncRuntime()
  }

  function setCountdownMode(mode: CountdownMode) {
    if (runtime.value.status === 'running') return
    runtime.value = {
      ...runtime.value,
      mode,
      accumulatedMs: 0,
      segmentStartedAt: null,
      status: 'idle',
      finished: false,
      pausedRemainingMs: null,
    }
    syncRuntime()
  }

  function setUntilTime(untilHour: number, untilMinute: number) {
    if (runtime.value.status === 'running') return
    const hour = Math.min(23, Math.max(0, Math.floor(untilHour) || 0))
    const minute = Math.min(59, Math.max(0, Math.floor(untilMinute) || 0))
    runtime.value = {
      ...runtime.value,
      mode: 'until',
      untilHour: hour,
      untilMinute: minute,
      accumulatedMs: 0,
      segmentStartedAt: null,
      status: 'idle',
      finished: false,
      pausedRemainingMs: null,
    }
    syncRuntime()
  }

  function start() {
    if (runtime.value.status === 'running') return
    if (runtime.value.mode !== 'until' && runtime.value.durationMs <= 0) return

    runtime.value = {
      ...runtime.value,
      status: 'running',
      segmentStartedAt: Date.now(),
      pausedRemainingMs: null,
    }
    syncRuntime()
    startFinishWatch()
  }

  function pause() {
    if (runtime.value.status !== 'running') return

    const now = Date.now()
    if (runtime.value.mode === 'until') {
      runtime.value = {
        ...runtime.value,
        status: 'paused',
        segmentStartedAt: null,
        pausedRemainingMs: computeCountdownRemainingMs(runtime.value, now),
      }
      syncRuntime()
      stopFinishWatch()
      return
    }

    if (runtime.value.segmentStartedAt == null) return

    const elapsed = computeElapsedMs(
      runtime.value.accumulatedMs,
      runtime.value.segmentStartedAt,
      'running',
      now,
    )

    runtime.value = {
      ...runtime.value,
      status: 'paused',
      segmentStartedAt: null,
      // Não limita à duração: preserva overtime negativo ao retomar.
      accumulatedMs: elapsed,
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
      pausedRemainingMs: null,
    }
    syncRuntime()
    if (keepRunning) startFinishWatch()
    else stopFinishWatch()
  }

  function saveMark() {
    const remaining = computeCountdownRemainingMs(runtime.value, Date.now())

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
    if (isPalcoTvOnlyRoute('countdown')) {
      isProjecting.value = true
      projectingTvsOnly.value = true
      inAppPreview.value = false
      syncRuntime()
      startProjectionWatch()
      return
    }
    projectingTvsOnly.value = false
    const hasExternal = await hasSelectedExtendedProjectionTargets()
    if (!hasExternal) {
      closeProjectionModule()
      isProjecting.value = true
      inAppPreview.value = true
      syncRuntime()
      startProjectionWatch()
      return
    }
    inAppPreview.value = false
    const opened = await openProjectionModule('countdown')
    isProjecting.value = opened
    syncRuntime()
    if (opened) startProjectionWatch()
    else stopProjectionWatch()
  }

  function clearProjection() {
    isProjecting.value = false
    projectingTvsOnly.value = false
    inAppPreview.value = false
    syncRuntime()
    stopProjectionWatch()
    closeProjectionModule()
  }

  async function toggleProjection() {
    if (isProjecting.value && (isProjectionModuleOpen('countdown') || projectingTvsOnly.value || inAppPreview.value)) {
      clearProjection()
      return
    }
    await syncProjection()
  }

  return {
    config,
    runtime,
    isProjecting,
    inAppPreview,
    configOpen,
    hydrated,
    isRunning,
    isPaused,
    canStart,
    isUntilMode,
    hydrate,
    setTimeFormat,
    setBgColor,
    setTextColor,
    resetDisplayToDefault,
    openConfig,
    closeConfig,
    setDurationMs,
    setCountdownMode,
    setUntilTime,
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

import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'

import { computeElapsedMs, formatElapsedMs } from '../services/timer-format'
import type { TimerDisplayConfig, TimerRuntimeState } from '../types/timer'
import { useTimerStore } from '../stores/useTimerStore'

export function useTimerTick(active: MaybeRefOrGetter<boolean> = true) {
  const now = ref(Date.now())
  let frameId = 0

  function tick() {
    if (toValue(active)) {
      now.value = Date.now()
    }
    frameId = requestAnimationFrame(tick)
  }

  onMounted(() => {
    frameId = requestAnimationFrame(tick)
  })

  onUnmounted(() => {
    cancelAnimationFrame(frameId)
  })

  return { now }
}

export function useTimerDisplay(
  configSource?: MaybeRefOrGetter<TimerDisplayConfig>,
  runtimeSource?: MaybeRefOrGetter<TimerRuntimeState>,
) {
  const store = useTimerStore()
  const config = computed(() => toValue(configSource) ?? store.config)
  const runtime = computed(() => toValue(runtimeSource) ?? store.runtime)
  const { now } = useTimerTick(() => runtime.value.status === 'running')

  const elapsedMs = computed(() =>
    computeElapsedMs(
      runtime.value.accumulatedMs,
      runtime.value.segmentStartedAt,
      runtime.value.status,
      now.value,
    ),
  )

  const formattedTime = computed(() =>
    formatElapsedMs(elapsedMs.value, config.value.timeFormat),
  )

  return {
    now,
    config,
    runtime,
    elapsedMs,
    formattedTime,
  }
}

export function useTimerFeature() {
  const store = useTimerStore()

  store.hydrate()

  return {
    config: computed(() => store.config),
    runtime: computed(() => store.runtime),
    isProjecting: computed(() => store.isProjecting),
    configOpen: computed(() => store.configOpen),
    isRunning: computed(() => store.isRunning),
    isPaused: computed(() => store.isPaused),
    setTimeFormat: store.setTimeFormat,
    setBgColor: store.setBgColor,
    setTextColor: store.setTextColor,
    resetDisplayToDefault: store.resetDisplayToDefault,
    openConfig: store.openConfig,
    closeConfig: store.closeConfig,
    start: store.start,
    pause: store.pause,
    reset: store.reset,
    saveMark: store.saveMark,
    removeSavedMark: store.removeSavedMark,
    clearSavedMarks: store.clearSavedMarks,
    toggleProjection: store.toggleProjection,
    syncProjection: store.syncProjection,
    clearProjection: store.clearProjection,
  }
}

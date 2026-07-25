import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'

import type { ClockConfig } from '../types/clock'
import { useClockStore } from '../stores/useClockStore'

export function useClockTick() {
  const now = ref(new Date())
  let frameId = 0

  function tick() {
    now.value = new Date()
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

export function useClockDisplay(configSource?: MaybeRefOrGetter<ClockConfig>) {
  const store = useClockStore()
  const { now } = useClockTick()

  const config = computed(() => toValue(configSource) ?? store.config)

  const hourAngle = computed(() => {
    const h = now.value.getHours() % 12
    const m = now.value.getMinutes()
    return h * 30 + m * 0.5
  })

  const minuteAngle = computed(() => {
    const m = now.value.getMinutes()
    const s = now.value.getSeconds()
    return m * 6 + s * 0.1
  })

  const secondAngle = computed(() => {
    const s = now.value.getSeconds()
    const ms = now.value.getMilliseconds()
    return s * 6 + ms * 0.006
  })

  const formattedTime = computed(() => {
    const opts: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !config.value.format24h,
    }
    return now.value
      .toLocaleTimeString('pt-BR', opts)
      .replace(/[a-zA-Z\s]/g, '')
  })

  const formattedSeconds = computed(() =>
    now.value.getSeconds().toString().padStart(2, '0'),
  )

  const ampm = computed(() => (now.value.getHours() >= 12 ? 'PM' : 'AM'))

  return {
    now,
    config,
    hourAngle,
    minuteAngle,
    secondAngle,
    formattedTime,
    formattedSeconds,
    ampm,
  }
}

export function useClockFeature() {
  const store = useClockStore()

  store.hydrate()

  return {
    config: computed(() => store.config),
    isProjecting: computed(() => store.isProjecting),
    configOpen: computed(() => store.configOpen),
    isAnalog: computed(() => store.isAnalog),
    setStyle: store.setStyle,
    setShowSeconds: store.setShowSeconds,
    setFormat24h: store.setFormat24h,
    setBgColor: store.setBgColor,
    setTextColor: store.setTextColor,
    resetToDefault: store.resetToDefault,
    openConfig: store.openConfig,
    closeConfig: store.closeConfig,
    syncProjection: store.syncProjection,
    clearProjection: store.clearProjection,
    toggleProjection: store.toggleProjection,
  }
}

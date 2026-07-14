import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  closeProjectionModule,
  isProjectionModuleOpen,
  openProjectionModule,
} from '@shared/composables/useProjectionWindow'

import {
  buildNumberRange,
  mergeUniqueNames,
  parseNameListFromText,
  remainingCandidates,
  runDrawAnimation,
} from '../services/random-draw'
import {
  loadRandomDisplayConfig,
  loadRandomSession,
  saveRandomDisplayConfig,
  saveRandomSession,
} from '../services/random-preferences'
import {
  publishRandomRuntime,
} from '../services/random-runtime'
import {
  DEFAULT_RANDOM_DISPLAY_CONFIG,
  DEFAULT_RANDOM_RUNTIME,
  RANDOM_FONT_SIZE_MAX,
  RANDOM_FONT_SIZE_MIN,
  activeModePool,
  emptyModePool,
  type RandomAnimationSpeed,
  type RandomDisplayConfig,
  type RandomDrawMode,
  type RandomModePool,
  type RandomRuntimeState,
  type RandomSessionState,
  type RandomTextTransform,
} from '../types/random'

function createDefaultSession(): RandomSessionState {
  return {
    mode: 'names',
    names: emptyModePool(),
    numbers: emptyModePool(),
    numberMin: 1,
    numberMax: 100,
  }
}

function patchActivePool(
  session: RandomSessionState,
  patch: Partial<RandomModePool>,
): RandomSessionState {
  if (session.mode === 'names') {
    return {
      ...session,
      names: { ...session.names, ...patch },
    }
  }

  return {
    ...session,
    numbers: { ...session.numbers, ...patch },
  }
}

export const useRandomStore = defineStore('random', () => {
  const config = ref<RandomDisplayConfig>({ ...DEFAULT_RANDOM_DISPLAY_CONFIG })
  const session = ref<RandomSessionState>(createDefaultSession())
  const runtime = ref<RandomRuntimeState>({ ...DEFAULT_RANDOM_RUNTIME })
  const draftName = ref('')
  const isProjecting = ref(false)
  const configOpen = ref(false)
  const hydrated = ref(false)
  const rangeError = ref<'invalid' | 'tooLarge' | null>(null)

  let projectionWatchTimer: ReturnType<typeof setInterval> | null = null
  let cancelAnimation: (() => void) | null = null

  const activePool = computed(() => activeModePool(session.value))

  const available = computed(() => activePool.value.available)
  const drawn = computed(() => activePool.value.drawn)

  const undrawn = computed(() =>
    remainingCandidates(available.value, drawn.value),
  )

  const canDraw = computed(
    () => undrawn.value.length > 0 && !runtime.value.isDrawing,
  )

  const drawnReversed = computed(() => [...drawn.value].reverse())

  /** Sessão “achatada” para as views (modo ativo). */
  const viewSession = computed(() => ({
    mode: session.value.mode,
    available: available.value,
    drawn: drawn.value,
    numberMin: session.value.numberMin,
    numberMax: session.value.numberMax,
  }))

  function stopProjectionWatch() {
    if (!projectionWatchTimer) return
    clearInterval(projectionWatchTimer)
    projectionWatchTimer = null
  }

  function startProjectionWatch() {
    stopProjectionWatch()
    projectionWatchTimer = setInterval(() => {
      if (!isProjectionModuleOpen('random')) {
        isProjecting.value = false
        stopProjectionWatch()
      }
    }, 400)
  }

  function syncRuntime() {
    publishRandomRuntime(runtime.value)
  }

  function persistSession() {
    saveRandomSession(session.value)
  }

  function persistConfig() {
    saveRandomDisplayConfig(config.value)
  }

  function hydrate() {
    if (hydrated.value) return
    config.value = loadRandomDisplayConfig()
    session.value = loadRandomSession()
    const pool = activeModePool(session.value)
    runtime.value = {
      currentDisplay: pool.currentDisplay,
      isDrawing: false,
    }
    syncRuntime()
    isProjecting.value = isProjectionModuleOpen('random')
    if (isProjecting.value) startProjectionWatch()
    hydrated.value = true
  }

  function setMode(mode: RandomDrawMode) {
    if (session.value.mode === mode) return
    cancelDrawAnimation()

    // Guarda o display do modo atual antes de trocar
    session.value = patchActivePool(session.value, {
      currentDisplay: runtime.value.currentDisplay,
    })

    session.value = {
      ...session.value,
      mode,
    }

    const nextPool = activeModePool(session.value)
    runtime.value = {
      currentDisplay: nextPool.currentDisplay,
      isDrawing: false,
    }
    draftName.value = ''
    rangeError.value = null
    persistSession()
    syncRuntime()
  }

  function setNumberMin(value: number) {
    session.value = { ...session.value, numberMin: value }
  }

  function setNumberMax(value: number) {
    session.value = { ...session.value, numberMax: value }
  }

  function setDraftName(value: string) {
    draftName.value = value
  }

  function addName(raw?: string) {
    const name = (raw ?? draftName.value).trim()
    if (!name) return false
    if (available.value.includes(name)) {
      draftName.value = ''
      return false
    }

    session.value = patchActivePool(session.value, {
      available: [...available.value, name],
    })
    draftName.value = ''
    persistSession()
    return true
  }

  function removeAvailable(index: number) {
    if (index < 0 || index >= available.value.length) return
    const next = [...available.value]
    next.splice(index, 1)
    session.value = patchActivePool(session.value, { available: next })
    persistSession()
  }

  function clearAvailable() {
    session.value = patchActivePool(session.value, { available: [] })
    persistSession()
  }

  function removeDrawn(index: number) {
    if (index < 0 || index >= drawn.value.length) return
    const next = [...drawn.value]
    next.splice(index, 1)
    session.value = patchActivePool(session.value, { drawn: next })
    persistSession()
  }

  function clearHistory() {
    session.value = patchActivePool(session.value, {
      drawn: [],
      currentDisplay: '',
    })
    runtime.value = {
      ...runtime.value,
      currentDisplay: '',
      isDrawing: false,
    }
    persistSession()
    syncRuntime()
  }

  function resetAll() {
    cancelDrawAnimation()
    // Limpa os dois modos
    session.value = {
      ...session.value,
      names: emptyModePool(),
      numbers: emptyModePool(),
    }
    runtime.value = { ...DEFAULT_RANDOM_RUNTIME }
    draftName.value = ''
    rangeError.value = null
    persistSession()
    syncRuntime()
  }

  function importNamesFromText(text: string): number {
    const parsed = parseNameListFromText(text)
    const { next, addedCount } = mergeUniqueNames(available.value, parsed)
    if (addedCount > 0) {
      session.value = patchActivePool(session.value, { available: next })
      persistSession()
    }
    return addedCount
  }

  function generateNumberRange(): boolean {
    const result = buildNumberRange(session.value.numberMin, session.value.numberMax)
    if (!result.ok) {
      rangeError.value = result.reason
      return false
    }

    cancelDrawAnimation()
    rangeError.value = null
    session.value = patchActivePool(session.value, {
      available: result.values,
      drawn: [],
      currentDisplay: '',
    })
    runtime.value = { ...DEFAULT_RANDOM_RUNTIME }
    persistSession()
    syncRuntime()
    return true
  }

  function cancelDrawAnimation() {
    cancelAnimation?.()
    cancelAnimation = null
  }

  function startDraw() {
    const pool = undrawn.value
    if (pool.length === 0 || runtime.value.isDrawing) return

    cancelDrawAnimation()
    runtime.value = {
      ...runtime.value,
      isDrawing: true,
    }
    syncRuntime()

    cancelAnimation = runDrawAnimation(pool, config.value.animationSpeed, {
      onTick: (candidate) => {
        runtime.value = {
          currentDisplay: candidate,
          isDrawing: true,
        }
        syncRuntime()
      },
      onFinish: (winner) => {
        cancelAnimation = null
        runtime.value = {
          currentDisplay: winner,
          isDrawing: false,
        }
        session.value = patchActivePool(session.value, {
          drawn: [...drawn.value, winner],
          currentDisplay: winner,
        })
        persistSession()
        syncRuntime()
      },
    })
  }

  function setBgColor(bgColor: string) {
    config.value = { ...config.value, bgColor }
    persistConfig()
  }

  function setTextColor(textColor: string) {
    config.value = { ...config.value, textColor }
    persistConfig()
  }

  function setFontSizePc(fontSizePc: number) {
    const next = Math.min(
      RANDOM_FONT_SIZE_MAX,
      Math.max(RANDOM_FONT_SIZE_MIN, Math.round(fontSizePc)),
    )
    config.value = { ...config.value, fontSizePc: next }
    persistConfig()
  }

  function setTextTransform(textTransform: RandomTextTransform) {
    config.value = { ...config.value, textTransform }
    persistConfig()
  }

  function setAnimationSpeed(animationSpeed: RandomAnimationSpeed) {
    config.value = { ...config.value, animationSpeed }
    persistConfig()
  }

  function resetDisplayToDefault() {
    config.value = { ...DEFAULT_RANDOM_DISPLAY_CONFIG }
    persistConfig()
  }

  function openConfig() {
    configOpen.value = true
  }

  function closeConfig() {
    configOpen.value = false
  }

  async function syncProjection() {
    syncRuntime()
    const opened = await openProjectionModule('random')
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
    if (isProjecting.value && isProjectionModuleOpen('random')) {
      clearProjection()
      return
    }
    await syncProjection()
  }

  return {
    config,
    session: viewSession,
    runtime,
    draftName,
    isProjecting,
    configOpen,
    hydrated,
    rangeError,
    available,
    drawn,
    undrawn,
    canDraw,
    drawnReversed,
    hydrate,
    setMode,
    setNumberMin,
    setNumberMax,
    setDraftName,
    addName,
    removeAvailable,
    clearAvailable,
    removeDrawn,
    clearHistory,
    resetAll,
    importNamesFromText,
    generateNumberRange,
    startDraw,
    cancelDrawAnimation,
    setBgColor,
    setTextColor,
    setFontSizePc,
    setTextTransform,
    setAnimationSpeed,
    resetDisplayToDefault,
    openConfig,
    closeConfig,
    toggleProjection,
    syncProjection,
    clearProjection,
  }
})

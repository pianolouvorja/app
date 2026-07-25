import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { BootstrapPhase } from '@modules/starting/types/bootstrap'

export const useStartingStore = defineStore('starting', () => {
  /** Overlay de boot visível (inclui first-boot e warm boot). */
  const isVisible = ref(true)
  /** Conteúdo da splash — true desde o início para não ficar tela preta. */
  const showContent = ref(true)
  /** Libera o shell (RouterView) só depois do boot. */
  const isAppReady = ref(false)
  const progress = ref(0)
  const phase = ref<BootstrapPhase>('idle')
  const isFirstBoot = ref(false)
  const hasError = ref(false)
  const statusKey = ref('starting.status.booting')

  function setProgress(value: number) {
    progress.value = Math.max(0, Math.min(100, Math.round(value)))
  }

  function setStatus(key: string) {
    statusKey.value = key
  }

  function resetError() {
    hasError.value = false
  }

  function markError(key = 'starting.status.error') {
    hasError.value = true
    phase.value = 'error'
    statusKey.value = key
  }

  function hide() {
    isVisible.value = false
    isAppReady.value = true
    phase.value = 'done'

    const staticSplash = document.getElementById('boot-splash')
    if (staticSplash) {
      staticSplash.hidden = true
    }
  }

  function revealOverlay() {
    isVisible.value = true
    showContent.value = true
    isAppReady.value = false

    const staticSplash = document.getElementById('boot-splash')
    if (staticSplash) {
      staticSplash.hidden = true
    }
  }

  return {
    isVisible,
    showContent,
    isAppReady,
    progress,
    phase,
    isFirstBoot,
    hasError,
    statusKey,
    setProgress,
    setStatus,
    resetError,
    markError,
    hide,
    revealOverlay,
  }
})

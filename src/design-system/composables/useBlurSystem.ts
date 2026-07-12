import { computed } from 'vue'

import { blur, type BlurToken } from '@design-system/tokens'

import { useThemeManager } from './useThemeManager'

/** Acesso focado à intensidade de blur (Glass / BlurSystem). */
export function useBlurSystem() {
  const { blurLevel, currentBlur, setBlur } = useThemeManager()

  const backdropFilter = computed(
    () => `blur(${currentBlur.value}) saturate(140%)`,
  )

  function setBlurLevel(level: BlurToken) {
    setBlur(level)
  }

  return {
    blurLevel,
    currentBlur,
    blurTokens: blur,
    backdropFilter,
    setBlurLevel,
  }
}

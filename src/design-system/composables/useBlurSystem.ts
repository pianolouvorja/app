import { computed } from 'vue'

import { blur, type BlurToken } from '@design-system/tokens'

import { useThemeManager } from './useThemeManager'

/** Acesso focado à intensidade de vidro (blur + fill). */
export function useBlurSystem() {
  const {
    glassIntensity,
    blurLevel,
    currentBlur,
    currentGlassFill,
    setGlassIntensity,
    setBlur,
  } = useThemeManager()

  const backdropFilter = computed(
    () => `blur(${currentBlur.value}) saturate(140%)`,
  )

  function setBlurLevel(level: BlurToken) {
    setBlur(level)
  }

  return {
    glassIntensity,
    blurLevel,
    currentBlur,
    currentGlassFill,
    blurTokens: blur,
    backdropFilter,
    setBlurLevel,
    setGlassIntensity,
  }
}

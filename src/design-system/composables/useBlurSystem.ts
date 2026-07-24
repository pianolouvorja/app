import { type BlurToken, blur } from '@design-system/tokens'
import { computed } from 'vue'

import { useThemeManager } from './useThemeManager'

/** Acesso focado à intensidade de vidro (blur + fill). */
export function useBlurSystem() {
  const { glassIntensity, blurLevel, currentBlur, currentGlassFill, setGlassIntensity, setBlur } =
    useThemeManager()

  const backdropFilter = computed(() => `blur(${currentBlur.value}) saturate(140%)`)

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

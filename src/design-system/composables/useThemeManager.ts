import { computed, ref, watchEffect } from 'vue'

import { blur as blurTokens, type BlurToken } from '@design-system/tokens'
import {
  defaultTheme,
  themes,
  type ThemeKey,
} from '@design-system/themes'

const themeKey = ref<ThemeKey>(defaultTheme)
const blurLevel = ref<BlurToken>('default')
let isWatching = false

function applyCssVars(target: HTMLElement = document.documentElement) {
  const theme = themes[themeKey.value]
  Object.entries(theme.cssVars).forEach(([key, value]) => {
    target.style.setProperty(key, value)
  })
  target.style.setProperty('--ds-blur-active', blurTokens[blurLevel.value])
  target.dataset.theme = theme.id
  target.dataset.mode = theme.mode
}

function ensureWatch() {
  if (isWatching || typeof document === 'undefined') return
  isWatching = true
  watchEffect(() => {
    applyCssVars()
  })
}

export function useThemeManager() {
  ensureWatch()

  const currentTheme = computed(() => themes[themeKey.value])
  const currentBlur = computed(() => blurTokens[blurLevel.value])

  function setTheme(key: ThemeKey) {
    themeKey.value = key
  }

  function toggleTheme() {
    themeKey.value =
      themeKey.value === 'etherealLumens' ? 'luminousClarity' : 'etherealLumens'
  }

  function setBlur(level: BlurToken) {
    blurLevel.value = level
  }

  return {
    themeKey,
    blurLevel,
    currentTheme,
    currentBlur,
    themes,
    setTheme,
    toggleTheme,
    setBlur,
    applyCssVars,
  }
}

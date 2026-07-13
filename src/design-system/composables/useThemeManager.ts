import { computed, ref, watchEffect } from 'vue'

import { blur as blurTokens, type BlurToken } from '@design-system/tokens'
import {
  defaultTheme,
  themes,
  type ThemeKey,
} from '@design-system/themes'
import { USER_PREFERENCE_KEYS } from '@shared/constants/storage-keys'
import {
  getUserPreference,
  setUserPreference,
} from '@shared/services/user-preferences'

function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in themes
}

function isBlurToken(value: unknown): value is BlurToken {
  return typeof value === 'string' && value in blurTokens
}

function readStoredTheme(): ThemeKey {
  const stored = getUserPreference<unknown>(USER_PREFERENCE_KEYS.theme)
  return isThemeKey(stored) ? stored : defaultTheme
}

function readStoredBlur(): BlurToken {
  const stored = getUserPreference<unknown>(USER_PREFERENCE_KEYS.blur)
  return isBlurToken(stored) ? stored : 'default'
}

const themeKey = ref<ThemeKey>(readStoredTheme())
const blurLevel = ref<BlurToken>(readStoredBlur())
let isWatching = false
let isPersisting = false

function persistAppearance() {
  if (typeof localStorage === 'undefined') return
  setUserPreference(USER_PREFERENCE_KEYS.theme, themeKey.value)
  setUserPreference(USER_PREFERENCE_KEYS.blur, blurLevel.value)
}

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
    if (!isPersisting) return
    persistAppearance()
  })
  isPersisting = true
}

export function useThemeManager() {
  ensureWatch()

  const currentTheme = computed(() => themes[themeKey.value])
  const currentBlur = computed(() => blurTokens[blurLevel.value])

  function setTheme(key: ThemeKey) {
    themeKey.value = key
    persistAppearance()
  }

  function toggleTheme() {
    themeKey.value =
      themeKey.value === 'etherealLumens' ? 'luminousClarity' : 'etherealLumens'
    persistAppearance()
  }

  function setBlur(level: BlurToken) {
    blurLevel.value = level
    persistAppearance()
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

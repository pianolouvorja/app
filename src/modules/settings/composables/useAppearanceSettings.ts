import { computed } from 'vue'

import { useBlurSystem, useThemeManager } from '@design-system/composables'
import type { ThemeKey } from '@design-system/themes'

import type { ThemeMode } from '../types/settings'

const modeToTheme: Record<ThemeMode, ThemeKey> = {
  light: 'luminousClarity',
  dark: 'etherealLumens',
}

const themeToMode: Record<ThemeKey, ThemeMode> = {
  luminousClarity: 'light',
  etherealLumens: 'dark',
}

/** Preferências de aparência (tema + blur) via design-system. */
export function useAppearanceSettings() {
  const { themeKey, currentTheme, setTheme } = useThemeManager()
  const { blurLevel, currentBlur, backdropFilter, setBlurLevel, blurTokens } =
    useBlurSystem()

  const themeMode = computed<ThemeMode>(
    () => themeToMode[themeKey.value] ?? 'dark',
  )

  const isDark = computed(() => currentTheme.value.mode === 'dark')

  function setThemeMode(mode: ThemeMode) {
    setTheme(modeToTheme[mode])
  }

  return {
    themeMode,
    themeKey,
    currentTheme,
    isDark,
    setThemeMode,
    blurLevel,
    currentBlur,
    backdropFilter,
    blurTokens,
    setBlurLevel,
  }
}

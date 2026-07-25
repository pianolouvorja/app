import type { SettingsSection } from '../types/settings'

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'appearance',
    routeName: 'settings-appearance',
    labelKey: 'settings.tabs.appearance',
  },
  {
    id: 'general',
    routeName: 'settings-general',
    labelKey: 'settings.tabs.general',
    // Temporariamente fora do menu — não estamos trabalhando nesta seção.
    hidden: true,
  },
  {
    id: 'media',
    routeName: 'settings-media',
    labelKey: 'settings.tabs.media',
    // Temporariamente fora do menu — não estamos trabalhando nesta seção.
    hidden: true,
  },
  {
    id: 'projection',
    routeName: 'settings-projection',
    labelKey: 'settings.tabs.projection',
  },
]

export const VISIBLE_SETTINGS_SECTIONS = SETTINGS_SECTIONS.filter(
  (section) => !section.hidden,
)

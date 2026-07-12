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
  },
  {
    id: 'media',
    routeName: 'settings-media',
    labelKey: 'settings.tabs.media',
  },
  {
    id: 'projection',
    routeName: 'settings-projection',
    labelKey: 'settings.tabs.projection',
  },
]

export type SettingsSectionId =
  | 'appearance'
  | 'general'
  | 'media'
  | 'projection'

export type ThemeMode = 'light' | 'dark'

export interface SettingsSection {
  id: SettingsSectionId
  routeName: string
  labelKey: string
}

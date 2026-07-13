export const mainNavRoutes = [
  { key: 'home', labelKey: 'nav.home', icon: 'mdi-home', to: '/' },
  { key: 'albums', labelKey: 'nav.albums', icon: 'mdi-music-box-multiple', to: '/albums' },
  { key: 'library', labelKey: 'nav.library', icon: 'mdi-library', to: '/library' },
  { key: 'bible', labelKey: 'nav.bible', icon: 'mdi-book-open-page-variant', to: '/bible' },
  { key: 'utilities', labelKey: 'nav.utilities', icon: 'mdi-hammer-wrench', to: '/utilities' },
  { key: 'settings', labelKey: 'nav.settings', icon: 'mdi-cog', to: '/settings/appearance' },
] as const

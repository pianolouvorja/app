import type { RouteRecordRaw } from 'vue-router'

import ModulePlaceholder from '@shared/components/ModulePlaceholder.vue'

export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: 'settings',
    name: 'settings',
    component: ModulePlaceholder,
    props: { titleKey: 'nav.settings' },
    meta: {
      navKey: 'settings',
    },
  },
]

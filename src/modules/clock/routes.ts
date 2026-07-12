import type { RouteRecordRaw } from 'vue-router'

import ModulePlaceholder from '@shared/components/ModulePlaceholder.vue'

export const utilitiesRoutes: RouteRecordRaw[] = [
  {
    path: 'utilities',
    name: 'utilities',
    component: ModulePlaceholder,
    props: { titleKey: 'nav.utilities' },
    meta: {
      navKey: 'utilities',
    },
  },
]

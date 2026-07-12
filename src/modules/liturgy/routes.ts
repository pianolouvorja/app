import type { RouteRecordRaw } from 'vue-router'

import ModulePlaceholder from '@shared/components/ModulePlaceholder.vue'

export const liturgyRoutes: RouteRecordRaw[] = [
  {
    path: 'albums',
    name: 'albums',
    component: ModulePlaceholder,
    props: { titleKey: 'nav.albums' },
    meta: {
      navKey: 'albums',
    },
  },
]

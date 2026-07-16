import type { RouteRecordRaw } from 'vue-router'

import LiturgyView from './views/LiturgyView.vue'

export const liturgyRoutes: RouteRecordRaw[] = [
  {
    path: 'liturgy',
    name: 'liturgy',
    component: LiturgyView,
    meta: {
      navKey: 'liturgy',
    },
  },
]

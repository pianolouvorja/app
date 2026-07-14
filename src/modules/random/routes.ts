import type { RouteRecordRaw } from 'vue-router'

import RandomView from './views/RandomView.vue'

export const randomRoutes: RouteRecordRaw[] = [
  {
    path: 'utilities/random',
    name: 'utilities-random',
    component: RandomView,
    meta: {
      navKey: 'utilities',
    },
  },
]

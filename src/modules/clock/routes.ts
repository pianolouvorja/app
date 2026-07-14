import type { RouteRecordRaw } from 'vue-router'

import ClockView from './views/ClockView.vue'
import UtilitiesView from './views/UtilitiesView.vue'

export const utilitiesRoutes: RouteRecordRaw[] = [
  {
    path: 'utilities',
    name: 'utilities',
    component: UtilitiesView,
    meta: {
      navKey: 'utilities',
    },
  },
  {
    path: 'utilities/clock',
    name: 'utilities-clock',
    component: ClockView,
    meta: {
      navKey: 'utilities',
    },
  },
]

import type { RouteRecordRaw } from 'vue-router'

import CountdownView from './views/CountdownView.vue'

export const countdownRoutes: RouteRecordRaw[] = [
  {
    path: 'utilities/countdown',
    name: 'utilities-countdown',
    component: CountdownView,
    meta: {
      navKey: 'utilities',
    },
  },
]

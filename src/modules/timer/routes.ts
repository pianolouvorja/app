import type { RouteRecordRaw } from 'vue-router'

import TimerView from './views/TimerView.vue'

export const timerRoutes: RouteRecordRaw[] = [
  {
    path: 'utilities/timer',
    name: 'utilities-timer',
    component: TimerView,
    meta: {
      navKey: 'utilities',
    },
  },
]

import type { RouteRecordRaw } from 'vue-router'

import BibleView from './views/BibleView.vue'

export const bibleRoutes: RouteRecordRaw[] = [
  {
    path: 'bible',
    name: 'bible',
    component: BibleView,
    meta: {
      navKey: 'bible',
    },
  },
]

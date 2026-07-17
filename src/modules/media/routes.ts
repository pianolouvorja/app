import type { RouteRecordRaw } from 'vue-router'

import MediaView from './views/MediaView.vue'

export const mediaRoutes: RouteRecordRaw[] = [
  {
    path: 'media',
    name: 'media',
    component: MediaView,
    meta: {
      navKey: 'albums',
    },
  },
]

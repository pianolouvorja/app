import type { RouteRecordRaw } from 'vue-router'

import LocalLibraryView from './views/LocalLibraryView.vue'

export const syncRoutes: RouteRecordRaw[] = [
  {
    path: 'library',
    name: 'local-library',
    component: LocalLibraryView,
    meta: {
      navKey: 'library',
    },
  },
]

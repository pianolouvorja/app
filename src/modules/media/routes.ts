import type { RouteRecordRaw } from 'vue-router'

import MediaView from './views/MediaView.vue'
import MediaEditorView from './views/MediaEditorView.vue'

export const mediaRoutes: RouteRecordRaw[] = [
  {
    path: 'media',
    name: 'media',
    component: MediaView,
    meta: {
      navKey: 'albums',
    },
  },
  {
    path: 'media/editor',
    name: 'media-editor',
    component: MediaEditorView,
    meta: {
      navKey: 'albums',
    },
  },
]

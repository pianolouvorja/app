import type { RouteRecordRaw } from 'vue-router'

import MediaView from './views/MediaView.vue'
import MediaEditorView from './views/MediaEditorView.vue'
import { SHOW_CUSTOM_COLLECTIONS } from '@modules/albums/constants'

export const mediaRoutes: RouteRecordRaw[] = [
  {
    path: 'media',
    name: 'media',
    component: MediaView,
    meta: {
      navKey: 'albums',
    },
  },
  ...(SHOW_CUSTOM_COLLECTIONS
    ? [
        {
          path: 'media/editor',
          name: 'media-editor',
          component: MediaEditorView,
          meta: {
            navKey: 'albums',
          },
        } satisfies RouteRecordRaw,
      ]
    : []),
]

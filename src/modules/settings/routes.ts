import type { RouteRecordRaw } from 'vue-router'

import AppearanceView from './views/AppearanceView.vue'
import GeneralView from './views/GeneralView.vue'
import MediaView from './views/MediaView.vue'
import ProjectionView from './views/ProjectionView.vue'
import SettingsView from './views/SettingsView.vue'

export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: 'settings',
    component: SettingsView,
    meta: {
      navKey: 'settings',
    },
    redirect: { name: 'settings-appearance' },
    children: [
      {
        path: 'appearance',
        name: 'settings-appearance',
        component: AppearanceView,
        meta: {
          navKey: 'settings',
        },
      },
      {
        path: 'general',
        name: 'settings-general',
        component: GeneralView,
        meta: {
          navKey: 'settings',
        },
      },
      {
        path: 'media',
        name: 'settings-media',
        component: MediaView,
        meta: {
          navKey: 'settings',
        },
      },
      {
        path: 'projection',
        name: 'settings-projection',
        component: ProjectionView,
        meta: {
          navKey: 'settings',
        },
      },
    ],
  },
]

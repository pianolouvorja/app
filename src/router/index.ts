import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'

import AppShell from '@layouts/AppShell.vue'
import { bibleRoutes } from '@modules/bible/routes'
import { utilitiesRoutes } from '@modules/clock/routes'
import { homeRoutes } from '@modules/home/routes'
import { liturgyRoutes } from '@modules/liturgy/routes'
import { settingsRoutes } from '@modules/settings/routes'
import { syncRoutes } from '@modules/sync/routes'

/** Em Electron (file://) history mode quebra; hash funciona em dev e prod. */
const isFileProtocol =
  typeof window !== 'undefined' && window.location.protocol === 'file:'

const router = createRouter({
  history: isFileProtocol
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        ...homeRoutes,
        ...liturgyRoutes,
        ...syncRoutes,
        ...bibleRoutes,
        ...utilitiesRoutes,
        ...settingsRoutes,
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router

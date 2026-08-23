import type { RouteRecordRaw } from 'vue-router'

export const remoteRoutes: RouteRecordRaw[] = [
  {
    path: 'remote',
    name: 'remote-p2p',
    component: () => import('./views/P2pPairingView.vue'),
    meta: {
      navKey: 'remote',
    },
  },
]

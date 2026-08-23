import type { RouteRecordRaw } from 'vue-router'

import AppearanceView from './views/AppearanceView.vue'
import GeneralView from './views/GeneralView.vue'
import ProjectionView from './views/ProjectionView.vue'
import RemotePairingView from '@modules/remote/views/RemotePairingView.vue'
import { isElectronShell } from '@shared/services/desktop-bridge'
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
      // Geral
      {
        path: 'general',
        name: 'settings-general',
        component: GeneralView,
        meta: {
          navKey: 'settings',
        },
      },
      // Mídia — oculto no menu; redirect até reativarmos a seção.
      {
        path: 'media',
        name: 'settings-media',
        redirect: { name: 'settings-appearance' },
      },
      {
        path: 'projection',
        name: 'settings-projection',
        component: ProjectionView,
        meta: {
          navKey: 'settings',
        },
      },
      // Controle remoto — desktop: WS :7071 (RemotePairingView);
      // web: P2P WebRTC 2-QR (P2pPairingView), sem servidor.
      {
        path: 'remote',
        name: 'settings-remote',
        component: isElectronShell()
          ? RemotePairingView
          : () => import('@modules/remote/views/P2pPairingView.vue'),
        meta: {
          navKey: 'settings',
        },
      },
    ],
  },
]

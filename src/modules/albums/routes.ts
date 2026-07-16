import type { RouteRecordRaw } from 'vue-router'

import ModulePlaceholder from '@shared/components/ModulePlaceholder.vue'

/** Reserva do menu Álbuns — feature futura. */
export const albumsRoutes: RouteRecordRaw[] = [
  {
    path: 'albums',
    name: 'albums',
    component: ModulePlaceholder,
    props: { titleKey: 'nav.albums' },
    meta: {
      navKey: 'albums',
    },
  },
]

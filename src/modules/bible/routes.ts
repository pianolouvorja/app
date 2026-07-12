import type { RouteRecordRaw } from 'vue-router'

import ModulePlaceholder from '@shared/components/ModulePlaceholder.vue'

export const bibleRoutes: RouteRecordRaw[] = [
  {
    path: 'bible',
    name: 'bible',
    component: ModulePlaceholder,
    props: { titleKey: 'nav.bible' },
    meta: {
      navKey: 'bible',
    },
  },
]

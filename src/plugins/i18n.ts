import { createI18n } from 'vue-i18n'

import ptBR from '@locales/pt-BR'
import biblePtBR from '@modules/bible/locales/pt-BR'
import settingsPtBR from '@modules/settings/locales/pt-BR'
import startingPtBR from '@modules/starting/locales/pt-BR'
import syncPtBR from '@modules/sync/locales/pt-BR'

export default createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'pt-BR',
  messages: {
    'pt-BR': {
      ...ptBR,
      ...biblePtBR,
      ...settingsPtBR,
      ...startingPtBR,
      ...syncPtBR,
    },
  },
})

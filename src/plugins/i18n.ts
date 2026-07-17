import { createI18n } from 'vue-i18n'

import ptBR from '@locales/pt-BR'
import albumsPtBR from '@modules/albums/locales/pt-BR'
import biblePtBR from '@modules/bible/locales/pt-BR'
import clockPtBR from '@modules/clock/locales/pt-BR'
import countdownPtBR from '@modules/countdown/locales/pt-BR'
import liturgyPtBR from '@modules/liturgy/locales/pt-BR'
import mediaPtBR from '@modules/media/locales/pt-BR'
import randomPtBR from '@modules/random/locales/pt-BR'
import settingsPtBR from '@modules/settings/locales/pt-BR'
import startingPtBR from '@modules/starting/locales/pt-BR'
import syncPtBR from '@modules/sync/locales/pt-BR'
import timerPtBR from '@modules/timer/locales/pt-BR'

export default createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'pt-BR',
  messages: {
    'pt-BR': {
      ...ptBR,
      ...albumsPtBR,
      ...biblePtBR,
      ...clockPtBR,
      ...countdownPtBR,
      ...liturgyPtBR,
      ...mediaPtBR,
      ...randomPtBR,
      ...settingsPtBR,
      ...startingPtBR,
      ...syncPtBR,
      ...timerPtBR,
    },
  },
})

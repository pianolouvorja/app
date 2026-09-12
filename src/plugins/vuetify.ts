import 'vuetify/styles'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'

import { createVuetify } from 'vuetify'
import { VSnackbar } from 'vuetify/components/VSnackbar'

export default createVuetify({
  components: { VSnackbar },
  theme: {
    defaultTheme: 'dark'
  }
})
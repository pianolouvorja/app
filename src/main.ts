import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import '@styles/tailwind.css'
import { useThemeManager } from '@design-system/composables'
import i18n from '@plugins/i18n'
import vuetify from '@plugins/vuetify'
import router from '@/router'

useThemeManager()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)
app.use(i18n)

app.mount('#app')

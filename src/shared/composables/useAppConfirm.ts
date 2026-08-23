/**
 * Confirm modal no styleguide do app — substitui window.confirm/alert.
 *
 * const confirmed = await appConfirm({
 *   title: t('...'), message: t('...'),
 *   confirmLabel: t('ok'), cancelLabel: t('cancel'),
 * })
 */
import { createApp, defineComponent, h, reactive, type App, type Component } from 'vue'

import AppConfirm from '@shared/components/AppConfirm.vue'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
}

export function appConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const state = reactive({ open: true })

    const close = (result: boolean) => {
      state.open = false
      // deixa a saída animar antes de desmontar
      setTimeout(() => {
        app.unmount()
        resolve(result)
      }, 50)
    }

    const wrapper: Component = defineComponent({
      setup() {
        return () =>
          h(AppConfirm, {
            open: state.open,
            title: options.title,
            message: options.message,
            confirmLabel: options.confirmLabel,
            cancelLabel: options.cancelLabel ?? 'Cancelar',
            danger: options.danger,
            onConfirm: () => close(true),
            onCancel: () => close(false),
          })
      },
    })

    const host = document.createElement('div')
    document.body.appendChild(host)
    const app: App = createApp(wrapper)
    app.mount(host)
  })
}

import { onMounted, onUnmounted } from 'vue'
import { getDesktopBridge } from '@shared/services/desktop-bridge'
import { appConfirm } from '@shared/composables/useAppConfirm'

/**
 * ESC na janela do OPERADOR com projeção externa ativa (video/pdf/ppt/site)
 * oferece encerrar a projeção (spec 30/08 — monitor único: o operador não
 * conseguia voltar sem fechar o app). A hotkey Ctrl+Alt+P alterna; aqui o
 * ESC dá o caminho de ENCERRAR direto da janela do operador.
 *
 * Guards: não sequestra ESC de inputs/textareas/contenteditable nem quando
 * há dialogs abertos. Ignora janela de projeção (checagem externa).
 */
export function useOperatorEscapeToCloseProjection(isProjectionWindow: () => boolean) {
  let handling = false

  async function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    if (isProjectionWindow()) return
    const target = event.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    if (document.querySelector('[role="dialog"]')) return
    if (handling) return

    try {
      const bridge = getDesktopBridge()
      const alive = (await bridge?.projection?.externalAlive?.()) ?? false
      if (!alive) return
      handling = true
      event.preventDefault()
      const ok = await appConfirm({
        title: 'Encerrar projeção?',
        message: 'Há uma projeção ativa (vídeo/PDF/apresentação/site). Encerrar agora?',
        confirmLabel: 'Encerrar',
        danger: true,
      })
      if (ok) {
        await bridge?.projection?.closeUrl?.()
      }
    } catch {
      /* ignore */
    } finally {
      handling = false
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}

/**
 * Bridge de Controle Remoto no renderer.
 *
 * Escuta 'remote:command' do main process (vindo do APK via WS) e executa
 * na LITURGIA (prioridade) ou no player. Responde 'remote:ack' e empurra
 * 'remote:state' completo após cada ação e em mudanças relevantes.
 *
 * Instanciado uma vez em App.vue (ou bootstrap do router).
 */

import { watch } from 'vue'

import { getDesktopBridge } from '@shared/services/desktop-bridge'

import { useLiturgyStore } from '../../liturgy/stores/useLiturgyStore'
import { useMediaPlayer } from '../../media/composables/useMediaPlayer'

/** Ações conhecidas (espelham RemoteAction do APK). */
const PLAYER_ACTIONS = new Set([
  'player.play',
  'player.pause',
  'player.toggle',
  'player.next',
  'player.previous',
  'player.stop',
  'player.setVolume',
  'player.seek',
  'player.setMode',
  'player.open',
])

/** Ações de liturgia (extensão v1.1 — prioridade do desktop). */
const LITURGY_ACTIONS = new Set([
  'liturgy.next',
  'liturgy.previous',
  'liturgy.select',
  'liturgy.toggleDone',
  'liturgy.state',
])

export function installRemoteLiturgyBridge({ router }) {
  const liturgy = useLiturgyStore()
  const player = useMediaPlayer()
  const remoteApi = getDesktopBridge()?.remote
  if (!remoteApi) return () => {}

  const send = (channel, payload) => {
    try {
      if (channel === 'remote:state') remoteApi.sendState(payload)
      else if (channel === 'remote:ack') remoteApi.sendAck(payload)
    } catch {
      // ignore
    }
  }

  const buildState = () => {
    const items = liturgy.currentItems ?? []
    return {
      liturgy: {
        total: items.length,
        selectedIndex: liturgy.selectedItemIndex,
        items: items.map((item, index) => ({
          index,
          type: item.type,
          title: item.name || item.subtitle || null,
          done: item.done === true,
        })),
      },
      player: {
        playing: player.isPlaying.value,
        title: player.session.value?.title ?? null,
        volume: Math.round((player.volume.value ?? 0) * 100),
        positionMs: Math.round((player.currentTimeSec.value ?? 0) * 1000),
        durationMs: Math.round((player.durationSec.value ?? 0) * 1000),
        canPrevious: (liturgy.selectedItemIndex ?? 0) > 0,
        canNext:
          (liturgy.selectedItemIndex ?? -1) + 1 <
          (liturgy.currentItems?.length ?? 0),
      },
    }
  }

  // Estado COMPLETO (spec v1): player + liturgia espelhada no APK.
  const pushState = () => send('remote:state', buildState())

  async function execute(msg) {
    const { action, value } = msg
    const items = liturgy.currentItems ?? []
    const current = liturgy.selectedItemIndex ?? -1

    // 1) Liturgia — prioridade (múltiplos monitores + projetor)
    if (LITURGY_ACTIONS.has(action)) {
      switch (action) {
        case 'liturgy.next': {
          if (current + 1 >= items.length) return false
          await liturgy.selectItem(current + 1, router)
          return true
        }
        case 'liturgy.previous': {
          if (current <= 0) return false
          await liturgy.selectItem(current - 1, router)
          return true
        }
        case 'liturgy.select': {
          const idx = value
          if (typeof idx !== 'number' || idx < 0 || idx >= items.length) {
            return false
          }
          // Controle remoto deve projetar no(s) palco(s), não só executar
          // no desktop do operador.
          await liturgy.playItemOnScreens(idx)
          return true
        }
        case 'liturgy.toggleDone': {
          const idx = typeof value === 'number' ? value : current
          if (idx < 0 || idx >= items.length) return false
          liturgy.toggleItemDone(idx)
          return true
        }
        case 'liturgy.state':
          return true
        default:
          return false
      }
    }

    // 2) Player
    if (PLAYER_ACTIONS.has(action)) {
      switch (action) {
        case 'player.play':
          await player.play()
          return true
        case 'player.pause':
          await player.pause()
          return true
        case 'player.toggle':
          await player.togglePlay()
          return true
        case 'player.stop':
          // requestClose apenas abre confirmação; close interrompe áudio/projeção.
          player.close()
          return true
        case 'player.next':
        case 'player.previous':
          // Sem playlist no renderer ainda — mapeia pra item da liturgia.
          return execute({
            ...msg,
            action:
              action === 'player.next' ? 'liturgy.next' : 'liturgy.previous',
          })
        case 'player.setVolume':
          if (typeof value !== 'number') return false
          player.setVolume(Math.min(100, Math.max(0, value)) / 100)
          return true
        case 'player.seek':
          if (typeof msg.positionMs !== 'number') return false
          player.seekTo(msg.positionMs / 1000)
          return true
        case 'player.setMode':
          if (typeof msg.mode !== 'string') return false
          await player.switchMode(msg.mode)
          return true
        case 'player.open':
          return false // abrir hino por id: fora do escopo do bridge v1
        default:
          return false
      }
    }
    return false
  }

  const onCommand = async (msg) => {
    let ok = false
    try {
      ok = await execute(msg)
    } catch {
      ok = false
    }
    send('remote:ack', { id: msg.id, ok })
    pushState()
  }

  const onStateRequest = () => pushState()

  const onUn = {
    command: remoteApi.onCommand(onCommand),
    state: remoteApi.onStateRequest(onStateRequest),
  }

  // Push de estado quando seleção da liturgia muda (local ou remoto).
  const unwatch = watch(
    () => [
      liturgy.selectedItemIndex,
      JSON.stringify(
        (liturgy.currentItems ?? []).map((i) => [i.name, i.subtitle, i.done]),
      ),
    ],
    () => pushState(),
    { deep: false },
  )

  pushState()

  return () => {
    onUn.command?.()
    onUn.state?.()
    unwatch()
  }
}

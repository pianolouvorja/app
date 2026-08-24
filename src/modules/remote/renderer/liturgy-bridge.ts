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

import { resolveMediaTarget } from './media-target'
import { createModuleHandlers } from './module-handlers'

import { useLiturgyStore } from '../../liturgy/stores/useLiturgyStore'
import { useMediaPlayer } from '../../media/composables/useMediaPlayer'
import { useBibleStore } from '../../bible/stores/useBibleStore'
import { useTimerStore } from '../../timer/stores/useTimerStore'
import { useCountdownStore } from '../../countdown/stores/useCountdownStore'
import { useClockStore } from '../../clock/stores/useClockStore'
import { useRandomStore } from '../../random/stores/useRandomStore'

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

/** Namespaces v2 (controle remoto total — spec Obsidian v2). */
const V2_NAMESPACES = new Set(['bible', 'timer', 'countdown', 'clock', 'random'])

export function installRemoteLiturgyBridge({ router }) {
  const liturgy = useLiturgyStore()
  const player = useMediaPlayer()
  const remoteApi = getDesktopBridge()?.remote
  const projection = getDesktopBridge()?.projection
  if (!remoteApi) return () => {}

  // Módulos v2: bible/timer/countdown com stores reais do desktop.
  // Cast: pinia expõe UnwrapRef que não é atribuível aos tipos estruturais
  // (RefLike) sem cast — a superfície usada é exatamente a declarada.
  const modules = createModuleHandlers({
    bible: useBibleStore() as never,
    timer: useTimerStore() as never,
    countdown: useCountdownStore() as never,
    clock: useClockStore() as never,
    random: useRandomStore() as never,
  })

  const send = (channel, payload) => {
    try {
      if (channel === 'remote:state') remoteApi.sendState(payload)
      else if (channel === 'remote:ack') remoteApi.sendAck(payload)
    } catch {
      // ignore
    }
  }

  const buildState = async () => {
    const items = liturgy.currentItems ?? []

    // Vídeo/images/pdf ativos na projeção? Estado de mídia vem de lá.
    const target = await resolveMediaTarget({ projection, player })
    let media
    if (target === 'projection' && projection?.getPlaybackState) {
      const pb = await projection.getPlaybackState()
      media = {
        playing: pb ? !pb.paused : false,
        title: items[liturgy.selectedItemIndex ?? -1]?.name ?? null,
        volume: Math.round((pb?.volume ?? 1) * 100),
        positionMs: Math.round((pb?.currentTime ?? 0) * 1000),
        durationMs: Math.round((pb?.duration ?? 0) * 1000),
      }
    } else {
      media = {
        playing: player.isPlaying.value,
        title: player.session.value?.title ?? null,
        volume: Math.round((player.volume.value ?? 0) * 100),
        positionMs: Math.round((player.currentTimeSec.value ?? 0) * 1000),
        durationMs: Math.round((player.durationSec.value ?? 0) * 1000),
      }
    }

    return {
      liturgy: {
        total: items.length,
        selectedIndex: liturgy.selectedItemIndex,
        items: items.map((item, index) => ({
          index,
          type: item.type,
          title: item.name || item.subtitle || null,
          subtitle: item.subtitle || null,
          isCategory: item.type === 'category',
          accentColor: item.accentColor || null,
          done: item.done === true,
        })),
      },
      player: {
        ...media,
        canPrevious: (liturgy.selectedItemIndex ?? 0) > 0,
        canNext:
          (liturgy.selectedItemIndex ?? -1) + 1 <
          (liturgy.currentItems?.length ?? 0),
      },
      // Snapshots v2 — ausentes para peers v1, que ignoram o extra.
      bible: modules.snapshot('bible') ?? undefined,
      timer: modules.snapshot('timer') ?? undefined,
      countdown: modules.snapshot('countdown') ?? undefined,
      clock: modules.snapshot('clock') ?? undefined,
      random: modules.snapshot('random') ?? undefined,
    }
  }

  // Estado COMPLETO (spec v1): player + liturgia espelhada no APK.
  const pushState = async () => send('remote:state', await buildState())

  async function execute(msg) {
    const { action, value } = msg
    const items = liturgy.currentItems ?? []
    const current = liturgy.selectedItemIndex ?? -1

    // 0) Namespaces v2 (bible/timer/countdown) — spec controle remoto total.
    const namespace = action.split('.')[0]
    if (V2_NAMESPACES.has(namespace)) {
      return modules.execute(namespace, action, msg)
    }

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

    // 2) Player — vídeo ativo na projeção? Comandos vão pra projeção.
    if (PLAYER_ACTIONS.has(action)) {
      const target = await resolveMediaTarget({ projection, player })
      if (target === 'projection') {
        switch (action) {
          case 'player.play':
            return (await projection?.remotePlay?.()) ?? false
          case 'player.pause':
            return (await projection?.remotePause?.()) ?? false
          case 'player.toggle': {
            const pb = await projection?.getPlaybackState?.()
            if (!pb) return false
            return pb.paused
              ? ((await projection?.remotePlay?.()) ?? false)
              : ((await projection?.remotePause?.()) ?? false)
          }
          case 'player.stop':
            // Desliga telas espelhadas e fecha o popup de vídeo.
            await projection?.toggleVideoScreens?.()
            await projection?.closeUrl?.()
            return true
          case 'player.setVolume':
            if (typeof value !== 'number') return false
            return (
              (await projection?.remoteSetVolume?.(
                Math.min(100, Math.max(0, value)) / 100,
              )) ?? false
            )
          case 'player.seek':
            if (typeof msg.positionMs !== 'number') return false
            return (
              (await projection?.remoteSeek?.(msg.positionMs / 1000)) ?? false
            )
          default:
            // next/previous/setMode/open caem no fallback de liturgia/player.
            break
        }
      }
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

  const onUn: Record<string, (() => void) | undefined> = {
    command: remoteApi.onCommand(onCommand),
    state: remoteApi.onStateRequest(onStateRequest),
    // Posição do vídeo avança continuamente — sincroniza o APK (throttle 1s).
    sync: projection?.onPlaybackSync
      ? projection.onPlaybackSync(() => {
          const now = Date.now()
          if (now - lastSyncPush > 1000) {
            lastSyncPush = now
            pushState()
          }
        })
      : undefined,
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

  let lastSyncPush = 0
  pushState()

  return () => {
    onUn.command?.()
    onUn.state?.()
    unwatch()
  }
}

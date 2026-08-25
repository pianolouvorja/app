/**
 * palco-bridge — espelha a projeção de HINOS (media runtime) na TV.
 *
 * Escuta os mesmos canais que a MediaProjectionView (BroadcastChannel +
 * storage) e envia `projection` v2 com o StageSettings do escopo 'hymns'.
 * Áudio: quando o media store tem sessão com audioUrl, envia `audio` v2
 * (url + play/pause + sincronização de posição throttled).
 * Ativado/desativado pelo PalcoCard (sender ON/OFF).
 */

import { palcoSession } from './palco-session'
import {
  MEDIA_RUNTIME_CHANNEL,
  MEDIA_RUNTIME_STORAGE_KEY,
  normalizeMediaRuntime,
} from '../../media/services/media-runtime'
import type { MediaProjectionRuntime } from '../../media/types/media'
import { DEFAULT_MEDIA_PROJECTION } from '../../media/types/media'
import { useMediaStore } from '../../media/stores/useMediaStore'
import { watch } from 'vue'

let started = false
let channel: BroadcastChannel | null = null
let lastRuntime: MediaProjectionRuntime = { ...DEFAULT_MEDIA_PROJECTION }

/** Controle de áudio — evita reenviar URL/ação sem mudança. */
let lastAudioKey = ''
let lastPosSyncMs = 0

async function projectToTv() {
  const r = lastRuntime
  const text = r.lyric || r.title || ''
  if (!text) {
    palcoSession.idle()
    return
  }
  const html = text.split('\n').join('<br>')
  await palcoSession.project('hymns', {
    text: html,
    footerRef: r.isCover ? '' : r.title,
    background: r.imageUrl ?? undefined,
  })
}

function syncAudio() {
  const media = useMediaStore()
  const session = media.session
  const audioUrl = session?.audioUrl ?? null
  const key = audioUrl ?? 'none'

  // URL mudou → manda áudio completo com position e play se tocando
  if (key !== lastAudioKey) {
    lastAudioKey = key
    lastPosSyncMs = 0
    if (audioUrl && media.isPlaying) {
      void palcoSession.audio({
        url: audioUrl,
        title: session?.title ?? undefined,
        subtitle: session?.subtitle ?? undefined,
        cover: session?.coverUrl ?? undefined,
        positionMs: Math.round((media.currentTimeSec ?? 0) * 1000),
        action: 'play',
      })
    }
    return
  }

  if (!audioUrl) return

  // Mesma URL — sincroniza play/pause e posição (throttle 3s)
  if (media.isPlaying) {
    const now = Date.now()
    if (now - lastPosSyncMs > 3000) {
      lastPosSyncMs = now
      void palcoSession.audio({
        url: audioUrl,
        positionMs: Math.round((media.currentTimeSec ?? 0) * 1000),
        action: 'play',
      })
    }
  } else if (media.isPaused) {
    void palcoSession.audio({ action: 'pause' })
  }
}

function onTick() {
  void projectToTv().then(syncAudio)
}

function onStorage(event: StorageEvent) {
  if (event.key !== MEDIA_RUNTIME_STORAGE_KEY) return
  try {
    const raw = event.newValue ? JSON.parse(event.newValue) : null
    lastRuntime = normalizeMediaRuntime(raw)
  } catch {
    // ignore
  }
  onTick()
}

function onChannelMessage(event: MessageEvent<unknown>) {
  lastRuntime = normalizeMediaRuntime(event.data)
  onTick()
}

let audioWatchers: Array<() => void> = []

export function startPalcoBridge() {
  if (started) return
  started = true
  try {
    const raw = localStorage.getItem(MEDIA_RUNTIME_STORAGE_KEY)
    if (raw) lastRuntime = normalizeMediaRuntime(JSON.parse(raw))
  } catch {
    // sem estado inicial
  }
  window.addEventListener('storage', onStorage)
  try {
    channel = new BroadcastChannel(MEDIA_RUNTIME_CHANNEL)
    channel.addEventListener('message', onChannelMessage)
  } catch {
    channel = null
  }

  // posição do áudio avança continuamente — sincroniza a TV periodicamente
  const media = useMediaStore()
  audioWatchers = [
    watch(
      () => [media.isPlaying, media.session?.audioUrl] as const,
      () => syncAudio(),
    ),
    // player fechou → para o áudio na TV
    watch(
      () => media.hasSession,
      (has) => {
        if (!has) {
          lastAudioKey = ''
          void palcoSession.audio({ action: 'stop' })
        }
      },
    ),
    // seek manual do operador → reposiciona a TV
    watch(
      () => media.currentTimeSec,
      (now, before) => {
        if (Math.abs(now - before) > 2 && media.hasSession) {
          void palcoSession.audio({ action: 'seek', position: now })
        }
      },
    ),
  ]
  window.setInterval(syncAudio, 3000)
  onTick()
}

export function stopPalcoBridge() {
  if (!started) return
  started = false
  window.removeEventListener('storage', onStorage)
  channel?.removeEventListener('message', onChannelMessage)
  channel?.close()
  channel = null
  for (const un of audioWatchers) un()
  audioWatchers = []
  lastAudioKey = ''
}

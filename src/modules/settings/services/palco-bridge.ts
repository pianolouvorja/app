/**
 * palco-bridge — espelha a projeção de HINOS (media runtime) na TV.
 *
 * Escuta os mesmos canais que a MediaProjectionView (BroadcastChannel +
 * storage) e envia `projection` v2 com o StageSettings do escopo 'hymns'.
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

let started = false
let channel: BroadcastChannel | null = null
let lastRuntime: MediaProjectionRuntime = { ...DEFAULT_MEDIA_PROJECTION }

function projectToTv() {
  const r = lastRuntime
  const text = r.lyric || r.title || ''
  if (!text) {
    palcoSession.idle()
    return
  }
  const html = text.split('\n').join('<br>')
  palcoSession.project('hymns', {
    text: html,
    footerRef: r.isCover ? '' : r.title,
  })
}

function onStorage(event: StorageEvent) {
  if (event.key !== MEDIA_RUNTIME_STORAGE_KEY) return
  try {
    const raw = event.newValue ? JSON.parse(event.newValue) : null
    lastRuntime = normalizeMediaRuntime(raw)
    projectToTv()
  } catch {
    // ignore
  }
}

function onChannelMessage(event: MessageEvent<unknown>) {
  lastRuntime = normalizeMediaRuntime(event.data)
  projectToTv()
}

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
  projectToTv()
}

export function stopPalcoBridge() {
  if (!started) return
  started = false
  window.removeEventListener('storage', onStorage)
  channel?.removeEventListener('message', onChannelMessage)
  channel?.close()
  channel = null
}

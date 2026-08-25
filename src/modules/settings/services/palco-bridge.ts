/**
 * palco-bridge — espelha TODAS as projeções na TV (paridade APK StageSession).
 *
 * Escuta os mesmos canais das views de projeção (BroadcastChannel + storage)
 * de cada módulo e envia ao palco o conteúdo do módulo "dono" corrente
 * (o último que projetou ativo; ao fechar, devolve ao idle).
 *
 * Módulos: media(hinos) · bible · liturgy(web/youtube→TV via proxy) ·
 * random · clock · timer · countdown.
 * Áudio: sincronizado com o media store (rota local ou TV).
 */

import { palcoSession } from './palco-session'
import { readEffectiveStageSettings } from './stage-settings-runtime'
import {
  MEDIA_RUNTIME_CHANNEL,
  MEDIA_RUNTIME_STORAGE_KEY,
  normalizeMediaRuntime,
} from '../../media/services/media-runtime'
import type { MediaProjectionRuntime } from '../../media/types/media'
import { DEFAULT_MEDIA_PROJECTION } from '../../media/types/media'
import {
  BIBLE_RUNTIME_CHANNEL,
  BIBLE_RUNTIME_STORAGE_KEY,
  normalizeBibleRuntime,
} from '../../bible/services/bible-runtime'
import {
  RANDOM_RUNTIME_CHANNEL,
  RANDOM_RUNTIME_STORAGE_KEY,
  normalizeRandomRuntime,
} from '../../random/services/random-runtime'
import {
  TIMER_RUNTIME_CHANNEL,
  TIMER_RUNTIME_STORAGE_KEY,
  normalizeTimerRuntime,
} from '../../timer/services/timer-runtime'
import {
  COUNTDOWN_RUNTIME_CHANNEL,
  COUNTDOWN_RUNTIME_STORAGE_KEY,
  normalizeCountdownRuntime,
} from '../../countdown/services/countdown-runtime'
import type { TimerRuntimeState } from '../../timer/types/timer'
import type { CountdownRuntimeState } from '../../countdown/types/countdown'
import { useMediaStore } from '../../media/stores/useMediaStore'
import { watch } from 'vue'

/** Quem é o dono do palco agora (última projeção ativa). */
type Owner = 'media' | 'bible' | 'random' | 'timer' | 'countdown' | 'clock' | null
let owner: Owner = null

const runtimes = {
  media: { ...DEFAULT_MEDIA_PROJECTION },
  bible: { active: false, text: '', reference: '' },
  random: { currentDisplay: '', isDrawing: false },
  timer: null as TimerRuntimeState | null,
  countdown: null as CountdownRuntimeState | null,
}

let started = false
let channels: BroadcastChannel[] = []
let unwatchers: Array<() => void> = []
let clockInterval: number | null = null

// ===== helpers =====

function elapsedMs(seg: { status: string; segmentStartedAt: number | null; accumulatedMs: number }): number {
  if (seg.status !== 'running' && seg.status !== 'paused') return seg.accumulatedMs
  if (seg.status === 'paused' || !seg.segmentStartedAt) return seg.accumulatedMs
  return seg.accumulatedMs + (Date.now() - seg.segmentStartedAt)
}

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const hh = Math.floor(s / 3600)
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`
}

// ===== projeção por módulo =====

async function projectOwner() {
  if (!owner) {
    palcoSession.idle()
    return
  }
  switch (owner) {
    case 'media':
      await projectMedia()
      break
    case 'bible':
      await projectBible()
      break
    case 'random':
      await projectRandom()
      break
    case 'timer':
      projectTimer()
      break
    case 'countdown':
      projectCountdown()
      break
    case 'clock':
      projectClock()
      break
  }
}

async function projectMedia() {
  const r = runtimes.media
  const text = r.lyric || r.title || ''
  if (!text) {
    palcoSession.idle()
    return
  }
  await palcoSession.projectRouted('hymns', 'hymns', {
    text: text.split('\n').join('<br>'),
    footerRef: r.isCover ? '' : r.title,
    background: r.imageUrl ?? undefined,
  })
}

async function projectBible() {
  const r = runtimes.bible
  if (!r.active || !r.text) {
    palcoSession.idle()
    return
  }
  await palcoSession.projectRouted('bible', 'bible', {
    text: r.text.split('\n').join('<br>'),
    footerRef: r.reference,
  })
}

async function projectRandom() {
  const r = runtimes.random
  if (!r.currentDisplay) {
    palcoSession.idle()
    return
  }
  await palcoSession.projectRouted('random', 'random', {
    text: r.currentDisplay,
  })
}

function projectTimer() {
  const r = runtimes.timer
  if (!r || r.status === 'idle') {
    palcoSession.idle()
    return
  }
  palcoSession.timerRouted('timer', {
    mode: 'chrono',
    label: '',
    duration: Math.floor(elapsedMs(r) / 1000),
  })
}

function projectCountdown() {
  const r = runtimes.countdown
  if (!r || r.status === 'idle') {
    palcoSession.idle()
    return
  }
  const remaining = Math.max(0, r.durationMs - elapsedMs(r))
  palcoSession.timerRouted('countdown', {
    mode: 'countdown',
    label: '',
    duration: Math.ceil(remaining / 1000),
  })
}

let clockTimer: number | null = null
function projectClock() {
  const s = readEffectiveStageSettings('clock')
  const render = () => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    void palcoSession.projectRouted('clock', 'clock', {
      text: `${hh}:${mm}`,
    })
  }
  if (clockTimer) window.clearInterval(clockTimer)
  render()
  clockTimer = window.setInterval(render, 15000)
  void s
}

function stopClock() {
  if (clockTimer) {
    window.clearInterval(clockTimer)
    clockTimer = null
  }
}

/** Marca o dono e re-projeta; dono saindo → volta pro anterior ativo ou idle. */
function claim(o: Exclude<Owner, null>) {
  if (owner === 'clock') stopClock()
  owner = o
  void projectOwner()
}

function release(o: Exclude<Owner, null>) {
  if (owner !== o) return
  owner = null
  // outro módulo ativo assume; senão idle
  if (runtimes.media.lyric || runtimes.media.title) return claim('media')
  if (runtimes.bible.active) return claim('bible')
  void projectOwner()
}

// ===== áudio (rota local ↔ TV) =====

let lastAudioKey = ''
let lastPosSyncMs = 0

function syncAudio() {
  const media = useMediaStoreSafe()
  if (!media) return
  const session = media.session
  const audioUrl = session?.audioUrl ?? null
  const key = audioUrl ?? 'none'

  // Rota TV: local pausado — a TV é a caixa. Envia a faixa (1x por URL)
  // e reenvia quando o operador der play/pause/seek NA UI (que comanda a TV).
  if (media.audioOnTv) {
    if (key !== lastAudioKey) {
      lastAudioKey = key
      if (audioUrl) {
        void palcoSession.audio({
          url: audioUrl,
          title: session?.title ?? undefined,
          subtitle: session?.subtitle ?? undefined,
          cover: session?.coverUrl ?? undefined,
          positionMs: Math.round((media.currentTimeSec ?? 0) * 1000),
          action: 'play',
        })
      } else {
        void palcoSession.audio({ action: 'stop' })
      }
    }
    return
  }

  // Rota local (espelho): TV toca junto, sincronizada.
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

/** useMediaStore fora de setup — pinia global já instalado em main.ts. */
function useMediaStoreSafe() {
  try {
    return useMediaStore()
  } catch {
    return null
  }
}

// ===== listeners =====

type Norm<T> = (raw: unknown) => T

function bindChannel<T>(
  channelName: string,
  storageKey: string,
  normalize: Norm<T>,
  apply: (v: T) => void,
) {
  const onMsg = (raw: unknown) => {
    apply(normalize(raw))
  }
  try {
    const ch = new BroadcastChannel(channelName)
    ch.addEventListener('message', (ev) => onMsg(ev.data))
    channels.push(ch)
  } catch {
    // sem BroadcastChannel — storage events cobrem entre janelas
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) return
    try {
      const raw = event.newValue ? JSON.parse(event.newValue) : null
      apply(normalize(raw))
    } catch {
      // ignore
    }
  }
  window.addEventListener('storage', onStorage)
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) onMsg(JSON.parse(raw))
  } catch {
    // sem estado inicial
  }
}

export function startPalcoBridge() {
  if (started) return
  started = true

  bindChannel<MediaProjectionRuntime>(
    MEDIA_RUNTIME_CHANNEL,
    MEDIA_RUNTIME_STORAGE_KEY,
    normalizeMediaRuntime,
    (v) => {
      runtimes.media = v
      v.active && (v.lyric || v.title) ? claim('media') : release('media')
    },
  )

  bindChannel(
    BIBLE_RUNTIME_CHANNEL,
    BIBLE_RUNTIME_STORAGE_KEY,
    normalizeBibleRuntime,
    (v: { active: boolean; text: string; reference: string }) => {
      runtimes.bible = v
      v.active ? claim('bible') : release('bible')
    },
  )

  bindChannel(
    RANDOM_RUNTIME_CHANNEL,
    RANDOM_RUNTIME_STORAGE_KEY,
    normalizeRandomRuntime,
    (v: { currentDisplay: string; isDrawing: boolean }) => {
      runtimes.random = v
      v.currentDisplay ? claim('random') : release('random')
    },
  )

  bindChannel<TimerRuntimeState>(
    TIMER_RUNTIME_CHANNEL,
    TIMER_RUNTIME_STORAGE_KEY,
    normalizeTimerRuntime,
    (v) => {
      runtimes.timer = v
      v.status !== 'idle' ? claim('timer') : release('timer')
    },
  )

  bindChannel<CountdownRuntimeState>(
    COUNTDOWN_RUNTIME_CHANNEL,
    COUNTDOWN_RUNTIME_STORAGE_KEY,
    normalizeCountdownRuntime,
    (v) => {
      runtimes.countdown = v
      v.status !== 'idle' ? claim('countdown') : release('countdown')
    },
  )

  // Relógio: sem runtime — o toggle do módulo clock chama palcoClockOn/Off.
  // Áudio: watchers do media store (mesma janela)
  const media = useMediaStoreSafe()
  if (media) {
    unwatchers.push(
      watch(
        () => [media.isPlaying, media.session?.audioUrl] as const,
        () => syncAudio(),
      ),
      watch(
        () => media.hasSession,
        (has) => {
          if (!has) {
            lastAudioKey = ''
            void palcoSession.audio({ action: 'stop' })
          }
        },
      ),
      watch(
        () => media.currentTimeSec,
        (now, before) => {
          if (Math.abs(now - before) > 2 && media.hasSession) {
            void palcoSession.audio({ action: 'seek', position: now })
          }
        },
      ),
    )
  }
  window.setInterval(syncAudio, 3000)
  void projectOwner()
}

export function stopPalcoBridge() {
  if (!started) return
  started = false
  for (const ch of channels) ch.close()
  channels = []
  for (const un of unwatchers) un()
  unwatchers = []
  stopClock()
  owner = null
  lastAudioKey = ''
}

/** Liga/desliga o relógio na TV (chamado pelo módulo clock). */
export function palcoClockOn() {
  claim('clock')
}
export function palcoClockOff() {
  release('clock')
}

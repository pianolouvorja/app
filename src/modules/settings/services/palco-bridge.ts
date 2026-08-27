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
import { useOutputRegistry } from './output-registry'
import type { OutputModule } from './output-registry'
import { planForSlot, OWNER_TO_PALCO_MODULE } from './output-plan'
import { getPalcoRoute } from './palco-routing'
import type { ProjectionInput } from './palco-session'
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
  random: { currentDisplay: '', isDrawing: false, projecting: false },
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

/**
 * Renderiza TODOS os slots segundo o plano (spec 2026-08-27 — takeover
 * híbrido): decisãoo pura em output-plan.ts; aqui só efeitos.
 * Takeover: owner com rota pro slot renderiza nele (toma a tela).
 * Restore: slot atribuído mostra o conteúdo ATUAL do módulo atribuído
 * (se vivo) — nunca fica congelado; degradado → idle.
 * SERIAL: projectTo/timerTo trocam activeSlotId/baseUrl por sender.
 */
async function renderAllSlots(): Promise<void> {
  if (!palcoSession.isElectron) return
  const { moduleForSlot } = useOutputRegistry()
  const slots = await palcoSession.slots()
  for (const s of slots) {
    if (!s.running) continue
    const plan = planForSlot(s.id, {
      owner,
      routeOf: (m) => getPalcoRoute(m),
      assignedOf: (slotId) => moduleForSlot(slotId),
      isAlive: assignedSlotHasContent,
    })
    if (plan.render === 'owner') {
      await renderOwnerTo(s.id)
    } else if (plan.render === 'assigned') {
      // video/pdf/ppt: runtime vive nos popups (não na bridge) — não tocar.
      if (plan.module === 'bible' || plan.module === 'media') {
        await renderModuleTo(plan.module, s.id)
      }
    } else {
      palcoSession.idleTo(s.id)
    }
  }
}

/** Módulo atribuído a um slot tem conteúdo ativo pra mostrar nele? */
function assignedSlotHasContent(m: OutputModule): boolean {
  switch (m) {
    case 'bible': return runtimes.bible.active && Boolean(runtimes.bible.text)
    case 'media': return Boolean(runtimes.media.lyric || runtimes.media.title)
    // video/pdf/ppt: popups mandam direto ao slot — bridge não renderiza,
    // mas também NÃO considera morto (não mandar idle por cima deles).
    default: return true
  }
}

/** Input de projeção do owner (ou null → idle). */
function ownerInput(): ProjectionInput | { timer: TimerOpts } | null {
  switch (owner) {
    case 'media': {
      const r = runtimes.media
      const text = r.lyric || r.title || ''
      if (!text) return null
      return {
        text: text.split('\n').join('<br>'),
        // Título NUNCA no rodapé dos slides de letra — o nome da música
        // aparece só na capa (decisão Rafael 26/08).
        footerRef: '',
        background: r.imageUrl ?? undefined,
        isCover: r.isCover === true,
      }
    }
    case 'bible': {
      const r = runtimes.bible
      if (!r.active || !r.text) return null
      return { text: r.text.split('\n').join('<br>'), footerRef: r.reference }
    }
    case 'random': {
      const r = runtimes.random
      // Projeção ativa sem sorteio ainda: assume o palco com o bg do
      // escopo random (tela de espera — decisão Rafael 27/08).
      if (!r.currentDisplay && r.projecting) return { text: '' }
      if (!r.currentDisplay) return null
      return { text: r.currentDisplay }
    }
    case 'timer': {
      const r = runtimes.timer
      // guard: runtime stale (storage de sessão morta) não projeta —
      // era a causa do "contador 00:00 fundo preto" na TV.
      if (!r || r.status === 'idle' || !r.projecting) return null
      return { timer: { mode: 'chrono' as const, label: '', duration: Math.floor(elapsedMs(r) / 1000) } }
    }
    case 'countdown': {
      const r = runtimes.countdown
      if (!r || r.status === 'idle' || !r.projecting) return null
      const remaining = Math.max(0, r.durationMs - elapsedMs(r))
      return { timer: { mode: 'countdown' as const, label: '', duration: Math.ceil(remaining / 1000) } }
    }
    default:
      return null
  }
}

type TimerOpts = { mode: 'countdown' | 'chrono'; label?: string; duration?: number }

async function renderOwnerTo(slotId: string): Promise<void> {
  if (owner === 'clock') return renderClockTo(slotId)
  const input = ownerInput()
  if (!input) return palcoSession.idleTo(slotId)
  if ('timer' in input) return palcoSession.timerTo(slotId, input.timer)
  await palcoSession.projectTo(slotId, OWNER_TO_PALCO_MODULE[owner!] ?? 'random', input)
}

/** Slot atribuído: renderiza o módulo atribuído (restore). */
async function renderModuleTo(m: 'bible' | 'media', slotId: string): Promise<void> {
  if (m === 'bible') {
    const r = runtimes.bible
    if (!r.active || !r.text) return palcoSession.idleTo(slotId)
    await palcoSession.projectTo(slotId, 'bible', {
      text: r.text.split('\n').join('<br>'),
      footerRef: r.reference,
    })
    return
  }
  const r = runtimes.media
  const text = r.lyric || r.title || ''
  if (!text) return palcoSession.idleTo(slotId)
  await palcoSession.projectTo(slotId, 'hymns', {
    text: text.split('\n').join('<br>'),
    footerRef: '',
    background: r.imageUrl ?? undefined,
    isCover: r.isCover === true,
  })
}

async function projectOwner() {
  if (owner === 'clock') {
    // relógio tem tick próprio; renderAllSlots cobre os demais slots
  }
  await renderAllSlots()
}

let clockTimer: number | null = null

/** Relógio num slot específico (tick próprio de 15s). */
async function renderClockTo(slotId: string): Promise<void> {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  await palcoSession.projectTo(slotId, 'clock', { text: `${hh}:${mm}` })
}

/** Reinicia o tick do relógio pro slot tomado (owner=clock). */
function restartClockTick(): void {
  if (clockTimer) window.clearInterval(clockTimer)
  const tick = async () => {
    const { moduleForSlot } = useOutputRegistry()
    const slots = await palcoSession.slots()
    for (const s of slots) {
      if (!s.running) continue
      if (planForSlot(s.id, {
        owner,
        routeOf: (m) => getPalcoRoute(m),
        assignedOf: (id) => moduleForSlot(id),
        isAlive: assignedSlotHasContent,
      }).render === 'owner') {
        await renderClockTo(s.id)
      }
    }
  }
  void tick()
  clockTimer = window.setInterval(() => void tick(), 15000)
}

function stopClock() {
  if (clockTimer) {
    window.clearInterval(clockTimer)
    clockTimer = null
  }
}

/** Marca o dono e re-projeta. */
function claim(o: Exclude<Owner, null>) {
  if (owner === 'clock') stopClock()
  owner = o
  if (o === 'clock') restartClockTick()
  void projectOwner()
}

/**
 * Dono saindo → re-planeja slots (spec 2026-08-27): slot atribuído
 * restaura o módulo atribuído (se vivo), espelho → novo owner/idle.
 */
function release(o: Exclude<Owner, null>) {
  if (owner !== o) return
  owner = null
  void projectOwner()
}

// ===== áudio (rota local ↔ TV) =====

let lastAudioKey = ''
let lastPosSyncMs = 0
let lastAudioRoute: 'pc' | 'tv' | 'both' | null = null

function syncAudio() {
  const media = useMediaStoreSafe()
  if (!media) return
  const session = media.session
  const audioUrl = session?.audioUrl ?? null
  const key = audioUrl ?? 'none'
  const route = media.audioRoute

  // PC somente: projeção visual continua normal; áudio não vai ao Palco.
  // Stop só na transição, para não martelar receivers a cada poll.
  if (route === 'pc') {
    if (lastAudioRoute !== 'pc') void palcoSession.audio({ action: 'stop' })
    lastAudioRoute = 'pc'
    lastAudioKey = key
    return
  }
  const routeChanged = lastAudioRoute !== route
  lastAudioRoute = route

  // Rota TV: local pausado — a TV é a caixa. Envia a faixa (1x por URL)
  // e reenvia quando o operador der play/pause/seek NA UI (que comanda a TV).
  if (route === 'tv') {
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

  // Rota Ambos: PC e TV tocam juntos, sincronizados.
  // Entrando em Ambos vindo de TV precisa reenviar play mesmo na mesma faixa.
  if (key !== lastAudioKey || routeChanged) {
    lastPosSyncMs = 0
    if (audioUrl && media.isPlaying) {
      lastAudioKey = key
      void palcoSession.audio({
        url: audioUrl,
        title: session?.title ?? undefined,
        subtitle: session?.subtitle ?? undefined,
        cover: session?.coverUrl ?? undefined,
        positionMs: Math.round((media.currentTimeSec ?? 0) * 1000),
        action: 'play',
      })
    } else if (!audioUrl) {
      lastAudioKey = key
    }
    // Ao sair de TV, play() local ainda pode estar pendente; o watcher de
    // isPlaying chama syncAudio novamente e então envia o play ao Palco.
    return
  }

  if (!audioUrl) return

  if (media.isPlaying) {
    // Sync periódico: SEEK (não play+url — receiver não pode recarregar).
    // Só corrige desvio >2s; micro-sync a cada 3s causava loop/stutter na TV.
    const now = Date.now()
    if (now - lastPosSyncMs > 3000) {
      lastPosSyncMs = now
      void palcoSession.audio({
        url: audioUrl,
        positionMs: Math.round((media.currentTimeSec ?? 0) * 1000),
        action: 'seek',
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

/**
 * Ownership por INTENÇÃO (spec 2026-08-27): claim só na transição
 * false→true do sinal de projeção do módulo; release só na transição
 * true→false. Mensagens intermediárias de runtime (tick do timer,
 * troca de versículo, re-publicação sticky) NÃO disputam o owner —
 * eliminam a concorrência em que a Bíblia ativa roubava o palco do
 * Timer projetado (caso real 26/08: timer→projection bíblia→idle).
 * runtime do dono continua re-renderizando via projectOwner() abaixo.
 */
const intent = {
  media: false,
  bible: false,
  random: false,
  timer: false,
  countdown: false,
}

function setIntent(o: keyof typeof intent, wants: boolean) {
  if (intent[o] === wants) {
    // sem mudança de intenção: se for o dono, apenas re-renderiza
    if (owner === o) void projectOwner()
    return
  }
  intent[o] = wants
  if (wants) claim(o)
  else release(o)
}

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

  // Setas do controle da TV: navegam slides do PDF/PPT quando ativo.
  // O receiver manda {type:'remote-key', key:'prev'|'next'}; sem este
  // listener as setas só funcionavam com vídeo (decisão local na TV).
  palcoSession.onEvent((msg) => {
    const m = msg as { type?: string; key?: string }
    if (m?.type !== 'remote-key') return
    const bridge = (window as unknown as {
      louvorja?: {
        projection?: {
          remotePptPrev?: () => Promise<unknown>
          remotePptNext?: () => Promise<unknown>
        }
      }
    }).louvorja
    if (!bridge?.projection?.remotePptNext || !bridge.projection.remotePptPrev) return
    if (m.key === 'prev') void bridge.projection.remotePptPrev()
    else if (m.key === 'next') void bridge.projection.remotePptNext()
  })

  bindChannel<MediaProjectionRuntime>(
    MEDIA_RUNTIME_CHANNEL,
    MEDIA_RUNTIME_STORAGE_KEY,
    normalizeMediaRuntime,
    (v) => {
      runtimes.media = v
      setIntent('media', Boolean(v.active && (v.lyric || v.title)))
    },
  )

  bindChannel(
    BIBLE_RUNTIME_CHANNEL,
    BIBLE_RUNTIME_STORAGE_KEY,
    normalizeBibleRuntime,
    (v: { active: boolean; text: string; reference: string }) => {
      runtimes.bible = v
      setIntent('bible', v.active)
    },
  )

  bindChannel(
    RANDOM_RUNTIME_CHANNEL,
    RANDOM_RUNTIME_STORAGE_KEY,
    normalizeRandomRuntime,
    (v: { currentDisplay: string; isDrawing: boolean }) => {
      runtimes.random = v
      setIntent('random', v.projecting || Boolean(v.currentDisplay))
    },
  )

  bindChannel<TimerRuntimeState>(
      TIMER_RUNTIME_CHANNEL,
      TIMER_RUNTIME_STORAGE_KEY,
      normalizeTimerRuntime,
      (v: TimerRuntimeState | null): void => {
        if (!v) return
        runtimes.timer = v
        // Botão Projetar é o dono explícito: 00:00/pausado continua visível
        // até Retirar da projeção, igual Bíblia (não solta após 400ms).
        setIntent('timer', Boolean(v.projecting) || v.status !== 'idle')
      },
    )

    bindChannel<CountdownRuntimeState>(
      COUNTDOWN_RUNTIME_CHANNEL,
      COUNTDOWN_RUNTIME_STORAGE_KEY,
      normalizeCountdownRuntime,
      (v: CountdownRuntimeState | null): void => {
        if (!v) return
        runtimes.countdown = v
        setIntent('countdown', Boolean(v.projecting) || v.status !== 'idle')
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

/** Liga/desliga o relógio na TV (chamado pelo módulo clock). */
export function palcoClockOn() {
  claim('clock')
}
export function palcoClockOff() {
  release('clock')
}

/** Pausa todos os ticks internos (bridge sendo desligado). */
export function stopPalcoBridge() {
  if (!started) return
  started = false
  for (const ch of channels) ch.close()
  channels = []
  for (const un of unwatchers) un()
  unwatchers = []
  stopClock()
  owner = null
  intent.media = false
  intent.bible = false
  intent.random = false
  intent.timer = false
  intent.countdown = false
  lastAudioKey = ''
}

import { getDesktopBridge, isDesktopApp } from '@shared/services/desktop-bridge'
import { resolveMediaUrl } from '@shared/services/workspace-api'

import {
  RANDOM_AUDIO_REL_DIR,
  RANDOM_DEFAULT_AUDIO_FILE,
  RANDOM_EFFECT_AUDIO_FILE,
  type RandomDisplayConfig,
} from '../types/random'

let currentAudio: HTMLAudioElement | null = null
let effectAudio: HTMLAudioElement | null = null
let volumeLevel = 1
let muted = false

type PlayingListener = (playing: boolean) => void
const playingListeners = new Set<PlayingListener>()

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1, Math.max(0, value))
}

function isPlayingNow(): boolean {
  return Boolean(currentAudio && !currentAudio.paused)
}

export function isRandomDrawAudioPlaying(): boolean {
  return isPlayingNow()
}

function notifyPlaying(): void {
  const playing = isPlayingNow()
  for (const listener of playingListeners) {
    listener(playing)
  }
}

function applySettingsToElement(audio: HTMLAudioElement): void {
  audio.volume = volumeLevel
  audio.muted = muted
}

function canPlayLocalMedia(): boolean {
  return isDesktopApp() || Boolean(getDesktopBridge()?.random)
}

export function subscribeRandomAudioPlaying(listener: PlayingListener): () => void {
  playingListeners.add(listener)
  listener(isPlayingNow())
  return () => {
    playingListeners.delete(listener)
  }
}

export function applyRandomAudioOutput(settings: {
  volume: number
  muted: boolean
}): void {
  volumeLevel = clampVolume(settings.volume)
  muted = settings.muted === true
  if (currentAudio) {
    applySettingsToElement(currentAudio)
  }
  if (effectAudio) {
    applySettingsToElement(effectAudio)
  }
}

export function resolveRandomDrawAudioUrl(config: RandomDisplayConfig): string {
  if (config.audioSource === 'custom' && config.customAudioFile) {
    return resolveMediaUrl(`${RANDOM_AUDIO_REL_DIR}/${config.customAudioFile}`)
  }

  return resolveMediaUrl(`${RANDOM_AUDIO_REL_DIR}/${RANDOM_DEFAULT_AUDIO_FILE}`)
}

export function resolveRandomEffectAudioUrl(): string {
  return resolveMediaUrl(`${RANDOM_AUDIO_REL_DIR}/${RANDOM_EFFECT_AUDIO_FILE}`)
}

export function stopRandomDrawAudio(): void {
  if (!currentAudio) {
    notifyPlaying()
    return
  }
  try {
    currentAudio.pause()
    currentAudio.currentTime = 0
  } catch {
    // ignore
  }
  currentAudio = null
  notifyPlaying()
}

export function pauseRandomDrawAudio(): void {
  if (!currentAudio || currentAudio.paused) {
    notifyPlaying()
    return
  }
  try {
    currentAudio.pause()
  } catch {
    // ignore
  }
  notifyPlaying()
}

function stopRandomEffectAudio(): void {
  if (!effectAudio) return
  try {
    effectAudio.pause()
    effectAudio.currentTime = 0
  } catch {
    // ignore
  }
  effectAudio = null
}

function bindAudioLifecycle(audio: HTMLAudioElement): void {
  audio.addEventListener(
    'ended',
    () => {
      if (currentAudio === audio) {
        currentAudio = null
        notifyPlaying()
      }
    },
    { once: true },
  )
  audio.addEventListener(
    'error',
    () => {
      if (currentAudio === audio) {
        currentAudio = null
        notifyPlaying()
      }
    },
    { once: true },
  )
}

export function playRandomDrawAudio(config: RandomDisplayConfig): void {
  stopRandomDrawAudio()

  if (!canPlayLocalMedia()) return

  const url = resolveRandomDrawAudioUrl(config)
  const audio = new Audio(url)
  audio.preload = 'auto'
  audio.loop = true
  applySettingsToElement(audio)
  currentAudio = audio
  bindAudioLifecycle(audio)

  void audio.play().then(
    () => notifyPlaying(),
    () => {
      if (currentAudio === audio) currentAudio = null
      notifyPlaying()
    },
  )
}

/** Efeito curto ao revelar o vencedor (não interrompe o áudio de fundo). */
export function playRandomWinnerEffect(): void {
  stopRandomEffectAudio()

  if (!canPlayLocalMedia()) return

  const audio = new Audio(resolveRandomEffectAudioUrl())
  audio.preload = 'auto'
  audio.loop = false
  applySettingsToElement(audio)
  effectAudio = audio

  audio.addEventListener(
    'ended',
    () => {
      if (effectAudio === audio) effectAudio = null
    },
    { once: true },
  )
  audio.addEventListener(
    'error',
    () => {
      if (effectAudio === audio) effectAudio = null
    },
    { once: true },
  )

  void audio.play().catch(() => {
    if (effectAudio === audio) effectAudio = null
  })
}

/** Play / pause do áudio selecionado (preview). */
export function toggleRandomDrawAudio(config: RandomDisplayConfig): void {
  if (currentAudio && !currentAudio.paused) {
    pauseRandomDrawAudio()
    return
  }

  if (currentAudio && currentAudio.paused) {
    applySettingsToElement(currentAudio)
    void currentAudio.play().then(
      () => notifyPlaying(),
      () => notifyPlaying(),
    )
    return
  }

  playRandomDrawAudio(config)
}

export async function ensureRandomDefaultAudioInstalled(): Promise<void> {
  const bridge = getDesktopBridge()
  await bridge?.random?.ensureDefaultAudio?.()
}

export async function pickAndImportRandomAudio(): Promise<{
  ok: boolean
  fileName?: string
  reason?: string
}> {
  const bridge = getDesktopBridge()
  if (!bridge?.random?.importAudio) {
    return { ok: false, reason: 'unavailable' }
  }
  const result = await bridge.random.importAudio()
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }
  return { ok: true, fileName: result.fileName }
}

export async function deleteRandomCustomAudio(fileName: string): Promise<{
  ok: boolean
  reason?: string
}> {
  const bridge = getDesktopBridge()
  if (!bridge?.random?.deleteAudio) {
    return { ok: false, reason: 'unavailable' }
  }
  return bridge.random.deleteAudio(fileName)
}

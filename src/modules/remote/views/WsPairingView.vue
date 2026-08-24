<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import jsQR from 'jsqr'
import { GlassCard } from '@design-system/index'
import { useLiturgyStore } from '../../liturgy/stores/useLiturgyStore'
import { useMediaPlayer } from '../../media/composables/useMediaPlayer'
import { WebRemoteBridge } from '../services/web-remote-bridge'

const { t } = useI18n()
const router = useRouter()
const liturgy = useLiturgyStore()
const player = useMediaPlayer()

type Step = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error'

const step = ref<Step>('idle')
const errorMsg = ref('')
const log = ref<string[]>([])
const wsUrl = ref('')
const manualUrl = ref('')

let video: HTMLVideoElement | null = null
let stream: MediaStream | null = null
let scanTimer: number | null = null
let bridge: WebRemoteBridge | null = null
let unwatchState: (() => void) | null = null

function pushLog(msg: string) {
  log.value = [...log.value.slice(-6), msg]
}

async function startScan() {
  step.value = 'scanning'
  errorMsg.value = ''
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    await new Promise((r) => setTimeout(r, 200))
    if (video) {
      video.srcObject = stream
      await video.play()
      scanTimer = window.setInterval(scanFrame, 250)
    }
  } catch {
    step.value = 'error'
    errorMsg.value = t('settings.remote.wsNoCamera')
  }
}

function scanFrame() {
  if (!video) return
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx || !canvas.width) return
  ctx.drawImage(video, 0, 0)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = jsQR(img.data, img.width, img.height)
  if (result?.data?.startsWith('ws://')) {
    stopScan()
    connectWs(result.data)
  }
}

function connectWs(url: string) {
  step.value = 'connecting'
  wsUrl.value = url
  try {
    bridge?.stop()
    bridge = new WebRemoteBridge(url, {
      snapshot: () => ({
        player: {
          playing: player.isPlaying.value,
          title: player.session.value?.title ?? null,
          positionMs: Math.round((player.currentTimeSec.value ?? 0) * 1000),
          durationMs: Math.round((player.durationSec.value ?? 0) * 1000),
          slideIndex: 0,
          slideCount: 0,
          volume: Math.round((player.volume.value ?? 0) * 100),
          canPrevious: (liturgy.selectedItemIndex ?? 0) > 0,
          canNext: (liturgy.selectedItemIndex ?? -1) + 1 < liturgy.currentItems.length,
        },
        liturgy: {
          selectedIndex: liturgy.selectedItemIndex,
          items: liturgy.currentItems.map((item, index) => ({
            index,
            type: item.type,
            title: item.name || item.subtitle || null,
            subtitle: item.subtitle || null,
            isCategory: item.type === 'category',
            accentColor: item.accentColor || null,
            done: item.done === true,
          })),
        },
      }),
      execute: async (command) => {
        const index = typeof command.value === 'number' ? command.value : liturgy.selectedItemIndex ?? -1
        switch (command.action) {
          case 'liturgy.select':
            if (index < 0 || index >= liturgy.currentItems.length) return false
            await liturgy.playItemOnScreens(index)
            return true
          case 'liturgy.next':
            if (index + 1 >= liturgy.currentItems.length) return false
            await liturgy.selectItem(index + 1, router)
            return true
          case 'liturgy.previous':
            if (index <= 0) return false
            await liturgy.selectItem(index - 1, router)
            return true
          case 'liturgy.toggleDone':
            if (index < 0 || index >= liturgy.currentItems.length) return false
            liturgy.toggleItemDone(index)
            return true
          case 'player.play':
            await player.play()
            return true
          case 'player.pause':
            await player.pause()
            return true
          case 'player.setVolume':
            if (typeof command.value !== 'number') return false
            player.setVolume(Math.min(100, Math.max(0, command.value)) / 100)
            return true
          case 'player.seek':
            if (typeof command.positionMs !== 'number') return false
            player.seekTo(command.positionMs / 1000)
            return true
          default:
            return false
        }
      },
      onClose: () => {
        step.value = 'error'
        errorMsg.value = t('settings.remote.wsClosed')
      },
    })
    unwatchState?.()
    unwatchState = watch(
      () => [liturgy.selectedItemIndex, JSON.stringify(liturgy.currentItems.map((item) => [item.name, item.subtitle, item.done]))],
      () => bridge?.reportState(),
    )
    bridge.start()
    step.value = 'connected'
    pushLog(t('settings.remote.wsConnected'))
  } catch {
    step.value = 'error'
    errorMsg.value = t('settings.remote.wsError')
  }
}

function submitManual() {
  const url = manualUrl.value.trim()
  if (!url) return
  const full = url.startsWith('ws://') ? url : `ws://${url}`
  stopScan()
  connectWs(full)
}

function stopScan() {
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null }
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}

function reset() {
  stopScan()
  unwatchState?.()
  unwatchState = null
  bridge?.stop()
  bridge = null
  step.value = 'idle'
  log.value = []
  wsUrl.value = ''
  manualUrl.value = ''
  errorMsg.value = ''
}

onUnmounted(() => {
  stopScan()
  unwatchState?.()
  bridge?.stop()
})
</script>

<template>
  <section class="ws-pairing">
    <GlassCard class="ws-pairing__card">
      <h2 class="ws-pairing__title">
        {{ t('settings.remote.wsTitle') }}
      </h2>

      <template v-if="step === 'idle'">
        <p class="ws-pairing__hint">
          {{ t('settings.remote.wsHint1') }}
        </p>
        <p class="ws-pairing__hint">
          {{ t('settings.remote.wsHint2') }}
        </p>
        <button
          type="button"
          class="ws-pairing__btn"
          @click="startScan"
        >
          {{ t('settings.remote.wsStart') }}
        </button>
        <p class="ws-pairing__hint ws-pairing__hint--small">
          {{ t('settings.remote.wsManualHint') }}
        </p>
        <input
          v-model="manualUrl"
          type="text"
          class="ws-pairing__input mono"
          :placeholder="t('settings.remote.wsManualPlaceholder')"
          @keyup.enter="submitManual"
        >
        <button
          type="button"
          class="ws-pairing__btn ws-pairing__btn--ghost"
          @click="submitManual"
        >
          {{ t('settings.remote.wsManualApply') }}
        </button>
      </template>

      <template v-else-if="step === 'scanning'">
        <p class="ws-pairing__hint">
          {{ t('settings.remote.wsScanning') }}
        </p>
        <video
          ref="video"
          class="ws-pairing__cam"
          muted
          playsinline
        />
        <button
          type="button"
          class="ws-pairing__btn ws-pairing__btn--ghost"
          @click="reset"
        >
          {{ t('settings.remote.wsCancel') }}
        </button>
      </template>

      <template v-else-if="step === 'connecting'">
        <p class="ws-pairing__hint">
          {{ t('settings.remote.wsConnecting') }}
        </p>
        <p class="ws-pairing__url mono">
          {{ wsUrl.replace('ws://', '') }}
        </p>
      </template>

      <template v-else-if="step === 'connected'">
        <p class="ws-pairing__ok">
          ✓ {{ t('settings.remote.wsConnected') }}
        </p>
        <button
          type="button"
          class="ws-pairing__btn"
          @click="reset"
        >
          {{ t('settings.remote.wsDisconnect') }}
        </button>
      </template>

      <template v-else-if="step === 'error'">
        <p class="ws-pairing__error">
          {{ errorMsg }}
        </p>
        <button
          type="button"
          class="ws-pairing__btn"
          @click="reset"
        >
          {{ t('settings.remote.wsRetry') }}
        </button>
      </template>

      <ul
        v-if="log.length"
        class="ws-pairing__log"
      >
        <li
          v-for="(line, i) in log"
          :key="i"
        >
          {{ line }}
        </li>
      </ul>
    </GlassCard>
  </section>
</template>

<style scoped>
.ws-pairing {
  display: flex;
  justify-content: center;
}

.ws-pairing__card {
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ws-pairing__title {
  font-size: 1.25rem;
  font-weight: 600;
}

.ws-pairing__hint {
  opacity: 0.8;
  line-height: 1.5;
}

.ws-pairing__cam {
  width: 100%;
  max-width: 360px;
  border-radius: 12px;
  background: #000;
  align-self: center;
}

.ws-pairing__btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 600;
  cursor: pointer;
}

.ws-pairing__btn--ghost {
  background: transparent;
  border: 1px solid rgb(var(--v-theme-outline));
  color: inherit;
}

.ws-pairing__input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgb(var(--v-theme-outline));
  background: transparent;
  color: inherit;
  font-size: 0.85rem;
}

.ws-pairing__hint--small {
  font-size: 0.8rem;
  opacity: 0.6;
}

.ws-pairing__url {
  word-break: break-all;
  opacity: 0.7;
}

.ws-pairing__ok {
  color: rgb(var(--v-theme-success, 76 175 80));
  font-weight: 600;
}

.ws-pairing__error {
  color: rgb(var(--v-theme-error));
}

.ws-pairing__log {
  font-family: monospace;
  font-size: 0.75rem;
  opacity: 0.6;
  list-style: none;
  padding: 0;
}
</style>

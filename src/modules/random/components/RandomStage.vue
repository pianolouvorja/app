<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  useTemplateRef,
} from 'vue'
import { useI18n } from 'vue-i18n'

import type { RandomDisplayConfig, RandomRuntimeState } from '../types/random'

const PARTICLE_COUNT = 20

interface OrbParticle {
  id: number
  size: number
  left: number
  top: number
}

function createParticles(): OrbParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
    id,
    size: Math.random() * 4 + 2,
    left: Math.random() * 100,
    top: Math.random() * 100,
  }))
}

const props = withDefaults(
  defineProps<{
    config: RandomDisplayConfig
    runtime: RandomRuntimeState
    canDraw: boolean
    isProjecting?: boolean
    preview?: boolean
  }>(),
  {
    isProjecting: false,
    preview: false,
  },
)

const emit = defineEmits<{
  draw: []
  openConfig: []
}>()

const { t } = useI18n()
const particlesLayerRef = useTemplateRef<HTMLElement>('particlesLayer')
const particles = createParticles()

const animations: Animation[] = []
let cancelled = false

const hasResult = computed(
  () => props.runtime.currentDisplay.length > 0 && !props.runtime.isDrawing,
)

const statusLabel = computed(() => {
  if (props.runtime.isDrawing) return t('random.drawing')
  if (props.canDraw) return t('random.readyToDraw')
  return t('random.emptyList')
})

const displayText = computed(() => {
  if (props.runtime.currentDisplay) return props.runtime.currentDisplay
  return t('random.placeholderDisplay')
})

const displayStyle = computed(() => ({
  color: props.runtime.isDrawing
    ? 'var(--ds-color-on-surface-variant)'
    : props.preview
      ? 'var(--ds-color-primary)'
      : props.config.textColor,
  textTransform: props.config.textTransform,
  textShadow:
    props.runtime.isDrawing || props.preview
      ? 'none'
      : `0 10px 40px ${props.config.textColor}60`,
  opacity: props.runtime.currentDisplay || props.preview ? 1 : 0.55,
}))

function relocateParticle(el: HTMLElement) {
  el.style.left = `${Math.random() * 100}%`
  el.style.top = `${Math.random() * 100}%`
}

function animateParticle(el: HTMLElement) {
  if (cancelled) return

  const duration = Math.random() * 2000 + 1000
  const x = (Math.random() - 0.5) * 100
  const y = (Math.random() - 0.5) * 100

  const animation = el.animate(
    [
      { transform: 'translate(0, 0)', opacity: 0.6 },
      { transform: `translate(${x}px, ${y}px)`, opacity: 0 },
    ],
    {
      duration,
      easing: 'ease-out',
      fill: 'forwards',
    },
  )

  animations.push(animation)

  animation.onfinish = () => {
    const index = animations.indexOf(animation)
    if (index >= 0) animations.splice(index, 1)
    if (cancelled) return
    relocateParticle(el)
    animateParticle(el)
  }
}

function startParticles() {
  const layer = particlesLayerRef.value
  if (!layer || typeof Element.prototype.animate !== 'function') return

  const nodes = layer.querySelectorAll<HTMLElement>('.random-stage__particle')
  for (const node of nodes) {
    animateParticle(node)
  }
}

function stopParticles() {
  cancelled = true
  for (const animation of animations) {
    animation.cancel()
  }
  animations.length = 0
}

onMounted(() => {
  cancelled = false
  startParticles()
})

onUnmounted(() => {
  stopParticles()
})
</script>

<template>
  <div class="random-stage">
    <div
      v-if="preview"
      class="random-stage__toolbar"
    >
      <button
        type="button"
        class="random-stage__tool"
        :aria-label="t('random.config')"
        :title="t('random.config')"
        @click="emit('openConfig')"
      >
        <i
          class="ti ti-palette"
          aria-hidden="true"
        />
      </button>
    </div>

    <div class="random-stage__focal">
      <div class="random-stage__orbit random-stage__orbit--outer" />
      <div class="random-stage__orbit random-stage__orbit--inner" />

      <div class="random-stage__orb">
        <div
          ref="particlesLayer"
          class="random-stage__particles"
          aria-hidden="true"
        >
          <span
            v-for="particle in particles"
            :key="particle.id"
            class="random-stage__particle"
            :style="{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }"
          />
        </div>
        <div class="random-stage__orb-glow" />
        <div class="random-stage__content">
          <template v-if="runtime.isDrawing || runtime.currentDisplay">
            <span
              v-if="hasResult"
              class="random-stage__winner-label"
            >
              {{ t('random.winner') }}
            </span>
            <p
              class="random-stage__display"
              :class="{ 'random-stage__display--drawing': runtime.isDrawing }"
              :style="displayStyle"
            >
              {{ displayText }}
            </p>
          </template>
          <template v-else>
            <i
              class="ti ti-sparkles random-stage__idle-icon"
              aria-hidden="true"
            />
            <p class="random-stage__idle-text">
              {{ t('random.readyToDraw') }}
            </p>
          </template>
        </div>
      </div>
    </div>

    <button
      v-if="preview"
      type="button"
      class="random-stage__draw"
      :class="{ 'random-stage__draw--spinning': runtime.isDrawing }"
      :disabled="!canDraw"
      :aria-label="t('random.drawButton')"
      @click="emit('draw')"
    >
      <span class="random-stage__draw-circle">
        <i
          class="ti ti-dice"
          aria-hidden="true"
        />
      </span>
      <span class="random-stage__draw-label">
        {{ t('random.drawButton') }}
      </span>
    </button>

    <p
      v-if="preview"
      class="random-stage__hint"
    >
      {{ statusLabel }}
    </p>

    <p
      v-if="preview && isProjecting"
      class="random-stage__projecting"
    >
      <i
        class="ti ti-device-desktop"
        aria-hidden="true"
      />
      {{ t('random.projecting') }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.random-stage {
  position: relative;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  padding: 1rem;
  overflow: visible;
}

.random-stage__toolbar {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
}

.random-stage__tool {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
  color: var(--ds-color-primary);
  cursor: pointer;
  transition:
    transform 160ms ease,
    background-color 160ms ease;

  &:hover {
    transform: scale(1.06);
    background: color-mix(in srgb, var(--ds-color-primary) 28%, transparent);
  }

  .ti {
    font-size: 1.1rem;
  }
}

.random-stage__focal {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(20rem, 55vw);
  height: min(20rem, 55vw);
  overflow: visible;
}

.random-stage__orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 0;
  translate: -50% -50%;
  border-radius: 9999px;
  pointer-events: none;
  animation: random-orbital 20s linear infinite;

  &--outer {
    width: min(26rem, 70vw);
    height: min(26rem, 70vw);
    border: 2px dashed color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
  }

  &--inner {
    width: min(22rem, 60vw);
    height: min(22rem, 60vw);
    border: 1px solid color-mix(in srgb, var(--ds-color-primary) 20%, transparent);
    animation-direction: reverse;
    animation-duration: 15s;
  }
}

.random-stage__orb {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-surface-elevated) 72%, transparent);
  backdrop-filter: blur(16px);
  box-shadow:
    0 0 80px 20px color-mix(in srgb, var(--ds-color-primary) 15%, transparent),
    inset 0 0 40px color-mix(in srgb, var(--ds-color-primary) 10%, transparent);
}

.random-stage__particles {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.random-stage__particle {
  position: absolute;
  border-radius: 50%;
  background: var(--ds-color-primary, #9ecaff);
  box-shadow: 0 0 6px color-mix(in srgb, var(--ds-color-primary, #9ecaff) 55%, transparent);
  pointer-events: none;
  opacity: 0.6;
}

.random-stage__orb-glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 40%,
    color-mix(in srgb, var(--ds-color-primary) 18%, transparent),
    transparent 70%
  );
}

.random-stage__content {
  position: relative;
  z-index: 1;
  display: flex;
  max-width: 85%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
}

.random-stage__winner-label {
  color: var(--ds-color-primary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.random-stage__display {
  margin: 0;
  font-size: clamp(1.5rem, 3.2vw, 2.25rem);
  font-weight: 800;
  line-height: 1.15;
  word-break: break-word;
  transition:
    color 300ms ease,
    opacity 200ms ease;

  &--drawing {
    opacity: 0.55;
  }
}

.random-stage__idle-icon {
  color: color-mix(in srgb, var(--ds-color-primary) 40%, transparent);
  font-size: 3.5rem;
}

.random-stage__idle-text {
  margin: 0;
  max-width: 11rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.875rem;
  line-height: 1.4;
}

.random-stage__draw {
  position: relative;
  z-index: 2;
  display: flex;
  margin-top: 2.5rem;
  flex-direction: column;
  align-items: center;
  border: 0;
  background: transparent;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &--spinning .random-stage__draw-circle .ti {
    animation: random-dice-spin 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:not(:disabled):hover .random-stage__draw-circle {
    transform: scale(1.08);
  }

  &:not(:disabled):active .random-stage__draw-circle {
    transform: scale(0.95);
  }
}

.random-stage__draw-circle {
  display: inline-flex;
  width: 5.5rem;
  height: 5.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--ds-color-primary-container, #2196f3);
  color: var(--ds-color-on-primary-container, #002c4f);
  box-shadow: 0 0 40px color-mix(in srgb, #2196f3 40%, transparent);
  transition: transform 180ms ease;

  .ti {
    font-size: 2.25rem;
  }
}

.random-stage__draw-label {
  margin-top: 0.85rem;
  color: var(--ds-color-primary);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.random-stage__hint {
  position: relative;
  z-index: 2;
  margin: 0.85rem 0 0;
  color: color-mix(in srgb, var(--ds-color-on-surface-variant) 80%, transparent);
  font-size: 0.75rem;
  font-weight: 500;
}

.random-stage__projecting {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 1.25rem 0 0;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-primary) 22%, transparent);
  color: var(--ds-color-primary);
  font-size: 0.75rem;
  font-weight: 600;

  .ti {
    font-size: 0.95rem;
  }
}

@keyframes random-orbital {
  from {
    rotate: 0deg;
  }

  to {
    rotate: 360deg;
  }
}

@keyframes random-dice-spin {
  from {
    transform: rotate(0deg) scale(0.9);
  }

  to {
    transform: rotate(360deg) scale(1);
  }
}

@media (max-width: 1100px) {
  .random-stage__orbit--outer,
  .random-stage__orbit--inner {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .random-stage__orbit {
    animation: none;
  }

  .random-stage__particle {
    display: none;
  }
}
</style>

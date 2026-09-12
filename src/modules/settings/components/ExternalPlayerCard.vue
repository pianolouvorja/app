<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  DetectedPlayer,
  ExternalPlayerPreference,
} from '@/shared/types/desktop-bridge'

const { t } = useI18n()

const bridge = window.louvorja
const hasApi = Boolean(bridge?.isElectron && bridge.externalPlayer?.get)

const player = ref<ExternalPlayerPreference>('associated')
const installed = ref<DetectedPlayer[]>([])
const busy = ref(false)

/** Rótulo do player atual (para o botão custom com caminho longo). */
function labelFor(p: ExternalPlayerPreference): string {
  if (p === 'associated') return t('settings.externalPlayer.player.associated')
  if (p.startsWith('custom:')) {
    const bin = p.slice('custom:'.length)
    const name = bin.split(/[\\/]/).pop() || bin
    return t('settings.externalPlayer.player.custom', { name })
  }
  const found = installed.value.find((d) => d.id === p)
  return found?.label ?? p
}

onMounted(async () => {
  if (!hasApi) return
  try {
    player.value = await bridge!.externalPlayer!.get!()
  } catch {
    player.value = 'associated'
  }
  try {
    installed.value = (await bridge!.externalPlayer!.detect!()) ?? []
  } catch {
    installed.value = []
  }
})

async function setPlayer(next: ExternalPlayerPreference) {
  if (!hasApi || busy.value) return
  busy.value = true
  const previous = player.value
  player.value = next
  try {
    const ok = await bridge!.externalPlayer!.set!(next)
    if (!ok) player.value = previous
  } catch {
    player.value = previous
  } finally {
    busy.value = false
  }
}

/** Abre o seletor de arquivos para escolher qualquer player não listado. */
async function pickCustomPlayer() {
  if (!hasApi || busy.value) return
  try {
    const picked = await bridge!.dialog!.openFile!({
      title: t('settings.externalPlayer.pickTitle'),
      multiple: false,
    })
    const path = Array.isArray(picked) ? picked[0] : picked
    if (typeof path === 'string' && path.trim()) {
      await setPlayer(`custom:${path.trim()}` as ExternalPlayerPreference)
    }
  } catch {
    /* usuário cancelou */
  }
}
</script>

<template>
  <section class="ext-player-card" data-test="external-player-card">
    <h3>{{ t('settings.externalPlayer.title') }}</h3>
    <p class="hint">{{ t('settings.externalPlayer.description') }}</p>

    <div
      v-if="hasApi"
      class="options"
      role="radiogroup"
      :aria-label="t('settings.externalPlayer.title')"
    >
      <button
        type="button"
        role="radio"
        :aria-checked="player === 'associated'"
        :class="{ selected: player === 'associated' }"
        data-test="external-player-associated"
        :disabled="busy"
        @click="setPlayer('associated')"
      >
        {{ t('settings.externalPlayer.player.associated') }}
      </button>

      <button
        v-for="option in installed"
        :key="option.id"
        type="button"
        role="radio"
        :aria-checked="player === option.id"
        :class="{ selected: player === option.id }"
        :data-test="`external-player-${option.id}`"
        :disabled="busy"
        @click="setPlayer(option.id as ExternalPlayerPreference)"
      >
        {{ option.label }}
      </button>

      <button
        v-if="player.startsWith('custom:')"
        type="button"
        role="radio"
        :aria-checked="true"
        class="selected"
        data-test="external-player-custom-active"
        :disabled="busy"
        @click="pickCustomPlayer()"
      >
        {{ labelFor(player) }}
      </button>

      <button
        type="button"
        :data-test="`external-player-pick`"
        :disabled="busy"
        @click="pickCustomPlayer()"
      >
        {{ t('settings.externalPlayer.pickOther') }}
      </button>
    </div>

    <p v-if="hasApi" class="hint">
      {{ t('settings.externalPlayer.hint') }}
    </p>
    <p v-else class="hint">{{ t('settings.externalPlayer.desktopOnly') }}</p>
  </section>
</template>

<style scoped lang="scss">
.ext-player-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

h3 {
  margin: 0;
  font-size: 1rem;
}

.hint {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.7;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.options button {
  padding: 0.4rem 0.9rem;
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.85rem;

  &.selected {
    border-color: var(--q-primary, #f2994a);
    background: color-mix(in srgb, var(--q-primary, #f2994a) 18%, transparent);
    font-weight: 600;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}
</style>

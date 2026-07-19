<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * Controles reutilizáveis de faixa: Cantado / Playback / Sem áudio / Letra.
 * Usado em Álbuns, Liturgia e qualquer lista de músicas.
 */
withDefaults(
  defineProps<{
    hasInstrumental: boolean
    busy?: boolean
    variant?: 'plain' | 'contained'
  }>(),
  {
    busy: false,
    variant: 'plain',
  },
)

const emit = defineEmits<{
  sung: []
  instrumental: []
  slides: []
  lyric: []
}>()

const { t } = useI18n()

/** Oculto por enquanto — reative para voltar o botão de letra nas listagens. */
const SHOW_LYRIC_ACTION = false
</script>

<template>
  <div
    class="music-track-actions"
    :class="`music-track-actions--${variant}`"
  >
    <button
      type="button"
      class="music-track-actions__btn"
      :disabled="busy"
      :title="t('media.actions.sung')"
      :aria-label="t('media.actions.sung')"
      @click.stop="emit('sung')"
    >
      <i
        class="ti ti-player-play"
        aria-hidden="true"
      />
    </button>

    <button
      type="button"
      class="music-track-actions__btn"
      :disabled="busy || !hasInstrumental"
      :title="t('media.actions.instrumental')"
      :aria-label="t('media.actions.instrumental')"
      @click.stop="emit('instrumental')"
    >
      <i
        class="ti ti-piano"
        aria-hidden="true"
      />
    </button>

    <button
      type="button"
      class="music-track-actions__btn"
      :disabled="busy"
      :title="t('media.actions.slides')"
      :aria-label="t('media.actions.slides')"
      @click.stop="emit('slides')"
    >
      <i
        class="ti ti-volume-off"
        aria-hidden="true"
      />
    </button>

    <button
      v-if="SHOW_LYRIC_ACTION"
      type="button"
      class="music-track-actions__btn"
      :disabled="busy"
      :title="t('media.actions.lyric')"
      :aria-label="t('media.actions.lyric')"
      @click.stop="emit('lyric')"
    >
      <i
        class="ti ti-file-text"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<style scoped lang="scss">
.music-track-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.music-track-actions__btn {
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--ds-color-primary);
  cursor: pointer;
  transition:
    background-color 140ms ease,
    transform 140ms ease;

  .ti {
    font-size: 1.35rem;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
    transform: scale(1.06);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.music-track-actions--contained {
  .music-track-actions__btn {
    background: var(--ds-color-surface-container-high);
    color: var(--ds-color-on-surface-variant);

    &:first-child {
      color: var(--ds-color-primary);
    }

    &:hover:not(:disabled) {
      background: var(--ds-color-primary);
      color: var(--ds-color-on-primary);
    }
  }
}
</style>

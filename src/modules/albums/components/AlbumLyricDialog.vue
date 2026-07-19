<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { AlbumLyricDocument } from '../types/albums'

defineProps<{
  open: boolean
  loading: boolean
  document: AlbumLyricDocument | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="album-lyric-dialog"
      role="dialog"
      aria-modal="true"
      :aria-label="t('albums.lyric.title')"
    >
      <button
        type="button"
        class="album-lyric-dialog__backdrop"
        :aria-label="t('albums.lyric.close')"
        @click="emit('close')"
      />

      <div class="album-lyric-dialog__panel">
        <header class="album-lyric-dialog__header">
          <h2 class="album-lyric-dialog__title">
            {{ document?.title || t('albums.lyric.title') }}
          </h2>
          <button
            type="button"
            class="album-lyric-dialog__close"
            :aria-label="t('albums.lyric.close')"
            @click="emit('close')"
          >
            <i
              class="ti ti-x"
              aria-hidden="true"
            />
          </button>
        </header>

        <div class="album-lyric-dialog__body">
          <p
            v-if="loading"
            class="album-lyric-dialog__state"
          >
            {{ t('albums.loading') }}
          </p>
          <p
            v-else-if="!document || document.lines.length === 0"
            class="album-lyric-dialog__state"
          >
            {{ t('albums.messages.lyricMissing') }}
          </p>
          <div
            v-else
            class="album-lyric-dialog__lines"
          >
            <p
              v-for="line in document.lines"
              :key="`${line.order}-${line.text.slice(0, 12)}`"
              class="album-lyric-dialog__line"
            >
              {{ line.text }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.album-lyric-dialog {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.album-lyric-dialog__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgb(0 0 0 / 0.55);
  cursor: pointer;
}

.album-lyric-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(36rem, 100%);
  max-height: min(80vh, 40rem);
  display: flex;
  flex-direction: column;
  border-radius: var(--ds-radius-lg, 1rem);
  background: var(--ds-color-surface-card, #1e1e1e);
  border: 1px solid var(--ds-color-outline-strong);
  box-shadow: 0 24px 60px rgb(0 0 0 / 0.45);
  overflow: hidden;
}

.album-lyric-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--ds-color-outline);
}

.album-lyric-dialog__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ds-color-on-surface);
}

.album-lyric-dialog__close {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--ds-color-primary);
    background: color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
  }
}

.album-lyric-dialog__body {
  min-height: 0;
  overflow: auto;
  padding: 1rem 1.1rem 1.25rem;
}

.album-lyric-dialog__state {
  margin: 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.9rem;
}

.album-lyric-dialog__lines {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.album-lyric-dialog__line {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.45;
  color: var(--ds-color-on-surface);
}
</style>

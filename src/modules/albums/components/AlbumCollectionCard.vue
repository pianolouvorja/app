<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { AlbumCollection } from '../types/albums'

defineProps<{
  collection: AlbumCollection
}>()

const emit = defineEmits<{
  open: []
}>()

const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    class="album-collection-card"
    @click="emit('open')"
  >
    <div
      class="album-collection-card__cover"
      :style="collection.coverUrl ? { backgroundImage: `url(${collection.coverUrl})` } : undefined"
    >
      <i
        v-if="!collection.coverUrl"
        class="mdi"
        :class="collection.kind === 'hymnal' ? 'mdi-book-music' : 'mdi-album'"
        aria-hidden="true"
      />
    </div>

    <div class="album-collection-card__body">
      <h3 class="album-collection-card__name">
        {{ collection.name }}
      </h3>
      <p
        v-if="collection.subtitle"
        class="album-collection-card__subtitle"
      >
        {{ collection.subtitle }}
      </p>
      <p
        v-if="collection.trackCount != null"
        class="album-collection-card__meta"
      >
        {{ t('albums.trackCount', { count: collection.trackCount }) }}
      </p>
    </div>
  </button>
</template>

<style scoped lang="scss">
.album-collection-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0;
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: var(--ds-radius-lg, 1rem);
  background: color-mix(in srgb, var(--ds-color-surface-card) 78%, transparent);
  overflow: hidden;
  text-align: left;
  color: inherit;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--ds-color-primary) 45%, transparent);
  }
}

.album-collection-card__cover {
  aspect-ratio: 1;
  width: 100%;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--ds-color-primary) 35%, #111), #1a1a1a);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;

  .mdi {
    font-size: 2.5rem;
    color: color-mix(in srgb, #fff 70%, transparent);
  }
}

.album-collection-card__body {
  padding: 0 0.9rem 1rem;
}

.album-collection-card__name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
  line-height: 1.3;
}

.album-collection-card__subtitle,
.album-collection-card__meta {
  margin: 0.3rem 0 0;
  font-size: 0.78rem;
  color: var(--ds-color-on-surface-variant);
}
</style>

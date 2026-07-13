<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { LibraryAlbum, LibraryCategory } from '../types/library'
import LibraryAlbumCoverCard from './LibraryAlbumCoverCard.vue'
import LibraryHymnalCard from './LibraryHymnalCard.vue'

const props = defineProps<{
  category: LibraryCategory
}>()

const emit = defineEmits<{
  download: [album: LibraryAlbum]
  cancel: [album: LibraryAlbum]
  remove: [album: LibraryAlbum]
}>()

const { t } = useI18n()

const isHymnals = computed(() => String(props.category.id) === 'hymnals')

const isYouthAlbums = computed(() => {
  const name = props.category.name
  return name === 'CDs Oficiais/Ano' || /cds?\s*oficiais/i.test(name)
})

const categoryTitle = computed(() => {
  if (isHymnals.value) return t('sync.categories.hymnals')
  if (isYouthAlbums.value) return t('sync.categories.youthAlbums')
  return props.category.name
})

const categorySubtitle = computed(() => {
  if (isHymnals.value) return t('sync.categories.hymnalsSubtitle')
  if (isYouthAlbums.value) return t('sync.categories.albumsSubtitle')
  return t('sync.categories.defaultSubtitle')
})
</script>

<template>
  <section
    class="library-category"
    :class="{
      'library-category--hymnals': isHymnals,
      'library-category--albums': !isHymnals,
    }"
  >
    <header class="library-category__header">
      <h2 class="library-category__title">
        {{ categoryTitle }}
      </h2>
      <p class="library-category__subtitle">
        {{ categorySubtitle }}
      </p>
    </header>

    <div
      v-if="isHymnals"
      class="library-category__hymnal-grid"
    >
      <LibraryHymnalCard
        v-for="album in category.albums"
        :key="String(album.id)"
        :album="album"
        @download="emit('download', album)"
        @cancel="emit('cancel', album)"
        @remove="emit('remove', album)"
      />
    </div>

    <div
      v-else
      class="library-category__album-grid"
    >
      <LibraryAlbumCoverCard
        v-for="album in category.albums"
        :key="String(album.id)"
        :album="album"
        @download="emit('download', album)"
        @cancel="emit('cancel', album)"
        @remove="emit('remove', album)"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.library-category {
  margin-bottom: 4rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.library-category__header {
  margin-bottom: 2rem;
  padding: 0 1rem;
}

.library-category__title {
  margin: 0 0 0.25rem;
  color: var(--ds-color-on-surface);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 32px;
}

.library-category__subtitle {
  margin: 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
  opacity: 0.7;
}

.library-category__hymnal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.library-category__album-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }

  @media (min-width: 1440px) {
    grid-template-columns: repeat(10, minmax(0, 1fr));
  }
}
</style>

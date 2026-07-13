<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { LibraryAlbum, LibraryCategory } from '../types/library'
import LibraryAlbumRow from './LibraryAlbumRow.vue'

const props = defineProps<{
  category: LibraryCategory
}>()

const emit = defineEmits<{
  download: [album: LibraryAlbum]
  cancel: [album: LibraryAlbum]
  remove: [album: LibraryAlbum]
}>()

const { t } = useI18n()

const categoryTitle = computed(() => {
  if (String(props.category.id) === 'hymnals') {
    return t('sync.categories.hymnals')
  }
  return props.category.name
})
</script>

<template>
  <section class="library-category">
    <h3 class="library-category__title">
      {{ categoryTitle }}
    </h3>
    <div class="library-category__list">
      <LibraryAlbumRow
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
  margin-bottom: 2.5rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.library-category__title {
  margin: 0 0 1rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2em;
  line-height: 14px;
  text-transform: uppercase;
  opacity: 0.6;
}

.library-category__list {
  overflow: hidden;
  border-radius: var(--ds-radius-lg, 0.75rem);
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
  background: color-mix(
    in srgb,
    var(--ds-color-surface-container-lowest, #0e0e0e) 30%,
    transparent
  );
}
</style>

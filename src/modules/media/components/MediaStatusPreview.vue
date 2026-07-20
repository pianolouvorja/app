<script setup lang="ts">
defineProps<{
  snippet: string
  reference: string
}>()
</script>

<template>
  <aside
    class="media-status-preview"
    aria-live="polite"
  >
    <p class="media-status-preview__text">
      “{{ snippet }}”
    </p>
    <p class="media-status-preview__ref">
      {{ reference }}
    </p>
  </aside>
</template>

<style scoped lang="scss">
.media-status-preview {
  width: 16rem;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.45rem;
  padding: 0.85rem;
  border-radius: 0.75rem 0 0.75rem 0;
  background: rgb(0 0 0 / 0.88);
  border: 1px solid rgb(255 255 255 / 0.2);
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.45);
  pointer-events: none;
}

.media-status-preview__text {
  margin: 0;
  color: #fff;
  font-size: 0.7rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.media-status-preview__ref {
  margin: 0;
  color: #fb8c00;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

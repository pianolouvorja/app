<script setup lang="ts">
import AppearancePreview from '../components/AppearancePreview.vue'
import ThemeModeCard from '../components/ThemeModeCard.vue'
</script>

<template>
  <div class="appearance-panel">
    <div class="appearance-panel__main">
      <ThemeModeCard />
    </div>
    <AppearancePreview class="appearance-panel__side" />
  </div>
</template>

<style scoped lang="scss">
.appearance-panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    align-items: start;
  }
}

.appearance-panel__main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.appearance-panel__side {
  @media (min-width: 1024px) {
    position: sticky;
    top: 1.5rem;
  }
}
</style>

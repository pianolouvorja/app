<script setup lang="ts">
import ClassoDetectCard from '../components/ClassoDetectCard.vue'
import YoutubeAccountCard from '../components/YoutubeAccountCard.vue'
import PptEngineCard from '../components/PptEngineCard.vue'
</script>

<template>
  <div class="media-view">
    <YoutubeAccountCard />
    <PptEngineCard />
    <ClassoDetectCard />
  </div>
</template>

<style scoped>
.media-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

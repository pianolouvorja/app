<script setup lang="ts">
import ClassoDetectCard from '../components/ClassoDetectCard.vue'
import PptEngineCard from '../components/PptEngineCard.vue'
import ExternalPlayerCard from '../components/ExternalPlayerCard.vue'
import YoutubeAccountCard from '../components/YoutubeAccountCard.vue'
</script>

<template>
  <div class="media-view">
    <YoutubeAccountCard />
    <PptEngineCard />
    <ExternalPlayerCard />
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

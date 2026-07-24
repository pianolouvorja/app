<script setup lang="ts">
import { useThemeManager } from '@design-system/composables'
import { useStartingStore } from '@modules/starting/stores/useStartingStore'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { useTheme } from 'vuetify'

const vuetifyTheme = useTheme()
const { currentTheme } = useThemeManager()
const startingStore = useStartingStore()
const { isAppReady } = storeToRefs(startingStore)

watch(
  () => currentTheme.value.mode,
  (mode) => {
    void vuetifyTheme.change(mode === 'dark' ? 'dark' : 'light')
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-frame">
    <AppTitlebar />
    <div class="app-frame__body">
      <StartingOverlay />
      <RouterView v-if="isAppReady" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-frame {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-frame__body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>

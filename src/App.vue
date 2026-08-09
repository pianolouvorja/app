<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import { useTheme } from 'vuetify'

import StartingOverlay from '@modules/starting/components/StartingOverlay.vue'
import { useStartingStore } from '@modules/starting/stores/useStartingStore'
import { useThemeManager } from '@design-system/composables'
import AppTitlebar from '@layouts/AppTitlebar.vue'
import { isProjectionPopupLocation } from '@shared/services/projection-window-location'

const route = useRoute()
const vuetifyTheme = useTheme()
const { currentTheme } = useThemeManager()
const startingStore = useStartingStore()
const { isAppReady } = storeToRefs(startingStore)

const isProjectionWindow = computed(
  () =>
    route.meta.projection === true ||
    route.name === 'projection-popup' ||
    isProjectionPopupLocation(),
)

// Popup: libera conteúdo na hora (legado). Sem splash / sem esperar bootstrap.
if (isProjectionPopupLocation()) {
  startingStore.hide()
}

watch(
  () => currentTheme.value.mode,
  (mode) => {
    void vuetifyTheme.change(mode === 'dark' ? 'dark' : 'light')
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="app-frame"
    :class="{ 'app-frame--projection': isProjectionWindow }"
  >
    <AppTitlebar />
    <div class="app-frame__body">
      <StartingOverlay v-if="!isProjectionWindow" />
      <RouterView v-if="isAppReady || isProjectionWindow" />
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

.app-frame--projection {
  background: #000;
}

.app-frame__body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.app-frame--projection .app-frame__body {
  overflow: hidden;
}
</style>

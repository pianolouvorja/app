<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import { useTheme } from 'vuetify'

import StartingOverlay from '@modules/starting/components/StartingOverlay.vue'
import { useStartingStore } from '@modules/starting/stores/useStartingStore'
import { useThemeManager } from '@design-system/composables'

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
  <StartingOverlay />
  <RouterView v-if="isAppReady" />
</template>

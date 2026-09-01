<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ClassoDetectionResult } from '@/shared/types/desktop-bridge'

const { t } = useI18n()

const bridge = window.louvorja
const isDesktop = Boolean(bridge?.isElectron && bridge.classo)

const detecting = ref(false)
const result = ref<ClassoDetectionResult | null>(null)
const error = ref('')

const totalMb = computed(() =>
  result.value ? Math.round(result.value.media.totalBytes / (1024 * 1024)) : 0,
)

async function detect() {
  if (!bridge?.classo) return
  detecting.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await bridge.classo.detect()
    if (!result.value.found) {
      error.value = t('settings.classo.notFound')
    }
  } catch (err) {
    error.value = t('settings.classo.detectError')
    console.error('[classo] detect falhou', err)
  } finally {
    detecting.value = false
  }
}
</script>

<template>
  <section class="classo-card">
    <h3>{{ t('settings.classo.title') }}</h3>
    <p class="hint">{{ t('settings.classo.description') }}</p>

    <button
      v-if="isDesktop"
      :disabled="detecting"
      data-test="classo-detect-button"
      @click="detect"
    >
      {{ detecting ? t('settings.classo.detecting') : t('settings.classo.detect') }}
    </button>
    <p v-else class="hint">{{ t('settings.classo.desktopOnly') }}</p>

    <p v-if="error" class="error" data-test="classo-error">{{ error }}</p>

    <div v-if="result?.found" class="found" data-test="classo-found">
      <p class="root">{{ result.root }}</p>
      <ul>
        <li>
          {{
            t('settings.classo.albumsFound', {
              count: result.media.albums.length,
              mb: totalMb,
            })
          }}
        </li>
        <li v-if="result.dataFiles?.liturgiaJa">
          {{ t('settings.classo.liturgyFound') }}
        </li>
        <li v-if="result.dataFiles?.itensAgendados">
          {{ t('settings.classo.scheduledFound') }}
        </li>
      </ul>
      <p class="hint">{{ t('settings.classo.wip') }}</p>
    </div>
  </section>
</template>

<style scoped>
.classo-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hint {
  opacity: 0.7;
  font-size: 0.85rem;
}
.error {
  color: var(--danger, #c0392b);
  font-size: 0.9rem;
}
.root {
  font-family: monospace;
  font-size: 0.85rem;
}
.found ul {
  margin: 0.25rem 0;
  padding-left: 1.25rem;
}
</style>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { isDesktopApp } from '@shared/services/desktop-bridge'
import { clearWorkspace } from '@shared/services/workspace-api'
import {
  removeBrowserItem,
  removeBrowserItemsByPrefix,
} from '@shared/services/browser-storage'
import { BROWSER_STORAGE_KEYS } from '@shared/constants/storage-keys'
import { APP_USER_DATA_DIR } from '@shared/constants/app'
import { useUpdateChecker } from '@shared/composables/useUpdateChecker'

const { t } = useI18n()
const isClearing = ref(false)
const clearError = ref(false)

const {
  checkForUpdates,
  isChecking,
  hasUpdate,
  newVersion,
  error: updateError,
  hasChecked,
} = useUpdateChecker()

async function handleCheckUpdate() {
  await checkForUpdates()
}

async function clearAllLocalData() {
  if (!isDesktopApp() || isClearing.value) return

  isClearing.value = true
  clearError.value = false

  try {
    const cleared = await clearWorkspace()
    if (!cleared) {
      throw new Error('clear failed')
    }

    removeBrowserItem(BROWSER_STORAGE_KEYS.userPreferences)
    removeBrowserItem(BROWSER_STORAGE_KEYS.recentCollections)
    removeBrowserItem(BROWSER_STORAGE_KEYS.topSongs)
    removeBrowserItemsByPrefix(BROWSER_STORAGE_KEYS.catalogSessionPrefix, 'session')

    window.location.reload()
  } catch (error) {
    console.error('[settings] falha ao limpar dados', error)
    clearError.value = true
    isClearing.value = false
  }
}
</script>

<template>
  <section class="general-settings">
    <div class="general-settings__block">
      <h3 class="general-settings__heading">
        {{ t('settings.general.updateTitle') }}
      </h3>
      <p class="general-settings__hint">
        {{ t('settings.general.updateHint') }}
      </p>
      <v-btn
        color="primary"
        variant="tonal"
        :loading="isChecking"
        :disabled="!isDesktopApp() || isChecking"
        @click="handleCheckUpdate"
      >
        {{ isChecking ? t('settings.general.checking') : t('settings.general.checkUpdate') }}
      </v-btn>
      <p
        v-if="hasUpdate"
        class="general-settings__success"
      >
        {{ t('settings.general.updateAvailable', { version: newVersion }) }}
      </p>
      <p
        v-else-if="updateError"
        class="general-settings__error"
      >
        {{ t('settings.general.updateError') }}
      </p>
      <p
        v-else-if="hasChecked && !isChecking"
        class="general-settings__hint"
      >
        {{ t('settings.general.updateNotAvailable') }}
      </p>
      <p
        v-if="!isDesktopApp()"
        class="general-settings__hint"
      >
        {{ t('settings.general.updateDesktopOnly') }}
      </p>
    </div>

    <div class="general-settings__block">
      <h3 class="general-settings__heading">
        {{ t('settings.general.dataTitle') }}
      </h3>
      <p class="general-settings__hint">
        {{ t('settings.general.dataHint', { product: APP_USER_DATA_DIR }) }}
      </p>
      <v-btn
        color="error"
        variant="tonal"
        :loading="isClearing"
        :disabled="!isDesktopApp()"
        @click="clearAllLocalData"
      >
        {{ t('settings.general.clearData') }}
      </v-btn>
      <p
        v-if="clearError"
        class="general-settings__error"
      >
        {{ t('settings.general.clearError') }}
      </p>
      <p
        v-if="!isDesktopApp()"
        class="general-settings__hint"
      >
        {{ t('settings.general.desktopOnly') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.general-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.general-settings__block {
  display: flex;
  max-width: 36rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.general-settings__heading {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.general-settings__hint {
  margin: 0;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.875rem;
  line-height: 1.4;
}

.general-settings__error {
  margin: 0;
  color: rgb(var(--v-theme-error));
  font-size: 0.875rem;
}

.general-settings__success {
  margin: 0;
  color: rgb(var(--v-theme-success));
  font-size: 0.875rem;
  font-weight: 500;
}
</style>

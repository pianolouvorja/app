<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'
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
  <div class="general-settings">
    <!-- Atualizações -->
    <GlassCard class="general-settings__card" elevated>
      <div class="general-settings__accent" aria-hidden="true" />

      <div class="general-settings__header">
        <div class="general-settings__heading">
          <i class="ti ti-refresh-dot general-settings__icon" aria-hidden="true" />
          <h3 class="general-settings__title">
            {{ t('settings.general.updateTitle') }}
          </h3>
        </div>
      </div>

      <p class="general-settings__hint">
        {{ t('settings.general.updateHint') }}
      </p>

      <button
        type="button"
        class="general-settings__btn general-settings__btn--primary"
        :disabled="!isDesktopApp() || isChecking"
        @click="handleCheckUpdate"
      >
        <i class="ti ti-cloud-download" aria-hidden="true" />
        {{ isChecking ? t('settings.general.checking') : t('settings.general.checkUpdate') }}
      </button>

      <p
        v-if="hasUpdate"
        class="general-settings__status general-settings__status--success"
      >
        <i class="ti ti-circle-check" aria-hidden="true" />
        {{ t('settings.general.updateAvailable', { version: newVersion }) }}
      </p>
      <p
        v-else-if="updateError"
        class="general-settings__status general-settings__status--error"
      >
        <i class="ti ti-alert-circle" aria-hidden="true" />
        {{ t('settings.general.updateError') }}
      </p>
      <p
        v-else-if="hasChecked && !isChecking"
        class="general-settings__status general-settings__status--info"
      >
        <i class="ti ti-check" aria-hidden="true" />
        {{ t('settings.general.updateNotAvailable') }}
      </p>

      <p
        v-if="!isDesktopApp()"
        class="general-settings__desktop-only"
      >
        {{ t('settings.general.updateDesktopOnly') }}
      </p>
    </GlassCard>

    <!-- Dados locais -->
    <GlassCard class="general-settings__card" elevated>
      <div class="general-settings__accent general-settings__accent--danger" aria-hidden="true" />

      <div class="general-settings__header">
        <div class="general-settings__heading">
          <i class="ti ti-database general-settings__icon" aria-hidden="true" />
          <h3 class="general-settings__title">
            {{ t('settings.general.dataTitle') }}
          </h3>
        </div>
      </div>

      <p class="general-settings__hint">
        {{ t('settings.general.dataHint', { product: APP_USER_DATA_DIR }) }}
      </p>

      <button
        type="button"
        class="general-settings__btn general-settings__btn--danger"
        :disabled="!isDesktopApp() || isClearing"
        @click="clearAllLocalData"
      >
        <i class="ti ti-trash" aria-hidden="true" />
        {{ t('settings.general.clearData') }}
      </button>

      <p
        v-if="clearError"
        class="general-settings__status general-settings__status--error"
      >
        <i class="ti ti-alert-circle" aria-hidden="true" />
        {{ t('settings.general.clearError') }}
      </p>

      <p
        v-if="!isDesktopApp()"
        class="general-settings__desktop-only"
      >
        {{ t('settings.general.desktopOnly') }}
      </p>
    </GlassCard>
  </div>
</template>

<style scoped lang="scss">
.general-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 64rem;
  margin: 0 auto;
  padding-bottom: 1.5rem;
}

.general-settings__card {
  position: relative;
  overflow: hidden;
}

.general-settings__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--ds-color-primary);
  opacity: 0.8;
}

.general-settings__accent--danger {
  background: rgb(var(--v-theme-error));
}

.general-settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.general-settings__heading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.general-settings__icon {
  font-size: 28px;
  line-height: 1;
  color: var(--ds-color-primary);
}

.general-settings__accent--danger ~ .general-settings__header .general-settings__icon {
  color: rgb(var(--v-theme-error));
}

.general-settings__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 1.25rem;
  font-weight: 700;
}

.general-settings__hint {
  margin: 0 0 1rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.875rem;
  line-height: 1.5;
  opacity: 0.85;
}

/* Botões */
.general-settings__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  border: none;
  border-radius: var(--ds-radius-full);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  cursor: pointer;
  transition:
    background-color 200ms ease,
    transform 150ms ease,
    opacity 150ms ease;

  .ti {
    font-size: 20px;
    line-height: 1;
  }

  &:active:not(:disabled) {
    transform: scale(0.96);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.general-settings__btn--primary {
  border: 1px solid color-mix(in srgb, var(--ds-color-primary) 28%, transparent);
  background: color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
  color: var(--ds-color-primary);

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ds-color-primary) 22%, transparent);
  }
}

.general-settings__btn--danger {
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-error)) 28%, transparent);
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 12%, transparent);
  color: rgb(var(--v-theme-error));

  &:hover:not(:disabled) {
    background: color-mix(in srgb, rgb(var(--v-theme-error)) 22%, transparent);
  }
}

/* Status */
.general-settings__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
  font-size: 0.875rem;
  font-weight: 500;

  .ti {
    font-size: 18px;
    line-height: 1;
  }
}

.general-settings__status--success {
  color: #4caf50;
}

.general-settings__status--error {
  color: rgb(var(--v-theme-error));
}

.general-settings__status--info {
  color: var(--ds-color-on-surface-variant);
  opacity: 0.8;
}

.general-settings__desktop-only {
  margin: 0.5rem 0 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.75rem;
  opacity: 0.6;
}
</style>

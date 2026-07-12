<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import { useAppearanceSettings } from '../composables/useAppearanceSettings'

const { t } = useI18n()
const { isDark, backdropFilter } = useAppearanceSettings()

const tipText = computed(() =>
  isDark.value
    ? t('settings.appearance.tipDark')
    : t('settings.appearance.tipLight'),
)

const previewGlassStyle = computed(() => ({
  backdropFilter: backdropFilter.value,
  WebkitBackdropFilter: backdropFilter.value,
}))
</script>

<template>
  <aside class="appearance-preview">
    <GlassCard class="appearance-preview__card">
      <h3 class="appearance-preview__title">
        {{ t('settings.appearance.preview') }}
      </h3>

      <div class="appearance-preview__stage">
        <div
          class="appearance-preview__glass"
          :style="previewGlassStyle"
          aria-hidden="true"
        >
          <div class="appearance-preview__bar appearance-preview__bar--short" />
          <div class="appearance-preview__bar appearance-preview__bar--long" />
          <div class="appearance-preview__footer">
            <span class="appearance-preview__chip appearance-preview__chip--primary" />
            <span class="appearance-preview__chip" />
          </div>
        </div>
      </div>

      <p class="appearance-preview__hint">
        {{ t('settings.appearance.previewHint') }}
      </p>
    </GlassCard>

    <GlassCard class="appearance-preview__tip" elevated>
      <div class="appearance-preview__tip-row">
        <span class="appearance-preview__tip-icon" aria-hidden="true">
          <i class="mdi mdi-information-outline" />
        </span>
        <div>
          <h4 class="appearance-preview__tip-title">
            {{ t('settings.appearance.tipTitle') }}
          </h4>
          <p class="appearance-preview__tip-text">
            {{ tipText }}
          </p>
        </div>
      </div>
    </GlassCard>
  </aside>
</template>

<style scoped lang="scss">
.appearance-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.appearance-preview__title {
  margin: 0 0 1rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.12em;
  line-height: 20px;
  text-transform: uppercase;
}

.appearance-preview__stage {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--ds-radius-lg);
  border: 1px solid var(--ds-color-outline);
  background: color-mix(in srgb, var(--ds-color-background) 70%, black);
}

.appearance-preview__glass {
  position: absolute;
  inset: 16%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--ds-radius-lg);
  border: 1px solid var(--ds-color-outline-strong);
  background: color-mix(in srgb, var(--ds-color-surface-card) 55%, transparent);
}

.appearance-preview__bar {
  height: 0.5rem;
  border-radius: var(--ds-radius-sm);

  &--short {
    width: 50%;
    background: color-mix(in srgb, var(--ds-color-primary) 35%, transparent);
  }

  &--long {
    width: 75%;
    background: color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  }
}

.appearance-preview__footer {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
}

.appearance-preview__chip {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);

  &--primary {
    background: color-mix(in srgb, var(--ds-color-primary) 45%, transparent);
  }
}

.appearance-preview__hint {
  margin: 1.25rem 0 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  font-style: italic;
  line-height: 20px;
  text-align: center;
}

.appearance-preview__tip-row {
  display: flex;
  gap: 1rem;
}

.appearance-preview__tip-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--ds-radius-full);
  background: color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
  color: var(--ds-color-primary);

  .mdi {
    font-size: 22px;
    line-height: 1;
  }
}

.appearance-preview__tip-title {
  margin: 0 0 0.25rem;
  color: var(--ds-color-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.appearance-preview__tip-text {
  margin: 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
}
</style>

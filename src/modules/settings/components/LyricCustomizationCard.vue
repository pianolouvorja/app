<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import { useProjectionSettings } from '../composables/useProjectionSettings'
import {
  LYRIC_ALIGN_OPTIONS,
  LYRIC_WEIGHT_OPTIONS,
  PROJECTION_BACKGROUND_PRESETS,
  type LyricVerticalAlign,
} from '../types/projection'

import SettingsToggle from './SettingsToggle.vue'

const { t } = useI18n()
const {
  settings,
  setLyricAlign,
  setShowSongTitle,
  setCustomTextFormat,
  setCustomBackground,
  setFontSizePercent,
  setFontColor,
  setFontWeight,
  setBackgroundColor,
  setBackgroundImageFromFile,
  clearBackgroundImage,
} = useProjectionSettings()

const fileInput = ref<HTMLInputElement | null>(null)

const alignIcon: Record<LyricVerticalAlign, string> = {
  top: 'ti-layout-align-top',
  center: 'ti-layout-align-middle',
  bottom: 'ti-layout-align-bottom',
}

const alignLabelKey: Record<LyricVerticalAlign, string> = {
  top: 'settings.projection.lyrics.alignTop',
  center: 'settings.projection.lyrics.alignCenter',
  bottom: 'settings.projection.lyrics.alignBottom',
}

const featureToggles = [
  {
    key: 'showSongTitle' as const,
    labelKey: 'settings.projection.lyrics.showTitle',
    set: setShowSongTitle,
  },
  {
    key: 'customTextFormat' as const,
    labelKey: 'settings.projection.lyrics.customTextFormat',
    set: setCustomTextFormat,
  },
  {
    key: 'customBackground' as const,
    labelKey: 'settings.projection.lyrics.customBackground',
    set: setCustomBackground,
  },
]

function openFilePicker() {
  fileInput.value?.click()
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  await setBackgroundImageFromFile(file)
  input.value = ''
}
</script>

<template>
  <GlassCard class="lyric-custom">
    <div class="lyric-custom__header">
      <i class="ti ti-palette lyric-custom__icon" aria-hidden="true" />
      <h3 class="lyric-custom__title">
        {{ t('settings.projection.lyrics.title') }}
      </h3>
    </div>

    <div class="lyric-custom__block">
      <p class="lyric-custom__label">
        {{ t('settings.projection.lyrics.align') }}
      </p>
      <div
        class="lyric-custom__align"
        role="radiogroup"
        :aria-label="t('settings.projection.lyrics.align')"
      >
        <button
          v-for="align in LYRIC_ALIGN_OPTIONS"
          :key="align"
          type="button"
          class="lyric-custom__align-btn"
          :class="{ 'lyric-custom__align-btn--active': settings.lyricAlign === align }"
          role="radio"
          :aria-checked="settings.lyricAlign === align"
          @click="setLyricAlign(align)"
        >
          <i
            class="ti"
            :class="alignIcon[align]"
            aria-hidden="true"
          />
          {{ t(alignLabelKey[align]) }}
        </button>
      </div>
    </div>

    <ul class="lyric-custom__toggles">
      <li
        v-for="item in featureToggles"
        :key="item.key"
        class="lyric-custom__toggle-row"
      >
        <button
          type="button"
          class="lyric-custom__toggle-label"
          @click="item.set(!settings[item.key])"
        >
          {{ t(item.labelKey) }}
        </button>
        <SettingsToggle
          :model-value="settings[item.key]"
          :label="t(item.labelKey)"
          @update:model-value="item.set($event)"
        />
      </li>
    </ul>

    <div
      v-if="settings.customTextFormat"
      class="lyric-custom__panel"
    >
      <div class="lyric-custom__font-size">
        <div class="lyric-custom__font-size-head">
          <span>{{ t('settings.projection.lyrics.fontSize') }}</span>
          <span class="lyric-custom__chip">{{ settings.fontSizePercent }}%</span>
        </div>
        <v-slider
          :model-value="settings.fontSizePercent"
          :min="50"
          :max="200"
          :step="5"
          color="primary"
          hide-details
          @update:model-value="setFontSizePercent(Number($event))"
        />
      </div>

      <div class="lyric-custom__field">
        <p class="lyric-custom__field-label">
          {{ t('settings.projection.lyrics.fontColor') }}
        </p>
        <div class="lyric-custom__swatches">
          <button
            v-for="color in ['#FFFFFF', '#f6c32a', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']"
            :key="color"
            type="button"
            class="lyric-custom__swatch"
            :class="{ 'lyric-custom__swatch--active': settings.fontColor === color }"
            :style="{ '--swatch': color }"
            :aria-label="color"
            @click="setFontColor(color)"
          />
          <label class="lyric-custom__picker">
            <i class="ti ti-color-picker" aria-hidden="true" />
            <input
              type="color"
              :value="settings.fontColor"
              :aria-label="t('settings.projection.lyrics.fontColor')"
              @input="setFontColor(($event.target as HTMLInputElement).value)"
            >
          </label>
        </div>
      </div>

      <div class="lyric-custom__field">
        <p class="lyric-custom__field-label">
          {{ t('settings.projection.lyrics.fontWeight') }}
        </p>
        <div
          class="lyric-custom__weights"
          role="radiogroup"
          :aria-label="t('settings.projection.lyrics.fontWeight')"
        >
          <button
            v-for="weight in LYRIC_WEIGHT_OPTIONS"
            :key="weight"
            type="button"
            class="lyric-custom__weight-btn"
            :class="{ 'lyric-custom__weight-btn--active': settings.fontWeight === weight }"
            :style="{ fontWeight: weight }"
            role="radio"
            :aria-checked="settings.fontWeight === weight"
            @click="setFontWeight(weight)"
          >
            {{ t(`settings.projection.lyrics.weight${weight}`) }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="settings.customBackground"
      class="lyric-custom__bg-grid"
    >
      <div class="lyric-custom__field">
        <p class="lyric-custom__field-label lyric-custom__field-label--row">
          <i class="ti ti-paint" aria-hidden="true" />
          {{ t('settings.projection.lyrics.backgroundColor') }}
        </p>
        <div class="lyric-custom__swatches">
          <button
            v-for="color in PROJECTION_BACKGROUND_PRESETS"
            :key="color"
            type="button"
            class="lyric-custom__swatch"
            :class="{ 'lyric-custom__swatch--active': settings.backgroundColor === color }"
            :style="{ '--swatch': color }"
            :aria-label="color"
            @click="setBackgroundColor(color)"
          />
          <label class="lyric-custom__picker">
            <i class="ti ti-color-picker" aria-hidden="true" />
            <input
              type="color"
              :value="settings.backgroundColor"
              :aria-label="t('settings.projection.lyrics.backgroundColor')"
              @input="setBackgroundColor(($event.target as HTMLInputElement).value)"
            >
          </label>
        </div>
      </div>

      <div class="lyric-custom__field">
        <p class="lyric-custom__field-label lyric-custom__field-label--row">
          <i class="ti ti-photo" aria-hidden="true" />
          {{ t('settings.projection.lyrics.backgroundImage') }}
        </p>

        <div
          v-if="settings.backgroundImage"
          class="lyric-custom__preview"
        >
          <img
            :src="settings.backgroundImage"
            alt=""
            class="lyric-custom__preview-img"
          >
          <div class="lyric-custom__preview-actions">
            <button
              type="button"
              class="lyric-custom__preview-btn lyric-custom__preview-btn--danger"
              :aria-label="t('settings.projection.lyrics.removeImage')"
              @click="clearBackgroundImage"
            >
              <i class="ti ti-trash" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="lyric-custom__preview-btn"
              :aria-label="t('settings.projection.lyrics.changeImage')"
              @click="openFilePicker"
            >
              <i class="ti ti-pencil" aria-hidden="true" />
            </button>
          </div>
        </div>

        <button
          v-else
          type="button"
          class="lyric-custom__dropzone"
          @click="openFilePicker"
        >
          <i class="ti ti-cloud-upload" aria-hidden="true" />
          <span>{{ t('settings.projection.lyrics.selectImage') }}</span>
        </button>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="lyric-custom__file"
          @change="onFileSelected"
        >
      </div>
    </div>
  </GlassCard>
</template>

<style scoped lang="scss">
.lyric-custom {
  padding: 2rem;
}

.lyric-custom__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.lyric-custom__icon {
  color: var(--ds-color-tertiary, #ffb77b);
  font-size: 24px;
  line-height: 1;
}

.lyric-custom__title {
  margin: 0;
  color: var(--ds-color-on-surface);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.lyric-custom__block {
  margin-bottom: 2rem;
}

.lyric-custom__label {
  margin: 0 0 1rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  line-height: 16px;
  text-transform: uppercase;
}

.lyric-custom__align {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.25rem;
  max-width: 28rem;
  padding: 0.25rem;
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--ds-color-surface-container-high) 80%, transparent);
}

.lyric-custom__align-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;

  .ti {
    font-size: 18px;
    line-height: 1;
  }

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 6%, transparent);
  }

  &--active {
    background: var(--ds-color-primary);
    color: var(--ds-color-on-primary);
    box-shadow: 0 8px 20px color-mix(in srgb, var(--ds-color-primary) 25%, transparent);
  }
}

.lyric-custom__toggles {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  margin: 0 0 1.5rem;
  padding: 0;
  list-style: none;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 3rem;
  }
}

.lyric-custom__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 6%, transparent);
}

.lyric-custom__toggle-label {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  font: inherit;
  font-size: 16px;
  line-height: 24px;
  text-align: left;
  cursor: pointer;

  &:hover {
    color: var(--ds-color-on-surface);
  }
}

.lyric-custom__panel,
.lyric-custom__bg-grid {
  margin-top: 0.5rem;
  padding: 1.25rem;
  border: 1px solid var(--ds-color-outline);
  border-radius: var(--ds-radius-lg);
  background: color-mix(in srgb, var(--ds-color-surface) 40%, transparent);
}

.lyric-custom__bg-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.lyric-custom__font-size {
  margin-bottom: 1.5rem;
}

.lyric-custom__font-size-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  color: var(--ds-color-on-surface);
  font-size: 14px;
  font-weight: 600;
}

.lyric-custom__chip {
  padding: 0.15rem 0.6rem;
  border-radius: var(--ds-radius-full);
  background: color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
  color: var(--ds-color-primary);
  font-size: 12px;
  font-weight: 700;
}

.lyric-custom__field {
  margin-bottom: 1.25rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.lyric-custom__field-label {
  margin: 0 0 0.75rem;
  color: var(--ds-color-on-surface);
  font-size: 14px;
  font-weight: 600;

  &--row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--ds-color-on-surface-variant);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;

    .ti {
      color: var(--ds-color-primary);
      font-size: 16px;
    }
  }
}

.lyric-custom__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.lyric-custom__swatch {
  width: 2.5rem;
  height: 2.5rem;
  border: 2px solid color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  border-radius: var(--ds-radius-full);
  background: var(--swatch);
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;

  &:hover {
    transform: scale(1.08);
  }

  &--active {
    border-color: var(--ds-color-primary);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--ds-color-primary) 25%, transparent);
    transform: scale(1.1);
  }
}

.lyric-custom__picker {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 2px dashed color-mix(in srgb, var(--ds-color-on-surface) 20%, transparent);
  border-radius: var(--ds-radius-full);
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;

  input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .ti {
    font-size: 18px;
    pointer-events: none;
  }
}

.lyric-custom__weights {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: var(--ds-radius-md);
  background: color-mix(in srgb, var(--ds-color-surface-container-high) 70%, transparent);
}

.lyric-custom__weight-btn {
  padding: 0.5rem 0.25rem;
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease;

  &--active {
    background: color-mix(in srgb, var(--ds-color-primary) 22%, transparent);
    color: var(--ds-color-primary);
  }
}

.lyric-custom__dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 8rem;
  padding: 1rem;
  border: 2px dashed color-mix(in srgb, var(--ds-color-on-surface) 14%, transparent);
  border-radius: var(--ds-radius-lg);
  background: color-mix(in srgb, var(--ds-color-surface-container) 50%, transparent);
  color: var(--ds-color-on-surface-variant);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 180ms ease;

  .ti {
    color: var(--ds-color-primary);
    font-size: 32px;
    line-height: 1;
  }

  &:hover {
    background: color-mix(in srgb, var(--ds-color-surface-container) 80%, transparent);
  }
}

.lyric-custom__preview {
  position: relative;
  overflow: hidden;
  height: 8.75rem;
  border: 1px solid var(--ds-color-outline);
  border-radius: var(--ds-radius-lg);
}

.lyric-custom__preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lyric-custom__preview-actions {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgb(0 0 0 / 0.35);
}

.lyric-custom__preview-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: var(--ds-radius-full);
  background: #fff;
  color: #111;
  cursor: pointer;

  &--danger {
    background: rgb(var(--v-theme-error));
    color: #fff;
  }

  .ti {
    font-size: 18px;
  }
}

.lyric-custom__file {
  display: none;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { GlassCard } from '@design-system/index'

import type { BibleSelection } from '../types/bible'

const props = defineProps<{
  chapterTitle: string
  verses: Array<{ number: number; text: string }>
  selectedVerses: number[]
  verseSearchQuery: string
  isLoading: boolean
  projection: BibleSelection
  previewSnippet: string
  hasProjection: boolean
}>()

const emit = defineEmits<{
  'update:verseSearchQuery': [value: string]
  selectVerse: [verseNumber: number, event: MouseEvent]
  previousVerse: []
  nextVerse: []
  clearProjection: []
  copy: []
}>()

const { t } = useI18n()
const copyFeedbackKey = ref<string | null>(null)

const canNavigate = computed(() => props.selectedVerses.length > 0)

async function handleCopy() {
  const text = props.hasProjection
    ? `${props.projection.text}\n${props.projection.scripturalReference}`
    : props.verses.map((verse) => `${verse.number}. ${verse.text}`).join('\n')

  try {
    await navigator.clipboard.writeText(text)
    copyFeedbackKey.value = 'bible.copied'
  } catch {
    copyFeedbackKey.value = 'bible.copyFailed'
  }

  window.setTimeout(() => {
    copyFeedbackKey.value = null
  }, 1800)

  emit('copy')
}

function isSelected(verseNumber: number): boolean {
  return props.selectedVerses.includes(verseNumber)
}
</script>

<template>
  <GlassCard
    class="bible-reader"
    :padding="false"
    elevated
  >
    <header class="bible-reader__header">
      <h2 class="bible-reader__title">
        {{ chapterTitle || t('bible.title') }}
      </h2>

      <div class="bible-reader__nav">
        <button
          type="button"
          class="bible-reader__circle-btn"
          :disabled="!canNavigate"
          :aria-label="t('bible.previousVerse')"
          :title="t('bible.previousVerse')"
          @click="emit('previousVerse')"
        >
          <i
            class="mdi mdi-chevron-left"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="bible-reader__circle-btn"
          :disabled="!canNavigate"
          :aria-label="t('bible.nextVerse')"
          :title="t('bible.nextVerse')"
          @click="emit('nextVerse')"
        >
          <i
            class="mdi mdi-chevron-right"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="bible-reader__circle-btn bible-reader__circle-btn--clear"
          :disabled="!hasProjection"
          :aria-label="t('bible.clearProjection')"
          :title="t('bible.clearProjection')"
          @click="emit('clearProjection')"
        >
          <i
            class="mdi mdi-eraser"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="bible-reader__search">
        <i
          class="mdi mdi-magnify bible-reader__search-icon"
          aria-hidden="true"
        />
        <input
          class="bible-reader__search-input"
          type="search"
          :value="verseSearchQuery"
          :placeholder="t('bible.searchVerse')"
          :aria-label="t('bible.searchVerse')"
          @input="emit('update:verseSearchQuery', ($event.target as HTMLInputElement).value)"
        >
      </div>

      <div class="bible-reader__actions">
        <button
          type="button"
          class="bible-reader__icon-btn"
          :aria-label="t('bible.copy')"
          :title="t('bible.copy')"
          @click="handleCopy"
        >
          <i
            class="mdi mdi-content-copy"
            aria-hidden="true"
          />
        </button>
      </div>
    </header>

    <p
      v-if="copyFeedbackKey"
      class="bible-reader__feedback"
      role="status"
    >
      {{ t(copyFeedbackKey) }}
    </p>

    <div class="bible-reader__scroll">
      <div
        v-if="isLoading"
        class="bible-reader__state"
      >
        {{ t('bible.loading') }}
      </div>

      <div
        v-else-if="verses.length === 0"
        class="bible-reader__state"
      >
        {{ t('bible.emptyChapter') }}
      </div>

      <div
        v-else
        class="bible-reader__verses"
      >
        <button
          v-for="verse in verses"
          :id="`bible-verse-${verse.number}`"
          :key="verse.number"
          type="button"
          class="bible-reader__verse"
          :class="{ 'bible-reader__verse--active': isSelected(verse.number) }"
          @click="emit('selectVerse', verse.number, $event)"
        >
          <span class="bible-reader__verse-num">{{ verse.number }}</span>
          <span class="bible-reader__verse-text">{{ verse.text }}</span>
        </button>
      </div>
    </div>

    <aside
      v-if="hasProjection"
      class="bible-reader__preview"
      aria-live="polite"
    >
      <p class="bible-reader__preview-text">
        “{{ previewSnippet }}”
      </p>
      <p class="bible-reader__preview-ref">
        {{ projection.scripturalReference }}
      </p>
    </aside>
  </GlassCard>
</template>

<style scoped lang="scss">
.bible-reader {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.bible-reader__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  padding: 1.25rem 1.75rem 0.75rem;
}

.bible-reader__title {
  margin: 0;
  flex-shrink: 0;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ds-color-primary-soft);
}

.bible-reader__nav {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.bible-reader__circle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ds-color-surface-container-high, #2a2a2a) 90%, transparent);
  color: var(--ds-color-on-surface);
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    opacity 160ms ease,
    transform 140ms ease;

  .mdi {
    font-size: 1.15rem;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ds-color-primary) 18%, #2a2a2a);
  }

  &:active:not(:disabled) {
    transform: scale(0.94);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &--clear {
    background: color-mix(in srgb, #93000a 45%, #2a2a2a);
    color: #ffb4ab;

    &:hover:not(:disabled) {
      background: color-mix(in srgb, #93000a 62%, #2a2a2a);
      color: #ffdad6;
    }
  }
}

.bible-reader__search {
  position: relative;
  flex: 1 1 auto;
  min-width: 8rem;
  max-width: 16rem;
  margin-left: auto;
}

.bible-reader__search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ds-color-on-surface-variant);
  font-size: 1rem;
  pointer-events: none;
}

.bible-reader__search-input {
  width: 100%;
  border: 0;
  border-radius: var(--ds-radius-md, 0.5rem);
  background: var(--ds-color-surface-container, #201f1f);
  color: var(--ds-color-on-surface);
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  font-size: 0.875rem;
  outline: none;

  &:focus {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--ds-color-primary) 55%, transparent);
  }
}

.bible-reader__actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.bible-reader__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ds-color-primary-soft);
  cursor: pointer;

  &:hover {
    background: var(--ds-color-surface-variant, #353534);
  }
}

.bible-reader__feedback {
  flex-shrink: 0;
  margin: 0;
  padding: 0 1.75rem 0.5rem;
  font-size: 0.8rem;
  color: var(--ds-color-secondary, #78d6d2);
}

.bible-reader__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0.25rem 1.75rem 7rem;
  font-size: 1.05rem;
  line-height: 1.7;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--ds-color-outline);
    border-radius: 999px;
  }
}

.bible-reader__state {
  color: var(--ds-color-on-surface-variant);
  opacity: 0.8;
}

.bible-reader__verses {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.bible-reader__verse {
  display: flex;
  gap: 1.25rem;
  width: 100%;
  text-align: left;
  border: 0;
  border-left: 4px solid transparent;
  background: transparent;
  color: inherit;
  padding: 0.65rem 0.5rem;
  border-radius: 0.35rem;
  cursor: pointer;
  opacity: 0.65;
  transition:
    opacity 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease;

  &:hover {
    opacity: 0.9;
    background: color-mix(in srgb, var(--ds-color-primary) 6%, transparent);
  }

  &--active {
    opacity: 1;
    margin-inline: -1.75rem;
    padding-inline: 1.75rem;
    padding-block: 1rem;
    background: color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
    border-left-color: var(--ds-color-primary);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ds-color-primary) 20%, transparent);

    .bible-reader__verse-text {
      font-weight: 500;
      font-size: 1.15rem;
      color: var(--ds-color-on-surface);
    }
  }
}

.bible-reader__verse-num {
  flex-shrink: 0;
  width: 1.5rem;
  font-weight: 700;
  color: var(--ds-color-primary-soft);
}

.bible-reader__verse-text {
  flex: 1;
  line-height: 1.65;
}

.bible-reader__preview {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  width: 16rem;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  text-align: center;
  border-radius: var(--ds-radius-md, 0.5rem);
  background: #000;
  border: 1px solid rgb(255 255 255 / 0.2);
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.45);
  pointer-events: none;
}

.bible-reader__preview-text {
  margin: 0;
  color: #fff;
  font-size: 0.7rem;
  line-height: 1.45;
}

.bible-reader__preview-ref {
  margin: 0;
  color: var(--ds-color-primary-soft);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>

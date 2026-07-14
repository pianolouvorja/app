<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import type { RandomDrawMode } from '../types/random'

const props = defineProps<{
  mode: RandomDrawMode
  available: readonly string[]
  drawn: readonly string[]
  draftName: string
  numberMin: number
  numberMax: number
  rangeError: 'invalid' | 'tooLarge' | null
}>()

const emit = defineEmits<{
  'update:draftName': [value: string]
  'update:numberMin': [value: number]
  'update:numberMax': [value: number]
  add: []
  importFile: [file: File]
  generateRange: []
  remove: [index: number]
  clear: []
}>()

const { t } = useI18n()
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput')

const drawnSet = computed(() => new Set(props.drawn))

function onDraftInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:draftName', target.value)
}

function onMinInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:numberMin', Number(target.value))
}

function onMaxInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:numberMax', Number(target.value))
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) emit('importFile', file)
  target.value = ''
}
</script>

<template>
  <aside class="random-available">
    <header class="random-available__head">
      <h2 class="random-available__title">
        {{ t('random.available') }}
      </h2>
      <span class="random-available__badge">
        {{ available.length }}
      </span>
    </header>

    <div
      v-if="mode === 'names'"
      class="random-available__form"
    >
      <div class="random-available__input-wrap">
        <input
          class="random-available__input"
          type="text"
          :value="draftName"
          :placeholder="t('random.addName')"
          :aria-label="t('random.addName')"
          @input="onDraftInput"
          @keydown.enter.prevent="emit('add')"
        >
        <button
          type="button"
          class="random-available__add"
          :aria-label="t('random.addNameAria')"
          @click="emit('add')"
        >
          <i
            class="mdi mdi-plus"
            aria-hidden="true"
          />
        </button>
      </div>

      <button
        type="button"
        class="random-available__import"
        :title="t('random.importTooltip')"
        @click="openFilePicker"
      >
        <i
          class="mdi mdi-file-upload-outline"
          aria-hidden="true"
        />
        {{ t('random.importList') }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".txt,text/plain"
        class="random-available__file"
        @change="onFileChange"
      >
    </div>

    <div
      v-else
      class="random-available__numbers"
    >
      <div class="random-available__range">
        <label class="random-available__field">
          <span>{{ t('random.minNumber') }}</span>
          <input
            type="number"
            :value="numberMin"
            @input="onMinInput"
          >
        </label>
        <label class="random-available__field">
          <span>{{ t('random.maxNumber') }}</span>
          <input
            type="number"
            :value="numberMax"
            @input="onMaxInput"
            @keydown.enter.prevent="emit('generateRange')"
          >
        </label>
      </div>
      <button
        type="button"
        class="random-available__generate"
        @click="emit('generateRange')"
      >
        {{ t('random.generateNumbers') }}
      </button>
      <p
        v-if="rangeError"
        class="random-available__error"
      >
        {{
          rangeError === 'tooLarge'
            ? t('random.rangeTooLarge')
            : t('random.invalidRange')
        }}
      </p>
    </div>

    <div class="random-available__list-wrap">
      <div
        v-if="available.length === 0"
        class="random-available__empty"
      >
        <i
          class="mdi mdi-account-group-outline"
          aria-hidden="true"
        />
        <p>{{ t('random.emptyList') }}</p>
      </div>
      <ul
        v-else
        class="random-available__list"
      >
        <li
          v-for="(name, index) in available"
          :key="`${name}-${index}`"
          class="random-available__item"
          :class="{ 'random-available__item--drawn': drawnSet.has(name) }"
        >
          <span>{{ name }}</span>
          <button
            type="button"
            class="random-available__remove"
            :aria-label="t('random.removeItem')"
            @click="emit('remove', index)"
          >
            <i
              class="mdi mdi-close"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </div>

    <button
      type="button"
      class="random-available__clear"
      @click="emit('clear')"
    >
      {{ t('random.clearList') }}
    </button>
  </aside>
</template>

<style scoped lang="scss">
.random-available {
  display: flex;
  width: 18rem;
  max-width: 100%;
  max-height: min(70vh, 36rem);
  flex-direction: column;
  overflow: hidden;
  padding: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  border-radius: 1.5rem;
  background: color-mix(in srgb, var(--ds-color-surface-elevated) 72%, transparent);
  backdrop-filter: blur(16px);
  box-sizing: border-box;
}

.random-available__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.random-available__title {
  margin: 0;
  color: var(--ds-color-primary);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.random-available__badge {
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-primary) 20%, transparent);
  color: var(--ds-color-primary);
  font-size: 0.6875rem;
  font-weight: 600;
}

.random-available__form,
.random-available__numbers {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.random-available__input-wrap {
  position: relative;
}

.random-available__input {
  width: 100%;
  height: 2.75rem;
  padding: 0 2.5rem 0 1rem;
  border: 0;
  border-radius: 0.75rem;
  background: color-mix(
    in srgb,
    var(--ds-color-on-surface) 6%,
    var(--ds-color-surface-container, var(--ds-color-surface))
  );
  color: var(--ds-color-on-surface);
  font-size: 0.875rem;
  box-sizing: border-box;

  &::placeholder {
    color: color-mix(in srgb, var(--ds-color-on-surface-variant) 45%, transparent);
  }

  &:focus {
    outline: 1px solid var(--ds-color-primary);
  }
}

.random-available__add {
  position: absolute;
  top: 50%;
  right: 0.65rem;
  display: inline-flex;
  border: 0;
  background: transparent;
  color: var(--ds-color-primary);
  cursor: pointer;
  transform: translateY(-50%);

  .mdi {
    font-size: 1.25rem;
  }
}

.random-available__import,
.random-available__generate {
  display: inline-flex;
  height: 2.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-primary) 22%, transparent);
  border-radius: 0.75rem;
  background: transparent;
  color: var(--ds-color-primary);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  transition: background-color 160ms ease;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-primary) 10%, transparent);
  }

  .mdi {
    font-size: 1rem;
  }
}

.random-available__generate {
  border: 0;
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary);

  &:hover {
    background: color-mix(in srgb, var(--ds-color-primary) 88%, #000);
  }
}

.random-available__file {
  display: none;
}

.random-available__range {
  display: flex;
  width: 100%;
  min-width: 0;
  gap: 0.5rem;
}

.random-available__field {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.6875rem;
  font-weight: 600;

  input {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    height: 2.5rem;
    padding: 0 0.65rem;
    border: 0;
    border-radius: 0.75rem;
    background: color-mix(
      in srgb,
      var(--ds-color-on-surface) 6%,
      var(--ds-color-surface-container, var(--ds-color-surface))
    );
    color: var(--ds-color-on-surface);
    font-size: 0.875rem;
    box-sizing: border-box;

    &:focus {
      outline: 1px solid var(--ds-color-primary);
    }
  }
}

.random-available__error {
  margin: 0;
  color: var(--ds-color-error, #ffb4ab);
  font-size: 0.75rem;
}

.random-available__list-wrap {
  flex: 1;
  min-height: 10rem;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, transparent, black 8%, black 92%, transparent);
}

.random-available__list {
  height: 100%;
  max-height: 16rem;
  margin: 0;
  padding: 0.5rem 0.25rem;
  overflow-y: auto;
  list-style: none;
}

.random-available__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--ds-color-on-surface) 5%, transparent);
  color: var(--ds-color-on-surface);
  font-size: 0.875rem;

  &--drawn {
    opacity: 0.35;
    text-decoration: line-through;
  }
}

.random-available__remove {
  display: inline-flex;
  border: 0;
  background: transparent;
  color: var(--ds-color-error, #ffb4ab);
  cursor: pointer;
  opacity: 0.45;
  transition: opacity 160ms ease;

  .random-available__item:hover & {
    opacity: 1;
  }

  .mdi {
    font-size: 1rem;
  }
}

.random-available__empty {
  display: flex;
  height: 100%;
  min-height: 10rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  opacity: 0.45;
  color: var(--ds-color-on-surface-variant);
  text-align: center;

  .mdi {
    font-size: 2rem;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
  }
}

.random-available__clear {
  margin-top: 1rem;
  border: 0;
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: color 160ms ease;

  &:hover {
    color: var(--ds-color-error, #ffb4ab);
  }
}

@media (max-width: 1100px) {
  .random-available {
    width: 100%;
    max-height: none;
  }
}
</style>

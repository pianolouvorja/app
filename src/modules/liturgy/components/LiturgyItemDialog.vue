<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  DEFAULT_MOMENT_DURATION_MS,
  getTypeDotColor,
  INTERNAL_FILE_TYPES,
  LITURGY_TYPE_GROUPS,
  MOMENT_DURATION_MAX_MS,
  MOMENT_DURATION_MIN_MS,
  MOMENT_DURATION_STEP_MS,
  type LiturgyItemDraft,
  type LiturgyItemType,
  type LiturgyMusicOption,
} from '../types/liturgy'
import { formatMomentDuration, isValidLiturgyUrl } from '../services/liturgy-item-helpers'

const props = defineProps<{
  open: boolean
  draft: LiturgyItemDraft
  isEditing: boolean
  isValid: boolean
  categoryOptions: Array<{ id: string; name: string }>
  complementaryTitleSuggestions: string[]
  musicOptions: LiturgyMusicOption[]
  musicQuery: string
  musicCatalogEmpty: boolean
  selectedMusic: LiturgyMusicOption | null
}>()

const emit = defineEmits<{
  close: []
  save: []
  'update:draft': [draft: LiturgyItemDraft]
  'update:musicQuery': [query: string]
  'pick-music': [musicId: number]
  'clear-music': []
}>()

const { t } = useI18n()
const showValidation = ref(false)

const isCategory = computed(() => props.draft.type === 'category')
const isMusic = computed(() => props.draft.type === 'music')

const musicRequiredMissing = computed(
  () => isMusic.value && props.draft.musicId == null,
)
const nameRequiredMissing = computed(() => props.draft.name.trim().length === 0)
const categoryRequiredMissing = computed(
  () => !isCategory.value && !props.draft.categoryId,
)

const durationLabel = computed(() => formatMomentDuration(props.draft.durationMs))

const showFilePath = computed(() =>
  INTERNAL_FILE_TYPES.includes(props.draft.type),
)

const showUrl = computed(
  () => props.draft.type === 'site' || props.draft.type === 'online_video',
)

const urlRequiredMissing = computed(
  () => showUrl.value && !isValidLiturgyUrl(props.draft.url),
)

const nameFieldError = computed(
  () => showValidation.value && nameRequiredMissing.value,
)
const musicFieldError = computed(
  () => showValidation.value && musicRequiredMissing.value,
)
const categoryFieldError = computed(
  () => showValidation.value && categoryRequiredMissing.value,
)
const urlFieldError = computed(
  () => showValidation.value && urlRequiredMissing.value,
)

const showMusicResults = computed(
  () => isMusic.value && props.musicQuery.trim().length > 0,
)

const momentNameLabel = computed(() => {
  if (isCategory.value) return t('liturgy.dialog.categoryMomentName')
  if (isMusic.value) return t('liturgy.dialog.complementaryTitle')
  return t('liturgy.dialog.momentName')
})

const momentNamePlaceholder = computed(() => {
  if (isCategory.value) return t('liturgy.namePlaceholders.category')
  if (isMusic.value) return t('liturgy.dialog.complementaryTitlePlaceholder')
  return t('liturgy.dialog.momentNamePlaceholder')
})

const typeGroups = computed(() => {
  const groups = LITURGY_TYPE_GROUPS.map((group) => ({ ...group }))
  if (props.draft.type === 'verse') {
    return [
      ...groups,
      {
        id: 'legacy' as const,
        labelKey: 'liturgy.dialog.groups.legacy',
        toneClass: 'primary' as const,
        types: [{ value: 'verse' as LiturgyItemType, dot: '#9ecaff' }],
      },
    ]
  }
  return groups
})

watch(
  () => props.open,
  (open) => {
    if (open) showValidation.value = false
  },
)

watch(
  () => props.draft.type,
  () => {
    showValidation.value = false
  },
)

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

function patch(partial: Partial<LiturgyItemDraft>) {
  emit('update:draft', { ...props.draft, ...partial })
}

function selectType(type: LiturgyItemType) {
  const next: Partial<LiturgyItemDraft> = {
    type,
    accentColor: getTypeDotColor(type),
  }
  if (type === 'category') {
    next.durationMs = 0
    next.categoryId = null
  } else {
    if (props.draft.type === 'category') {
      next.durationMs =
        props.draft.durationMs > 0
          ? props.draft.durationMs
          : DEFAULT_MOMENT_DURATION_MS
    }
    next.categoryId = props.draft.categoryId ?? null
  }
  if (type !== 'music') {
    next.musicId = null
  } else if (props.draft.type !== 'music') {
    next.name = ''
  }
  patch(next)
  if (type !== 'music') {
    emit('update:musicQuery', '')
  }
}

function bumpDuration(deltaSteps: number) {
  const next = props.draft.durationMs + deltaSteps * MOMENT_DURATION_STEP_MS
  const clamped = Math.min(
    MOMENT_DURATION_MAX_MS,
    Math.max(MOMENT_DURATION_MIN_MS, next),
  )
  patch({ durationMs: clamped })
}

function onNameInput(event: Event) {
  patch({ name: (event.target as HTMLInputElement).value })
}

function onDetailsInput(event: Event) {
  patch({ subtitle: (event.target as HTMLTextAreaElement).value })
}

function onUrlInput(event: Event) {
  patch({ url: (event.target as HTMLInputElement).value })
}

function onFileInput(event: Event) {
  patch({ filePath: (event.target as HTMLInputElement).value })
}

function onCategoryChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  patch({ categoryId: value || null })
}

function onMusicQueryInput(event: Event) {
  emit('update:musicQuery', (event.target as HTMLInputElement).value)
}

function pickMusic(musicId: number) {
  emit('pick-music', musicId)
  emit('update:musicQuery', '')
}

function clearMusic() {
  emit('clear-music')
  emit('update:musicQuery', '')
}

function onSubmit(event: Event) {
  event.preventDefault()
  if (!props.isValid) {
    showValidation.value = true
    if (nameRequiredMissing.value) {
      const input = document.getElementById('moment-name') as HTMLInputElement | null
      input?.focus()
    }
    return
  }
  showValidation.value = false
  emit('save')
}

/** Pontos claros (ex.: branco) precisam de contorno no tema escuro. */
function isLightDot(hex: string): boolean {
  const value = hex.replace('#', '')
  if (value.length !== 6) return false
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 180
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="moment-dialog-backdrop"
      @click="onBackdropClick"
    >
      <section
        class="moment-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="isEditing ? t('liturgy.dialog.editTitle') : t('liturgy.dialog.title')"
      >
        <header class="moment-dialog__header">
          <div class="moment-dialog__heading">
            <div
              class="moment-dialog__badge"
              aria-hidden="true"
            >
              <i class="mdi mdi-plus" />
            </div>
            <h2 class="moment-dialog__title">
              {{ isEditing ? t('liturgy.dialog.editTitle') : t('liturgy.dialog.title') }}
            </h2>
          </div>
          <button
            type="button"
            class="moment-dialog__close"
            :aria-label="t('liturgy.actions.discard')"
            @click="emit('close')"
          >
            <i
              class="mdi mdi-close"
              aria-hidden="true"
            />
          </button>
        </header>

        <form
          class="moment-dialog__form"
          @submit="onSubmit"
        >
          <div class="moment-dialog__section">
            <span class="moment-dialog__label">
              {{ t('liturgy.dialog.itemType') }}
            </span>

            <div class="moment-dialog__type-panel">
              <div
                v-for="(group, groupIndex) in typeGroups"
                :key="group.id"
                class="moment-dialog__group"
                :class="{ 'moment-dialog__group--divided': groupIndex > 0 }"
              >
                <p
                  class="moment-dialog__group-label"
                  :class="`moment-dialog__group-label--${group.toneClass}`"
                >
                  {{ t(group.labelKey) }}
                </p>
                <div class="moment-dialog__chips">
                  <button
                    v-for="chip in group.types"
                    :key="chip.value"
                    type="button"
                    class="moment-dialog__chip"
                    :class="{ 'moment-dialog__chip--active': draft.type === chip.value }"
                    :title="t(`liturgy.typeDescriptions.${chip.value}`)"
                    @click="selectType(chip.value)"
                  >
                    <span
                      class="moment-dialog__dot"
                      :class="{ 'moment-dialog__dot--light': isLightDot(chip.dot) }"
                      :style="{ backgroundColor: chip.dot, boxShadow: `0 0 8px ${chip.dot}99` }"
                      aria-hidden="true"
                    />
                    {{ t(`liturgy.types.${chip.value}`) }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="isMusic"
            class="moment-dialog__section"
          >
            <label
              class="moment-dialog__label"
              :class="{ 'moment-dialog__label--error': musicFieldError }"
              for="moment-music-search"
            >
              {{ t('liturgy.fields.selectMusic') }}
              <span
                class="moment-dialog__required"
                aria-hidden="true"
              >*</span>
            </label>

            <div
              class="moment-dialog__music"
              :class="{ 'moment-dialog__music--error': musicFieldError }"
            >
              <div
                class="moment-dialog__music-search"
                :class="{ 'moment-dialog__music-search--error': musicFieldError }"
              >
                <i
                  class="mdi mdi-magnify"
                  aria-hidden="true"
                />
                <input
                  id="moment-music-search"
                  class="moment-dialog__music-input"
                  type="search"
                  :value="musicQuery"
                  :placeholder="t('liturgy.fields.searchMusic')"
                  :aria-invalid="musicFieldError"
                  autocomplete="off"
                  @input="onMusicQueryInput"
                >
              </div>

              <ul
                v-if="showMusicResults && musicOptions.length > 0"
                class="moment-dialog__music-results"
                role="listbox"
              >
                <li
                  v-for="option in musicOptions"
                  :key="option.id"
                >
                  <button
                    type="button"
                    class="moment-dialog__music-option"
                    :class="{
                      'moment-dialog__music-option--active':
                        draft.musicId === option.id,
                    }"
                    role="option"
                    :aria-selected="draft.musicId === option.id"
                    @click="pickMusic(option.id)"
                  >
                    <span class="moment-dialog__music-option-title">
                      {{ option.displayLabel }}
                    </span>
                    <span class="moment-dialog__music-option-meta">
                      {{ option.albumNames }}
                    </span>
                  </button>
                </li>
              </ul>

              <p
                v-else-if="showMusicResults"
                class="moment-dialog__type-hint"
              >
                {{ t('liturgy.messages.catalogEmpty') }}
              </p>

              <p
                v-else-if="musicCatalogEmpty"
                class="moment-dialog__type-hint"
              >
                {{ t('liturgy.messages.catalogEmpty') }}
              </p>

              <div
                v-if="selectedMusic"
                class="moment-dialog__music-selected"
              >
                <div class="moment-dialog__music-selected-text">
                  <span class="moment-dialog__music-selected-label">
                    {{ selectedMusic.displayLabel }}
                  </span>
                  <span
                    v-if="selectedMusic.albumNames"
                    class="moment-dialog__music-selected-meta"
                  >
                    {{ selectedMusic.albumNames }}
                  </span>
                </div>
                <button
                  type="button"
                  class="moment-dialog__music-clear"
                  :aria-label="t('liturgy.actions.discard')"
                  @click="clearMusic"
                >
                  <i
                    class="mdi mdi-close"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>

          <div
            class="moment-dialog__row"
            :class="{
              'moment-dialog__row--name-only': isCategory,
              'moment-dialog__row--with-category': !isCategory,
            }"
          >
            <div
              v-if="!isCategory"
              class="moment-dialog__section"
            >
              <span class="moment-dialog__label">
                {{ t('liturgy.dialog.duration') }}
              </span>
              <div class="moment-dialog__stepper">
                <button
                  type="button"
                  class="moment-dialog__step-btn"
                  :aria-label="t('liturgy.dialog.durationDecrease')"
                  @click="bumpDuration(-1)"
                >
                  <i
                    class="mdi mdi-minus"
                    aria-hidden="true"
                  />
                </button>
                <span class="moment-dialog__step-value">
                  {{ durationLabel }}
                </span>
                <button
                  type="button"
                  class="moment-dialog__step-btn"
                  :aria-label="t('liturgy.dialog.durationIncrease')"
                  @click="bumpDuration(1)"
                >
                  <i
                    class="mdi mdi-plus"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <div class="moment-dialog__section">
              <p
                v-if="isCategory"
                class="moment-dialog__type-hint"
              >
                {{ t('liturgy.typeDescriptions.category') }}
              </p>
              <label
                class="moment-dialog__label"
                :class="{ 'moment-dialog__label--error': nameFieldError }"
                for="moment-name"
              >
                {{ momentNameLabel }}
                <span
                  class="moment-dialog__required"
                  aria-hidden="true"
                >*</span>
              </label>
              <input
                id="moment-name"
                class="moment-dialog__input"
                :class="{ 'moment-dialog__input--error': nameFieldError }"
                type="text"
                :value="draft.name"
                :placeholder="momentNamePlaceholder"
                :list="isMusic ? 'moment-complementary-titles' : undefined"
                :aria-invalid="nameFieldError"
                :aria-required="true"
                autocomplete="off"
                @input="onNameInput"
              >
              <datalist
                v-if="isMusic && complementaryTitleSuggestions.length > 0"
                id="moment-complementary-titles"
              >
                <option
                  v-for="title in complementaryTitleSuggestions"
                  :key="title"
                  :value="title"
                />
              </datalist>
            </div>

            <div
              v-if="!isCategory"
              class="moment-dialog__section"
            >
              <label
                class="moment-dialog__label"
                :class="{ 'moment-dialog__label--error': categoryFieldError }"
                for="moment-category"
              >
                {{ t('liturgy.dialog.categoryField') }}
                <span
                  class="moment-dialog__required"
                  aria-hidden="true"
                >*</span>
              </label>
              <select
                id="moment-category"
                class="moment-dialog__input moment-dialog__select"
                :class="{ 'moment-dialog__input--error': categoryFieldError }"
                :value="draft.categoryId ?? ''"
                :aria-invalid="categoryFieldError"
                @change="onCategoryChange"
              >
                <option value="">
                  {{ t('liturgy.dialog.categoryPlaceholder') }}
                </option>
                <option
                  v-for="option in categoryOptions"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.name }}
                </option>
              </select>
              <p
                v-if="categoryOptions.length === 0"
                class="moment-dialog__type-hint"
              >
                {{ t('liturgy.dialog.categoryEmpty') }}
              </p>
            </div>
          </div>

          <div
            v-if="showFilePath"
            class="moment-dialog__section"
          >
            <label
              class="moment-dialog__label"
              for="moment-file"
            >
              {{ t('liturgy.fields.selectFile') }}
            </label>
            <input
              id="moment-file"
              class="moment-dialog__input"
              type="text"
              :value="draft.filePath"
              @input="onFileInput"
            >
          </div>

          <div
            v-if="showUrl"
            class="moment-dialog__section"
          >
            <label
              class="moment-dialog__label"
              :class="{ 'moment-dialog__label--error': urlFieldError }"
              for="moment-url"
            >
              {{ t('liturgy.fields.url') }}
              <span
                class="moment-dialog__required"
                aria-hidden="true"
              >*</span>
            </label>
            <input
              id="moment-url"
              class="moment-dialog__input"
              :class="{ 'moment-dialog__input--error': urlFieldError }"
              type="url"
              :value="draft.url"
              placeholder="https://"
              :aria-invalid="urlFieldError"
              @input="onUrlInput"
            >
            <p
              v-if="urlFieldError"
              class="moment-dialog__field-error"
            >
              {{ t('liturgy.dialog.urlInvalid') }}
            </p>
          </div>

          <div class="moment-dialog__section">
            <label
              class="moment-dialog__label"
              for="moment-details"
            >
              {{ t('liturgy.dialog.notesTitle') }}
            </label>
            <textarea
              id="moment-details"
              class="moment-dialog__textarea"
              rows="4"
              :value="draft.subtitle"
              :placeholder="t('liturgy.dialog.notesPlaceholder')"
              @input="onDetailsInput"
            />
          </div>

          <footer class="moment-dialog__footer">
            <button
              type="button"
              class="moment-dialog__discard"
              @click="emit('close')"
            >
              {{ t('liturgy.actions.discard') }}
            </button>
            <button
              type="submit"
              class="moment-dialog__submit"
            >
              <i
                class="mdi mdi-check"
                aria-hidden="true"
              />
              {{ isEditing ? t('liturgy.actions.save') : t('liturgy.actions.addToService') }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.moment-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(0 0 0 / 55%);
  backdrop-filter: blur(2px);
}

.moment-dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(58rem, 100%);
  max-height: min(90vh, 52rem);
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  background: var(--ds-color-surface-card, #242424);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  color: var(--ds-color-on-surface);
}

.moment-dialog__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1.15rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
  background: var(--ds-color-surface-card, #242424);
}

.moment-dialog__heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.7rem;
}

.moment-dialog__close {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  cursor: pointer;

  &:hover {
    color: var(--ds-color-primary);
    background: color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
  }

  i {
    font-size: 1.25rem;
  }
}

.moment-dialog__badge {
  flex-shrink: 0;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--ds-color-primary) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-color-primary) 30%, transparent);
  color: var(--ds-color-primary);

  i {
    font-size: 1.15rem;
    font-weight: 600;
  }
}

.moment-dialog__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: var(--ds-color-on-surface);
}

.moment-dialog__form {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1.1rem;
  min-height: 0;
  padding: 0.95rem 1.15rem 1.15rem;
  overflow-x: hidden;
  overflow-y: auto;
}

.moment-dialog__section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}

.moment-dialog__label {
  padding-inline: 0.15rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  opacity: 0.85;

  &--error {
    color: var(--ds-color-error, #ffb4ab);
    opacity: 1;
  }
}

.moment-dialog__required {
  margin-left: 0.15rem;
  color: var(--ds-color-error, #ffb4ab);
  font-weight: 700;
}

.moment-dialog__field-error {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--ds-color-error, #ffb4ab);
}

.moment-dialog__type-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.85rem;
  border-radius: 0.9rem;
  border: 1px solid color-mix(in srgb, #fff 10%, transparent);
  background: var(--ds-color-surface-container-high, #2a2a2a);
}

.moment-dialog__group {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;

  &--divided {
    padding-top: 0.65rem;
    border-top: 1px solid color-mix(in srgb, #fff 5%, transparent);
  }
}

.moment-dialog__group-label {
  margin: 0;
  padding-inline: 0.15rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.01em;

  &--primary {
    color: color-mix(in srgb, var(--ds-color-primary) 70%, transparent);
  }

  &--secondary {
    color: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 70%, transparent);
  }

  &--tertiary {
    color: color-mix(in srgb, var(--ds-color-tertiary, #ffb77b) 70%, transparent);
  }
}

.moment-dialog__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.moment-dialog__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2rem;
  padding: 0.35rem 0.7rem;
  border-radius: 0.55rem;
  border: 1px solid color-mix(in srgb, #fff 10%, transparent);
  background: color-mix(in srgb, #fff 5%, transparent);
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 140ms ease;

  &:hover {
    color: #fff;
    background: color-mix(in srgb, #fff 10%, transparent);
    border-color: color-mix(in srgb, #fff 20%, transparent);
    transform: scale(1.02);
  }

  &--active {
    color: var(--ds-color-primary);
    background: color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
    border-color: color-mix(in srgb, var(--ds-color-primary) 30%, transparent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
  }
}

.moment-dialog__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  flex-shrink: 0;

  &--light {
    border: 1px solid color-mix(in srgb, #fff 55%, #000);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.45) !important;
  }
}

.moment-dialog__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;

  &--name-only {
    grid-template-columns: 1fr;
  }

  &--with-category {
    grid-template-columns: minmax(7.5rem, 0.85fr) minmax(10rem, 1.2fr) minmax(9rem, 1fr);
  }
}

.moment-dialog__type-hint {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  line-height: 1.35;
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  opacity: 0.78;
}

.moment-dialog__stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.35rem 0.55rem;
  border-radius: 0.65rem;
  border: 1px solid color-mix(in srgb, #fff 10%, transparent);
  background: var(--ds-color-surface-container, #201f1f);
}

.moment-dialog__step-btn {
  width: 1.85rem;
  height: 1.85rem;
  border: 0;
  border-radius: 0.5rem;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, #fff 5%, transparent);
  color: var(--ds-color-on-surface);
  cursor: pointer;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    transform 120ms ease;

  &:hover {
    color: var(--ds-color-primary);
    background: color-mix(in srgb, #fff 10%, transparent);
  }

  &:active {
    transform: scale(0.9);
  }
}

.moment-dialog__step-value {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.moment-dialog__input {
  width: 100%;
  min-height: 2.5rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid color-mix(in srgb, #fff 10%, transparent);
  border-radius: 0.65rem;
  background: var(--ds-color-surface-container-low, #1c1b1b);
  color: #fff;
  font-size: 0.875rem;
  line-height: 1.35;

  &::placeholder {
    color: color-mix(in srgb, var(--ds-color-on-surface-variant) 40%, transparent);
  }

  &:focus {
    outline: 2px solid color-mix(in srgb, var(--ds-color-primary) 50%, transparent);
    outline-offset: 0;
  }

  &--error {
    border-color: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 65%, transparent);
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 8%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--ds-color-error, #ffb4ab) 25%, transparent);

    &:focus {
      outline-color: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 55%, transparent);
    }
  }
}

.moment-dialog__select {
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239ecaff' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.85rem center;
  padding-right: 2.25rem;
}

.moment-dialog__music {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.moment-dialog__music-search {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.5rem;
  padding: 0.4rem 0.85rem;
  border: 1px solid color-mix(in srgb, #fff 10%, transparent);
  border-radius: 0.65rem;
  background: var(--ds-color-surface-container-low, #1c1b1b);
  color: var(--ds-color-primary);

  i {
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  &:focus-within {
    outline: 2px solid color-mix(in srgb, var(--ds-color-primary) 50%, transparent);
    outline-offset: 0;
  }

  &--error {
    border-color: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 65%, transparent);
    background: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 8%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--ds-color-error, #ffb4ab) 25%, transparent);
    color: var(--ds-color-error, #ffb4ab);

    &:focus-within {
      outline-color: color-mix(in srgb, var(--ds-color-error, #ffb4ab) 55%, transparent);
    }
  }
}

.moment-dialog__music-input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 0.875rem;
  line-height: 1.35;
  outline: none;

  &::placeholder {
    color: color-mix(in srgb, var(--ds-color-on-surface-variant) 40%, transparent);
  }
}

.moment-dialog__music-results {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 11rem;
  overflow: auto;
  border-radius: 0.65rem;
  border: 1px solid color-mix(in srgb, #fff 10%, transparent);
  background: var(--ds-color-surface-container-high, #2a2a2a);
}

.moment-dialog__music-option {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  padding: 0.45rem 0.7rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, #fff 6%, transparent);
  }

  &--active {
    background: color-mix(in srgb, var(--ds-color-primary) 14%, transparent);
  }
}

.moment-dialog__music-option-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff;
}

.moment-dialog__music-option-meta {
  font-size: 0.68rem;
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  opacity: 0.8;
}

.moment-dialog__music-selected {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.7rem;
  border-radius: 0.65rem;
  border: 1px solid color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 35%, transparent);
  background: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 12%, transparent);
}

.moment-dialog__music-selected-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.moment-dialog__music-selected-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff;
}

.moment-dialog__music-selected-meta {
  font-size: 0.68rem;
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  opacity: 0.85;
}

.moment-dialog__music-clear {
  width: 1.7rem;
  height: 1.7rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ds-color-on-surface);
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, #fff 10%, transparent);
  }
}

.moment-dialog__textarea {
  width: 100%;
  min-height: 4.5rem;
  resize: vertical;
  padding: 0.7rem 0.85rem;
  border-radius: 0.65rem;
  border: 1px solid color-mix(in srgb, #fff 10%, transparent);
  background: var(--ds-color-surface-container-low, #1c1b1b);
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  font-size: 0.8125rem;
  line-height: 1.4;

  &::placeholder {
    color: color-mix(in srgb, var(--ds-color-on-surface-variant) 30%, transparent);
  }

  &:focus {
    outline: 2px solid color-mix(in srgb, var(--ds-color-primary) 30%, transparent);
    outline-offset: 0;
  }
}

.moment-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.85rem;
  padding-top: 0.35rem;
}

.moment-dialog__discard {
  border: 0;
  background: transparent;
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: #fff;
  }
}

.moment-dialog__submit {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.15rem;
  padding: 0.4rem 1rem;
  border: 0;
  border-radius: 0.6rem;
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 4px 16px
    color-mix(in srgb, var(--ds-color-primary) 22%, transparent);
  transition:
    box-shadow 180ms ease,
    transform 140ms ease;

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px
      color-mix(in srgb, var(--ds-color-primary) 35%, transparent);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  i {
    font-size: 0.9rem;
  }
}

@media (max-width: 720px) {
  .moment-dialog__header,
  .moment-dialog__form {
    padding-inline: 0.9rem;
  }

  .moment-dialog__row {
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }

  .moment-dialog__footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .moment-dialog__submit {
    justify-content: center;
  }
}
</style>

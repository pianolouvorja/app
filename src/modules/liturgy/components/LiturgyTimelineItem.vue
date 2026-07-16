<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import MonitorTargetSelect from '@shared/components/MonitorTargetSelect.vue'

import { getItemTypeIcon, isExecutableItem } from '../services/liturgy-item-helpers'
import type { LiturgyItem } from '../types/liturgy'

const props = defineProps<{
  item: LiturgyItem
  index: number
  selected: boolean
  siteProjecting?: boolean
  startLabel: string
  durationLabel: string
  linked?: boolean
  /** Indeterminado: alguns (não todos) filhos da categoria concluídos. */
  indeterminate?: boolean
  /** Categoria com filhos ainda não todos concluídos → status Em andamento. */
  sectionInProgress?: boolean
  /** Categoria abaixo de outra incompleta → status Aguardando. */
  sectionWaiting?: boolean
  collapsible?: boolean
  collapsed?: boolean
  childCount?: number
  /** Reordenação em andamento na timeline. */
  reorderActive?: boolean
  /** Este item é o que está sendo arrastado. */
  isDragSource?: boolean
  /** Cadeado ativo: oculta edição e exclusão unitária. */
  deletionLocked?: boolean
}>()

const emit = defineEmits<{
  select: []
  playScreens: []
  edit: []
  remove: []
  toggleDone: []
  toggleCollapse: []
  dragStart: [index: number]
  dragEnd: []
  drop: [index: number]
}>()

const { t } = useI18n()
const rootEl = ref<HTMLElement | null>(null)
let dragGhostEl: HTMLElement | null = null

const isCategory = computed(() => props.item.type === 'category')
const isLinked = computed(() => Boolean(props.linked))
const executable = computed(() => isExecutableItem(props.item))
const isStreamVideo = computed(() => props.item.type === 'online_video')
const isSiteItem = computed(() => props.item.type === 'site')
const canPlayOnScreens = computed(() => isStreamVideo.value)
const isDimmed = computed(
  () => Boolean(props.reorderActive) && !props.isDragSource,
)

const showInProgress = computed(() => {
  if (props.item.done) return false
  if (isCategory.value && props.sectionWaiting) return false
  if (isCategory.value && props.sectionInProgress) return true
  return props.selected
})

const showWaiting = computed(
  () => isCategory.value && Boolean(props.sectionWaiting) && !props.item.done,
)

const statusKey = computed(() => {
  if (props.item.done) return 'liturgy.done'
  if (showWaiting.value) return 'liturgy.waiting'
  if (showInProgress.value) return 'liturgy.inProgress'
  return null
})

const doneLabel = computed(() =>
  props.item.done
    ? t('liturgy.actions.markPending')
    : t('liturgy.actions.markDone'),
)

const collapseLabel = computed(() =>
  props.collapsed
    ? t('liturgy.actions.expandCategory')
    : t('liturgy.actions.collapseCategory'),
)

function clearDragGhost() {
  if (!dragGhostEl) return
  dragGhostEl.remove()
  dragGhostEl = null
}

function onHandleDragStart(event: DragEvent) {
  const row = rootEl.value
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(props.index))

    if (row) {
      clearDragGhost()
      const rect = row.getBoundingClientRect()
      const ghost = row.cloneNode(true) as HTMLElement
      ghost.classList.add('liturgy-item--drag-ghost')
      ghost.classList.remove('liturgy-item--dimmed')
      ghost.classList.add('liturgy-item--drag-source')
      ghost.style.width = `${rect.width}px`
      ghost.style.boxSizing = 'border-box'
      document.body.appendChild(ghost)
      dragGhostEl = ghost

      const offsetX = Math.min(
        Math.max(event.clientX - rect.left, 0),
        rect.width,
      )
      const offsetY = Math.min(
        Math.max(event.clientY - rect.top, 0),
        rect.height,
      )
      event.dataTransfer.setDragImage(ghost, offsetX, offsetY)
    }
  }

  emit('dragStart', props.index)
}

function onHandleDragEnd() {
  window.setTimeout(() => clearDragGhost(), 0)
  emit('dragEnd')
}
</script>

<template>
  <div
    ref="rootEl"
    class="liturgy-item"
    :class="{
      'liturgy-item--category': isCategory,
      'liturgy-item--linked': isLinked,
      'liturgy-item--selected': showInProgress,
      'liturgy-item--done': item.done && !showInProgress,
      'liturgy-item--pending': !item.done && !showInProgress,
      'liturgy-item--waiting': showWaiting,
      'liturgy-item--dimmed': isDimmed,
      'liturgy-item--drag-source': isDragSource,
    }"
    @dragover.prevent
    @drop.prevent="emit('drop', index)"
  >
    <label
      class="liturgy-item__check"
      :class="{
        'liturgy-item__check--linked': isLinked,
        'liturgy-item__check--done': item.done,
        'liturgy-item__check--indeterminate': indeterminate && !item.done,
        'liturgy-item__check--active': showInProgress,
      }"
      :title="doneLabel"
      @click.stop
    >
      <input
        type="checkbox"
        class="liturgy-item__check-input"
        :checked="item.done"
        :indeterminate="Boolean(indeterminate && !item.done)"
        :aria-label="doneLabel"
        @change="emit('toggleDone')"
      >
      <span
        class="liturgy-item__check-box"
        aria-hidden="true"
      >
        <i
          v-if="item.done"
          class="mdi mdi-check"
        />
        <i
          v-else-if="indeterminate"
          class="mdi mdi-minus"
        />
      </span>
    </label>

    <div class="liturgy-item__card">
      <div class="liturgy-item__main">
        <span
          class="liturgy-item__drag"
          role="button"
          tabindex="0"
          draggable="true"
          :title="t('liturgy.actions.reorder')"
          :aria-label="t('liturgy.actions.reorder')"
          @click.stop
          @dragstart.stop="onHandleDragStart"
          @dragend="onHandleDragEnd"
        >
          <i
            class="mdi mdi-drag-vertical"
            aria-hidden="true"
          />
        </span>

        <div
          class="liturgy-item__icon"
          :class="{ 'liturgy-item__icon--active': showInProgress }"
          :style="
            item.done && !showInProgress
              ? undefined
              : {
                  color: item.accentColor,
                  background: `color-mix(in srgb, ${item.accentColor} 18%, transparent)`,
                }
          "
        >
          <i
            class="mdi"
            :class="getItemTypeIcon(item.type)"
            aria-hidden="true"
          />
        </div>

        <div class="liturgy-item__body">
          <p class="liturgy-item__type">
            {{ t(`liturgy.types.${item.type}`) }}
          </p>
          <div class="liturgy-item__heading">
            <h3 class="liturgy-item__name">
              {{ item.name }}
              <span
                v-if="item.complementaryTitle"
                class="liturgy-item__complementary"
              >
                {{ item.complementaryTitle }}
              </span>
            </h3>
            <span
              v-if="statusKey"
              class="liturgy-item__badge"
              :class="{
                'liturgy-item__badge--done': item.done,
                'liturgy-item__badge--active': showInProgress,
                'liturgy-item__badge--waiting': showWaiting,
              }"
            >
              {{ t(statusKey) }}
            </span>
          </div>
          <p
            v-if="item.subtitle"
            class="liturgy-item__subtitle"
          >
            {{ item.subtitle }}
          </p>
          <p
            v-if="item.notes"
            class="liturgy-item__notes"
          >
            {{ item.notes }}
          </p>
        </div>
      </div>

      <div class="liturgy-item__meta">
        <div
          v-if="!isCategory"
          class="liturgy-item__time"
        >
          <p class="liturgy-item__clock">
            {{ startLabel }}
          </p>
          <p class="liturgy-item__duration">
            {{ t('liturgy.duration', { time: durationLabel }) }}
          </p>
        </div>

        <span
          v-else-if="collapsible && collapsed"
          class="liturgy-item__child-count"
        >
          {{ childCount }}
        </span>

        <div
          class="liturgy-item__actions"
          :class="{
            'liturgy-item__actions--visible': isCategory || isStreamVideo || isSiteItem,
          }"
          @click.stop
        >
          <button
            v-if="collapsible"
            type="button"
            class="liturgy-item__action liturgy-item__action--collapse"
            :title="collapseLabel"
            :aria-label="collapseLabel"
            :aria-expanded="!collapsed"
            @click="emit('toggleCollapse')"
          >
            <i
              class="mdi"
              :class="collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down'"
              aria-hidden="true"
            />
          </button>
          <button
            v-if="!isCategory && !isStreamVideo && !isSiteItem && (executable || selected)"
            type="button"
            class="liturgy-item__action"
            :class="{ 'liturgy-item__action--primary': selected }"
            :title="t('liturgy.actions.openControl')"
            :aria-label="t('liturgy.actions.openControl')"
            @click.stop="emit('select')"
          >
            <i
              class="mdi mdi-play"
              aria-hidden="true"
            />
          </button>
          <MonitorTargetSelect
            v-if="!isCategory && isSiteItem"
            dense
            persist
          />
          <button
            v-if="!isCategory && isSiteItem"
            type="button"
            class="liturgy-item__action liturgy-item__action--site-control"
            :title="t('liturgy.actions.openSiteControl')"
            :aria-label="t('liturgy.actions.openSiteControl')"
            @click.stop="emit('select')"
          >
            <i
              class="mdi mdi-monitor-dashboard"
              aria-hidden="true"
            />
          </button>
          <button
            v-if="!isCategory && isSiteItem"
            type="button"
            class="liturgy-item__action liturgy-item__action--site-project"
            :class="{
              'liturgy-item__action--site-projecting': siteProjecting,
            }"
            :title="
              siteProjecting
                ? t('liturgy.actions.stopSiteProjection')
                : t('liturgy.actions.projectSiteOnScreens')
            "
            :aria-label="
              siteProjecting
                ? t('liturgy.actions.stopSiteProjection')
                : t('liturgy.actions.projectSiteOnScreens')
            "
            :aria-pressed="siteProjecting"
            @click.stop="emit('playScreens')"
          >
            <i
              class="mdi"
              :class="siteProjecting ? 'mdi-stop' : 'mdi-arrow-top-right'"
              aria-hidden="true"
            />
          </button>
          <button
            v-if="!isCategory && canPlayOnScreens"
            type="button"
            class="liturgy-item__action liturgy-item__action--screens"
            :class="{ 'liturgy-item__action--screens-highlight': isStreamVideo }"
            :title="
              isStreamVideo
                ? t('liturgy.actions.openControl')
                : t('liturgy.actions.playOnScreens')
            "
            :aria-label="
              isStreamVideo
                ? t('liturgy.actions.openControl')
                : t('liturgy.actions.playOnScreens')
            "
            @click.stop="emit('select')"
          >
            <i
              class="mdi mdi-television-play"
              aria-hidden="true"
            />
          </button>
          <button
            v-if="!deletionLocked"
            type="button"
            class="liturgy-item__action"
            :title="t('liturgy.actions.edit')"
            :aria-label="t('liturgy.actions.edit')"
            @click="emit('edit')"
          >
            <i
              class="mdi mdi-pencil"
              aria-hidden="true"
            />
          </button>
          <button
            v-if="!deletionLocked"
            type="button"
            class="liturgy-item__action liturgy-item__action--danger"
            :title="t('liturgy.actions.delete')"
            :aria-label="t('liturgy.actions.delete')"
            @click="emit('remove')"
          >
            <i
              class="mdi mdi-delete-outline"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.liturgy-item {
  position: relative;
  display: grid;
  grid-template-columns: 1.25rem 1fr;
  gap: 0.65rem;
  width: 100%;
  cursor: default;

  &--linked {
    grid-template-columns: 1rem 1fr;
    gap: 0.55rem;
    width: 100%;
  }

  &--dimmed {
    opacity: 0.34;
    filter: grayscale(0.35);
    transition:
      opacity 160ms ease,
      filter 160ms ease;
  }

  &--drag-source {
    position: relative;
    z-index: 2;
    opacity: 1;
    filter: none;
    pointer-events: auto;

    .liturgy-item__card {
      border-color: color-mix(in srgb, var(--ds-color-primary) 55%, transparent);
      background: color-mix(in srgb, var(--ds-color-primary) 14%, transparent);
      box-shadow: 0 0 18px color-mix(in srgb, var(--ds-color-primary) 22%, transparent);
    }
  }

  &--drag-ghost {
    position: fixed !important;
    top: -10000px !important;
    left: 0 !important;
    z-index: 0;
    margin: 0;
    pointer-events: none;
    opacity: 1;
    filter: none;

    .liturgy-item__card {
      border-color: color-mix(in srgb, var(--ds-color-primary) 60%, transparent);
      background: color-mix(in srgb, var(--ds-color-primary) 16%, transparent);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
    }
  }
}

.liturgy-item__marker {
  position: relative;
  z-index: 1;
  margin-top: 0.7rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  background: var(--ds-color-surface-container-high, #2a2a2a);
  display: grid;
  place-items: center;
  color: var(--ds-color-on-secondary, #003736);
  font-size: 0.85rem;

  &--done {
    background: var(--ds-color-secondary, #78d6d2);
    border-color: transparent;
  }

  &--active {
    background: var(--ds-color-primary);
    border-color: transparent;
    color: var(--ds-color-on-primary, #003258);
    box-shadow: 0 0 16px color-mix(in srgb, var(--ds-color-primary) 40%, transparent);
  }
}

.liturgy-item__check {
  position: relative;
  z-index: 1;
  margin-top: 0.7rem;
  width: 1.25rem;
  height: 1.25rem;
  display: grid;
  place-items: center;
  cursor: pointer;

  &--linked {
    margin-top: 0.6rem;
    width: 1rem;
    height: 1rem;
  }
}

.liturgy-item__check-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}

.liturgy-item__check-box {
  width: 100%;
  height: 100%;
  border-radius: 0.3rem;
  border: 1.5px solid color-mix(in srgb, var(--ds-color-on-surface) 35%, transparent);
  background: var(--ds-color-surface-container-high, #2a2a2a);
  display: grid;
  place-items: center;
  color: transparent;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;

  i {
    font-size: 0.8rem;
    line-height: 1;
  }

  .liturgy-item__check--linked & {
    border-radius: 0.22rem;

    i {
      font-size: 0.68rem;
    }
  }

  .liturgy-item__check:hover & {
    border-color: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 55%, transparent);
  }

  .liturgy-item__check--done & {
    border-color: transparent;
    background: var(--ds-color-secondary, #78d6d2);
    color: var(--ds-color-on-secondary, #003736);
  }

  .liturgy-item__check--indeterminate & {
    border-color: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 55%, transparent);
    background: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 18%, transparent);
    color: var(--ds-color-secondary, #78d6d2);
  }

  .liturgy-item__check--active:not(.liturgy-item__check--done) & {
    border-color: color-mix(in srgb, var(--ds-color-primary) 55%, transparent);
    box-shadow: 0 0 10px color-mix(in srgb, var(--ds-color-primary) 25%, transparent);
  }
}

.liturgy-item__pulse {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: currentColor;
  animation: liturgy-pulse 1.4s ease-in-out infinite;
}

.liturgy-item__dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ds-color-on-surface) 45%, transparent);
}

.liturgy-item__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.65rem 0.85rem;
  border-radius: 0.6rem;
  background: color-mix(
    in srgb,
    var(--ds-color-surface-card, #242424) 55%,
    transparent
  );
  border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
  backdrop-filter: blur(12px);
  transition:
    border-color 220ms ease,
    background-color 220ms ease,
    opacity 220ms ease,
    box-shadow 220ms ease;

  .liturgy-item--selected & {
    border-color: color-mix(in srgb, var(--ds-color-primary) 50%, transparent);
    background: color-mix(in srgb, var(--ds-color-primary) 10%, transparent);
    box-shadow: 0 0 15px color-mix(in srgb, var(--ds-color-primary) 12%, transparent);
  }

  .liturgy-item--pending & {
    opacity: 0.62;
  }

  .liturgy-item--pending:hover & {
    opacity: 1;
  }

  .liturgy-item--done & {
    opacity: 1;
    border-color: color-mix(in srgb, var(--ds-color-on-surface) 6%, transparent);
    background: color-mix(
      in srgb,
      var(--ds-color-surface-card, #242424) 40%,
      transparent
    );
    box-shadow: none;
  }

  .liturgy-item--linked & {
    padding: 0.55rem 0.75rem;
    border-color: color-mix(in srgb, var(--ds-color-on-surface) 12%, transparent);
  }
}

.liturgy-item__main {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  flex: 1;
}

.liturgy-item__drag {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  align-self: center;
  width: 1.1rem;
  height: 1.7rem;
  margin-left: -0.25rem;
  margin-right: -0.2rem;
  border-radius: 0.35rem;
  color: color-mix(in srgb, var(--ds-color-on-surface) 35%, transparent);
  cursor: grab;
  user-select: none;
  touch-action: none;
  transition:
    color 160ms ease,
    background-color 160ms ease;

  i {
    font-size: 1.15rem;
    line-height: 1;
    pointer-events: none;
  }

  &:hover,
  &:focus-visible {
    color: color-mix(in srgb, var(--ds-color-on-surface) 70%, transparent);
    background: color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
    outline: none;
  }

  &:active {
    cursor: grabbing;
  }

  .liturgy-item--linked & {
    width: 1rem;
    height: 1.5rem;
    margin-left: -0.2rem;
    margin-right: -0.15rem;

    i {
      font-size: 1.05rem;
    }
  }

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 22%, transparent);
  }
}

.liturgy-item__icon {
  flex: 0 0 auto;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 0.45rem;
  display: grid;
  place-items: center;
  background: var(--ds-color-surface-container-highest, #353534);
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  font-size: 1.1rem;
  transition:
    color 160ms ease,
    background-color 160ms ease;

  &--active {
    background: color-mix(in srgb, var(--ds-color-primary) 20%, transparent);
    color: var(--ds-color-primary);
  }

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 32%, transparent);
    background: color-mix(in srgb, var(--ds-color-on-surface) 6%, transparent);
  }
}

.liturgy-item__body {
  min-width: 0;
}

.liturgy-item__type {
  margin: 0 0 0.05rem;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.2;
  color: color-mix(in srgb, var(--ds-color-on-surface) 42%, transparent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .liturgy-item--linked & {
    font-size: 0.55rem;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, var(--ds-color-on-surface) 38%, transparent);
  }

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 28%, transparent);
  }

  .liturgy-item--selected & {
    color: color-mix(in srgb, var(--ds-color-primary) 70%, transparent);
  }
}

.liturgy-item__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.liturgy-item__name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ds-color-on-surface);

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 38%, transparent);
  }
}

.liturgy-item__complementary {
  margin-left: 0.35rem;
  font-weight: 500;
  color: color-mix(in srgb, var(--ds-color-on-surface) 48%, transparent);

  &::before {
    content: '·';
    margin-right: 0.35rem;
    color: color-mix(in srgb, var(--ds-color-on-surface) 32%, transparent);
  }

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 28%, transparent);
  }
}

.liturgy-item__badge {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;

  &--done {
    color: var(--ds-color-secondary, #78d6d2);
    background: color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 25%, transparent);
  }

  &--active {
    color: var(--ds-color-primary);
    background: color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--ds-color-primary) 40%, transparent);
    animation: liturgy-badge-pulse 1.8s ease-in-out infinite;
  }

  &--waiting {
    color: color-mix(in srgb, var(--ds-color-on-surface) 62%, transparent);
    background: color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--ds-color-on-surface) 14%, transparent);
  }

  .liturgy-item--done &--done {
    opacity: 1;
    color: var(--ds-color-secondary, #78d6d2);
  }
}

.liturgy-item__subtitle {
  margin: 0.1rem 0 0;
  font-size: 0.78rem;
  line-height: 1.3;
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 30%, transparent);
  }
}

.liturgy-item__notes {
  margin: 0.08rem 0 0;
  font-size: 0.72rem;
  line-height: 1.3;
  color: color-mix(in srgb, var(--ds-color-on-surface) 52%, transparent);

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 28%, transparent);
  }
}

.liturgy-item__meta {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}

.liturgy-item__time {
  text-align: right;
}

.liturgy-item__clock {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--ds-color-primary);

  .liturgy-item--pending & {
    color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));
  }

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 32%, transparent);
  }
}

.liturgy-item__duration {
  margin: 0.08rem 0 0;
  font-size: 0.65rem;
  color: var(--ds-color-on-surface-variant, var(--ds-color-on-surface));

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 28%, transparent);
  }
}

.liturgy-item__actions {
  display: flex;
  gap: 0.15rem;
  opacity: 0;
  transition: opacity 160ms ease;

  .liturgy-item:hover &,
  .liturgy-item--selected &,
  &--visible {
    opacity: 1;
  }

  .liturgy-item--done & {
    opacity: 0.55;
  }

  .liturgy-item--done:hover &,
  .liturgy-item--done &--visible {
    opacity: 0.85;
  }
}

.liturgy-item__child-count {
  min-width: 1.5rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--ds-color-on-surface) 55%, transparent);
  background: color-mix(in srgb, var(--ds-color-on-surface) 8%, transparent);
}

.liturgy-item__action {
  width: 1.7rem;
  height: 1.7rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--ds-color-on-surface);
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--ds-color-on-surface) 10%, transparent);
  }

  &--primary {
    color: var(--ds-color-primary);
  }

  &--collapse {
    color: var(--ds-color-primary);

    i {
      font-size: 1.2rem;
    }
  }

  &--danger:hover {
    color: var(--ds-color-error, #ffb4ab);
  }

  &--screens-highlight {
    width: 2.15rem;
    height: 2.15rem;
    color: var(--ds-color-on-primary, #003258);
    background: var(--ds-color-primary);
    box-shadow: 0 0 16px color-mix(in srgb, var(--ds-color-primary) 42%, transparent);

    i {
      font-size: 1.2rem;
    }

    &:hover {
      background: color-mix(in srgb, var(--ds-color-primary) 90%, white);
    }
  }

  &--site-control,
  &--site-project {
    width: 2.05rem;
    height: 2.05rem;
    color: var(--ds-color-on-primary, #003258);
    background: var(--ds-color-primary);
    box-shadow: 0 0 14px color-mix(in srgb, var(--ds-color-primary) 36%, transparent);

    i {
      font-size: 1.15rem;
    }

    &:hover {
      background: color-mix(in srgb, var(--ds-color-primary) 90%, white);
    }
  }

  &--site-project {
    background: #78d6d2;
    color: #000;
    box-shadow: 0 0 14px color-mix(in srgb, var(--ds-color-secondary, #78d6d2) 38%, transparent);

    &:hover {
      background: #9be4e1;
    }
  }

  // Deve vir após --site-project, pois o botão possui as duas classes.
  &--site-projecting {
    background: #fca5a5;
    color: #111827;
    box-shadow: 0 0 14px rgba(252, 165, 165, 0.5);

    &:hover {
      background: #f87171;
      color: #111827;
    }
  }

  .liturgy-item--done & {
    color: color-mix(in srgb, var(--ds-color-on-surface) 35%, transparent);
  }

  .liturgy-item--done &--screens-highlight {
    color: var(--ds-color-on-primary, #003258);
    background: var(--ds-color-primary);
    opacity: 1;
  }

  .liturgy-item--done &--site-control,
  .liturgy-item--done &--site-project {
    opacity: 1;
  }

  .liturgy-item--done &--site-project {
    color: #000;
  }

  .liturgy-item--done &--site-projecting {
    background: #fca5a5;
    color: #111827;
  }

  .liturgy-item--done &--collapse {
    color: color-mix(in srgb, var(--ds-color-primary) 55%, transparent);
  }
}

.liturgy-item--done {
  .liturgy-item__check-box {
    border-color: transparent;
    background: color-mix(in srgb, var(--ds-color-on-surface) 18%, transparent);
    color: color-mix(in srgb, var(--ds-color-on-surface) 42%, transparent);
  }
}

@keyframes liturgy-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.55);
    opacity: 0.55;
  }
}

@keyframes liturgy-badge-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@media (max-width: 720px) {
  .liturgy-item__card {
    flex-direction: column;
    align-items: stretch;
  }

  .liturgy-item__meta {
    justify-content: space-between;
  }

  .liturgy-item__actions {
    opacity: 1;
  }
}
</style>

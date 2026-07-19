<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { GlassCard } from '@design-system/index'

const props = defineProps<{
  titleKey: string
  descriptionKey: string
  icon: string
  to?: string | null
  available?: boolean
}>()

const { t } = useI18n()
const router = useRouter()

const isAvailable = props.available !== false

function onActivate() {
  if (!isAvailable || !props.to) return
  void router.push(props.to)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onActivate()
  }
}
</script>

<template>
  <GlassCard
    class="utilities-hub-card"
    :class="{
      'utilities-hub-card--disabled': !isAvailable,
      'utilities-hub-card--interactive': isAvailable,
    }"
    :padding="false"
    role="button"
    :tabindex="isAvailable ? 0 : -1"
    :aria-disabled="!isAvailable"
    :aria-label="t(titleKey)"
    @click="onActivate"
    @keydown="onKeydown"
  >
    <div class="utilities-hub-card__icon-wrap">
      <i
        class="ti utilities-hub-card__icon"
        :class="icon"
        aria-hidden="true"
      />
    </div>

    <div class="utilities-hub-card__body">
      <h2 class="utilities-hub-card__title">
        {{ t(titleKey) }}
      </h2>
      <p class="utilities-hub-card__description">
        {{ t(descriptionKey) }}
      </p>
      <span
        v-if="!isAvailable"
        class="utilities-hub-card__badge"
      >
        {{ t('common.comingSoon') }}
      </span>
    </div>

    <i
      v-if="isAvailable"
      class="ti ti-chevron-right utilities-hub-card__chevron"
      aria-hidden="true"
    />
  </GlassCard>
</template>

<style scoped lang="scss">
.utilities-hub-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  width: 100%;
  max-width: 22rem;
  padding: 1.25rem 1.35rem;
  text-align: left;
  transition:
    transform 220ms ease,
    border-color 220ms ease,
    opacity 220ms ease;

  &--interactive {
    cursor: pointer;

    &:hover {
      transform: translateY(-4px);
    }

    &:focus-visible {
      outline: 2px solid var(--ds-color-primary);
      outline-offset: 3px;
    }
  }

  &--disabled {
    opacity: 0.55;
    cursor: default;
  }
}

.utilities-hub-card__icon-wrap {
  display: flex;
  width: 3.5rem;
  height: 3.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: var(--ds-radius-md, 0.75rem);
  background: color-mix(in srgb, var(--ds-color-primary) 16%, transparent);
}

.utilities-hub-card__icon {
  color: var(--ds-color-primary);
  font-size: 1.75rem;
  line-height: 1;
}

.utilities-hub-card__body {
  min-width: 0;
  flex: 1;
}

.utilities-hub-card__title {
  margin: 0 0 0.2rem;
  color: var(--ds-color-on-surface);
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.35;
}

.utilities-hub-card__description {
  margin: 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.8125rem;
  line-height: 1.35;
}

.utilities-hub-card__badge {
  display: inline-block;
  margin-top: 0.5rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 0.75rem;
  font-weight: 500;
}

.utilities-hub-card__chevron {
  flex-shrink: 0;
  color: var(--ds-color-on-surface-variant);
  font-size: 1.5rem;
  line-height: 1;
}
</style>

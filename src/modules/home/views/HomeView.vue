<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import logoUrl from '@assets/brand/logo-louvor-ja.svg'

const { t } = useI18n()
</script>

<template>
  <section class="home-view">
    <div class="home-view__content">
      <div class="home-view__logo-wrap">
        <img
          class="home-view__logo"
          :src="logoUrl"
          :alt="t('app.name')"
          width="128"
          height="128"
        >
      </div>

      <h1 class="home-view__title">
        {{ t('home.title') }}
      </h1>

      <div class="home-view__search">
        <label class="home-view__search-field">
          <i class="ti ti-search" aria-hidden="true" />
          <input
            type="search"
            :placeholder="t('home.searchPlaceholder')"
            autocomplete="off"
          >
        </label>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.home-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--app-titlebar-height, 0px) - 5rem - var(--ds-dock-height));
  padding: var(--ds-spacing-page);
}

.home-view__content {
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: 42rem;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.home-view__logo-wrap {
  margin-bottom: 2.5rem;
  transition: transform 500ms ease;

  &:hover {
    transform: scale(1.05);
  }
}

.home-view__logo {
  width: 8rem;
  height: 8rem;
  object-fit: contain;
  display: block;
}

.home-view__title {
  margin: 0 0 2rem;
  font-size: 32px;
  font-weight: 700;
  line-height: 40px;
  letter-spacing: -0.02em;
  color: var(--ds-color-on-surface);
}

.home-view__search {
  width: 100%;
  max-width: 36rem;
}

.home-view__search-field {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.5rem;
  border-radius: var(--ds-radius-full);
  border: 1px solid var(--ds-color-outline-strong);
  background: var(--ds-color-surface-elevated);
  transition:
    background-color 300ms ease,
    border-color 300ms ease,
    box-shadow 300ms ease;

  .ti {
    font-size: 24px;
    color: var(--ds-color-on-surface-variant);
    transition: color 200ms ease;
  }

  input {
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--ds-color-on-surface);
    font: inherit;
    font-size: 16px;
    line-height: 24px;

    &::placeholder {
      color: color-mix(in srgb, var(--ds-color-on-surface-variant) 50%, transparent);
    }
  }

  &:hover {
    background: var(--ds-color-surface-card);
  }

  &:focus-within {
    border-color: var(--ds-color-primary);
    box-shadow: 0 0 0 1px var(--ds-color-primary);

    .ti {
      color: var(--ds-color-primary);
    }
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { DockFooter, GradientBackground } from '@design-system/index'
import type { DockNavItem } from '@design-system/types/navigation'
import { mainNavRoutes } from '@shared/constants/navigation'
import logoUrl from '@assets/brand/logo-louvor-ja.svg'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

/** Login Google — reativar quando o fluxo de autenticação existir */
const showAccountButton = false

const activeKey = computed(() => {
  const navKey = route.meta.navKey
  return typeof navKey === 'string' ? navKey : 'home'
})

const showHeaderLogo = computed(() => activeKey.value !== 'home')

const navItems = computed<DockNavItem[]>(() =>
  mainNavRoutes.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: t(item.labelKey),
    to: item.to,
  })),
)

function onNavigate(key: string) {
  const item = mainNavRoutes.find((nav) => nav.key === key)
  if (item) {
    void router.push(item.to)
  }
}
</script>

<template>
  <GradientBackground class="app-shell">
    <header class="app-shell__header">
      <div class="app-shell__brand-group" :aria-label="t('app.name')">
        <img
          v-if="showHeaderLogo"
          class="app-shell__logo"
          :src="logoUrl"
          :alt="t('app.name')"
          width="36"
          height="36"
        >
        <span class="app-shell__brand">
          <span class="app-shell__brand-louvor">{{ t('app.nameLouvor') }}</span>
          <span class="app-shell__brand-ja">{{ t('app.nameJa') }}</span>
        </span>
      </div>
      <button
        v-if="showAccountButton"
        type="button"
        class="app-shell__account"
        :aria-label="t('app.name')"
      >
        <i class="mdi mdi-account-circle" aria-hidden="true" />
      </button>
    </header>

    <main class="app-shell__main">
      <RouterView />
    </main>

    <DockFooter
      :items="navItems"
      :active-key="activeKey"
      @select="onNavigate"
    />
  </GradientBackground>
</template>

<style scoped lang="scss">
.app-shell {
  min-height: 100%;
}

.app-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 5rem;
  padding: 0 var(--ds-spacing-page);
  border-bottom: 1px solid var(--ds-color-outline);
  position: relative;
  z-index: 40;
}

.app-shell__brand-group {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}

.app-shell__logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}

.app-shell__brand {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35em;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.app-shell__brand-louvor {
  color: var(--ds-color-on-surface);
}

.app-shell__brand-ja {
  color: var(--ds-color-brand-yellow);
}

.app-shell__account {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  transition: color 200ms ease, transform 150ms ease;

  .mdi {
    font-size: 32px;
    line-height: 1;
  }

  &:hover {
    color: var(--ds-color-primary-soft);
  }

  &:active {
    transform: scale(0.95);
  }
}

.app-shell__main {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 5rem - var(--ds-dock-height));
  padding-bottom: var(--ds-dock-height);
}
</style>

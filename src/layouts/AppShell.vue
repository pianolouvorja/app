<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { usePageTransition } from '@design-system/composables'
import { DockFooter, GradientBackground } from '@design-system/index'
import type { DockNavItem } from '@design-system/types/navigation'
import MediaChrome from '@modules/media/components/MediaChrome.vue'
import { mainNavRoutes } from '@shared/constants/navigation'
import logoUrl from '@assets/brand/logo-louvor-ja.svg'
import codenamePianoUrl from '@assets/brand/codenamePIANO.svg'
import { APP_VERSION } from '@shared/constants/app'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { transitionName } = usePageTransition()

/** Login Google — reativar quando o fluxo de autenticação existir */
const showAccountButton = false

const activeKey = computed(() => {
  const navKey = route.meta.navKey
  return typeof navKey === 'string' ? navKey : 'home'
})

/** Na liturgia o FAB de mídia fica na própria view (padrão Bíblia). */
const showMediaChrome = computed(() => activeKey.value !== 'liturgy')

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

function viewKey(viewRoute: typeof route) {
  const navKey = viewRoute.meta.navKey
  return typeof navKey === 'string' ? navKey : String(viewRoute.name ?? viewRoute.path)
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
      <div class="app-shell__header-end">
        <div class="app-shell__codename-block">
          <img
            class="app-shell__codename"
            :src="codenamePianoUrl"
            alt="codename PIANO"
            width="168"
            height="25"
          >
          <span class="app-shell__version" aria-hidden="true">{{ APP_VERSION }}</span>
        </div>
        <button
          v-if="showAccountButton"
          type="button"
          class="app-shell__account"
          :aria-label="t('app.name')"
        >
          <i class="ti ti-user-circle" aria-hidden="true" />
        </button>
      </div>
    </header>

    <main class="app-shell__main">
      <RouterView v-slot="{ Component, route: viewRoute }">
        <Transition :name="transitionName" mode="out-in">
          <component
            :is="Component"
            :key="viewKey(viewRoute)"
          />
        </Transition>
      </RouterView>
    </main>

    <MediaChrome v-if="showMediaChrome" />

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

.app-shell__header-end {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.app-shell__codename-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

.app-shell__codename {
  display: block;
  height: 1.5rem;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
}

.app-shell__version {
  color: var(--ds-color-on-surface-variant);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.02em;
  opacity: 0.7;
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

  .ti {
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
  min-height: calc(100vh - var(--app-titlebar-height, 0px) - 5rem - var(--ds-dock-height));
  padding-bottom: var(--ds-dock-height);
}
</style>

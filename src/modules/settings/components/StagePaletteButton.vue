<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import StageCustomizationDialog from './StageCustomizationDialog.vue'

/**
 * Botão de paleta + dialog contextual: personaliza o palco do módulo
 * (scope) onde está inserido. Mesmo padrão do grupo de tempo.
 */

const props = defineProps<{
  /** Escopo do módulo (ex.: 'bible', 'liturgy', 'hymns', 'random'). */
  scope: string
}>()

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <Teleport to="body">
    <button
      type="button"
      class="stage-palette-fab"
      :aria-label="t('settings.stage.title')"
      :title="t('settings.stage.title')"
      @click="open = true"
    >
      <i
        class="ti ti-palette"
        aria-hidden="true"
      />
    </button>

    <StageCustomizationDialog
      :open="open"
      :scope="props.scope"
      @close="open = false"
    />
  </Teleport>
</template>

<style scoped lang="scss">
.stage-palette-fab {
  position: fixed;
  top: calc(var(--app-titlebar-height, 0px) + var(--ds-header-height, 5rem) + 0.75rem);
  right: 1.25rem;
  z-index: 40;
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--ds-color-primary) 18%, transparent);
  color: var(--ds-color-primary);
  cursor: pointer;
  transition:
    transform 160ms ease,
    background-color 160ms ease;

  &:hover {
    transform: scale(1.06);
    background: color-mix(in srgb, var(--ds-color-primary) 28%, transparent);
  }

  .ti {
    font-size: 1.15rem;
  }
}
</style>

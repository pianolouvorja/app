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
  <div>
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
  </div>
</template>

<style scoped lang="scss">
.stage-palette-fab {
  /* Estático: o pai (fab-bar no MediaView ou container do módulo) decide
   * o lugar. Nada de fixed — não sobrepõe letra nem aside. */
  position: static;
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

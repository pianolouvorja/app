<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  messageKey: string
}>()

const { t } = useI18n()
</script>

<template>
  <section class="settings-placeholder">
    <p>{{ t(messageKey) }}</p>
  </section>
</template>

<style scoped lang="scss">
.settings-placeholder {
  display: flex;
  min-height: 12rem;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--ds-color-on-surface-variant);
  font-size: 14px;
  line-height: 20px;
  text-align: center;
}
</style>

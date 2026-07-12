<script setup lang="ts">
import DockFooter from './DockFooter.vue'
import type { DockNavItem } from '@design-system/types/navigation'

defineProps<{
  items: DockNavItem[]
  activeKey?: string
}>()

defineEmits<{
  select: [key: string]
}>()
</script>

<template>
  <DockFooter
    :items="items"
    :active-key="activeKey"
    @select="$emit('select', $event)"
  />
</template>

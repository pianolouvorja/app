<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import InAppProjectionOverlay from '@shared/components/InAppProjectionOverlay.vue'

import BibleProjectionView from '../views/BibleProjectionView.vue'

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
</script>

<template>
  <InAppProjectionOverlay
    scope="bible"
    :label="t('bible.inAppProjection')"
    :close-label="t('bible.close')"
    :hint="t('bible.projectionHotkeyHint')"
    @close="emit('close')"
  >
    <BibleProjectionView embedded />
  </InAppProjectionOverlay>
</template>

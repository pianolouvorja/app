<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPalcoRoute, setPalcoRoute, type PalcoModule } from '../services/palco-routing'

type Slot = { id: string; label: string; running: boolean; clients: number; httpPort: number; wsPort: number }
const props = defineProps<{ module: PalcoModule; compact?: boolean }>()
const { t } = useI18n()
const slots = ref<Slot[]>([])
const route = ref(getPalcoRoute(props.module))
const hasElectron = computed(() => Boolean((window as never as { louvorja?: { palco?: unknown } }).louvorja?.palco))

async function refresh() {
  if (!hasElectron.value) return
  slots.value = await (window as never as { louvorja: { palco: { slots(): Promise<Slot[]> } } }).louvorja.palco.slots()
}
function update(value: string) {
  route.value = value
  setPalcoRoute(props.module, value)
}
onMounted(() => void refresh())
</script>

<template>
  <label v-if="hasElectron" class="palco-route" :class="{ 'palco-route--compact': compact }">
    <i class="ti ti-device-tv" aria-hidden="true" />
    <span>{{ t('settings.palco.route') }}</span>
    <select :value="route" @change="update(($event.target as HTMLSelectElement).value)">
      <option value="mirror">{{ t('settings.palco.mirror') }}</option>
      <option v-for="slot in slots" :key="slot.id" :value="slot.id">
        {{ slot.label }}{{ slot.clients ? ` · ${slot.clients} ${t('settings.palco.connectedShort')}` : '' }}
      </option>
    </select>
  </label>
</template>

<style scoped lang="scss">
.palco-route { display:inline-flex; align-items:center; gap:.4rem; color:var(--ds-color-on-surface-variant); font-size:.72rem; }
.palco-route .ti { color:var(--ds-color-primary); }
.palco-route select { max-width:9rem; padding:.3rem .45rem; border:1px solid color-mix(in srgb,var(--ds-color-on-surface) 18%,transparent); border-radius:.4rem 0 .4rem 0; background:var(--ds-color-surface); color:var(--ds-color-on-surface); font-size:.72rem; }
.palco-route--compact span { display:none; }
</style>

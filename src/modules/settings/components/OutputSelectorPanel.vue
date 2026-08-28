<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOutputRegistry, type OutputModule } from '../services/output-registry'
import { palcoSession } from '../services/palco-session'

/**
 * OutputSelector — spec multi-telas (2026-08-26).
 *
 * Lista UNIFICADA de destinos: monitores cabeados + slots do Palco no
 * mesmo painel (padrão do popup de vídeo: monitorList + tvList juntos).
 *
 * Modo 'assign': altera a atribuição persistida (registry).
 * Modo 'pick': emite os destinos escolhidos (por sessão, popups).
 */

const props = withDefaults(
  defineProps<{
    /** 'assign' = atribuição persistida; 'pick' = seleção por sessão. */
    mode?: 'assign' | 'pick'
    /** Em modo pick: destinos pré-marcados. */
    modelValue?: string[]
  }>(),
  { mode: 'assign', modelValue: () => [] },
)

const emit = defineEmits<{ 'update:modelValue': [ids: string[]] }>()

const { t } = useI18n()
const registry = useOutputRegistry()
const session = palcoSession

interface DisplayInfo {
  id: number
  bounds?: { width: number; height: number }
}

const displays = ref<DisplayInfo[]>([])
const slots = ref<Array<{ id: string; label: string; clients: number; running: boolean }>>(([] as Array<{ id: string; label: string; clients: number; running: boolean }>))
const picked = ref<Set<string>>(new Set(props.modelValue))

let unsubscribeDisplays: (() => void) | null = null

const MODULE_OPTIONS: Array<{ value: OutputModule; labelKey: string }> = [
  { value: null, labelKey: 'settings.outputs.mirror' },
  { value: 'bible', labelKey: 'settings.outputs.bible' },
  { value: 'media', labelKey: 'settings.outputs.media' },
  { value: 'video', labelKey: 'settings.outputs.video' },
  { value: 'pdf', labelKey: 'settings.outputs.pdf' },
  { value: 'ppt', labelKey: 'settings.outputs.ppt' },
]

const outputs = computed(() => {
  const cable = displays.value.map((d, i) => {
    const id = `cable:${d.id}`
    return {
      id,
      kind: 'cable' as const,
      label: `${t('settings.outputs.monitor')} ${i + 1}`,
      detail: d.bounds ? `${d.bounds.width} × ${d.bounds.height}` : '',
      online: true,
      module: registry.targets.value.find((x) => x.id === id)?.module ?? null,
    }
  })
  const palco = slots.value.map((s) => {
    const id = `palco:${s.id}`
    return {
      id,
      kind: 'palco-slot' as const,
      label: s.label || s.id,
      detail: s.clients > 0 ? t('settings.outputs.tvConnected') : t('settings.outputs.tvOffline'),
      online: s.clients > 0,
      module: registry.targets.value.find((x) => x.id === id)?.module ?? null,
    }
  })
  // merge no registry para o roteador conhecer as saídas
  registry.syncDetected([
    ...displays.value.map((d, i) => ({
      id: `cable:${d.id}`,
      kind: 'cable' as const,
      monitorId: d.id,
      label: `${t('settings.outputs.monitor')} ${i + 1}`,
    })),
    ...slots.value.map((s) => ({
      id: `palco:${s.id}`,
      kind: 'palco-slot' as const,
      slotId: s.id,
      label: s.label || s.id,
    })),
  ])
  return [...cable, ...palco]
})

async function refresh(): Promise<void> {
  try {
    const bridge = (window as unknown as {
      louvorja?: { displays?: { list?: () => Promise<DisplayInfo[]> } }
    }).louvorja
    displays.value = bridge?.displays?.list ? await bridge.displays.list() : []
  } catch {
    displays.value = []
  }
  try {
    const all = await session.slots()
    slots.value = all as typeof slots.value
  } catch {
    slots.value = []
  }
}

function onAssign(id: string, module: OutputModule): void {
  registry.setModule(id, module)
}

function onPick(id: string, checked: boolean): void {
  if (checked) picked.value.add(id)
  else picked.value.delete(id)
  emit('update:modelValue', [...picked.value])
}

onMounted(async () => {
  await refresh()
  const bridge = (window as unknown as {
    louvorja?: { displays?: { onChanged?: (cb: () => void) => () => void } }
  }).louvorja
  unsubscribeDisplays = bridge?.displays?.onChanged?.(() => void refresh()) ?? null
})
onUnmounted(() => unsubscribeDisplays?.())
</script>

<template>
  <div class="output-selector">
    <p class="output-selector__hint">{{ t('settings.outputs.hint') }}</p>
    <ul class="output-selector__list">
      <li v-for="out in outputs" :key="out.id" class="output-selector__item">
        <i
          class="ti"
          :class="out.kind === 'cable' ? 'ti-device-desktop' : 'ti-device-tv'"
          aria-hidden="true"
        />
        <div class="output-selector__meta">
          <span class="output-selector__label">{{ out.label }}</span>
          <span class="output-selector__detail" :class="{ 'is-off': !out.online }">
            {{ out.detail }}
          </span>
        </div>
        <select
          v-if="mode === 'assign'"
          class="output-selector__select"
          :value="out.module"
          :aria-label="t('settings.outputs.assign', { output: out.label })"
          @change="onAssign(out.id, ($event.target as HTMLSelectElement).value as OutputModule || null)"
        >
          <option v-for="opt in MODULE_OPTIONS" :key="String(opt.value)" :value="opt.value">
            {{ t(opt.labelKey) }}
          </option>
        </select>
        <input
          v-else
          type="checkbox"
          :checked="picked.has(out.id)"
          :aria-label="out.label"
          @change="onPick(out.id, ($event.target as HTMLInputElement).checked)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.output-selector {
  &__hint {
    font-size: 0.8rem;
    opacity: 0.7;
    margin: 0 0 0.75rem;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.75rem;
    background: color-mix(in srgb, #fff 6%, transparent);

    .ti {
      font-size: 1.25rem;
      opacity: 0.85;
    }
  }

  &__meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__label {
    font-weight: 600;
  }

  &__detail {
    font-size: 0.75rem;
    opacity: 0.6;

    &.is-off {
      opacity: 0.4;
    }
  }

  &__select {
    padding: 0.35rem 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid color-mix(in srgb, #fff 20%, transparent);
    background: color-mix(in srgb, #fff 8%, transparent);
    color: inherit;
    font-size: 0.8rem;

    /* option nativa pega fundo do SO (branco) — texto claro ficaria
       ilegível. Cores explícitas garantem contraste em qualquer tema. */
    option {
      background: #1c2433;
      color: #fff;
    }
  }
}
</style>

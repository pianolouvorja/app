import {
  formatDisplayResolution,
  identifySystemDisplays,
  listExtendedDisplays,
  listSystemDisplays,
} from '@modules/settings/services/display-service'
import {
  loadProjectionSettings,
  reconcileTargetDisplays,
  saveProjectionSettings,
  toggleTargetDisplay,
} from '@modules/settings/services/projection-preferences'
import type { SystemDisplay } from '@modules/settings/types/projection'
import { getDesktopBridge } from '@shared/services/desktop-bridge'
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

export type MonitorTargetOption = {
  id: number
  index: number
  label: string
  resolutionLabel: string
  isPrimary: boolean
  isSelected: boolean
}

export type UseMonitorTargetSelectOptions = {
  /** Se true, sincroniza com projection.settings. */
  persist?: boolean
  /** Só monitores estendidos (não primários). Default true. */
  extendedOnly?: boolean
  /** IDs controlados externamente (v-model). */
  modelValue?: Ref<number[] | undefined> | (() => number[] | undefined)
  onUpdate?: (ids: number[]) => void
}

function readModel(
  modelValue: UseMonitorTargetSelectOptions['modelValue'],
): number[] | undefined {
  if (!modelValue) return undefined
  return typeof modelValue === 'function' ? modelValue() : modelValue.value
}

function sameIds(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

export function useMonitorTargetSelect(options: UseMonitorTargetSelectOptions = {}) {
  const persist = options.persist !== false
  const extendedOnly = options.extendedOnly !== false

  const displays = ref<SystemDisplay[]>([])
  const selectedIds = ref<number[]>([])
  const loading = ref(false)
  const identifying = ref(false)
  const open = ref(false)

  let applyingRemote = false
  let unsubscribeTargets: (() => void) | undefined

  const optionsList = computed<MonitorTargetOption[]>(() => {
    const all = displays.value
    const source = extendedOnly
      ? listExtendedDisplays(all)
      : all

    return source.map((display) => {
      // Mesmo número do overlay "Identificar monitores" (índice na lista completa).
      const globalIndex = all.findIndex((item) => item.id === display.id)
      const index = globalIndex >= 0 ? globalIndex + 1 : 0
      return {
        id: display.id,
        index,
        label: `Monitor ${index}`,
        resolutionLabel: formatDisplayResolution(display),
        isPrimary: display.isPrimary,
        isSelected: selectedIds.value.includes(display.id),
      }
    })
  })

  const selectedCount = computed(() => selectedIds.value.length)
  const hasDisplays = computed(() => optionsList.value.length > 0)

  function emitUpdate(ids: number[]) {
    options.onUpdate?.(ids)
  }

  function syncToMain(ids: number[]) {
    if (applyingRemote) return
    const bridge = getDesktopBridge()
    void bridge?.projection?.setSiteTargetMonitors?.(ids)
  }

  function allowedDisplayIds(nextDisplays: SystemDisplay[]): number[] {
    return (extendedOnly ? listExtendedDisplays(nextDisplays) : nextDisplays).map(
      (item) => item.id,
    )
  }

  function applySelectionFromSettings(nextDisplays: SystemDisplay[]) {
    const extendedIds = listExtendedDisplays(nextDisplays).map((item) => item.id)
    let settings = loadProjectionSettings()
    settings = reconcileTargetDisplays(settings, extendedIds)
    // Nunca persiste/seleciona o monitor principal
    settings = {
      ...settings,
      targetDisplayIds: settings.targetDisplayIds.filter((id) =>
        extendedIds.includes(id),
      ),
    }
    saveProjectionSettings(settings)
    selectedIds.value = [...settings.targetDisplayIds]
  }

  function applySelectionFromModel(ids: number[] | undefined, nextDisplays: SystemDisplay[]) {
    const allowed = new Set(allowedDisplayIds(nextDisplays))
    if (ids && ids.length > 0) {
      selectedIds.value = ids.filter((id) => allowed.has(id))
      return
    }
    if (persist) {
      applySelectionFromSettings(nextDisplays)
      return
    }
    selectedIds.value = [...allowed]
  }

  function applyRemoteIds(ids: number[]) {
    const allowed = new Set(allowedDisplayIds(displays.value))
    const next = displays.value.length
      ? ids.filter((id) => allowed.has(id))
      : [...ids]
    if (sameIds(selectedIds.value, next)) return

    applyingRemote = true
    try {
      selectedIds.value = next
      if (persist && displays.value.length) {
        const settings = loadProjectionSettings()
        const extendedIds = listExtendedDisplays(displays.value).map((item) => item.id)
        saveProjectionSettings({
          ...settings,
          targetDisplayIds: next,
          declinedDisplayIds: extendedIds.filter((id) => !next.includes(id)),
        })
      }
      emitUpdate([...next])
    } finally {
      applyingRemote = false
    }
  }

  async function refresh() {
    loading.value = true
    try {
      const next = await listSystemDisplays()
      displays.value = next
      applySelectionFromModel(readModel(options.modelValue), next)
    } finally {
      loading.value = false
    }
  }

  function setSelectedIds(ids: number[]) {
    const allowed = new Set(allowedDisplayIds(displays.value))
    const nextIds = ids.filter((id) => allowed.has(id))
    selectedIds.value = nextIds
    if (persist) {
      const settings = loadProjectionSettings()
      const extendedIds = listExtendedDisplays(displays.value).map((item) => item.id)
      const declined = extendedIds.filter((id) => !nextIds.includes(id))
      saveProjectionSettings({
        ...settings,
        targetDisplayIds: nextIds,
        declinedDisplayIds: declined,
      })
    }
    emitUpdate([...selectedIds.value])
    syncToMain([...selectedIds.value])
  }

  function toggle(displayId: number) {
    const allowed = new Set(allowedDisplayIds(displays.value))
    if (!allowed.has(displayId)) return

    if (persist) {
      const settings = toggleTargetDisplay(loadProjectionSettings(), displayId)
      const extendedIds = listExtendedDisplays(displays.value).map((item) => item.id)
      const next = {
        ...settings,
        targetDisplayIds: settings.targetDisplayIds.filter((id) =>
          extendedIds.includes(id),
        ),
      }
      saveProjectionSettings(next)
      selectedIds.value = [...next.targetDisplayIds]
      emitUpdate([...selectedIds.value])
      syncToMain([...selectedIds.value])
      return
    }

    const next = selectedIds.value.includes(displayId)
      ? selectedIds.value.filter((id) => id !== displayId)
      : [...selectedIds.value, displayId]
    setSelectedIds(next)
  }

  async function identify() {
    identifying.value = true
    try {
      await identifySystemDisplays()
    } finally {
      identifying.value = false
    }
  }

  function toggleOpen() {
    open.value = !open.value
    if (open.value) {
      void refresh()
    }
  }

  function close() {
    open.value = false
  }

  onMounted(() => {
    void refresh()
    const bridge = getDesktopBridge()
    unsubscribeTargets = bridge?.projection?.onSiteTargetsChanged?.((ids) => {
      applyRemoteIds(Array.isArray(ids) ? ids : [])
    })
  })

  onBeforeUnmount(() => {
    unsubscribeTargets?.()
  })

  watch(
    () => readModel(options.modelValue),
    (ids) => {
      if (!ids) return
      const allowed = new Set(allowedDisplayIds(displays.value))
      selectedIds.value = ids.filter((id) => allowed.has(id))
    },
  )

  return {
    displays,
    optionsList,
    selectedIds,
    selectedCount,
    hasDisplays,
    loading,
    identifying,
    open,
    refresh,
    toggle,
    setSelectedIds,
    identify,
    toggleOpen,
    close,
  }
}

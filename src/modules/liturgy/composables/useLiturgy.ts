import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { formatMomentDuration } from '../services/liturgy-item-helpers'
import { useLiturgyStore } from '../stores/useLiturgyStore'
import type { LiturgyDayKey } from '../types/liturgy'
import { useLiturgyClock } from './useLiturgyClock'

/** Orquestra a feature de liturgia na view. */
export function useLiturgy() {
  const store = useLiturgyStore()
  const router = useRouter()
  const { t } = useI18n()

  const {
    selectedDay,
    selectedCustomIndex,
    selectedItemIndex,
    customLiturgies,
    lastActionMessageKey,
    itemDialogOpen,
    editingIndex,
    itemDraft,
    customDialogOpen,
    newCustomName,
    countdownRunning,
    canStartCountdown,
    canCloneLiturgy,
    cloneDialogOpen,
    cloneSourceKey,
    cloneSources,
    deletionLocked,
    currentItems,
    currentNotes,
    currentStartTime,
    currentEndTime,
    sessionStartedAt,
    currentTitleKey,
    currentCustomTitle,
    isDraftValid,
    categoryOptions,
    complementaryTitleSuggestions,
    musicSearchQuery,
    filteredMusic,
    selectedMusic,
    musicCatalogEmpty,
  } = storeToRefs(store)

  const clock = useLiturgyClock(
    () => currentStartTime.value,
    () => currentEndTime.value,
    () => countdownRunning.value,
    () => sessionStartedAt.value,
  )

  onMounted(() => {
    void store.hydrate()
  })

  function worshipLabel(): string {
    if (selectedDay.value === 'custom' && currentCustomTitle.value) {
      return currentCustomTitle.value
    }
    const dayLabel =
      selectedDay.value === 'custom'
        ? t('liturgy.days.custom')
        : t(`liturgy.days.${selectedDay.value}`)
    return t('liturgy.worshipOf', { day: dayLabel })
  }

  const startLabels = computed(() => currentItems.value.map(() => '—'))

  const durationLabels = computed(() =>
    currentItems.value.map((item) => formatMomentDuration(item.durationMs)),
  )

  function confirmClearLiturgy() {
    if (currentItems.value.length === 0 || deletionLocked.value) return
    if (!window.confirm(t('liturgy.messages.confirmClear'))) return
    store.clearAllItems()
  }

  function confirmRemoveItem(index: number) {
    if (deletionLocked.value) return
    if (!window.confirm(t('liturgy.messages.confirmDelete'))) return
    store.removeItem(index)
  }

  function confirmRemoveCustom(index: number) {
    const name = customLiturgies.value[index]?.name ?? ''
    if (
      !window.confirm(t('liturgy.messages.confirmDeleteCustom', { name }))
    ) {
      return
    }
    store.removeCustomLiturgy(index)
  }

  function onSelectItem(index: number) {
    void store.selectItem(index, router)
  }

  function onSelectDay(day: LiturgyDayKey) {
    store.selectDay(day)
  }

  function onManageTeam() {
    window.alert(t('liturgy.team.comingSoon'))
  }

  return {
    selectedDay,
    selectedCustomIndex,
    selectedItemIndex,
    customLiturgies,
    lastActionMessageKey,
    itemDialogOpen,
    editingIndex,
    itemDraft,
    customDialogOpen,
    newCustomName,
    currentItems,
    currentNotes,
    isDraftValid,
    categoryOptions,
    complementaryTitleSuggestions,
    musicSearchQuery,
    filteredMusic,
    selectedMusic,
    musicCatalogEmpty,
    startLabels,
    durationLabels,
    worshipLabel,
    headerDateTime: clock.headerDateTime,
    remainingCountdownLabel: clock.remainingCountdownLabel,
    startTimeInput: clock.startTimeInput,
    endTimeInput: clock.endTimeInput,
    countdownExpired: clock.countdownExpired,
    countdownRunning,
    canStartCountdown,
    canCloneLiturgy,
    cloneDialogOpen,
    cloneSourceKey,
    cloneSources,
    deletionLocked,
    selectDay: onSelectDay,
    selectCustomLiturgy: store.selectCustomLiturgy,
    setSessionStartFromInput: store.setSessionStartFromInput,
    clearSessionStart: store.clearSessionStart,
    setSessionEndFromInput: store.setSessionEndFromInput,
    clearSessionEnd: store.clearSessionEnd,
    startCountdown: store.startCountdown,
    stopCountdown: store.stopCountdown,
    openAddDialog: store.openAddDialog,
    openEditDialog: store.openEditDialog,
    closeItemDialog: store.closeItemDialog,
    saveItemDraft: store.saveItemDraft,
    confirmRemoveItem,
    confirmClearLiturgy,
    reorderItems: store.reorderItems,
    selectItem: onSelectItem,
    toggleItemDone: store.toggleItemDone,
    openCustomDialog: store.openCustomDialog,
    closeCustomDialog: store.closeCustomDialog,
    createCustomLiturgy: store.createCustomLiturgy,
    confirmRemoveCustom,
    openCloneDialog: store.openCloneDialog,
    closeCloneDialog: store.closeCloneDialog,
    cloneLiturgyFromSelected: store.cloneLiturgyFromSelected,
    toggleDeletionLock: store.toggleDeletionLock,
    clearActionMessage: store.clearActionMessage,
    setNotes: store.setNotes,
    onManageTeam,
    onMusicPick: store.onMusicPick,
    clearMusicPick: store.clearMusicPick,
  }
}

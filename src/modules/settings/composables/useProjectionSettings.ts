import { storeToRefs } from 'pinia'

import { useProjectionStore } from '../stores/useProjectionStore'

/** Fachada da aba Projeção & Telas para as views/componentes. */
export function useProjectionSettings() {
  const store = useProjectionStore()
  const {
    displays,
    settings,
    isLoadingDisplays,
    isIdentifying,
    lastErrorKey,
    monitorOptions,
    extendedMonitorOptions,
    hasExtendedDisplays,
    hasCustomArrangement,
  } = storeToRefs(store)

  return {
    displays,
    settings,
    isLoadingDisplays,
    isIdentifying,
    lastErrorKey,
    monitorOptions,
    extendedMonitorOptions,
    hasExtendedDisplays,
    hasCustomArrangement,
    hydrate: store.hydrate,
    refreshDisplays: store.refreshDisplays,
    identifyMonitors: store.identifyMonitors,
    setMonitorArrangement: store.setMonitorArrangement,
    moveMonitorInArrangement: store.moveMonitorInArrangement,
    resetMonitorArrangement: store.resetMonitorArrangement,
    toggleExtendedMonitor: store.toggleExtendedMonitor,
    setOpenFullscreenOnPrimary: store.setOpenFullscreenOnPrimary,
    setDisablePrimaryWhenExtended: store.setDisablePrimaryWhenExtended,
    setAutoMinimizePlayer: store.setAutoMinimizePlayer,
    setLyricAlign: store.setLyricAlign,
    setShowSongTitle: store.setShowSongTitle,
    setCustomTextFormat: store.setCustomTextFormat,
    setCustomBackground: store.setCustomBackground,
    setFontSizePercent: store.setFontSizePercent,
    setFontColor: store.setFontColor,
    setFontWeight: store.setFontWeight,
    setBackgroundColor: store.setBackgroundColor,
    setBackgroundOpacity: store.setBackgroundOpacity,
    setBackgroundImageFromFile: store.setBackgroundImageFromFile,
    clearBackgroundImage: store.clearBackgroundImage,
    resetToDefaults: store.resetToDefaults,
  }
}

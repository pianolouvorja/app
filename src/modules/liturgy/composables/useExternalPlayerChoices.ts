import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { getDesktopBridge } from '@shared/services/desktop-bridge'

export type ExternalPlayerChoice = { id: string; label: string }

function fileName(bin: string): string {
  return bin.split(/[\\/]/).pop() || bin
}

export function useExternalPlayerChoices() {
  const { t } = useI18n()
  const globalPlayer = ref('associated')
  const playerOptions = ref<ExternalPlayerChoice[]>([])

  function labelFor(id: string, detectedLabel?: string): string {
    if (id === 'associated') {
      return t('settings.externalPlayer.player.associated')
    }
    if (id.startsWith('custom:')) {
      return t('settings.externalPlayer.player.custom', {
        name: fileName(id.slice('custom:'.length)),
      })
    }
    return detectedLabel || id
  }

  function pushOption(list: ExternalPlayerChoice[], id: string, label?: string) {
    if (!id || list.some((entry) => entry.id === id)) return
    list.push({ id, label: labelFor(id, label) })
  }

  async function loadPlayerChoices(extraIds: Array<string | undefined> = []) {
    const bridge = getDesktopBridge()
    if (!bridge?.externalPlayer) return

    try {
      globalPlayer.value = (await bridge.externalPlayer.get?.()) ?? 'associated'
    } catch {
      globalPlayer.value = 'associated'
    }

    let detected: Array<{ id: string; label: string }> = []
    let customs: string[] = []
    try {
      detected = (await bridge.externalPlayer.detect?.()) ?? []
    } catch {
      detected = []
    }
    try {
      customs = (await bridge.externalPlayer.listCustom?.()) ?? []
    } catch {
      customs = []
    }

    const options: ExternalPlayerChoice[] = []
    pushOption(options, 'associated')
    for (const player of detected) pushOption(options, player.id, player.label)
    for (const bin of customs) pushOption(options, `custom:${bin}`)
    pushOption(options, globalPlayer.value)
    for (const extra of extraIds) {
      if (extra && extra !== 'default') pushOption(options, extra)
    }
    playerOptions.value = options
  }

  function selectedPlayerId(playerId?: string): string {
    if (playerId && playerId !== 'default') return playerId
    return globalPlayer.value
  }

  function storedPlayerId(value: string): string {
    return value === globalPlayer.value ? 'default' : value
  }

  return {
    globalPlayer,
    playerOptions,
    loadPlayerChoices,
    selectedPlayerId,
    storedPlayerId,
  }
}

import { describe, expect, it } from 'vitest'

import {
  enableReturnScreen,
  normalizeProjectionSettings,
  pickDefaultReturnDisplayId,
  pruneReturnDisplay,
  reconcileTargetDisplays,
  resolveReturnMonitorId,
  resolveSelectedReturnMonitorId,
  setReturnDisplayId,
  toggleTargetDisplay,
} from '../services/projection-preferences'
import { DEFAULT_PROJECTION_SETTINGS } from '../types/projection'

const DISPLAYS = [
  { id: 1, isPrimary: true },
  { id: 2, isPrimary: false },
  { id: 3, isPrimary: false },
]

describe('projection-preferences — tela de retorno', () => {
  it('normalize lê openReturnScreen e returnDisplayId', () => {
    const settings = normalizeProjectionSettings({
      ...DEFAULT_PROJECTION_SETTINGS,
      openReturnScreen: true,
      returnDisplayId: 7,
    })
    expect(settings.openReturnScreen).toBe(true)
    expect(settings.returnDisplayId).toBe(7)
  })

  it('normalize ignora returnDisplayId inválido', () => {
    const settings = normalizeProjectionSettings({
      returnDisplayId: '2',
      openReturnScreen: 'yes',
    })
    expect(settings.returnDisplayId).toBeNull()
    expect(settings.openReturnScreen).toBe(false)
  })

  it('setReturnDisplayId não tira o monitor da audiência', () => {
    const next = setReturnDisplayId(
      {
        ...DEFAULT_PROJECTION_SETTINGS,
        targetDisplayIds: [2, 3],
        declinedDisplayIds: [],
      },
      2,
    )
    expect(next.returnDisplayId).toBe(2)
    expect(next.targetDisplayIds).toEqual([2, 3])
    expect(next.declinedDisplayIds).toEqual([])
  })

  it('toggle da audiência no monitor de retorno mantém returnDisplayId', () => {
    const next = toggleTargetDisplay(
      {
        ...DEFAULT_PROJECTION_SETTINGS,
        targetDisplayIds: [3],
        declinedDisplayIds: [2],
        returnDisplayId: 2,
        openReturnScreen: true,
      },
      2,
    )
    expect(next.targetDisplayIds).toEqual([3, 2])
    expect(next.returnDisplayId).toBe(2)
    expect(next.openReturnScreen).toBe(true)
  })

  it('reconcile também inclui o monitor de retorno na audiência', () => {
    const next = reconcileTargetDisplays(
      {
        ...DEFAULT_PROJECTION_SETTINGS,
        targetDisplayIds: [],
        declinedDisplayIds: [],
        openReturnScreen: true,
        returnDisplayId: 2,
      },
      [2, 3],
    )
    expect(next.targetDisplayIds).toEqual([2, 3])
    expect(next.returnDisplayId).toBe(2)
  })

  it('pickDefaultReturnDisplayId prefere estendido livre', () => {
    const id = pickDefaultReturnDisplayId(
      {
        ...DEFAULT_PROJECTION_SETTINGS,
        targetDisplayIds: [2],
      },
      DISPLAYS,
    )
    expect(id).toBe(3)
  })

  it('enableReturnScreen escolhe monitor quando ainda não há um', () => {
    const next = enableReturnScreen(
      { ...DEFAULT_PROJECTION_SETTINGS },
      DISPLAYS,
    )
    expect(next.openReturnScreen).toBe(true)
    expect(next.returnDisplayId).toBe(2)
  })

  it('enableReturnScreen mantém o toggle ligado se ainda não há monitores', () => {
    const next = enableReturnScreen(
      { ...DEFAULT_PROJECTION_SETTINGS },
      [],
    )
    expect(next.openReturnScreen).toBe(true)
    expect(next.returnDisplayId).toBeNull()
  })

  it('resolveReturnMonitorId só vale com toggle ligado e monitor presente', () => {
    const settings = {
      ...DEFAULT_PROJECTION_SETTINGS,
      openReturnScreen: true,
      returnDisplayId: 2,
    }
    expect(resolveReturnMonitorId(settings, [1, 2])).toBe(2)
    expect(resolveReturnMonitorId({ ...settings, openReturnScreen: false }, [1, 2])).toBeNull()
    expect(resolveReturnMonitorId(settings, [1])).toBeNull()
  })

  it('resolveSelectedReturnMonitorId some se o monitor não está marcado', () => {
    const settings = {
      ...DEFAULT_PROJECTION_SETTINGS,
      openReturnScreen: true,
      returnDisplayId: 4,
    }
    expect(resolveSelectedReturnMonitorId(settings, [1, 2, 4], [1, 2, 4])).toBe(4)
    expect(resolveSelectedReturnMonitorId(settings, [1, 2, 4], [1, 2])).toBeNull()
  })

  it('pruneReturnDisplay desliga se o monitor sumiu', () => {
    const next = pruneReturnDisplay(
      {
        ...DEFAULT_PROJECTION_SETTINGS,
        openReturnScreen: true,
        returnDisplayId: 9,
      },
      [1, 2],
    )
    expect(next.returnDisplayId).toBeNull()
    expect(next.openReturnScreen).toBe(false)
  })
})

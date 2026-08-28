import { describe, expect, it } from 'vitest'
import { planForSlot, OWNER_TO_PALCO_MODULE, type AliveFn } from '../services/output-plan'

const aliveYes: AliveFn = () => true
const aliveNo: AliveFn = () => false

describe('planForSlot (spec 2026-08-27 takeover híbrido)', () => {
  it('slot espelho (null) mostra o owner — legado #122', () => {
    const plan = planForSlot('7082', {
      owner: 'bible',
      routeOf: () => 'mirror',
      assignedOf: () => null,
      isAlive: aliveYes,
    })
    expect(plan).toEqual({ render: 'owner' })
  })

  it('takeover: rota do owner mira o slot → owner renderiza nele', () => {
    const plan = planForSlot('7082', {
      owner: 'media',
      routeOf: (m) => (m === 'hymns' ? '7082' : 'mirror'),
      assignedOf: () => 'bible',
      isAlive: aliveYes,
    })
    expect(plan).toEqual({ render: 'owner' })
  })

  it('restore: slot atribuído a bible, owner é outro sem rota pra cá → bible renderiza (runtime vivo)', () => {
    const plan = planForSlot('7082', {
      owner: 'media',
      routeOf: () => 'mirror',
      assignedOf: () => 'bible',
      isAlive: aliveYes,
    })
    expect(plan).toEqual({ render: 'assigned', module: 'bible' })
  })

  it('restore-degradado: módulo atribuído morto → idle (nunca conteúdo congelado)', () => {
    const plan = planForSlot('7082', {
      owner: 'media',
      routeOf: () => 'mirror',
      assignedOf: () => 'bible',
      isAlive: aliveNo,
    })
    expect(plan).toEqual({ render: 'idle' })
  })

  it('owner é o próprio módulo atribuído → renderiza owner (sem conflito)', () => {
    const plan = planForSlot('7082', {
      owner: 'bible',
      routeOf: () => 'mirror',
      assignedOf: () => 'bible',
      isAlive: aliveYes,
    })
    expect(plan).toEqual({ render: 'owner' })
  })

  it('takeover vence restore: owner roteado aqui mesmo com atribuição divergente', () => {
    // cenário do Rafael: tela 1 atribuída a bible; hinos pede a tela 1 → hinos assume
    const plan = planForSlot('0', {
      owner: 'media',
      routeOf: (m) => (m === 'hymns' ? '0' : 'mirror'),
      assignedOf: () => 'bible',
      isAlive: aliveYes,
    })
    expect(plan).toEqual({ render: 'owner' })
  })

  it('sem owner: slot atribuído vivo renderiza atribuído; espelho idle', () => {
    expect(
      planForSlot('0', { owner: null, routeOf: () => 'mirror', assignedOf: () => 'media', isAlive: aliveYes }),
    ).toEqual({ render: 'assigned', module: 'media' })
    expect(
      planForSlot('0', { owner: null, routeOf: () => 'mirror', assignedOf: () => null, isAlive: aliveYes }),
    ).toEqual({ render: 'idle' })
  })

  it('owner sem rota individual não vaza takeover em outro slot', () => {
    // owner roteado pro slot 0; slot 1 atribuído a bible vivo → slot 1 mostra bible
    const plan = planForSlot('7082', {
      owner: 'media',
      routeOf: (m) => (m === 'hymns' ? '0' : 'mirror'),
      assignedOf: () => 'bible',
      isAlive: aliveYes,
    })
    expect(plan).toEqual({ render: 'assigned', module: 'bible' })
  })


  it('owner com rota individual NAO vaza pro espelho (fix 27/08 bug real)', () => {
    // biblia roteada pra TV 2 (slot 7082); slot Principal (0) espelho sem atribuição
    // ANTES: regra 3 mostrava biblia no Principal também (todas as TVs).
    const plan = planForSlot('0', {
      owner: 'bible',
      routeOf: (m) => (m === 'bible' ? '7082' : 'mirror'),
      assignedOf: () => null,
      isAlive: aliveYes,
    })
    expect(plan).toEqual({ render: 'idle' })
  })

  it('owner em mirror continua espelhando em slots sem atribuição', () => {
    const plan = planForSlot('0', {
      owner: 'bible',
      routeOf: () => 'mirror',
      assignedOf: () => null,
      isAlive: aliveYes,
    })
    expect(plan).toEqual({ render: 'owner' })
  })

  it('mapeia Owner → PalcoModule corretamente', () => {
    expect(OWNER_TO_PALCO_MODULE.media).toBe('hymns')
    expect(OWNER_TO_PALCO_MODULE.bible).toBe('bible')
    expect(OWNER_TO_PALCO_MODULE.timer).toBe('timer')
    expect(OWNER_TO_PALCO_MODULE.clock).toBe('clock')
  })
})

import type { OutputModule } from './output-registry'
import type { PalcoModule } from './palco-routing'

/**
 * Plano de renderização por slot — spec takeover híbrido (2026-08-27).
 *
 * Decisão PURA (sem IO): dado owner, rotas, atribuições e vida dos módulos,
 * o que cada tela mostra. Toda mudança de estado resolvida aqui vira
 * takeover/restore automáticos — zero passo manual pro operador.
 *
 * Precedência:
 * 1. owner com rota individual pra ESTE slot → takeover (owner renderiza).
 * 2. slot com módulo atribuído e runtime vivo → renderiza o atribuído
 *    (restore: a tela "é dele"; outro módulo só a toma via regra 1).
 * 3. slot espelho → owner (legado #122).
 * 4. degradado → idle (nunca conteúdo congelado na tela).
 */

export type PlanOwner = 'media' | 'bible' | 'random' | 'timer' | 'countdown' | 'clock' | null

/** Owner do bridge → módulo Palco (projetado) e módulo do registry. */
export const OWNER_TO_PALCO_MODULE: Record<Exclude<PlanOwner, null>, PalcoModule> = {
  media: 'hymns',
  bible: 'bible',
  random: 'random',
  timer: 'timer',
  countdown: 'countdown',
  clock: 'clock',
}

export interface SlotPlanInput {
  owner: PlanOwner
  /** getPalcoRoute(module) do roteamento atual. */
  routeOf: (m: PalcoModule) => 'mirror' | string
  /** moduleForSlot(slotId) do registry. */
  assignedOf: (slotId: string) => OutputModule
  /** Módulo atribuído tem runtime vivo (conteúdo a mostrar)? */
  isAlive: (m: OutputModule) => boolean
}

export type SlotPlan =
  | { render: 'owner' }
  | { render: 'assigned'; module: OutputModule }
  | { render: 'idle' }

export function planForSlot(slotId: string, input: SlotPlanInput): SlotPlan {
  const { owner, routeOf, assignedOf, isAlive } = input

  // owner está roteado individualmente? determina o alcance dele
  const ownerRoute = owner ? routeOf(OWNER_TO_PALCO_MODULE[owner]) : null
  const ownerRoutedHere = owner !== null && ownerRoute === slotId

  // 1. takeover: owner roteado pra este slot
  if (ownerRoutedHere) return { render: 'owner' }

  const assigned = assignedOf(slotId)

  // 2. restore: atribuição vence em slots não-tomados (owner sendo o
  // próprio módulo atribuído é o mesmo conteúdo — explícito p/ clareza)
  if (assigned !== null && isAlive(assigned)) {
    if (owner && OWNER_TO_PALCO_MODULE[owner] === assigned) return { render: 'owner' }
    return { render: 'assigned', module: assigned }
  }

  // 3. espelho legado — SÓ quando o owner está em mirror. Owner com rota
  // individual NÃO vaza pros espelhos: as demais telas não são dele.
  if (assigned === null && owner && ownerRoute === 'mirror') return { render: 'owner' }

  // 4. degradado
  return { render: 'idle' }
}

/** Roteamento de cast por módulo — mirror (todas TVs) ou slot individual.
 * Persistência local. Paridade conceitual com PalcoOrchestrator APK:
 * áudio continua tendo uma única TV alvo; conteúdos podem divergir por tela.
 */

export type PalcoRoute = 'mirror' | string // string = slotId (ex.: '0', '7082')
export type PalcoModule = 'bible' | 'hymns' | 'liturgy' | 'random' | 'clock' | 'timer' | 'countdown'

const KEY = 'louvorja-palco-routing-v1'
const MODULES: PalcoModule[] = ['bible', 'hymns', 'liturgy', 'random', 'clock', 'timer', 'countdown']

let routes: Record<PalcoModule, PalcoRoute> = Object.fromEntries(
  MODULES.map((module) => [module, 'mirror']),
) as Record<PalcoModule, PalcoRoute>

try {
  const raw = localStorage.getItem(KEY)
  if (raw) routes = { ...routes, ...(JSON.parse(raw) as Partial<typeof routes>) }
} catch {
  // defaults
}

export function getPalcoRoute(module: PalcoModule): PalcoRoute {
  return routes[module] ?? 'mirror'
}

export function setPalcoRoute(module: PalcoModule, route: PalcoRoute): void {
  routes[module] = route
  try { localStorage.setItem(KEY, JSON.stringify(routes)) } catch { /* ignore */ }
}

export function getPalcoRoutes(): Readonly<Record<PalcoModule, PalcoRoute>> {
  return { ...routes }
}

export function isMirrorRoute(module: PalcoModule): boolean {
  return getPalcoRoute(module) === 'mirror'
}

export { MODULES as PALCO_MODULES }

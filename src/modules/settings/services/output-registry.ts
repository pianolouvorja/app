import { ref, readonly } from 'vue'

/**
 * Registry de Saídas — spec multi-telas (2026-08-26).
 *
 * Cada destino de projeção (monitor cabheado OU slot do Palco) é uma
 * saída com conteúdo próprio. Sem configuração: tudo espelha a projeção
 * principal (comportamento legado, zero quebra).
 *
 * O registro vive na janela principal (renderer) e é consultado pelo
 * palco-bridge para rotear cada publicação ao destino certo.
 */

export type OutputKind = 'cable' | 'palco-slot'

/** Módulos que uma saída pode exibir. null = segue a projeção principal. */
export type OutputModule =
  | null // espelha a projeção principal (default)
  | 'bible'
  | 'media'
  | 'video'
  | 'pdf'
  | 'ppt'

export interface OutputTarget {
  id: string
  kind: OutputKind
  /** Monitor físico (kind='cable') — índice do display. */
  monitorId?: number
  /** Slot do Palco (kind='palco-slot'). */
  slotId?: string
  /** Label humano (ex.: 'Monitor HDMI', 'TV 2'). */
  label: string
  /** Conteúdo atribuído; null = espelha a principal. */
  module: OutputModule
  /** Conectada/ativa no momento (clients>0 no slot / monitor presente). */
  online: boolean
}

const STORAGE_KEY = 'louvorja-output-registry-v1'

const targets = ref<OutputTarget[]>([])

function load(): OutputTarget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OutputTarget[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((t) => t && typeof t.id === 'string')
  } catch {
    return []
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targets.value))
  } catch {
    /* storage cheio/indisponível — registro só em memória */
  }
}

/** Garante que as saídas conhecidas existam (merge com detectadas). */
function syncDetected(
  detected: Array<Pick<OutputTarget, 'id' | 'kind' | 'monitorId' | 'slotId' | 'label'>>,
): void {
  const saved = new Map(targets.value.map((t) => [t.id, t]))
  const next: OutputTarget[] = detected.map((d) => {
    const prev = saved.get(d.id)
    return {
      ...d,
      // atribuição persistida vence; saída nova nasce espelhando (null)
      module: prev?.module ?? null,
      online: true,
    }
  })
  targets.value = next
  persist()
}

function setModule(id: string, module: OutputModule): void {
  const t = targets.value.find((x) => x.id === id)
  if (!t || t.module === module) return
  t.module = module
  persist()
}

function moduleForSlot(slotId: string): OutputModule {
  const t = targets.value.find((x) => x.kind === 'palco-slot' && x.slotId === slotId)
  return t?.module ?? null
}

function moduleForMonitor(monitorId: number): OutputModule {
  const t = targets.value.find((x) => x.kind === 'cable' && x.monitorId === monitorId)
  return t?.module ?? null
}

/** Reseta tudo para espelho (util em "Redefinir"). */
function resetAll(): void {
  targets.value = targets.value.map((t) => ({ ...t, module: null }))
  persist()
}

// hidrata na carga do módulo
targets.value = load()

export function useOutputRegistry() {
  return {
    targets: readonly(targets),
    syncDetected,
    setModule,
    moduleForSlot,
    moduleForMonitor,
    resetAll,
  }
}

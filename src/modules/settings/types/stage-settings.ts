/**
 * Personalização do Palco — modelo UNIFICADO (paridade com o APK).
 *
 * Fonte da verdade: APK `StageSettings`
 * (lib/core/services/dlna/stage_slide_painter.dart + stage_settings_repository.dart).
 * As chaves do JSON são EXATAMENTE as mesmas do APK (bg/fg/size/weight/...)
 * para permitir sync futuro via pacote .louvorja sem conversão.
 */

/**
 * Escopos de módulo com personalização de Palco. Derivados DINAMICAMENTE
 * das views de projeção existentes (glob em src/modules, padrão
 * "views/XptoProjectionView.vue") — módulo novo com projeção entra
 * sozinho na lista de abas.
 *
 * Mapeamento nome-da-view → scope:
 *   MediaProjectionView → hymns (projeção de hinos/mídia)
 *   LiturgyWebProjectionView → liturgy
 *   <X>ProjectionView → <x> (bible, timer, random, clock, countdown…)
 */
const projectionViewModules = import.meta.glob('/src/modules/*/views/*ProjectionView.vue')

function viewNameToScope(fileName: string): string | null {
  const m = fileName.match(/^(\w+)ProjectionView\.vue$/)
  if (!m) return null
  const name = m[1]
  if (name === 'Media') return 'hymns'
  if (name === 'LiturgyWeb') return 'liturgy'
  return name.charAt(0).toLowerCase() + name.slice(1)
}

/** Scopes descobertos (ordenados), sem duplicatas. */
export const STAGE_MODULE_SCOPES: readonly string[] = [
  ...new Set(
    Object.keys(projectionViewModules)
      .map((p) => viewNameToScope(p.split('/').pop() ?? ''))
      .filter((s): s is string => Boolean(s)),
  ),
].sort()

export type StageModuleScope = (typeof STAGE_MODULE_SCOPES)[number]

export type StageAlign = 'left' | 'center' | 'right'
export type StageVerticalAlign = 'top' | 'middle' | 'bottom'

/** Peso da fonte do texto principal (mesmos passos do APK). */
export type StageFontWeight = 400 | 600 | 800

export type StageSettings = {
  backgroundColor: string
  textColor: string
  fontSize: number // px @1920 (60–160)
  fontWeight: StageFontWeight
  margin: number
  textShadow: boolean
  shadowBlur: number // vh (0.5–5)
  shadowIntensity: number // 0–1
  textBox: boolean
  boxOpacity: number // 0.1–0.9
  boxBorder: boolean
  textAlign: StageAlign
  textVerticalAlign: StageVerticalAlign
  footerRefColor: string
  footerRefWeight: number
  showBibleVersion: boolean
  bibleFontSize: number // px @1920 (50–140)
  bibleFontWeight: 400 | 500 | 700
  bibleTextColor: string
  /** Data URL da imagem de fundo do escopo (1 ativa por escopo). */
  backgroundImage: string | null
}

export const DEFAULT_STAGE_SETTINGS: StageSettings = {
  backgroundColor: '#0A0E1A',
  textColor: '#FFFFFF',
  fontSize: 96,
  fontWeight: 600,
  margin: 120,
  textShadow: true,
  shadowBlur: 2.2,
  shadowIntensity: 0.8,
  textBox: false,
  boxOpacity: 0.45,
  boxBorder: true,
  textAlign: 'center',
  textVerticalAlign: 'middle',
  footerRefColor: '#FCCE02',
  footerRefWeight: 600,
  showBibleVersion: true,
  bibleFontSize: 84,
  bibleFontWeight: 500,
  bibleTextColor: '#FFFFFF',
  backgroundImage: null,
}

/** Presets de fundo — mesmos do APK. */
export const STAGE_BG_PRESETS = [
  { color: '#0A0E1A', label: 'Azul-noite' },
  { color: '#000000', label: 'Preto' },
  { color: '#1B2A1F', label: 'Verde-pastoral' },
  { color: '#2A1B1B', label: 'Vinho' },
] as const

/**
 * Backgrounds oficiais — mesmos assets do casting DLNA do APK
 * (src/assets/backgrounds), servidos em /backgrounds no web.
 * A lista é DINÂMICA: qualquer bg-*.png novo em public/backgrounds
 * entra automaticamente na galeria (sem hardcode).
 * backgroundImage = null → cor; `official:bg-01` → asset oficial.
 */
const officialBgModules = import.meta.glob('../../../assets/backgrounds/bg-*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** IDs dos bgs oficiais (ex.: 'bg-01'), ordenados. */
export const STAGE_OFFICIAL_BACKGROUNDS: readonly string[] = Object.keys(officialBgModules)
  .map((path) => path.match(/(bg-[\w-]+)\.png$/)?.[1])
  .filter((id): id is string => Boolean(id))
  .sort()

/** Prefixo que marca um bg oficial (vs dataURL do usuário). */
export const OFFICIAL_BG_PREFIX = 'official:'

/** URL pública de um bg oficial (hash de build via import.meta.glob). */
export function officialBgUrl(id: string): string {
  return officialBgModules[`../../../assets/backgrounds/${id}.png`] ?? `/backgrounds/${id}.png`
}

/** Resolve o backgroundImage salvo para URL usável em <img>/CSS. */
export function resolveBackgroundImage(backgroundImage: string | null): string | null {
  if (!backgroundImage) return null
  if (backgroundImage.startsWith(OFFICIAL_BG_PREFIX)) {
    return officialBgUrl(backgroundImage.slice(OFFICIAL_BG_PREFIX.length))
  }
  return backgroundImage
}

/** Presets de cor do texto — mesmos do APK. */
export const STAGE_FG_PRESETS = [
  { color: '#FFFFFF', label: 'Branco' },
  { color: '#FFE9A8', label: 'Amarelo suave' },
  { color: '#B8E0FF', label: 'Azul claro' },
] as const

/** Cores da referência da Bíblia (rodapé) — mesmas do APK. */
export const STAGE_REF_PRESETS = [
  { color: '#FCCE02', label: 'Dourado' },
  { color: '#FFFFFF', label: 'Branco' },
  { color: '#00C1E6', label: 'Ciano' },
  { color: '#FFE9A8', label: 'Amarelo suave' },
] as const

const WEIGHTS: StageFontWeight[] = [400, 600, 800]
const BIBLE_WEIGHTS: StageSettings['bibleFontWeight'][] = [400, 500, 700]

function asColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Parse do JSON no formato do APK. Chaves idênticas às do
 * StageSettingsRepository (bg/fg/size/weight/tsOn/tsBlur/tsInt/boxOn/
 * boxBg/boxBorder/tAlign/tVAlign/refColor/refWeight/showVer/bSize/
 * bWeight/bFg). O background (dataURL no web) vai em `bgImg`.
 */
export function parseStageSettings(raw: unknown): StageSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STAGE_SETTINGS }
  const s = raw as Record<string, unknown>
  const weight = asNumber(s['weight'], 600) as StageFontWeight
  const bibleWeight = asNumber(s['bWeight'], 500) as StageSettings['bibleFontWeight']
  return {
    backgroundColor: asColor(s['bg'], DEFAULT_STAGE_SETTINGS.backgroundColor),
    textColor: asColor(s['fg'], DEFAULT_STAGE_SETTINGS.textColor),
    fontSize: clamp(asNumber(s['size'], 96), 60, 160),
    fontWeight: WEIGHTS.includes(weight) ? weight : 600,
    margin: clamp(asNumber(s['margin'], 120), 0, 480),
    textShadow: typeof s['tsOn'] === 'boolean' ? s['tsOn'] : true,
    shadowBlur: clamp(asNumber(s['tsBlur'], 2.2), 0.5, 5),
    shadowIntensity: clamp(asNumber(s['tsInt'], 0.8), 0.2, 1),
    textBox: typeof s['boxOn'] === 'boolean' ? s['boxOn'] : false,
    boxOpacity: clamp(asNumber(s['boxBg'], 0.45), 0.1, 0.9),
    boxBorder: typeof s['boxBorder'] === 'boolean' ? s['boxBorder'] : true,
    textAlign: s['tAlign'] === 'left' || s['tAlign'] === 'right' ? s['tAlign'] : 'center',
    textVerticalAlign:
      s['tVAlign'] === 'top' || s['tVAlign'] === 'bottom' ? s['tVAlign'] : 'middle',
    footerRefColor: asColor(s['refColor'], DEFAULT_STAGE_SETTINGS.footerRefColor),
    footerRefWeight: clamp(Math.round(asNumber(s['refWeight'], 600)), 100, 900),
    showBibleVersion: typeof s['showVer'] === 'boolean' ? s['showVer'] : true,
    bibleFontSize: clamp(asNumber(s['bSize'], 84), 50, 140),
    bibleFontWeight: BIBLE_WEIGHTS.includes(bibleWeight) ? bibleWeight : 500,
    bibleTextColor: asColor(s['bFg'], DEFAULT_STAGE_SETTINGS.bibleTextColor),
    backgroundImage:
      typeof s['bgImg'] === 'string' &&
      (s['bgImg'].startsWith('data:') || s['bgImg'].startsWith(OFFICIAL_BG_PREFIX))
        ? s['bgImg']
        : null,
  }
}

/** Serializa no formato do APK (simétrico ao parse). */
export function serializeStageSettings(s: StageSettings): Record<string, unknown> {
  return {
    bg: s.backgroundColor,
    fg: s.textColor,
    size: s.fontSize,
    weight: s.fontWeight,
    margin: s.margin,
    tsOn: s.textShadow,
    tsBlur: s.shadowBlur,
    tsInt: s.shadowIntensity,
    boxOn: s.textBox,
    boxBg: s.boxOpacity,
    boxBorder: s.boxBorder,
    tAlign: s.textAlign,
    tVAlign: s.textVerticalAlign,
    refColor: s.footerRefColor,
    refWeight: s.footerRefWeight,
    showVer: s.showBibleVersion,
    bSize: s.bibleFontSize,
    bWeight: s.bibleFontWeight,
    bFg: s.bibleTextColor,
    bgImg: s.backgroundImage,
  }
}

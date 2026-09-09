import type {
  MediaLyricSlide,
  MediaTrackRecord,
} from '../types/media'

import { loadMediaTrack } from './media-catalog'
import { resolveRemoteFileUrl } from './media-audio'

/**
 * Catálogo de músicas customizadas (Minhas Coletâneas) via API /v1/custom
 *
 * Formato de resposta do GET /v1/custom/musics/{id}:
 * { id_music, id_collection, name, lyric, auxiliary_lyric,
 *   audio_url, instrumental_url, image_url, image_position,
 *   lyrics: [{ id_lyric, lyric, aux_lyric, image_url, image_position,
 *              time, instrumental_time, show_slide, order }] }
 */

/**
 * Namespace de IDs: custom_musics.id_music e custom_collections.id_collection
 * são AUTOINCREMENT próprios (1, 2, 3...) e colidem com music_{id} do catálogo
 * oficial (1..90167). Na Central de Mídia usamos IDs deslocados:
 * - música custom = id_music + CUSTOM_MUSIC_ID_OFFSET (1.000.000+)
 * - coletânea custom = id_collection + CUSTOM_COLLECTION_ID_OFFSET (2.000.000+)
 * O dispatcher resolveMediaTrack() usa o offset para escolher o loader certo.
 */
export const CUSTOM_MUSIC_ID_OFFSET = 1_000_000
export const CUSTOM_COLLECTION_ID_OFFSET = 2_000_000

export function isCustomMusicId(musicId: number): boolean {
  return Number.isFinite(musicId) && musicId >= CUSTOM_MUSIC_ID_OFFSET
}

export function toCustomMusicId(musicId: number): number {
  return musicId + CUSTOM_MUSIC_ID_OFFSET
}

export function fromCustomMusicId(musicId: number): number {
  return musicId - CUSTOM_MUSIC_ID_OFFSET
}

export function isCustomCollectionId(collectionId: number | string): boolean {
  const n = Number(collectionId)
  return Number.isFinite(n) && n >= CUSTOM_COLLECTION_ID_OFFSET
}

export function toCustomCollectionId(collectionId: number): number {
  return collectionId + CUSTOM_COLLECTION_ID_OFFSET
}

export function fromCustomCollectionId(collectionId: number | string): number {
  return Number(collectionId) - CUSTOM_COLLECTION_ID_OFFSET
}

type CustomLyricRow = {
  lyric?: string
  aux_lyric?: string | null
  image_url?: string | null
  image_position?: string | number | null
  time?: string
  instrumental_time?: string
  show_slide?: number | string | boolean
  order?: number | string
}

type CustomMusicRow = {
  id_music?: number
  id_collection?: number
  name?: string
  lyric?: string | null
  auxiliary_lyric?: string | null
  audio_url?: string | null
  instrumental_url?: string | null
  image_url?: string | null
  image_position?: string | number | null
  duration?: number | null
  official_music_id?: number | null
  lyrics?: CustomLyricRow[]
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseShowSlide(value: unknown): boolean {
  if (value === false || value === 0 || value === '0') return false
  return true
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeTime(value: unknown): string {
  const s = asNullableString(value)
  if (!s) return '00:00:00'
  // API retorna HH:MM ou HH:MM:SS — normalizar para HH:MM:SS
  const parts = s.split(':')
  if (parts.length === 2) return `${s}:00`
  return s
}

function mapCustomLyrics(raw: CustomLyricRow[]): MediaLyricSlide[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row, index) => ({
      order: asNumber(row.order, index + 1),
      lyric: asNullableString(row.lyric) ?? '',
      auxLyric: asNullableString(row.aux_lyric),
      showSlide: parseShowSlide(row.show_slide),
      time: normalizeTime(row.time),
      instrumentalTime: normalizeTime(row.instrumental_time),
      imageUrl: asNullableString(row.image_url),
      imagePosition: row.image_position != null ? String(row.image_position) : null,
      isCover: index === 0,
    }))
    .sort((a, b) => a.order - b.order)
}

function customBaseUrl(): string {
  const base = import.meta.env.VITE_PALCO_API_URL
  if (base) return `${base.replace(/\/$/, '')}/v1/custom`
  return '/v1/custom'
}

/**
 * Formata duração da API para m:ss.
 * API pode retornar: null, segundos (number), "mm:ss" ou "hh:mm:ss".
 */
function formatDurationLabel(value: unknown): string {
  const raw = asNullableString(value)
  if (raw) {
    // Já vem formatado ("3:45" / "00:03:45") — só limpar horas vazias
    const parts = raw.split(':').map((p) => p.padStart(2, '0'))
    if (parts.length === 3 && parts[0] === '00') return parts.slice(1).join(':')
    if (parts.length >= 2) return raw
    const secs = Number(raw)
    if (Number.isFinite(secs) && secs > 0) return formatSeconds(secs)
    return '0:00'
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return formatSeconds(value)
  }
  return '0:00'
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Carrega uma música customizada pela API e mapeia para MediaTrackRecord.
 * Retorna null se a API não responder ou a música não existir.
 */
export async function loadCustomMusicTrack(
  musicId: number,
): Promise<MediaTrackRecord | null> {
  if (!Number.isFinite(musicId) || musicId <= 0) return null

  try {
    const response = await fetch(`${customBaseUrl()}/musics/${musicId}`)
    if (!response.ok) return null
    const row = (await response.json()) as CustomMusicRow
    if (!row || !row.name) return null

    // Link p/ hino oficial: delega ao catálogo oficial (letra, áudio, capa,
    // instrumental — tudo de lá). Mantém o id custom p/ fila/estado do player.
    const officialId =
      typeof row.official_music_id === 'number' && row.official_music_id > 0
        ? row.official_music_id
        : null
    if (officialId != null) {
      const official = await loadMediaTrack(officialId)
      if (official) return { ...official, id: row.id_music ?? musicId }
      return null
    }

    const lyrics = mapCustomLyrics(row.lyrics ?? [])
    // Capa: image_url da música; fallback = bg do primeiro slide que tiver imagem
    const coverUrl =
      asNullableString(row.image_url) ??
      lyrics.find((slide) => slide.imageUrl)?.imageUrl ??
      null

    return {
      id: row.id_music ?? musicId,
      name: row.name,
      durationLabel: formatDurationLabel(row.duration),
      audioUrl: asNullableString(row.audio_url),
      instrumentalUrl: asNullableString(row.instrumental_url),
      coverUrl,
      coverPosition: row.image_position != null ? String(row.image_position) : null,
      albums: [],
      categories: ['Minhas Coletâneas'],
      lyrics,
    } satisfies MediaTrackRecord
  } catch {
    return null
  }
}

/** Lista coletâneas customizadas (para a Central de Mídia). */
export type CustomCollectionSummary = {
  id: number
  name: string
  description: string | null
  coverUrl?: string | null
  musicsCount: number
}

/** Atualiza campos de uma coletânea custom (nome, descrição, cover). */
export async function updateCustomCollection(
  collectionId: number,
  patch: { name?: string; description?: string | null; cover_url?: string | null },
): Promise<CustomCollectionSummary | null> {
  try {
    const response = await fetch(`${customBaseUrl()}/collections/${collectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!response.ok) return null
    const row = (await response.json()) as {
      id_collection: number
      name: string
      description: string | null
      cover_url?: string | null
      musics_count?: number
    }
    return {
      id: row.id_collection,
      name: row.name,
      description: row.description ?? null,
      coverUrl: row.cover_url ?? null,
      musicsCount: row.musics_count ?? 0,
    }
  } catch {
    return null
  }
}

export async function listCustomCollections(): Promise<
  CustomCollectionSummary[]
> {
  try {
    const response = await fetch(`${customBaseUrl()}/collections`)
    if (!response.ok) return []
    const json = (await response.json()) as {
      data?: Array<{
        id_collection: number
        name: string
        description: string | null
        cover_url?: string | null
        musics_count?: number
      }>
    }
    return (json.data ?? []).map((row) => ({
      id: row.id_collection,
      name: row.name,
      description: row.description ?? null,
      coverUrl: row.cover_url ?? null,
      musicsCount: row.musics_count ?? 0,
    }))
  } catch {
    return []
  }
}

/** Lista músicas de uma coletânea customizada. */
export type CustomMusicSummary = {
  id: number
  name: string
  duration: number | null
  hasAudio: boolean
  hasImage: boolean
  audioUrl?: string | null
  /** Link p/ hino oficial da API (null = música própria). */
  officialMusicId?: number | null
}

/** Copia uma música custom existente (outra coletânea) pra coletânea aberta. */
export async function copyCustomMusic(
  collectionId: number,
  musicId: number,
): Promise<{ id: number } | null> {
  try {
    const response = await fetch(
      `${customBaseUrl()}/collections/${collectionId}/musics/${musicId}/copy`,
      { method: 'POST' },
    )
    if (!response.ok) return null
    const json = (await response.json()) as { id_music: number }
    return { id: json.id_music }
  } catch {
    return null
  }
}

/** Todas as músicas custom (qualquer coletânea) — p/ reutilizar no editor. */
export async function listAllCustomMusics(): Promise<
  Array<CustomMusicSummary & { collectionName?: string; collectionId?: number }>
> {
  try {
    const response = await fetch(`${customBaseUrl()}/musics`)
    if (!response.ok) return []
    const json = (await response.json()) as {
      data?: Array<{
        id_music: number
        name: string | null
        official_music_id?: number | null
        duration?: number | string | null
        audio_url?: string | null
        image_url?: string | null
        id_collection?: number
        collection_name?: string
      }>
    }
    return (json.data ?? []).map((row) => ({
      id: row.id_music,
      name: row.name ?? '',
      duration: typeof row.duration === 'string' ? null : row.duration ?? null,
      hasAudio: Boolean(row.audio_url),
      hasImage: Boolean(row.image_url),
      audioUrl: row.audio_url ?? null,
      officialMusicId: row.official_music_id ?? null,
      collectionId: row.id_collection,
      collectionName: row.collection_name,
    }))
  } catch {
    return []
  }
}

export async function listCustomMusics(
  collectionId: number,
): Promise<CustomMusicSummary[]> {
  try {
    const response = await fetch(
      `${customBaseUrl()}/collections/${collectionId}/musics`,
    )
    if (!response.ok) return []
    const json = (await response.json()) as {
      data?: Array<{
        id_music: number
        name: string
        duration: number | null
        audio_url?: string | null
        image_url?: string | null
        official_music_id?: number | null
      }>
    }
    const rows = (json.data ?? []).map((row) => ({
      id: row.id_music,
      name: row.name,
      duration: row.duration ?? null,
      hasAudio: Boolean(row.audio_url) || Boolean(row.official_music_id),
      hasImage: Boolean(row.image_url),
      audioUrl: asNullableString(row.audio_url),
      officialMusicId:
        typeof row.official_music_id === 'number' && row.official_music_id > 0
          ? row.official_music_id
          : null,
    }))
    // API não tem duração (null no banco): ler metadata do MP3 no cliente
    // (request range — só o header do arquivo). Não bloqueia a lista.
    void enrichDurations(rows)
    return rows
  } catch {
    return []
  }
}

/**
 * Preenche duration (segundos) lendo metadata do áudio em background.
 * Retorna true quando terminou (para o caller re-renderizar).
 */
export async function enrichDurations(
  rows: Array<{ duration: number | null; hasAudio: boolean; audioUrl?: string | null }>,
): Promise<boolean> {
  const CONCURRENCY = 4
  const TIMEOUT_MS = 8000
  const pending = rows.filter((row) => row.duration == null && row.hasAudio)
  if (pending.length === 0) return false
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < pending.length) {
      const row = pending[cursor++]
      const seconds = await probeAudioDuration(row.audioUrl, TIMEOUT_MS).catch(
        () => null,
      )
      if (seconds != null) row.duration = seconds
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker),
  )
  return true
}

/** Duração do arquivo de áudio via preload=metadata (request range). */
export function probeAudioDuration(
  audioUrl: string | null | undefined,
  timeoutMs: number,
): Promise<number | null> {
  return new Promise((resolve) => {
    // URLs custom (/custom/...) vêm da própria API custom (customFileUrl:
    // respeita VITE_PALCO_API_URL/proxy local). Demais paths do catálogo
    // usam a base de files remota (resolveRemoteFileUrl).
    const src = audioUrl
      ? audioUrl.startsWith('/custom/')
        ? customFileUrl(audioUrl)
        : resolveRemoteFileUrl(audioUrl)
      : null
    if (!src) {
      resolve(null)
      return
    }
    const audio = new Audio()
    audio.preload = 'metadata'
    const done = (value: number | null) => {
      clearTimeout(timer)
      audio.removeAttribute('src')
      audio.load()
      resolve(value)
    }
    const timer = setTimeout(() => done(null), timeoutMs)
    audio.addEventListener(
      'loadedmetadata',
      () =>
        done(
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : null,
        ),
      { once: true },
    )
    audio.addEventListener('error', () => done(null), { once: true })
    audio.src = src
  })
}

/** CRUD mínimo para o editor web. */
export async function createCustomCollection(
  name: string,
  description?: string,
): Promise<{ id: number } | null> {
  try {
    const response = await fetch(`${customBaseUrl()}/collections`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    if (!response.ok) return null
    const json = (await response.json()) as { id_collection: number }
    return { id: json.id_collection }
  } catch {
    return null
  }
}

export async function createCustomMusic(
  collectionId: number,
  input: { name?: string; lyric?: string; auxiliary_lyric?: string },
): Promise<{ id: number } | null> {
  try {
    const response = await fetch(
      `${customBaseUrl()}/collections/${collectionId}/musics`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      },
    )
    if (!response.ok) return null
    const json = (await response.json()) as { id_music: number }
    return { id: json.id_music }
  } catch {
    return null
  }
}

/**
 * Adiciona um hino OFICIAL da API (tabela musics) a uma coletânea custom.
 * Cria apenas um link (official_music_id) — playback/letra resolvem pelo
 * catálogo oficial via resolveMediaTrack. Retorna o id custom criado.
 */
export async function addOfficialMusicToCollection(
  collectionId: number,
  officialMusicId: number,
  name?: string,
): Promise<{ id: number } | null> {
  try {
    const response = await fetch(
      `${customBaseUrl()}/collections/${collectionId}/musics`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // name opcional: o catálogo oficial (json_db remoto) é a fonte do nome —
        // o SQLite local pode não ter o hino.
        body: JSON.stringify({ official_music_id: officialMusicId, name }),
      },
    )
    if (!response.ok) return null
    const json = (await response.json()) as { id_music: number }
    return { id: json.id_music }
  } catch {
    return null
  }
}

export async function updateCustomMusic(
  musicId: number,
  input: {
    name?: string
    lyric?: string
    auxiliary_lyric?: string
    id_file_audio?: number | null
    id_file_image?: number | null
  },
): Promise<boolean> {
  try {
    const response = await fetch(`${customBaseUrl()}/musics/${musicId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    return response.ok
  } catch {
    return false
  }
}

/** URL absoluta para um path de arquivo servido pela API (/file/...) */
export function customFileUrl(urlPath: string): string {
  const base = import.meta.env.VITE_PALCO_API_URL
  if (base) return `${base.replace(/\/$/, '')}/file${urlPath}`
  return `/file${urlPath}`
}

/**
 * Upload de mídia extraída de .slja (áudio/imagens).
 * Retorna id_file + url relativa (/custom/...) ou null em falha.
 */
export async function uploadCustomFile(
  bytes: Uint8Array,
  filename: string,
  kind: 'audio' | 'imagens',
): Promise<{ idFile: number; url: string } | null> {
  try {
    const formData = new FormData()
    formData.append('file', new Blob([bytes as BlobPart]), filename)
    formData.append('kind', kind)
    const response = await fetch(`${customBaseUrl()}/files`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) return null
    const data = (await response.json()) as { id_file: number; url: string }
    return { idFile: data.id_file, url: data.url }
  } catch {
    return null
  }
}

export async function deleteCustomMusic(musicId: number): Promise<boolean> {
  try {
    const response = await fetch(`${customBaseUrl()}/musics/${musicId}`, {
      method: 'DELETE',
    })
    return response.ok
  } catch {
    return false
  }
}

export async function deleteCustomCollection(collectionId: number): Promise<boolean> {
  try {
    const response = await fetch(`${customBaseUrl()}/collections/${collectionId}`, {
      method: 'DELETE',
    })
    return response.ok
  } catch {
    return false
  }
}

export async function createCustomLyric(
  musicId: number,
  input: {
    lyric: string
    aux_lyric?: string
    time?: string
    order?: number
    id_file_image?: number
  },
): Promise<{ id: number } | null> {
  try {
    const response = await fetch(`${customBaseUrl()}/musics/${musicId}/lyrics`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) return null
    const json = (await response.json()) as { id_lyric: number }
    return { id: json.id_lyric }
  } catch {
    return null
  }
}

export async function updateCustomLyric(
  lyricId: number,
  input: {
    lyric?: string
    aux_lyric?: string
    time?: string
    order?: number
  },
): Promise<boolean> {
  try {
    const response = await fetch(`${customBaseUrl()}/lyrics/${lyricId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function deleteCustomLyric(lyricId: number): Promise<boolean> {
  try {
    const response = await fetch(`${customBaseUrl()}/lyrics/${lyricId}`, {
      method: 'DELETE',
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Loader composto: resolve um musicId para MediaTrackRecord consultando o
 * catálogo oficial OU a API custom (Minhas Coletâneas), conforme o namespace.
 * IDs >= 1.000.000 são custom; o restante vai ao catálogo JSON oficial.
 * Retorna null quando nenhuma fonte tem a faixa.
 */
export async function resolveMediaTrack(
  musicId: number,
): Promise<MediaTrackRecord | null> {
  if (isCustomMusicId(musicId)) {
    return loadCustomMusicTrack(fromCustomMusicId(musicId))
  }
  return loadMediaTrack(musicId)
}
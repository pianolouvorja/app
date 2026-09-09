<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import MediaSlideStage from '../components/MediaSlideStage.vue'
import {
  addOfficialMusicToCollection,
  copyCustomMusic,
  listAllCustomMusics,
} from '../services/custom-catalog'
import {
  filterAlbumMusicIndex,
  loadAlbumMusicIndex,
} from '@modules/albums/services/album-music-search'
import type { AlbumSearchHit } from '@modules/albums/types/albums'
import {
  createCustomCollection,
  createCustomLyric,
  createCustomMusic,
  customFileUrl,
  deleteCustomCollection,
  deleteCustomLyric,
  deleteCustomMusic,
  listCustomCollections,
  listCustomMusics,
  updateCustomCollection,
  updateCustomLyric,
  updateCustomMusic,
  uploadCustomFile,
} from '../services/custom-catalog'
import type { CustomCollectionSummary } from '../services/custom-catalog'
import { customApiUrl } from '../services/custom-catalog'
import { buildSlja, parseSlja } from '../../../shared/services/slja'

/**
 * Editor de letras v1 (web)
 * - Lista coletâneas customizadas (Minhas Coletâneas)
 * - Cria coletânea / música / estrofes
 * - Timing por estrofe (time) e background (image_url por estrofe)
 * v1: salvamento direto na API a cada ação (sem draft local)
 */

type EditorLyric = {
  id: number | null
  lyric: string
  time: string
  imageUrl: string
}

type EditorMusic = {
  id: number
  name: string
  lyrics: EditorLyric[]
}

const router = useRouter()
const route = useRoute()

const collections = ref<CustomCollectionSummary[]>([])
const selectedCollectionId = ref<number | null>(null)
const musics = ref<Array<{ id: number; name: string }>>([])
const selectedMusicId = ref<number | null>(null)
const musicName = ref('')
const lyrics = ref<EditorLyric[]>([])
const loading = ref(false)
const saving = ref(false)
const statusMessage = ref('')
const snackbarOpen = ref(false)

/** statusMessage + snackbar juntos (toast). */
function notify(message: string): void {
  statusMessage.value = message
  snackbarOpen.value = true
}

/** Status de erro ganha ícone/cor distintos no toast. */
const isErrorStatus = computed(() =>
  /falha|erro|indispon|não foi possível/i.test(statusMessage.value),
)

/** Progresso 0..1 da estrofe dentro do intervalo até a próxima (barra estilo /media). */
function stanzaProgress(index: number): number {
  if (index !== activeStanzaIndex.value || !isPlaying.value) return 0
  const start = timeToMs(lyrics.value[index]!.time)
  const next = lyrics.value[index + 1]
  const end = next ? timeToMs(next.time) : start + 1
  if (end <= start) return 0
  return Math.min(1, Math.max(0, (currentTimeMs.value - start) / (end - start)))
}

const newCollectionName = ref('')
const newMusicName = ref('')
/** Assets de imagem upados no último import .slja (path → url) */
const uploadedAssets = ref<Array<{ path: string; url: string; idFile: number }>>([])

const hasSelection = computed(() => selectedMusicId.value != null)

/* ---------- Aside de coletâneas colapsável ---------- */
const asideCollapsed = ref(false)

/* ---------- Painel "Letra" (estilo playlist da /media) ---------- */
const lyricPaneOpen = ref(true)

async function refreshCollections(): Promise<void> {
  loading.value = true
  try {
    collections.value = await listCustomCollections()
  } finally {
    loading.value = false
  }
}

async function onCollectionChange(): Promise<void> {
  selectedMusicId.value = null
  lyrics.value = []
  musicName.value = ''
  if (selectedCollectionId.value == null) {
    musics.value = []
    return
  }
  loading.value = true
  try {
    musics.value = await listCustomMusics(selectedCollectionId.value)
  } finally {
    loading.value = false
  }
}

async function onCreateCollection(): Promise<void> {
  const name = newCollectionName.value.trim()
  if (!name) return
  saving.value = true
  try {
    const result = await createCustomCollection(name)
    if (result) {
      newCollectionName.value = ''
      await refreshCollections()
      selectedCollectionId.value = result.id
      await onCollectionChange()
      notify('Coletânea criada')
    } else {
      notify('Falha ao criar coletânea (API indisponível?)')
    }
  } finally {
    saving.value = false
  }
}

async function onCreateMusic(): Promise<void> {
  const name = newMusicName.value.trim()
  if (!name || selectedCollectionId.value == null) return
  saving.value = true
  try {
    const result = await createCustomMusic(selectedCollectionId.value, { name })
    if (result) {
      newMusicName.value = ''
      await onCollectionChange()
      selectedMusicId.value = result.id
      musicName.value = name
      lyrics.value = []
      notify('Música criada')
    } else {
      notify('Falha ao criar música')
    }
  } finally {
    saving.value = false
  }
}

/* ---------- Adicionar hino oficial à coletânea (busca no catálogo) ---------- */

const officialSearch = ref('')
const officialSearchResults = ref<AlbumSearchHit[]>([])

function onOfficialSearchInput(): void {
  const query = officialSearch.value.trim()
  if (!query) {
    officialSearchResults.value = []
    return
  }
  void (async () => {
    const index = await loadAlbumMusicIndex()
    officialSearchResults.value = filterAlbumMusicIndex(index, query).slice(0, 8)
  })()
}

async function onAddOfficial(officialMusicId: number, name: string): Promise<void> {
  if (selectedCollectionId.value == null) return
  saving.value = true
  try {
    const result = await addOfficialMusicToCollection(selectedCollectionId.value, officialMusicId, name)
    if (result) {
      officialSearch.value = ''
      officialSearchResults.value = []
      await onCollectionChange()
      notify(`“${name}” adicionada à coletânea`)
    } else {
      notify('Falha ao adicionar hino')
    }
  } finally {
    saving.value = false
  }
}

function onAddOfficialFromSearch(): void {
  const first = officialSearchResults.value[0]
  if (first) void onAddOfficial(first.musicId, first.displayTitle || first.name)
}

/* ---------- Reutilizar música custom existente (outra coletânea) ---------- */

interface ReusableMusic {
  id: number
  name: string
  collectionName?: string
  isCurrent: boolean
}

const reuseSearch = ref('')
const reuseResults = ref<ReusableMusic[]>([])
let allCustomMusicsCache: Array<ReusableMusic & { collectionId?: number }> | null = null

function onReuseSearchInput(): void {
  const query = reuseSearch.value.trim().toLowerCase()
  if (!query) {
    reuseResults.value = []
    return
  }
  void (async () => {
    if (allCustomMusicsCache == null) {
      allCustomMusicsCache = await listAllCustomMusics()
    }
    reuseResults.value = allCustomMusicsCache
      .filter((m) => m.name.toLowerCase().includes(query))
      .slice(0, 8)
      .map((m) => ({
        id: m.id,
        name: m.name,
        collectionName: m.collectionName,
        isCurrent: m.collectionId === selectedCollectionId.value,
      }))
  })()
}

async function onReuseMusic(music: ReusableMusic): Promise<void> {
  if (selectedCollectionId.value == null || music.isCurrent) return
  saving.value = true
  try {
    const result = await copyCustomMusic(selectedCollectionId.value, music.id)
    if (result) {
      reuseSearch.value = ''
      reuseResults.value = []
      allCustomMusicsCache = null
      await onCollectionChange()
      selectedMusicId.value = result.id
      await onSelectMusic(result.id)
      notify(`“${music.name}” copiada com letra e áudio`)
    } else {
      notify('Falha ao copiar música')
    }
  } finally {
    saving.value = false
  }
}

/* ---------- Capa da coletânea (upload/remoção no editor) ---------- */

const coverInput = ref<HTMLInputElement | null>(null)

const selectedCollection = computed(
  () => collections.value.find((c) => c.id === selectedCollectionId.value) ?? null,
)

async function onCoverFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || selectedCollectionId.value == null) return
  saving.value = true
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const uploaded = await uploadCustomFile(bytes, file.name, 'imagens')
    if (!uploaded) {
      notify('Falha no upload da capa')
      return
    }
    const updated = await updateCustomCollection(selectedCollectionId.value, {
      cover_url: uploaded.url,
    })
    if (!updated) {
      notify('Falha ao salvar capa')
      return
    }
    collections.value = collections.value.map((c) =>
      c.id === selectedCollectionId.value ? updated : c,
    )
    notify('Capa atualizada')
  } finally {
    saving.value = false
  }
}

async function onRemoveCover(): Promise<void> {
  if (selectedCollectionId.value == null) return
  saving.value = true
  try {
    const updated = await updateCustomCollection(selectedCollectionId.value, {
      cover_url: null,
    })
    if (!updated) {
      notify('Falha ao remover capa')
      return
    }
    collections.value = collections.value.map((c) =>
      c.id === selectedCollectionId.value ? updated : c,
    )
    notify('Capa removida')
  } finally {
    saving.value = false
  }
}

async function onAddStanza(): Promise<void> {
  if (selectedMusicId.value == null) return
  saving.value = true
  try {
    const result = await createCustomLyric(selectedMusicId.value, {
      lyric: 'Nova estrofe',
      time: '00:00',
    })
    if (result) {
      lyrics.value.push({ id: result.id, lyric: 'Nova estrofe', time: '00:00', imageUrl: '' })
      notify('Estrofe adicionada')
    } else {
      notify('Falha ao adicionar estrofe')
    }
  } finally {
    saving.value = false
  }
}

async function onSaveStanza(index: number): Promise<void> {
  const stanza = lyrics.value[index]
  if (stanza?.id == null) return
  saving.value = true
  try {
    const ok = await updateCustomLyric(stanza.id, {
      lyric: stanza.lyric,
      time: stanza.time,
    })
    notify(ok ? 'Estrofe salva' : 'Falha ao salvar estrofe')
  } finally {
    saving.value = false
  }
}

async function onSelectMusic(id: number): Promise<void> {
  selectedMusicId.value = id
  loading.value = true
  notify('')
  try {
    const response = await fetch(customApiUrl(`/musics/${id}`))
    if (response.ok) {
      const data = (await response.json()) as {
        name: string
        audio_url?: string | null
        official_music_id?: number | null
        lyrics?: Array<{
          id_lyric: number
          lyric: string
          time: string
          image_url?: string | null
        }>
      }
      // Link p/ hino oficial: editor mostra aviso (edição de letra fica no hinário oficial)
      if (typeof data.official_music_id === 'number' && data.official_music_id > 0) {
        notify('Hino oficial vinculado — a letra/áudio são gerenciados no catálogo oficial')
      }
      musicName.value = data.name
      lyrics.value = (data.lyrics ?? []).map((row) => ({
        id: row.id_lyric,
        lyric: row.lyric,
        time: row.time ?? '00:00',
        imageUrl: row.image_url ?? '',
      }))
      loadAudioForMusic(data.audio_url ?? null)
    } else if (response.status === 404) {
      // Música não existe mais (apagada em outra sessão/coletânea):
      // limpa a seleção em vez de deixar a tela em estado quebrado.
      notify('Esta música não existe mais')
      selectedMusicId.value = null
      musicName.value = ''
      lyrics.value = []
      loadAudioForMusic(null)
      await refreshCollections()
    } else {
      notify('Falha ao carregar música')
    }
  } catch {
    notify('API indisponível')
  } finally {
    loading.value = false
  }
}

function onBack(): void {
  void router.push('/media')
}

/* ---------- Import / Export .slja ---------- */

const fileInputEl = ref<HTMLInputElement | null>(null)

function onImportSlja(): void {
  fileInputEl.value?.click()
}

async function onImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  loading.value = true
  notify('')
  try {
    const buffer = await file.arrayBuffer()
    const archive = await parseSlja(buffer)

    // Nome da música: título do arquivo .slja, mas ignora fallbacks genéricos do
    // parser (v<versao> / "Sem título") — nesses casos usa o nome do arquivo.
    const genericTitle = /^v[\d.]+$/.test(archive.title?.trim() ?? '') || !archive.title?.trim()
    const name = genericTitle
      ? file.name.replace(/\.slja$/i, '')
      : archive.title.trim()

    // Garante coletânea de importação: reaproveita a primeira "Importações .slja"
    // existente; só cria se ainda não houver nenhuma.
    let collectionId = selectedCollectionId.value
    if (collectionId == null) {
      const existing = collections.value.find((c) => c.name === 'Importações .slja')
      if (existing) {
        collectionId = existing.id
      } else {
        const created = await createCustomCollection('Importações .slja')
        if (!created) {
          notify('Falha ao criar coletânea de importação')
          return
        }
        collectionId = created.id
      }
      await refreshCollections()
      selectedCollectionId.value = collectionId
    }

    const createdMusic = await createCustomMusic(collectionId, { name })
    if (!createdMusic) {
      notify('Falha ao criar música a partir do .slja')
      return
    }
    selectedMusicId.value = createdMusic.id
    musicName.value = name
    lyrics.value = []

    // Upload de mídia embutida no .slja (áudio + imagens de fundo).
    // Falha de upload não aborta o import — segue só com texto.
    let uploadedAudio: { idFile: number; url: string } | null = null
    if (archive.audio?.bytes?.length) {
      uploadedAudio = await uploadCustomFile(
        archive.audio.bytes,
        archive.audio.name,
        'audio',
      )
      if (uploadedAudio) {
        await updateCustomMusic(createdMusic.id, { id_file_audio: uploadedAudio.idFile })
        notify(`Importado: ${file.name} (com áudio)`)
      } else {
        notify(`Importado: ${file.name} (áudio falhou no upload)`)
      }
    }
    if (archive.assets?.length) {
      const uploaded: Array<{ path: string; url: string; idFile: number }> = []
      for (const asset of archive.assets) {
        const up = await uploadCustomFile(asset.bytes, asset.path, 'imagens')
        if (up) uploaded.push({ path: asset.path, url: up.url, idFile: up.idFile })
      }
      uploadedAssets.value = uploaded
    }

    /** imageUrl → id_file, pro createCustomLyric (API espera id, não url) */
    const imageIdByUrl = new Map(uploadedAssets.value.map((a) => [a.url, a.idFile]))

    // CAPA vira estrofe 1 (se tiver texto), demais slides na ordem
    const slides = [...archive.slides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    for (const slide of slides) {
      const text = slide.lyric.trim()
      if (!text) continue
      // Background do slide: se o .slja referencia imagem, usa a URL upada
      let imageUrl = ''
      if (slide.image?.name && uploadedAssets.value.length) {
        const match = uploadedAssets.value.find((a) =>
          slide.image!.name.toLowerCase().includes(a.path.toLowerCase())
          || a.path.toLowerCase().includes(slide.image!.name.toLowerCase()),
        )
        if (match) imageUrl = match.url
      }
      const created = await createCustomLyric(createdMusic.id, {
        lyric: text,
        time: formatMsAsTime(slide.timeMs),
        id_file_image: imageIdByUrl.get(imageUrl),
      })
      if (created) {
        lyrics.value.push({
          id: created.id,
          lyric: text,
          time: formatMsAsTime(slide.timeMs),
          imageUrl,
        })
      }
    }
    if (!statusMessage.value) {
      notify(`Importado: ${slides.filter((s) => s.lyric.trim()).length} estrofes de ${file.name}`)
    }

    // Pós-import: reflete tudo na UI — sidebar da coletânea, áudio no player,
    // estrofes com timing (já populadas acima).
    await refreshCollections()
    if (selectedCollectionId.value !== collectionId) {
      selectedCollectionId.value = collectionId
    }
    musics.value = await listCustomMusics(collectionId)
    loadAudioForMusic(uploadedAudio?.url ?? null)
  } catch (error) {
    console.error('Falha ao importar .slja', error)
    notify('Arquivo .slja inválido')
  } finally {
    loading.value = false
  }
}

/** ms -> HH:MM:SS para o input[type=time] e DB.
 * SEMPRE 3 partes: "00:17" seria lido como 17 MINUTOS pelo player
 * (convenção MM:SS do .slja/DB), dessincronizando os slides. */
function formatMsAsTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

async function onExportSlja(): Promise<void> {
  if (selectedMusicId.value == null || lyrics.value.length === 0) return
  saving.value = true
  notify('')
  try {
    const slides = lyrics.value.map((stanza, index) => ({
      lyric: stanza.lyric,
      auxiliaryLyric: '',
      type: (index === 0 ? 'CAPA' : 'LETRA') as 'CAPA' | 'LETRA',
      timeMs: timeToMs(stanza.time),
      order: index + 1,
    }))
    const archive = {
      title: musicName.value || 'Sem título',
      version: 'piano-web-editor',
      slides,
    }
    const buffer = await buildSlja(archive as never)
    const blob = new Blob([buffer], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${musicName.value || 'apresentacao'}.slja`
    anchor.click()
    URL.revokeObjectURL(url)
    notify('Exportado com sucesso')
  } catch (error) {
    console.error('Falha ao exportar .slja', error)
    notify('Falha ao exportar .slja')
  } finally {
    saving.value = false
  }
}

/** HH:MM[:SS] -> ms */
function timeToMs(time: string): number {
  const parts = time.split(':').map((part) => Number.parseInt(part, 10) || 0)
  // "HH:MM:SS" (3 partes) OU "MM:SS" (2 partes, formato do .slja/DB) — nunca HH:MM
  if (parts.length === 3) return (parts[0]! * 3600 + parts[1]! * 60 + parts[2]!) * 1000
  if (parts.length === 2) return (parts[0]! * 60 + parts[1]!) * 1000
  return 0
}

/* ---------- Deleção (coletânea / música / estrofe) ---------- */

async function onDeleteCollection(): Promise<void> {
  const id = selectedCollectionId.value
  const current = collections.value.find((c) => c.id === id)
  if (id == null || !current) return
  if (!window.confirm(`Excluir a coletânea "${current.name}" e TODAS as suas músicas?`)) return
  saving.value = true
  try {
    if (await deleteCustomCollection(id)) {
      selectedMusicId.value = null
      selectedCollectionId.value = null
      lyrics.value = []
      musicName.value = ''
      await refreshCollections()
      notify(`Coletânea "${current.name}" excluída`)
    } else {
      notify('Falha ao excluir coletânea')
    }
  } finally {
    saving.value = false
  }
}

async function onDeleteMusic(): Promise<void> {
  const id = selectedMusicId.value
  if (id == null) return
  if (!window.confirm(`Excluir a música "${musicName.value}"?`)) return
  saving.value = true
  try {
    if (await deleteCustomMusic(id)) {
      selectedMusicId.value = null
      lyrics.value = []
      musicName.value = ''
      await refreshMusics()
      notify('Música excluída')
    } else {
      notify('Falha ao excluir música')
    }
  } finally {
    saving.value = false
  }
}

async function onDeleteStanza(index: number): Promise<void> {
  const stanza = lyrics.value[index]
  if (!stanza) return
  if (!window.confirm('Excluir esta estrofe?')) return
  saving.value = true
  try {
    if (stanza.id != null && !(await deleteCustomLyric(stanza.id))) {
      notify('Falha ao excluir estrofe')
      return
    }
    lyrics.value.splice(index, 1)
    notify('Estrofe excluída')
  } finally {
    saving.value = false
  }
}

/* ---------- Player de áudio + sync manual ---------- */

const audioEl = ref<HTMLAudioElement | null>(null)
const audioUrl = ref<string | null>(null)
const audioSrc = ref<string | null>(null)
const isPlaying = ref(false)
const currentTimeMs = ref(0)
const activeStanzaIndex = ref(-1)

/** Índice da estrofe ativa no tempo atual (última com time <= currentTime). */
const computedActiveIndex = computed(() => {
  let active = -1
  for (let i = 0; i < lyrics.value.length; i++) {
    if (timeToMs(lyrics.value[i]!.time) <= currentTimeMs.value) active = i
    else break
  }
  return active
})

function syncStanzaHighlight(): void {
  activeStanzaIndex.value =
    activeStanzaIndexOverride.value !== null
      ? activeStanzaIndexOverride.value
      : computedActiveIndex.value
}

/** Override manual: marcar estrofe no momento do play (botão "Marcar aqui") */
const activeStanzaIndexOverride = ref<number | null>(null)

function timeLabelOf(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function onAudioPlay(): void {
  isPlaying.value = true
}

function onAudioPause(): void {
  isPlaying.value = false
  // Auto-fill: ao pausar, o instante atual vira o timing da estrofe ativa
  // (o usuário pausa no momento certo e digita/ajusta a letra).
  const idx = activeStanzaIndexOverride.value ?? computedActiveIndex.value
  const stanza = lyrics.value[idx]
  if (stanza) {
    stanza.time = timeLabelOf(currentTimeMs.value)
    void onSaveStanza(idx)
  }
}

function onAudioTimeUpdate(): void {
  const el = audioEl.value
  if (!el) return
  currentTimeMs.value = el.currentTime * 1000
  syncStanzaHighlight()
}

/** Marca o timing da estrofe com o instante atual do áudio (sync manual) */
async function onMarkStanzaTime(index: number): Promise<void> {
  const stanza = lyrics.value[index]
  if (!stanza) return
  stanza.time = timeLabelOf(currentTimeMs.value)
  await onSaveStanza(index)
}

/** Salta o áudio pro instante da estrofe */
function onSeekToStanza(index: number): void {
  const el = audioEl.value
  const stanza = lyrics.value[index]
  if (!el || !stanza) return
  el.currentTime = timeToMs(stanza.time) / 1000
  activeStanzaIndexOverride.value = index
  syncStanzaHighlight()
}

/** Slide em exibição: estrofe ativa (override manual > timing do áudio > 1ª). */
const activeStanza = computed(() => {
  const idx =
    activeStanzaIndexOverride.value ??
    (activeStanzaIndex.value >= 0
      ? activeStanzaIndex.value
      : lyrics.value.length > 0
        ? 0
        : -1)
  return lyrics.value[idx] ?? null
})

/** Carrega o áudio vinculado à música (audio_url da API) */
function loadAudioForMusic(audioPath: string | null): void {
  audioSrc.value = audioPath ? customFileUrl(audioPath) : null
  audioUrl.value = audioPath
  currentTimeMs.value = 0
  activeStanzaIndex.value = -1
  activeStanzaIndexOverride.value = null
}

onMounted(async () => {
  // Query params vindos da Central de Mídia (?collection=ID&new=1|import=1)
  const collectionParam = route.query.collection
  if (collectionParam) {
    const id = Number(collectionParam)
    if (!Number.isNaN(id)) {
      selectedCollectionId.value = id
      // Carrega as músicas da coletânea pré-selecionada
      await onCollectionChange()
    }
  }
  await refreshCollections()
  // Se refreshCollections não trouxe a coletânea (id inválido), limpa
  if (
    selectedCollectionId.value != null &&
    !collections.value.some((c) => c.id === selectedCollectionId.value)
  ) {
    selectedCollectionId.value = null
    musics.value = []
  }
  if (route.query.new === '1') {
    newMusicName.value = ''
    document.querySelector<HTMLInputElement>('[data-testid="new-music-input"]')?.focus()
  } else if (route.query.import === '1') {
    onImportSlja()
  }
})
</script>

<template>
  <section class="editor">
    <header class="editor__toolbar">
      <button
        type="button"
        class="editor__btn"
        @click="onBack"
      >
        <i
          class="ti ti-arrow-left"
          aria-hidden="true"
        />
        Voltar
      </button>
      <h1 class="editor__title">
        Editor de Letras
      </h1>
      <input
        ref="fileInputEl"
        type="file"
        accept=".slja"
        class="editor__file-input"
        @change="onImportFile"
      >
      <button
        type="button"
        class="editor__btn"
        title="Importar arquivo .slja (LouvorJA Delphi)"
        @click="onImportSlja"
      >
        <i
          class="ti ti-file-import"
          aria-hidden="true"
        />
        Importar .slja
      </button>
      <button
        type="button"
        class="editor__btn"
        :disabled="!hasSelection || lyrics.length === 0"
        title="Exportar música atual como .slja"
        @click="onExportSlja"
      >
        <i
          class="ti ti-file-export"
          aria-hidden="true"
        />
        Exportar .slja
      </button>
    </header>

    <v-snackbar
      v-model="snackbarOpen"
      :timeout="2600"
      location="top right"
      variant="text"
      class="editor__snackbar"
      :content-class="'editor__snackbar-content'"
    >
      <div class="editor__toast">
        <i
          class="editor__toast-icon"
          :class="isErrorStatus ? 'ti-alert-circle' : 'ti-circle-check'"
          aria-hidden="true"
        />
        <span class="editor__toast-text">{{ statusMessage }}</span>
      </div>
    </v-snackbar>

    <div class="editor__body" :class="{ 'editor__body--aside-collapsed': asideCollapsed }">
      <button
        type="button"
        class="editor__aside-toggle"
        :title="asideCollapsed ? 'Mostrar coletâneas' : 'Ocultar coletâneas'"
        @click="asideCollapsed = !asideCollapsed"
      >
        <i
          class="ti"
          :class="asideCollapsed ? 'ti-chevron-right' : 'ti-chevron-left'"
          aria-hidden="true"
        />
      </button>
      <aside
        class="editor__aside"
        :class="{ 'editor__aside--collapsed': asideCollapsed }"
        v-show="!asideCollapsed"
      >
        <h2 class="editor__section-title">
          Coletâneas
        </h2>
        <!-- Capa da coletânea selecionada (upload/remoção) -->
        <div
          v-if="selectedCollection"
          class="editor__cover"
        >
          <button
            type="button"
            class="editor__cover-thumb"
            :class="{ 'editor__cover-thumb--empty': !selectedCollection.coverUrl }"
            :style="selectedCollection.coverUrl
              ? { backgroundImage: `url(${customFileUrl(selectedCollection.coverUrl)})` }
              : undefined"
            title="Alterar capa da coletânea"
            @click="coverInput?.click()"
          >
            <i
              v-if="!selectedCollection.coverUrl"
              class="ti ti-camera"
              aria-hidden="true"
            />
          </button>
          <button
            v-if="selectedCollection.coverUrl"
            type="button"
            class="editor__btn editor__btn--danger editor__btn--icon"
            title="Remover capa"
            @click="onRemoveCover"
          >
            <i
              class="ti ti-trash"
              aria-hidden="true"
            />
          </button>
          <input
            ref="coverInput"
            type="file"
            accept="image/*"
            class="editor__file-input"
            aria-label="Alterar capa da coletânea"
            @change="onCoverFile"
          >
        </div>
        <div class="editor__row">
          <input
            v-model="newCollectionName"
            type="text"
            class="editor__input"
            placeholder="Nova coletânea…"
            @keyup.enter="onCreateCollection"
          >
          <button
            type="button"
            class="editor__btn"
            :disabled="saving || !newCollectionName.trim()"
            @click="onCreateCollection"
          >
            <i
              class="ti ti-plus"
              aria-hidden="true"
            />
          </button>
        </div>
        <ul class="editor__list">
          <li
            v-for="collection in collections"
            :key="collection.id"
          >
            <button
              type="button"
              class="editor__list-item"
              :class="{ 'editor__list-item--active': collection.id === selectedCollectionId }"
              @click="selectedCollectionId = collection.id; onCollectionChange()"
            >
              {{ collection.name }}
              <span class="editor__count">{{ collection.musicsCount }}</span>
            </button>
          </li>
        </ul>
        <button
          v-if="selectedCollectionId != null"
          type="button"
          class="editor__btn editor__btn--danger"
          :disabled="saving"
          title="Excluir coletânea selecionada"
          @click="onDeleteCollection"
        >
          <i
            class="ti ti-trash"
            aria-hidden="true"
          />
          Excluir coletânea
        </button>
        <p
          v-if="!loading && collections.length === 0"
          class="editor__hint"
        >
          Nenhuma coletânea ainda. Crie a primeira acima.
        </p>

        <template v-if="selectedCollectionId != null">
          <h2 class="editor__section-title">
            Músicas
          </h2>
          <div class="editor__row">
            <input
              v-model="newMusicName"
              type="text"
              class="editor__input"
              placeholder="Nova música…"
              @keyup.enter="onCreateMusic"
            >
            <button
              type="button"
              class="editor__btn"
              :disabled="saving || !newMusicName.trim()"
              @click="onCreateMusic"
            >
              <i
                class="ti ti-plus"
                aria-hidden="true"
              />
            </button>
          </div>

          <!-- Reutilizar música custom já criada/importada (copia com letra e áudio) -->
          <div class="editor__add-official">
            <input
              v-model="reuseSearch"
              type="text"
              class="editor__input"
              placeholder="Reutilizar música existente…"
              @input="onReuseSearchInput"
            >
            <ul
              v-if="reuseResults.length > 0"
              class="editor__list editor__list--search"
            >
              <li
                v-for="music in reuseResults"
                :key="`reuse-${music.id}`"
              >
                <button
                  type="button"
                  class="editor__list-item editor__list-item--search"
                  :disabled="saving || music.isCurrent"
                  :title="music.isCurrent
                    ? 'Já está nesta coletânea'
                    : `Copiar “${music.name}” (com letra e áudio) para esta coletânea`"
                  @click="onReuseMusic(music)"
                >
                  <i
                    class="ti ti-copy"
                    aria-hidden="true"
                  />
                  <span class="editor__list-item-text">
                    {{ music.name }}
                    <small
                      v-if="music.collectionName"
                      class="editor__list-item-sub"
                    >em {{ music.collectionName }}</small>
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <!-- Adicionar hino OFICIAL da API à coletânea (busca no catálogo) -->
          <div class="editor__add-official">
            <div class="editor__row">
              <input
                v-model="officialSearch"
                type="text"
                class="editor__input"
                placeholder="Buscar hino oficial (nº ou nome)…"
                @input="onOfficialSearchInput"
                @keyup.enter="onAddOfficialFromSearch"
              >
              <button
                type="button"
                class="editor__btn"
                :disabled="saving || officialSearchResults.length === 0"
                title="Adicionar 1º resultado"
                @click="onAddOfficialFromSearch"
              >
                <i
                  class="ti ti-plus"
                  aria-hidden="true"
                />
              </button>
            </div>
            <ul
              v-if="officialSearchResults.length > 0"
              class="editor__list editor__list--search"
            >
              <li
                v-for="result in officialSearchResults"
                :key="result.musicId"
              >
                <button
                  type="button"
                  class="editor__list-item editor__list-item--search"
                  :disabled="saving"
                  :title="`Adicionar “${result.name}” à coletânea`"
                  @click="onAddOfficial(result.musicId, result.displayTitle || result.name)"
                >
                  <i
                    class="ti ti-plus"
                    aria-hidden="true"
                  />
                  <span class="editor__list-search-num">{{ result.track ?? '' }}</span>
                  {{ result.name }}
                </button>
              </li>
            </ul>
          </div>

          <ul class="editor__list">
            <li
              v-for="music in musics"
              :key="music.id"
            >
              <button
                type="button"
                class="editor__list-item"
                :class="{ 'editor__list-item--active': music.id === selectedMusicId }"
                @click="onSelectMusic(music.id)"
              >
                <i
                  v-if="music.officialMusicId"
                  class="ti ti-book editor__official-badge"
                  title="Hino oficial (gerenciado no catálogo)"
                  aria-hidden="true"
                />
                {{ music.name }}
              </button>
            </li>
          </ul>
          <button
            v-if="selectedMusicId != null"
            type="button"
            class="editor__btn editor__btn--danger"
            :disabled="saving"
            title="Excluir música selecionada"
            @click="onDeleteMusic"
          >
            <i
              class="ti ti-trash"
              aria-hidden="true"
            />
            Excluir música
          </button>
        </template>
      </aside>

      <div class="editor__main">
        <template v-if="hasSelection">
          <div class="editor__music-head">
            <h2 class="editor__section-title">
              {{ musicName || 'Música' }}
            </h2>
          </div>

          <!-- Faixa superior: slide com player INTEGRADO (hover), mesmo tamanho da /media -->
          <div class="editor__stage-row">
            <div class="editor__stage-left">
              <!-- Preview estilo /media: MediaSlideStage REAL (mesma estética do player) -->
              <div
                v-if="activeStanza"
                class="editor__preview editor__preview--with-player"
                :class="{ 'is-playing': isPlaying }"
              >
                <MediaSlideStage
                  :lyric="activeStanza.lyric"
                  :title="musicName || ''"
                  :image-url="activeStanza.imageUrl ? customFileUrl(activeStanza.imageUrl) : null"
                  :is-cover="false"
                />
                <!-- Player embutido: aparece no hover, igual player da /media -->
                <div
                  v-if="audioSrc"
                  class="editor__player"
                >
                  <span class="editor__player-time">{{ timeLabelOf(currentTimeMs) }}</span>
                  <audio
                    ref="audioEl"
                    class="editor__audio"
                    controls
                    :src="audioSrc"
                    preload="metadata"
                    @play="onAudioPlay"
                    @pause="onAudioPause"
                    @timeupdate="onAudioTimeUpdate"
                  />
                </div>
              </div>
              <div
                v-else
                class="editor__preview editor__preview--empty"
              >
                <i
                  class="ti ti-movie"
                  aria-hidden="true"
                />
                <span>Adicione a 1ª estrofe para ver o slide aqui</span>
              </div>

              <p
                v-if="!audioSrc && activeStanza"
                class="editor__hint editor__hint--compact"
              >
                Esta música não tem áudio vinculado. Importe um .slja com áudio ou o áudio
                ficará disponível na próxima importação.
              </p>
            </div>
          </div>

          <!-- Estrofes na MESMA visão: tocar, marcar, adicionar — tudo junto -->
          <ul
            class="editor__stanzas"
          >
            <li
              v-for="(stanza, index) in lyrics"
              :key="stanza.id ?? index"
              class="editor__stanza"
              :class="{ 'editor__stanza--active': index === activeStanzaIndex && isPlaying }"
            >
              <div class="editor__stanza-head">
                <span class="editor__stanza-index">#{{ index + 1 }}</span>
                <label class="editor__time-label">
                  Timing
                  <input
                    v-model="stanza.time"
                    type="time"
                    class="editor__input editor__input--time"
                    step="1"
                  >
                </label>
                <button
                  v-if="audioSrc"
                  type="button"
                  class="editor__btn editor__btn--mark"
                  :disabled="saving || !isPlaying"
                  title="Marcar o instante atual do áudio como timing desta estrofe"
                  @click="onMarkStanzaTime(index)"
                >
                  <i
                    class="ti ti-point-filled"
                    aria-hidden="true"
                  />
                  Marcar
                </button>
                <button
                  type="button"
                  class="editor__btn editor__btn--save"
                  :disabled="saving"
                  @click="onSaveStanza(index)"
                >
                  <i
                    class="ti ti-device-floppy"
                    aria-hidden="true"
                  />
                  Salvar
                </button>
                <button
                  type="button"
                  class="editor__btn editor__btn--danger editor__btn--icon"
                  :disabled="saving"
                  title="Excluir estrofe"
                  @click="onDeleteStanza(index)"
                >
                  <i
                    class="ti ti-trash"
                    aria-hidden="true"
                  />
                </button>
              </div>
              <textarea
                v-model="stanza.lyric"
                class="editor__textarea"
                rows="4"
                placeholder="Letra da estrofe…"
                @dblclick="onSeekToStanza(index)"
              />
              <div class="editor__stanza-media">
                <div
                  class="editor__stanza-thumb"
                  :style="
                    stanza.imageUrl
                      ? { backgroundImage: `url(${customFileUrl(stanza.imageUrl)})` }
                      : undefined
                  "
                  aria-hidden="true"
                >
                  <i
                    v-if="!stanza.imageUrl"
                    class="ti ti-photo"
                  />
                </div>
                <label class="editor__bg-label">
                  Background (URL da imagem)
                  <input
                    v-model="stanza.imageUrl"
                    type="url"
                    class="editor__input"
                    placeholder="https://…/imagem.jpg"
                  >
                </label>
              </div>
            </li>
          </ul>
          <button
            type="button"
            class="editor__btn editor__btn--add"
            :disabled="saving"
            @click="onAddStanza"
          >
            <i
              class="ti ti-plus"
              aria-hidden="true"
            />
            Nova estrofe
          </button>
        </template>
        <p
          v-else
          class="editor__empty"
        >
          Selecione uma música à esquerda para editar as estrofes, timing e background.
        </p>
      </div>

      <!-- Painel "Letra" (estilo playlist da /media): a letra PRONTA, é ela que anda -->
      <aside
        v-if="hasSelection && lyricPaneOpen"
        class="editor__lyric-pane"
      >
        <div class="editor__lyric-pane-head">
          <h2 class="editor__lyric-pane-title">Letra</h2>
          <button
            type="button"
            class="editor__lyric-pane-toggle"
            title="Ocultar letra"
            @click="lyricPaneOpen = false"
          >
            <i
              class="ti ti-chevron-right"
              aria-hidden="true"
            />
          </button>
        </div>
        <ul class="editor__lyric-list">
          <li
            v-for="(stanza, index) in lyrics"
            :key="`lp-${stanza.id ?? index}`"
          >
            <button
              type="button"
              class="editor__lyric-item"
              :class="{ 'editor__lyric-item--active': index === activeStanzaIndex && isPlaying }"
              :style="{ '--slide-progress': stanzaProgress(index) }"
              @click="onSeekToStanza(index)"
            >
              <span class="editor__lyric-index">{{ index + 1 }}</span>
              <span class="editor__lyric-text">{{ stanza.lyric }}</span>
            </button>
          </li>
        </ul>
      </aside>
      <button
        v-else-if="hasSelection"
        type="button"
        class="editor__lyric-pane-toggle editor__lyric-pane-toggle--floating"
        title="Mostrar letra"
        @click="lyricPaneOpen = true"
      >
        <i
          class="ti ti-chevron-left"
          aria-hidden="true"
        />
      </button>
    </div>
  </section>
</template>

<style scoped>
/*
 * Tokens do design system (docs/stitch/home/DESIGN.md · docs/prd/DESIGN_SYSTEM.md)
 * Vars injetadas pelo useThemeManager: --ds-color-*, --ds-radius-*, --ds-blur-*, --ds-motion-*.
 * Linguagem de marca: raios assimétricos (top-left/bottom-right arredondados),
 * superfícies de vidro (color-mix + blur) e primary #2196f3.
 */
.editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: var(--ds-spacing-4, 1rem);
  gap: var(--ds-spacing-4, 1rem);
}

.editor__toolbar {
  display: flex;
  align-items: center;
  gap: var(--ds-spacing-3, 0.75rem);
}

.editor__title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ds-color-on-surface);
  margin: 0;
  flex: 1;
}

/* Toast do editor — linguagem de vidro do design system (docs/prd/DESIGN_SYSTEM.md) */
.editor__snackbar-content {
  /* mata o fundo/chpadding padrão do VSnackbar (variant=text) */
  background: transparent !important;
  box-shadow: none !important;
}

.editor__toast {
  display: flex;
  align-items: center;
  gap: var(--ds-spacing-3, 12px);
  max-width: 380px;
  padding: var(--ds-spacing-3, 12px) var(--ds-spacing-4, 16px);
  border-radius: var(--ds-radius-md, 12px 0 12px 0);
  border: 1px solid var(--ds-color-outline-strong);
  background: color-mix(in srgb, var(--ds-color-surface-elevated) 82%, transparent);
  backdrop-filter: blur(var(--ds-blur-default, 16px));
  -webkit-backdrop-filter: blur(var(--ds-blur-default, 16px));
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
  color: var(--ds-color-on-surface);
  font-family: var(--ds-font-family);
  font-size: 0.85rem;
  line-height: 1.4;
}

.editor__toast-icon {
  flex-shrink: 0;
  font-size: 1.15rem;
  color: var(--ds-color-primary);
}

.editor__toast:has(.ti-alert-circle) .editor__toast-icon {
  color: #ef5350;
}

.editor__toast-text {
  min-width: 0;
}

/* Painel "Letra" — espelho da playlist da /media: é a LETRA que anda, estrofes fixas */
.editor__lyric-pane {
  width: 17rem;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto;
  background: rgb(12 12 12 / 0.92);
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: var(--ds-radius-lg, 16px 0 16px 0);
  padding: 1rem 0.75rem;
}

.editor__lyric-pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.editor__lyric-pane-title {
  margin: 0;
  padding: 0 0.4rem;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.55);
}

.editor__lyric-pane-toggle {
  width: 1.6rem;
  height: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgb(255 255 255 / 0.45);
  cursor: pointer;

  &:hover {
    background: rgb(255 255 255 / 0.08);
    color: #fff;
  }
}

.editor__lyric-pane-toggle--floating {
  align-self: flex-start;
  width: 1.8rem;
  height: 2.4rem;
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: 10px 0 10px 0;
  background: color-mix(in srgb, var(--ds-color-surface-card) 60%, transparent);
}

.editor__lyric-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.editor__lyric-item {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  border: none;
  border-radius: 0.65rem 0 0.65rem 0;
  padding: 0.55rem 0.5rem;
  background: transparent;
  color: #fff;
  text-align: left;
  cursor: pointer;

  /* Barra de progresso da estrofe ativa — igual playlist da /media */
  &::before {
    content: '';
    position: absolute;
    z-index: -1;
    inset: 0;
    border-radius: inherit;
    background: color-mix(
      in srgb,
      var(--ds-color-primary, #2196f3) 34%,
      transparent
    );
    transform: scaleX(var(--slide-progress, 0));
    transform-origin: left center;
    transition: transform 180ms linear;
    pointer-events: none;
  }

  &:hover {
    background: rgb(255 255 255 / 0.06);
  }

  &--active {
    background: rgb(255 255 255 / 0.055);
  }
}

.editor__lyric-index {
  flex-shrink: 0;
  width: 1.5rem;
  font-size: 0.75rem;
  opacity: 0.65;
  font-variant-numeric: tabular-nums;
}

.editor__lyric-text {
  font-size: 0.82rem;
  line-height: 1.35;
  white-space: pre-line;
  word-break: break-word;
}

.editor__file-input {
  display: none;
}

.editor__body {
  display: flex;
  gap: var(--ds-spacing-4, 1rem);
  flex: 1;
  min-height: 0;
}

/* Toggle de colapso do aside (fina, lateral) */
.editor__aside-toggle {
  flex-shrink: 0;
  align-self: flex-start;
  width: 1.4rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: 0 10px 10px 0;
  background: color-mix(in srgb, var(--ds-color-surface-card) 60%, transparent);
  color: var(--ds-color-on-surface-variant);
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 150ms ease;

  &:hover {
    opacity: 1;
    color: var(--ds-color-primary);
  }
}

.editor__aside {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  overflow-y: auto;
  padding: var(--ds-spacing-4, 16px);
  border-radius: var(--ds-radius-lg, 16px 0 16px 0);
  background: color-mix(
    in srgb,
    var(--ds-color-surface-card) var(--ds-glass-fill, 72%),
    transparent
  );
  border: 1px solid var(--ds-color-outline-strong);
  backdrop-filter: blur(var(--ds-blur-active, 16px)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--ds-blur-active, 16px)) saturate(140%);
}

.editor__main {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  padding: var(--ds-spacing-5, 20px);
  border-radius: var(--ds-radius-lg, 16px 0 16px 0);
  background: color-mix(
    in srgb,
    var(--ds-color-surface-card) var(--ds-glass-fill, 72%),
    transparent
  );
  border: 1px solid var(--ds-color-outline-strong);
  backdrop-filter: blur(var(--ds-blur-active, 16px)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--ds-blur-active, 16px)) saturate(140%);
}

.editor__section-title {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--ds-color-on-surface-variant);
  margin: 0.75rem 0 0.375rem;
}

.editor__row {
  display: flex;
  gap: 0.375rem;
}

.editor__input {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: var(--ds-radius-sm, 8px 0 8px 0);
  background: color-mix(in srgb, var(--ds-color-surface) 55%, transparent);
  color: var(--ds-color-on-surface);
  font: inherit;
  transition:
    border-color var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease),
    box-shadow var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease);
}

.editor__input:focus {
  outline: none;
  border-color: var(--ds-color-primary);
  box-shadow: 0 0 0 1px
    color-mix(in srgb, var(--ds-color-primary) 45%, transparent);
}

.editor__input--time {
  flex: 0 0 auto;
  width: 7.5rem;
}

.editor__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: var(--ds-radius-sm, 8px 0 8px 0);
  background: color-mix(
    in srgb,
    var(--ds-color-surface-container-high) 40%,
    transparent
  );
  color: var(--ds-color-on-surface);
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  transition:
    background-color var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease),
    border-color var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease),
    color var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease);
}

.editor__btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--ds-color-primary) 55%, transparent);
  background: color-mix(in srgb, var(--ds-color-primary) 10%, transparent);
}

.editor__btn:focus-visible {
  outline: 2px solid var(--ds-color-primary);
  outline-offset: 2px;
}

.editor__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.editor__btn--save {
  margin-left: auto;
}

.editor__btn--add {
  margin-top: 0.75rem;
}

.editor__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.editor__list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: 1px solid transparent;
  border-radius: var(--ds-radius-sm, 8px 0 8px 0);
  background: transparent;
  color: var(--ds-color-on-surface);
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  text-align: left;
  transition:
    background-color var(--ds-motion-duration, 160ms) var(--ds-motion-easing, ease),
    border-color var(--ds-motion-duration, 160ms) var(--ds-motion-easing, ease);
}

.editor__list-item:hover {
  background: color-mix(in srgb, var(--ds-color-on-surface) 7%, transparent);
}

.editor__list-item--active {
  background: color-mix(in srgb, var(--ds-color-primary) 14%, transparent);
  border-color: color-mix(in srgb, var(--ds-color-primary) 45%, transparent);
  font-weight: 600;
}

.editor__count {
  font-size: 0.75rem;
  color: var(--ds-color-on-surface-variant);
}

.editor__hint,
.editor__empty {
  font-size: 0.875rem;
  color: var(--ds-color-on-surface-variant);
}

.editor__stanzas {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.editor__stanza {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem;
  background: color-mix(in srgb, var(--ds-color-surface) 45%, transparent);
  border: 1px solid var(--ds-color-outline);
  border-radius: var(--ds-radius-md, 12px 0 12px 0);
  transition:
    border-color var(--ds-motion-duration, 160ms) var(--ds-motion-easing, ease),
    background-color var(--ds-motion-duration, 160ms) var(--ds-motion-easing, ease),
    box-shadow var(--ds-motion-duration, 160ms) var(--ds-motion-easing, ease);
}

.editor__stanza--active {
  border-color: color-mix(in srgb, var(--ds-color-primary) 70%, transparent);
  background: color-mix(in srgb, var(--ds-color-primary) 9%, transparent);
  box-shadow: 0 0 0 1px
    color-mix(in srgb, var(--ds-color-primary) 55%, transparent);
}

.editor__stanza-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.editor__stanza-index {
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--ds-color-primary-soft);
  min-width: 2.5rem;
}

.editor__time-label,
.editor__bg-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--ds-color-on-surface-variant);
}

/* Thumb do background ao lado da estrofe (editor) */
.editor__stanza-media {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.editor__stanza-thumb {
  flex: 0 0 96px;
  height: 54px;
  border-radius: var(--ds-radius-sm, 8px);
  background-size: cover;
  background-position: center;
  background-color: color-mix(in srgb, var(--ds-color-surface) 60%, transparent);
  border: 1px solid var(--ds-color-outline);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--ds-color-on-surface-variant);
}

@media (max-width: 900px) {
  .editor__stanza-media {
    flex-direction: column;
    align-items: stretch;
  }
  .editor__stanza-thumb {
    flex: none;
    height: 80px;
  }
}

.editor__bg-label {
  flex-direction: column;
  align-items: stretch;
}

.editor__textarea {
  width: 100%;
  min-height: 80px;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: var(--ds-radius-sm, 8px 0 8px 0);
  background: color-mix(in srgb, var(--ds-color-surface) 55%, transparent);
  color: var(--ds-color-on-surface);
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  transition:
    border-color var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease),
    box-shadow var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease);
}

.editor__textarea:focus {
  outline: none;
  border-color: var(--ds-color-primary);
  box-shadow: 0 0 0 1px
    color-mix(in srgb, var(--ds-color-primary) 45%, transparent);
}

@media (max-width: 768px) {
  .editor__body {
    flex-direction: column;
  }

  .editor__aside {
    width: 100%;
  }
}

.editor__music-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.editor__player-time {
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  color: var(--ds-color-on-surface-variant);
  font-family: monospace;
}

.editor__audio {
  /* flex-basis 0 colapsa <audio> (replaced element sem largura intrínseca
     nessa cadeia de grid) — fix: sem flex-grow, largura 100% do player */
  flex: 0 0 auto;
  width: 100%;
  height: 36px;
}

.editor__btn--active {
  background: var(--ds-color-primary);
  color: var(--ds-color-on-primary);
  border-color: var(--ds-color-primary);
  font-weight: 600;
}

.editor__btn--danger {
  background: color-mix(in srgb, #ef4444 14%, transparent);
  color: #f87171;
  border-color: color-mix(in srgb, #ef4444 35%, transparent);
}
.editor__btn--danger:hover:not(:disabled) {
  background: color-mix(in srgb, #ef4444 24%, transparent);
  border-color: color-mix(in srgb, #ef4444 55%, transparent);
}

.editor__btn--mark {
  background: color-mix(in srgb, var(--ds-color-primary) 13%, transparent);
  color: var(--ds-color-primary-soft);
  border-color: color-mix(in srgb, var(--ds-color-primary) 35%, transparent);
}
.editor__btn--mark:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ds-color-primary) 24%, transparent);
  border-color: color-mix(in srgb, var(--ds-color-primary) 55%, transparent);
}
.editor__btn--mark:disabled {
  opacity: 0.4;
}

.editor__btn--icon {
  padding: 0.35rem 0.5rem;
  line-height: 1;
}

.editor__bg-label input {
  padding: 0.4rem 0.55rem;
  background: color-mix(in srgb, var(--ds-color-surface) 55%, transparent);
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: var(--ds-radius-sm, 8px 0 8px 0);
  color: var(--ds-color-on-surface);
  font-size: 0.8rem;
  transition:
    border-color var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease),
    box-shadow var(--ds-motion-duration, 200ms) var(--ds-motion-easing, ease);
}

.editor__bg-label input:focus {
  outline: none;
  border-color: var(--ds-color-primary);
  box-shadow: 0 0 0 1px
    color-mix(in srgb, var(--ds-color-primary) 45%, transparent);
}

.editor__preview {
  position: relative;
  /* 16:9 como a /media — o slide é vídeo, não estica com o container */
  aspect-ratio: 16 / 9;
  width: 100%;
  border-radius: var(--ds-radius-lg, 16px 0 16px 0);
  border: 1px solid var(--ds-color-outline-strong);
  overflow: hidden;
}

/* Faixa topo: slide + player embutido em coluna (como /media) */
.editor__hint--compact {
  font-size: 0.8rem;
  opacity: 0.75;
  margin: 0;
  line-height: 1.4;
}

.editor__stage-row {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;
}

.editor__stage-left {
  min-width: 0;
}

.editor__preview--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgb(255 255 255 / 0.03);
  color: var(--ds-color-on-surface-variant, rgb(255 255 255 / 0.55));
  font-size: 0.9rem;

  > i {
    font-size: 2rem;
    opacity: 0.5;
  }
}

/* Slide com player integrado: player sobrepõe a base, aparece no hover
   ou enquanto toca (mesmo comportamento do player da /media) */
.editor__preview--with-player {
  position: relative;
}

.editor__preview--with-player > .editor__player {
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 2;
  margin: 0;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 180ms ease, transform 180ms ease;
  pointer-events: none;
}

.editor__preview--with-player:hover > .editor__player,
.editor__preview--with-player:focus-within > .editor__player,
.editor__preview--with-player.is-playing > .editor__player {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* Player-pill sob o slide: tempo à esquerda + áudio esticando (como /media) */
.editor__player {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.875rem;
  background: rgb(12 12 12 / 0.92);
  border: 1px solid var(--ds-color-outline-strong);
  border-radius: var(--ds-radius-full, 9999px);
}

.editor__player-time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  color: var(--ds-color-on-surface-variant);
}

/* MediaSlideStage preenche o container do preview (estética idêntica à /media) */
.editor__preview :deep(.media-slide-stage) {
  width: 100%;
  height: 100%;
}

/* Busca de hino oficial */
.editor__cover {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.editor__cover-thumb {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border: 1px dashed var(--ds-color-outline, rgb(255 255 255 / 0.25));
  border-radius: var(--ds-radius-md, 10px 0 10px 0);
  background-size: cover;
  background-position: center;
  background-color: rgb(255 255 255 / 0.04);
  color: rgb(255 255 255 / 0.55);
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 150ms ease, opacity 150ms ease;

  &:hover {
    border-color: var(--ds-color-primary, #2196f3);
    opacity: 0.9;
  }
}

.editor__cover-thumb--empty {
  border-style: dashed;
}

.editor__add-official {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.editor__list--search {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--ds-color-outline, rgb(255 255 255 / 0.12));
  border-radius: var(--ds-radius-md, 10px 0 10px 0);
  padding: 0.25rem;
}

.editor__list-item--search {
  justify-content: flex-start;
  text-align: left;
  gap: 0.4rem;
  font-size: 0.82rem;
}

.editor__list-item-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.editor__list-item-sub {
  opacity: 0.55;
  font-size: 0.72rem;
}

.editor__list-search-num {
  flex-shrink: 0;
  min-width: 1.6rem;
  text-align: right;
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
}

.editor__official-badge {
  flex-shrink: 0;
  margin-right: 0.3rem;
  color: var(--ds-color-primary, #2196f3);
  opacity: 0.85;
}
</style>

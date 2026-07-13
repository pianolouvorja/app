import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { obfuscateText } from './crypto.mjs'
import { getWorkspacePaths } from './paths.mjs'

/**
 * @typedef {{ text: string, progress: number }} ExtractProgress
 * @typedef {(data: ExtractProgress) => void} ProgressCallback
 */

/**
 * Extrai o SQLite temporário para registros JSON ofuscados em `.sysdata`.
 * Usa `node:sqlite` (sem addon nativo).
 */
export class CatalogExtractor {
  /**
   * @param {string} dbPath
   */
  constructor(dbPath) {
    this.dbPath = dbPath
    this.sysdataDir = getWorkspacePaths().sysdata
  }

  /**
   * @param {ProgressCallback} [progressCallback]
   */
  async extract(progressCallback = () => {}) {
    if (!existsSync(this.dbPath)) {
      throw new Error(`Arquivo de banco não encontrado: ${this.dbPath}`)
    }

    mkdirSync(this.sysdataDir, { recursive: true })
    const db = new DatabaseSync(this.dbPath, { readOnly: true })

    try {
      progressCallback({ text: 'Extraindo categorias...', progress: 10 })
      this.extractCategories(db)

      progressCallback({ text: 'Extraindo álbuns...', progress: 20 })
      this.extractAlbumsAndMusics(db, progressCallback)

      progressCallback({ text: 'Extraindo hinários...', progress: 60 })
      this.extractHymnals(db)

      progressCallback({ text: 'Extraindo Bíblias...', progress: 70 })
      this.extractBibles(db, progressCallback)

      progressCallback({ text: 'Extração concluída', progress: 100 })
    } finally {
      db.close()
    }
  }

  /**
   * @param {string} filename
   * @param {unknown} data
   */
  saveJson(filename, data) {
    const filePath = path.join(this.sysdataDir, `${filename}.bin`)
    const encryptedContent = obfuscateText(JSON.stringify(data))
    if (encryptedContent) {
      writeFileSync(filePath, encryptedContent, 'utf8')
    }
  }

  /**
   * @param {import('node:sqlite').DatabaseSync} db
   */
  extractCategories(db) {
    const categoriesRows = db
      .prepare(`SELECT * FROM categories WHERE id_language = 'pt' ORDER BY \`order\` ASC`)
      .all()

    const categories = []

    for (const cat of categoriesRows) {
      const albumsRows = db
        .prepare(
          `
        SELECT ca.id_album, a.name, a.color, f.dir, f.file_name, ca.name as subtitle, ca.\`order\`
        FROM categories_albums ca
        JOIN albums a ON ca.id_album = a.id_album
        LEFT JOIN files f ON a.id_file_image = f.id_file
        WHERE ca.id_category = ?
        ORDER BY ca.\`order\` ASC
      `,
        )
        .all(cat.id_category)

      const albums = albumsRows.map((row) => ({
        id_album: row.id_album,
        name: row.name,
        color: row.color,
        url_image: row.dir && row.file_name ? `${row.dir}/${row.file_name}` : null,
        subtitle: row.subtitle || '',
        order: row.order,
      }))

      categories.push({
        id_category: cat.id_category,
        name: cat.name,
        slug: cat.slug,
        order: cat.order,
        albums: albums.length > 0 ? albums : undefined,
      })
    }

    this.saveJson('pt_categories', categories)
  }

  /**
   * @param {import('node:sqlite').DatabaseSync} db
   * @param {ProgressCallback} progressCallback
   */
  extractAlbumsAndMusics(db, progressCallback) {
    const albums = db
      .prepare(
        `
      SELECT a.id_album, a.name, a.color, f.dir, f.file_name
      FROM albums a
      LEFT JOIN files f ON a.id_file_image = f.id_file
      WHERE a.id_language = 'pt'
    `,
      )
      .all()

    let processedAlbums = 0
    const totalAlbums = albums.length || 1

    for (const album of albums) {
      const categoriesRows = db
        .prepare(
          `
        SELECT c.slug, c.id_category
        FROM categories_albums ca
        JOIN categories c ON ca.id_category = c.id_category
        WHERE ca.id_album = ?
      `,
        )
        .all(album.id_album)

      const categoriesSlugs = categoriesRows.map((c) => c.slug)

      const albumJson = {
        id_album: album.id_album,
        name: album.name,
        color: album.color || '',
        url_image: album.dir && album.file_name ? `${album.dir}/${album.file_name}` : null,
        categories: categoriesSlugs.length > 0 ? categoriesSlugs : undefined,
        musics: [],
      }

      const musicsRows = db
        .prepare(
          `
        SELECT m.id_music, m.name, am.track,
          fm.duration as duration,
          fim.duration as instrumental_duration,
          fm.dir as m_dir, fm.file_name as m_file,
          fim.dir as im_dir, fim.file_name as im_file,
          fi.dir as i_dir, fi.file_name as i_file
        FROM albums_musics am
        JOIN musics m ON am.id_music = m.id_music
        LEFT JOIN files fm ON m.id_file_music = fm.id_file
        LEFT JOIN files fim ON m.id_file_instrumental_music = fim.id_file
        LEFT JOIN files fi ON m.id_file_image = fi.id_file
        WHERE am.id_album = ?
        ORDER BY am.track ASC
      `,
        )
        .all(album.id_album)

      for (const music of musicsRows) {
        albumJson.musics.push({
          id_music: music.id_music,
          name: music.name,
          has_instrumental_music: music.im_file ? 1 : 0,
          duration: music.duration,
          track: music.track,
        })

        const lyricsRows = db
          .prepare(
            `
          SELECT l.id_lyric, l.lyric, l.aux_lyric, l.time, l.instrumental_time, l.show_slide, l.\`order\`,
                 fl.dir, fl.file_name
          FROM lyrics l
          LEFT JOIN files fl ON l.id_file_image = fl.id_file
          WHERE l.id_music = ?
          ORDER BY l.\`order\` ASC
        `,
          )
          .all(music.id_music)

        const lyricArr = lyricsRows.map((lyric) => ({
          id_lyric: lyric.id_lyric,
          id_music: music.id_music,
          lyric: lyric.lyric,
          aux_lyric: lyric.aux_lyric,
          url_image: lyric.dir && lyric.file_name ? `${lyric.dir}/${lyric.file_name}` : null,
          image_position: null,
          time: lyric.time,
          instrumental_time: lyric.instrumental_time,
          show_slide: lyric.show_slide,
          order: lyric.order,
        }))

        const musicAlbumsRows = db
          .prepare(
            `
          SELECT am.id_album, a.name, am.track, f.dir, f.file_name, ca.\`order\`
          FROM albums_musics am
          JOIN albums a ON am.id_album = a.id_album
          LEFT JOIN files f ON a.id_file_image = f.id_file
          LEFT JOIN categories_albums ca ON ca.id_album = a.id_album
          WHERE am.id_music = ?
        `,
          )
          .all(music.id_music)

        const musicAlbums = musicAlbumsRows.map((entry) => ({
          id_album: entry.id_album,
          name: entry.name,
          track: entry.track,
          url_image: entry.dir && entry.file_name ? `${entry.dir}/${entry.file_name}` : null,
          order: entry.order || 0,
        }))

        this.saveJson(`music_${music.id_music}`, {
          id_music: music.id_music,
          name: music.name,
          duration: music.duration,
          instrumental_duration: music.instrumental_duration,
          url_image: music.i_dir && music.i_file ? `${music.i_dir}/${music.i_file}` : null,
          image_position: null,
          url_music: music.m_dir && music.m_file ? `${music.m_dir}/${music.m_file}` : null,
          url_instrumental_music:
            music.im_dir && music.im_file ? `${music.im_dir}/${music.im_file}` : null,
          lyric: lyricArr,
          albums: musicAlbums,
        })
      }

      this.saveJson(`album_${album.id_album}`, albumJson)

      processedAlbums += 1
      if (processedAlbums % 10 === 0) {
        progressCallback({
          text: 'Extraindo álbuns...',
          progress: 20 + Math.floor((processedAlbums / totalAlbums) * 40),
        })
      }
    }
  }

  /**
   * @param {import('node:sqlite').DatabaseSync} db
   */
  extractHymnals(db) {
    const getHymnalData = (albumId) => {
      const rows = db
        .prepare(
          `
        SELECT am.track, m.id_music, m.name, fim.file_name as im_file, fm.duration
        FROM albums_musics am
        JOIN musics m ON am.id_music = m.id_music
        LEFT JOIN files fm ON m.id_file_music = fm.id_file
        LEFT JOIN files fim ON m.id_file_instrumental_music = fim.id_file
        WHERE am.id_album = ?
        ORDER BY am.track ASC
      `,
        )
        .all(albumId)

      return rows.map((row) => {
        const lyrics = db
          .prepare(`SELECT lyric FROM lyrics WHERE id_music = ? ORDER BY \`order\` ASC`)
          .all(row.id_music)

        let fullLyric = ''
        for (const lyric of lyrics) {
          if (String(lyric.lyric).trim() !== '') {
            fullLyric += `${lyric.lyric} `
          }
        }

        return {
          id_music: row.id_music,
          name: row.name,
          track: row.track,
          has_instrumental_music: row.im_file ? 1 : 0,
          duration: row.duration,
          lyric: fullLyric,
        }
      })
    }

    try {
      this.saveJson('pt_hymnal', getHymnalData(712))
      this.saveJson('pt_hymnal_1996', getHymnalData(629))
    } catch (error) {
      console.warn('[catalog] hinários ignorados:', error)
    }
  }

  /**
   * @param {import('node:sqlite').DatabaseSync} db
   * @param {ProgressCallback} progressCallback
   */
  extractBibles(db, progressCallback) {
    const books = db
      .prepare(`SELECT * FROM bible_book WHERE id_language = 'pt' ORDER BY book_number ASC`)
      .all()
    this.saveJson('pt_bible_book', books)

    const versions = db.prepare(`SELECT * FROM bible_version WHERE id_language = 'pt'`).all()
    this.saveJson('pt_bible_version', versions)

    let processedChapters = 0
    const totalChapters =
      books.reduce((sum, book) => sum + Number(book.chapters || 0), 0) * (versions.length || 1) || 1

    for (const version of versions) {
      for (const book of books) {
        for (let chapter = 1; chapter <= Number(book.chapters); chapter += 1) {
          const verses = db
            .prepare(
              `
            SELECT verse, text
            FROM bible_verse
            WHERE id_bible_version = ? AND id_bible_book = ? AND chapter = ?
            ORDER BY verse ASC
          `,
            )
            .all(version.id_bible_version, book.id_bible_book, chapter)

          /** @type {Record<string, string>} */
          const versesObj = {}
          for (const verse of verses) {
            versesObj[String(verse.verse)] = String(verse.text)
          }

          this.saveJson(
            `bible_${version.id_bible_version}_${book.id_bible_book}_${chapter}`,
            versesObj,
          )

          processedChapters += 1
          if (processedChapters % 100 === 0) {
            progressCallback({
              text: 'Extraindo Bíblias...',
              progress: 70 + Math.floor((processedChapters / totalChapters) * 30),
            })
          }
        }
      }
    }
  }
}

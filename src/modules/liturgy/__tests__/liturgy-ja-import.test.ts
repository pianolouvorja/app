import { describe, expect, it } from 'vitest'

import { parseJaLiturgy } from '../services/liturgy-ja-import'

const sample = [
  '[item_20260704084840569]',
  'tipo=musica',
  'item=Momentos de louvor',
  'cor=$004F0000',
  'musica=1660',
  'subtipo=div',
  'subitem=Música Missão (Adoradores 4)',
  'checked=22/08/2026',
  '',
  '[item_20260704085317501]',
  'tipo=arquivo',
  'item=Abertura escola sabatina',
  'cor=$004F0000',
  'subtipo=arq',
  'subitem=Arquivo C:\\Users\\iasdn\\Videos\\video.mp4',
  'dir=C:\\Users\\iasdn\\Videos\\video.mp4',
  'checked=',
  '',
  '[item_20260704085517828]',
  'tipo=anotacao',
  'item=Oração',
  '',
  '[Geral]',
  '7=item_20260704084840569;item_20260704085317501;item_20260704085517828;',
  '6=item_20260704084840569_d6_i0;',
].join('\r\n')

describe('parseJaLiturgy', () => {
  it('parse completo: dias, tipos, campos', () => {
    const map = parseJaLiturgy(sample)
    expect(map.sunday).toHaveLength(3)
    const [music, file, annotation] = map.sunday!
    expect(music.type).toBe('music')
    expect(music.musicId).toBe(1660)
    expect(music.done).toBe(true)
    expect(music.accentColor).toBe('#00004F')
    expect(file.type).toBe('video')
    expect(file.filePath).toContain('video.mp4')
    expect(file.done).toBe(false)
    expect(annotation.type).toBe('annotation')
  })

  it('dedup: _d6_i0 resolve pro mesmo item', () => {
    const map = parseJaLiturgy(sample)
    expect(map.saturday).toHaveLength(1)
    expect(map.saturday![0]!.id).toBe(map.sunday![0]!.id)
  })

  it('BOM não quebra o parse', () => {
    const map = parseJaLiturgy('﻿' + sample)
    expect(map.sunday).toHaveLength(3)
  })

  it('sem [Geral] lança', () => {
    expect(() => parseJaLiturgy('[item_x]\ntipo=musica\nitem=A\n')).toThrow()
  })

  it('extensão decide tipo', () => {
    expect(
      parseJaLiturgy(sample.replaceAll('video.mp4', 'slides.pptx'))
        .sunday![1]!.type,
    ).toBe('presentation')
  })
})

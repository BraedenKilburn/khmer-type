import { describe, expect, it } from 'vitest'
import { toClusters, toRenderClusters } from '@/lib/clusters'
import { corpus } from '@/data/corpus'

describe('toClusters', () => {
  it('holds a stacked cluster whole — the case this whole fix exists for', () => {
    expect(toClusters('ស្វា')).toEqual(['ស្វា'])
  })

  it('splits សូមស្វាគមន៏! into 7 clusters', () => {
    expect(toClusters('សូមស្វាគមន៏!')).toEqual(['សូ', 'ម', 'ស្វា', 'គ', 'ម', 'ន៏', '!'])
  })

  it('holds a doubly-stacked cluster whole', () => {
    expect(toClusters('ស្ត្រី')).toEqual(['ស្ត្រី'])
  })

  it('clusters a bare consonant', () => {
    expect(toClusters('ក')).toEqual(['ក'])
  })

  it('clusters a consonant with a dependent vowel', () => {
    expect(toClusters('កូ')).toEqual(['កូ'])
  })

  it('clusters a consonant with a diacritic', () => {
    expect(toClusters('ក៏')).toEqual(['ក៏'])
  })

  it('splits mixed Khmer, Latin, and punctuation', () => {
    expect(toClusters('ក ab, ខ។')).toEqual(['ក', ' ', 'a', 'b', ',', ' ', 'ខ', '។'])
  })

  it('yields an empty array for an empty drill', () => {
    expect(toClusters('')).toEqual([])
  })

  it('keeps a trailing COENG with its base rather than dropping it', () => {
    expect(toClusters('ស្').join('')).toBe('ស្')
  })

  it.each(corpus)('round-trips every drill in the corpus: %s', (drill) => {
    expect(toClusters(drill).join('')).toBe(drill)
  })
})

describe('toRenderClusters', () => {
  const drill = 'សូមស្វាគមន៏!'

  it('marks every cluster untyped at cursor 0', () => {
    const rendered = toRenderClusters(drill, '', 0)
    expect(rendered.map((c) => c.text)).toEqual(toClusters(drill))
    expect(rendered.every((c) => c.state === 'untyped')).toBe(true)
  })

  it('marks every cluster correct once the drill is fully and correctly typed', () => {
    const rendered = toRenderClusters(drill, drill, drill.length)
    expect(rendered.every((c) => c.state === 'correct')).toBe(true)
  })

  it('never splits a cluster — the rendered text always reassembles to the drill', () => {
    for (let cursor = 0; cursor <= drill.length; cursor++) {
      const rendered = toRenderClusters(drill, drill.slice(0, cursor), cursor)
      expect(rendered.map((c) => c.text).join('')).toBe(drill)
    }
  })

  it('walks the cursor through every position and buckets each cluster', () => {
    // Cluster boundaries in code-unit offsets: សូ[0,2) ម[2,3) ស្វា[3,7) គ[7,8) ម[8,9) ន៏[9,11) ![11,12)
    const bounds = [
      [0, 2],
      [2, 3],
      [3, 7],
      [7, 8],
      [8, 9],
      [9, 11],
      [11, 12],
    ]

    for (let cursor = 0; cursor <= drill.length; cursor++) {
      const rendered = toRenderClusters(drill, drill.slice(0, cursor), cursor)

      const expected = bounds.map(([start, end]) => {
        if (cursor >= end) return 'correct'
        if (cursor > start) return 'active'
        return 'untyped'
      })

      expect(rendered.map((c) => c.state), `cursor ${cursor}`).toEqual(expected)
    }
  })

  it('keeps ស្វា active at every cursor position inside it, never split', () => {
    // ស្វា spans [3, 7). Cursors 4, 5, and 6 sit inside it.
    for (const cursor of [4, 5, 6]) {
      const rendered = toRenderClusters(drill, drill.slice(0, cursor), cursor)
      const stacked = rendered.find((c) => c.text === 'ស្វា')
      expect(stacked, `cursor ${cursor}`).toBeDefined()
      expect(stacked!.state, `cursor ${cursor}`).toBe('active')
    }
  })

  it('marks the whole stacked cluster incorrect when a keystroke inside it was wrong', () => {
    // Type through ស្វា but get the subscript consonant wrong.
    const typed = 'សូម' + 'ស្ត' + 'ា'
    const rendered = toRenderClusters(drill, typed, typed.length)
    expect(rendered.find((c) => c.text === 'ស្វា')!.state).toBe('incorrect')
  })

  it('leaves clusters before the error untouched', () => {
    const typed = 'សូម' + 'ស្ត' + 'ា'
    const rendered = toRenderClusters(drill, typed, typed.length)
    expect(rendered.slice(0, 2).map((c) => c.state)).toEqual(['correct', 'correct'])
  })

  it('yields an empty array for an empty drill', () => {
    expect(toRenderClusters('', '', 0)).toEqual([])
  })
})

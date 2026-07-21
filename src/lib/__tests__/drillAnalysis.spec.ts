import { describe, expect, it } from 'vitest'
import { analyseDrill, expectedSignAt, toClusters } from '@/lib/drillAnalysis'
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

  it('does not let a stray COENG swallow a following space', () => {
    expect(toClusters('ក្ ខ')).toEqual(['ក្', ' ', 'ខ'])
  })

  it('does not let a stray COENG swallow a following newline', () => {
    expect(toClusters('ក្\nខ')).toEqual(['ក្', '\n', 'ខ'])
  })

  it('does not let a stray COENG swallow a following Latin letter', () => {
    expect(toClusters('ក្a')).toEqual(['ក្', 'a'])
  })

  it.each(corpus.map(({ km }) => km))('round-trips every drill in the corpus: %s', (drill) => {
    expect(toClusters(drill).join('')).toBe(drill)
  })
})

describe('analyseDrill', () => {
  it('gives every cluster its text, its start, and its signs', () => {
    expect(analyseDrill('សូមស្វា').clusters).toEqual([
      { text: 'សូ', start: 0, signs: ['ស', 'ូ'] },
      { text: 'ម', start: 2, signs: ['ម'] },
      { text: 'ស្វា', start: 3, signs: ['ស', '្វ', 'ា'] },
    ])
  })

  it('runs the signs of the whole drill together, in order', () => {
    expect(analyseDrill('សូមស្វា').signs).toEqual(['ស', 'ូ', 'ម', 'ស', '្វ', 'ា'])
  })

  it('answers with the sign each keystroke is aimed at', () => {
    // ស ្វ ា — four keystrokes, three signs, and the two presses of the
    // subscript are both attempts at `្វ`.
    expect(analyseDrill('ស្វា').signAt).toEqual(['ស', '្វ', '្វ', 'ា'])
  })

  it('runs the whole drill, not one cluster', () => {
    expect(analyseDrill('សូម').signAt).toEqual(['ស', 'ូ', 'ម'])
  })

  it('is empty for an empty drill', () => {
    expect(analyseDrill('')).toEqual({ clusters: [], signs: [], signAt: [] })
  })

  it('has one signAt entry per code unit of every drill in the corpus', () => {
    // The cursor is a code-unit offset, so a gap here would misfile a keystroke.
    for (const { km } of corpus) {
      expect(analyseDrill(km).signAt).toHaveLength(km.length)
    }
  })

  it('walks a drill once and answers the same way every time after', () => {
    const first = analyseDrill('ស្វា')
    expect(analyseDrill('ស្វា')).toBe(first)
  })
})

describe('expectedSignAt', () => {
  it('names the sign under the cursor', () => {
    expect(expectedSignAt('ស្វា', 0)).toBe('ស')
    expect(expectedSignAt('ស្វា', 1)).toBe('្វ')
    expect(expectedSignAt('ស្វា', 2)).toBe('្វ')
    expect(expectedSignAt('ស្វា', 3)).toBe('ា')
  })

  it('has nothing to say past the end of the drill', () => {
    expect(expectedSignAt('ក', 1)).toBeUndefined()
  })
})

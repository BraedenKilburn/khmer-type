import { describe, expect, it } from 'vitest'
import { COENG, describeSign, displaySign, signKind, toSignProgress, toSigns } from '@/lib/signs'

describe('toSigns', () => {
  /*
   * The four rows the ticket verified against the corpus. Keystroke counts are
   * code points and are deliberately not sign counts — `ស្វា` is four presses
   * and three signs, which is the whole reason the strip exists.
   */
  it('leaves a lone consonant as one sign', () => {
    expect(toSigns('ក')).toEqual(['ក'])
  })

  it('splits a consonant and its vowel sign', () => {
    expect(toSigns('សូ')).toEqual(['ស', 'ូ'])
  })

  it('keeps COENG with the consonant it stacks', () => {
    expect(toSigns('ស្វា')).toEqual(['ស', '្វ', 'ា'])
  })

  it('splits a doubly stacked cluster into four signs', () => {
    expect(toSigns('ស្ត្រី')).toEqual(['ស', '្ត', '្រ', 'ី'])
  })

  it('records a subscript separately from the base consonant it looks like', () => {
    expect(toSigns('្ក')).toEqual(['្ក'])
    expect(toSigns('្ក')).not.toEqual(toSigns('ក'))
  })

  it('stands a COENG alone when nothing stackable follows', () => {
    expect(toSigns(`ក${COENG}`)).toEqual(['ក', COENG])
  })

  it('does not stack a vowel sign under COENG', () => {
    expect(toSigns(`${COENG}ា`)).toEqual([COENG, 'ា'])
  })

  it('yields nothing for an empty cluster', () => {
    expect(toSigns('')).toEqual([])
  })
})

describe('signKind', () => {
  it('classifies each kind the corpus contains', () => {
    expect(signKind('ក')).toBe('baseConsonant')
    expect(signKind('្ក')).toBe('subscriptConsonant')
    expect(signKind('ឥ')).toBe('independentVowel')
    expect(signKind('ា')).toBe('dependentVowel')
    expect(signKind('់')).toBe('diacritic')
    expect(signKind('០')).toBe('digit')
    expect(signKind(' ')).toBe('space')
    expect(signKind('។')).toBe('symbol')
  })

  it('calls a bare COENG a diacritic, not a subscript', () => {
    // A subscript is COENG *plus* a consonant. Alone it has stacked nothing.
    expect(signKind(COENG)).toBe('diacritic')
  })

  it('treats a Zero Width Space as a space — it is a key and a keystroke', () => {
    expect(signKind('​')).toBe('space')
  })
})

describe('displaySign', () => {
  it('gives a combining sign a dotted circle to attach to', () => {
    expect(displaySign('ា')).toBe('◌ា')
    expect(displaySign('្វ')).toBe('◌្វ')
    expect(displaySign('់')).toBe('◌់')
  })

  it('leaves a sign that stands on its own untouched', () => {
    expect(displaySign('ក')).toBe('ក')
    expect(displaySign('។')).toBe('។')
  })
})

describe('describeSign', () => {
  it('spells out the two presses a subscript takes', () => {
    expect(describeSign('្វ')).toBe(`Subscript វ — press ${COENG} then វ`)
  })

  it('explains COENG rather than showing a glyph the user cannot see', () => {
    expect(describeSign(COENG)).toBe('COENG — stacks the next consonant beneath this one')
  })

  it('names the visible signs by what they are', () => {
    expect(describeSign('ក')).toBe('Consonant ក')
    expect(describeSign('ា')).toBe('Vowel sign ◌ា')
    expect(describeSign('់')).toBe('Diacritic ◌់')
  })
})

describe('toSignProgress', () => {
  it('marks the sign under the cursor current and the rest pending', () => {
    // `ស` typed, cursor sitting on the COENG of `្វ`.
    expect(toSignProgress('ស្វា', 1).map(({ state }) => state)).toEqual([
      'done',
      'current',
      'pending',
    ])
  })

  it('keeps a subscript current between its two keystrokes', () => {
    // COENG pressed, its consonant not yet — the moment the naming is for.
    expect(toSignProgress('ស្វា', 2).map(({ state }) => state)).toEqual([
      'done',
      'current',
      'pending',
    ])
  })

  it('advances once the subscript is complete', () => {
    expect(toSignProgress('ស្វា', 3).map(({ state }) => state)).toEqual([
      'done',
      'done',
      'current',
    ])
  })

  it('marks every sign done at the end of the cluster', () => {
    expect(toSignProgress('ស្វា', 4).map(({ state }) => state)).toEqual(['done', 'done', 'done'])
  })

  it('carries the display form alongside the typed one', () => {
    expect(toSignProgress('សូ', 1)).toEqual([
      { sign: 'ស', display: 'ស', state: 'done' },
      { sign: 'ូ', display: '◌ូ', state: 'current' },
    ])
  })
})

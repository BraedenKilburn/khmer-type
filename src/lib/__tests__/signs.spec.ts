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
    expect(toSignProgress('ស្វា', 'ស').map(({ state }) => state)).toEqual([
      'done',
      'current',
      'pending',
    ])
  })

  it('keeps a subscript current between its two keystrokes', () => {
    // COENG pressed, its consonant not yet — the moment the naming is for.
    expect(toSignProgress('ស្វា', 'ស្').map(({ state }) => state)).toEqual([
      'done',
      'current',
      'pending',
    ])
  })

  it('advances once the subscript is complete', () => {
    expect(toSignProgress('ស្វា', 'ស្វ').map(({ state }) => state)).toEqual([
      'done',
      'done',
      'current',
    ])
  })

  it('marks every sign done at the end of the cluster', () => {
    expect(toSignProgress('ស្វា', 'ស្វា').map(({ state }) => state)).toEqual(['done', 'done', 'done'])
  })

  /*
   * The strip is the only place a mistake inside a cluster can surface before
   * the cluster ends — the typing line renders the cluster whole and cannot
   * mark part of it. These pin the feedback down at the keystroke it happens.
   */
  it('marks the sign a wrong keystroke landed in, immediately', () => {
    // `ស` correct, then `ត` where the subscript's COENG was wanted.
    expect(toSignProgress('ស្វា', 'សត').map(({ state }) => state)).toEqual([
      'done',
      'wrong',
      'pending',
    ])
  })

  it('blames the sign the wrong key landed in, not the cluster', () => {
    /*
     * The base consonant is wrong on the very first keystroke. The cursor has
     * moved on to the subscript, so that one is `current` — the strip reports
     * the mistake and where the next key goes at the same time.
     */
    expect(toSignProgress('ស្វា', 'ក').map(({ state }) => state)).toEqual([
      'wrong',
      'current',
      'pending',
    ])
  })

  it('catches a subscript whose consonant is wrong, on that keystroke', () => {
    // COENG landed correctly, then the wrong consonant under it. The cursor has
    // already moved on to the vowel, so that one reads as current.
    expect(toSignProgress('ស្វា', 'ស្ត').map(({ state }) => state)).toEqual([
      'done',
      'wrong',
      'current',
    ])
  })

  it('does not call a half-typed subscript wrong for being unfinished', () => {
    // COENG pressed, its consonant not yet: incomplete is not incorrect.
    expect(toSignProgress('ស្វា', 'ស្').map(({ state }) => state)).toEqual([
      'done',
      'current',
      'pending',
    ])
  })

  it('keeps an earlier mistake marked once the cursor has moved past it', () => {
    expect(toSignProgress('ស្វា', 'កូ').map(({ state }) => state)).toEqual([
      'wrong',
      'wrong',
      'pending',
    ])
  })

  it('carries the display form alongside the typed one', () => {
    expect(toSignProgress('សូ', 'ស')).toEqual([
      { sign: 'ស', display: 'ស', state: 'done' },
      { sign: 'ូ', display: '◌ូ', state: 'current' },
    ])
  })
})

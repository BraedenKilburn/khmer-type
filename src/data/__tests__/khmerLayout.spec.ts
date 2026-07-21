import { describe, expect, it } from 'vitest'
import { COENG, invisibleLabel, nidaLayout, type KeyDef } from '@/data/khmerLayout'
import { macKhmerLayout } from '@/data/macKhmerLayout'
import { keystrokeFor, LAYOUT_VARIANTS, layoutFor, type LayoutVariant } from '@/lib/layoutVariant'
import { corpus } from '@/data/corpus'

const byCode = new Map(nidaLayout.map((key) => [key.code, key]))
const key = (code: string): KeyDef => {
  const found = byCode.get(code)
  if (!found) throw new Error(`no key ${code}`)
  return found
}

/** Structural checks every variant has to pass; the tables themselves differ. */
describe.each(LAYOUT_VARIANTS.map(({ id }) => id))('the %s layout', (variant: LayoutVariant) => {
  const layout = layoutFor(variant)

  it('covers all 48 printable keys of the standard block', () => {
    expect(layout).toHaveLength(48)
  })

  it('identifies keys by KeyboardEvent.code, uniquely', () => {
    const codes = new Map(layout.map((entry) => [entry.code, entry]))
    expect(codes.size).toBe(layout.length)
    for (const { code } of layout) {
      expect(code).toMatch(
        /^(Key[A-Z]|Digit[0-9]|Backquote|Minus|Equal|Bracket(Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|Space)$/,
      )
    }
  })

  it('assigns every key to a row and a finger', () => {
    for (const { code, row, finger } of layout) {
      expect(row, code).toBeGreaterThanOrEqual(1)
      expect(row, code).toBeLessThanOrEqual(5)
      expect(finger, code).toBeTruthy()
    }
  })

  it('describes the same physical board, key for key', () => {
    expect(layout.map(({ code }) => code)).toEqual(nidaLayout.map(({ code }) => code))
  })
})

describe('nidaLayout', () => {
  // Spot checks against the sources cited in the module. These are the keys
  // where NiDA differs from Apple's near-variant, so they are exactly the
  // entries a careless re-derivation would get wrong.
  it('puts COENG on KeyJ unshifted, with ញ shifted', () => {
    expect(key('KeyJ').base).toBe(COENG)
    expect(key('KeyJ').shift).toBe('ញ')
  })

  it('puts ZWSP on Space unshifted and a plain space on Shift+Space', () => {
    expect(key('Space').base).toBe('​')
    expect(key('Space').shift).toBe(' ')
  })

  it('puts ? on Shift+Slash', () => {
    expect(key('Slash').shift).toBe('?')
  })

  it('puts ឮ unshifted and ឭ shifted on Backslash', () => {
    expect(key('Backslash').base).toBe('ឮ')
    expect(key('Backslash').shift).toBe('ឭ')
  })

  it('keeps the ligature keys, which emit two code points from one press', () => {
    expect(key('KeyA').shift).toBe('ាំ')
    expect(key('Comma').base).toBe('ុំ')
  })
})

describe('macKhmerLayout', () => {
  const mac = new Map(macKhmerLayout.map((entry) => [entry.code, entry]))
  const macKey = (code: string): KeyDef => mac.get(code)!

  /*
   * The tables are meant to disagree — see the module docblock. A change here
   * that makes one of these pass by matching NiDA has broken the point of the
   * file, not fixed a discrepancy.
   */
  it('swaps the spacebar: a plain space unshifted, ZWSP on Shift', () => {
    expect(macKey('Space').base).toBe(' ')
    expect(macKey('Space').shift).toBe('​')
    expect(macKey('Space').base).not.toBe(key('Space').base)
  })

  it('reverses ឭ and ឮ on Backslash', () => {
    expect(macKey('Backslash').base).toBe('ឭ')
    expect(macKey('Backslash').shift).toBe('ឮ')
  })

  it('assigns no ligature — every key emits one code point', () => {
    for (const entry of macKhmerLayout) {
      for (const output of [entry.base, entry.shift, entry.alt]) {
        expect([...output].length, `${entry.code} → ${output}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('puts on Shift what NiDA reaches only through AltGr', () => {
    expect(macKey('Slash').shift).toBe('ឯ')
    expect(macKey('Comma').shift).toBe('ឱ')
    expect(macKey('Equal').shift).toBe('៎')
  })

  it('keeps COENG where NiDA keeps it — the key that matters most', () => {
    expect(macKey('KeyJ').base).toBe(COENG)
  })

  it('differs from NiDA on exactly ten keys at base or shift', () => {
    const divergent = macKhmerLayout.filter(
      (entry) => entry.base !== key(entry.code).base || entry.shift !== key(entry.code).shift,
    )
    expect(divergent.map(({ code }) => code)).toEqual([
      'Digit9',
      'Digit0',
      'Equal',
      'Backslash',
      'KeyA',
      'Semicolon',
      'KeyV',
      'Comma',
      'Slash',
      'Space',
    ])
  })
})

describe('invisibleLabel', () => {
  it('names COENG, the key that produces no glyph of its own', () => {
    expect(invisibleLabel(COENG)).toBe('COENG')
  })

  it('names the other zero-width and space characters on the layout', () => {
    expect(invisibleLabel('​')).toBeTruthy()
    expect(invisibleLabel(' ')).toBeTruthy()
  })

  it('returns undefined for a sign that renders a glyph', () => {
    expect(invisibleLabel('ក')).toBeUndefined()
    expect(invisibleLabel('ា')).toBeUndefined()
  })
})

describe('keystrokeFor', () => {
  it('finds an unshifted key', () => {
    expect(keystrokeFor('ក', 'nida')).toEqual({ code: 'KeyK', level: 'base' })
  })

  it('finds a shifted key', () => {
    expect(keystrokeFor('គ', 'nida')).toEqual({ code: 'KeyK', level: 'shift' })
  })

  it('finds an AltGr key', () => {
    expect(keystrokeFor(',', 'nida')).toEqual({ code: 'Comma', level: 'alt' })
  })

  it('finds COENG', () => {
    expect(keystrokeFor(COENG, 'nida')).toEqual({ code: 'KeyJ', level: 'base' })
  })

  it('never returns a ligature key, which cannot produce a lone code point', () => {
    // ុ is Comma's base *prefix*, but pressing Comma also emits ំ.
    expect(keystrokeFor('ុ', 'nida')).toEqual({ code: 'KeyU', level: 'base' })
    expect(keystrokeFor('ា', 'nida')).toEqual({ code: 'KeyA', level: 'base' })
  })

  it('returns undefined for a character the layout cannot produce', () => {
    expect(keystrokeFor('z', 'nida')).toBeUndefined()
  })

  it('is undefined for a multi-code-point string', () => {
    expect(keystrokeFor('ាំ', 'nida')).toBeUndefined()
  })

  it('answers per variant, not once for all Khmer', () => {
    expect(keystrokeFor('ឯ', 'nida')).toEqual({ code: 'KeyE', level: 'alt' })
    expect(keystrokeFor('ឯ', 'macos')).toEqual({ code: 'Slash', level: 'shift' })
  })
})

describe('corpus coverage', () => {
  // The test that actually catches a bad mapping: a drill containing a sign no
  // key produces means the layout is wrong or incomplete. Both variants have to
  // answer for the whole corpus — a learner on either one has to be able to
  // finish every drill.
  const codePoints = [...new Set(corpus.flatMap(({ km }) => [...km]))].sort()
  const cases = LAYOUT_VARIANTS.flatMap(({ id }) =>
    codePoints.map((char) => [id, describeCodePoint(char), char] as const),
  )

  it.each(cases)('%s produces %s', (variant, _label, char) => {
    expect(keystrokeFor(char, variant)).toBeDefined()
  })
})

function describeCodePoint(char: string): string {
  const hex = `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`
  return invisibleLabel(char) ? `${hex} (${invisibleLabel(char)})` : `${hex} ${char}`
}

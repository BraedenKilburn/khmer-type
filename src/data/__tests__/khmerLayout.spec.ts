import { describe, expect, it } from 'vitest'
import { COENG, invisibleLabel, keystrokeFor, khmerLayout, type KeyDef } from '@/data/khmerLayout'
import { corpus } from '@/data/corpus'

const byCode = new Map(khmerLayout.map((key) => [key.code, key]))
const key = (code: string): KeyDef => {
  const found = byCode.get(code)
  if (!found) throw new Error(`no key ${code}`)
  return found
}

describe('khmerLayout', () => {
  it('covers all 48 printable keys of the standard block', () => {
    expect(khmerLayout).toHaveLength(48)
  })

  it('identifies keys by KeyboardEvent.code, uniquely', () => {
    expect(byCode.size).toBe(khmerLayout.length)
    for (const { code } of khmerLayout) {
      expect(code).toMatch(
        /^(Key[A-Z]|Digit[0-9]|Backquote|Minus|Equal|Bracket(Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|Space)$/,
      )
    }
  })

  it('assigns every key to a row and a finger', () => {
    for (const { code, row, finger } of khmerLayout) {
      expect(row, code).toBeGreaterThanOrEqual(1)
      expect(row, code).toBeLessThanOrEqual(5)
      expect(finger, code).toBeTruthy()
    }
  })

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
    expect(keystrokeFor('ក')).toEqual({ code: 'KeyK', level: 'base' })
  })

  it('finds a shifted key', () => {
    expect(keystrokeFor('គ')).toEqual({ code: 'KeyK', level: 'shift' })
  })

  it('finds an AltGr key', () => {
    expect(keystrokeFor(',')).toEqual({ code: 'Comma', level: 'alt' })
  })

  it('finds COENG', () => {
    expect(keystrokeFor(COENG)).toEqual({ code: 'KeyJ', level: 'base' })
  })

  it('never returns a ligature key, which cannot produce a lone code point', () => {
    // ុ is Comma's base *prefix*, but pressing Comma also emits ំ.
    expect(keystrokeFor('ុ')).toEqual({ code: 'KeyU', level: 'base' })
    expect(keystrokeFor('ា')).toEqual({ code: 'KeyA', level: 'base' })
  })

  it('returns undefined for a character the layout cannot produce', () => {
    expect(keystrokeFor('z')).toBeUndefined()
  })

  it('is undefined for a multi-code-point string', () => {
    expect(keystrokeFor('ាំ')).toBeUndefined()
  })
})

describe('corpus coverage', () => {
  // The test that actually catches a bad mapping: a drill containing a sign no
  // key produces means the layout is wrong or incomplete.
  const codePoints = [...new Set(corpus.flatMap((drill) => [...drill]))].sort()

  it.each(codePoints.map((char) => [describeCodePoint(char), char] as const))(
    'produces %s',
    (_label, char) => {
      expect(keystrokeFor(char)).toBeDefined()
    },
  )
})

function describeCodePoint(char: string): string {
  const hex = `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`
  return invisibleLabel(char) ? `${hex} (${invisibleLabel(char)})` : `${hex} ${char}`
}

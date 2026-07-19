import { describe, expect, it } from 'vitest'
import { accuracyFrom, tallyKeystrokes } from '@/lib/accuracy'

/** Accuracy of a raw key sequence, the way the component computes it. */
const accuracyOf = (drill: string, keys: string[]) => accuracyFrom(tallyKeystrokes(drill, keys))

describe('tallyKeystrokes', () => {
  it('counts a correct keystroke', () => {
    expect(tallyKeystrokes('ក', ['ក'])).toEqual({ total: 1, errors: 0 })
  })

  it('keeps the error after a backspace corrects it — the bug this exists to fix', () => {
    expect(tallyKeystrokes('ក', ['x', 'Backspace', 'ក'])).toEqual({ total: 2, errors: 1 })
  })

  it('does not count Backspace as a keystroke', () => {
    expect(tallyKeystrokes('កខ', ['ក', 'Backspace', 'ក', 'ខ'])).toEqual({ total: 3, errors: 0 })
  })

  it('tallies nothing for a Backspace at cursor 0', () => {
    expect(tallyKeystrokes('ក', ['Backspace'])).toEqual({ total: 0, errors: 0 })
  })

  it('rewinds the cursor so the next keystroke is judged against the same code point', () => {
    expect(tallyKeystrokes('កខ', ['ក', 'ក', 'Backspace', 'ខ'])).toEqual({ total: 3, errors: 1 })
  })

  it('reads the drill code point at the pre-increment cursor', () => {
    expect(tallyKeystrokes('កខ', ['ខ', 'ក'])).toEqual({ total: 2, errors: 2 })
  })

  it('counts the COENG keystroke like any other — see docs/adr/0002', () => {
    expect(tallyKeystrokes('ស្វា', [...'ស្វា'])).toEqual({ total: 4, errors: 0 })
  })

  it('errors on a stacked cluster typed without its COENG', () => {
    expect(tallyKeystrokes('ស្វា', ['ស', 'វ', 'ា'])).toEqual({ total: 3, errors: 2 })
  })

  it('tallies nothing for an empty sequence', () => {
    expect(tallyKeystrokes('ក', [])).toEqual({ total: 0, errors: 0 })
  })

  it('ignores keystrokes past the end of the drill', () => {
    expect(tallyKeystrokes('ក', ['ក', 'ខ'])).toEqual({ total: 1, errors: 0 })
  })
})

describe('accuracyFrom', () => {
  it('scores a clean drill 100%', () => {
    expect(accuracyOf('ក', ['ក'])).toBe(100)
  })

  it('scores a corrected typo 50%, not 100%', () => {
    expect(accuracyOf('ក', ['x', 'Backspace', 'ក'])).toBe(50)
  })

  it('scores an empty sequence 100% rather than dividing by zero', () => {
    expect(accuracyOf('ក', [])).toBe(100)
  })

  it('leaves earned accuracy untouched by trailing Backspaces', () => {
    const typed = ['ស', '្', 'វ', 'ា']
    expect(accuracyOf('ស្វា', [...typed, 'Backspace', 'Backspace'])).toBe(
      accuracyOf('ស្វា', typed),
    )
  })

  it('scores a perfectly typed stacked drill 100%', () => {
    expect(accuracyOf('សូមស្វាគមន៏!', [...'សូមស្វាគមន៏!'])).toBe(100)
  })

  it('rounds to a whole percent', () => {
    expect(accuracyOf('កខគ', ['ក', 'ក', 'គ'])).toBe(67)
  })
})

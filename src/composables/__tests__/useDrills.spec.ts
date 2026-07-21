import { describe, expect, it } from 'vitest'
import { stripZwsp, toSigns } from '@/composables/useDrills'

const ZWSP = '\u200B'

describe('stripZwsp', () => {
  it('removes a Zero Width Space between two clusters', () => {
    expect(stripZwsp(`ខ្ញុំ${ZWSP}ស្រលាញ់អ្នក`)).toBe('ខ្ញុំស្រលាញ់អ្នក')
  })

  it('removes every Zero Width Space, not just the first', () => {
    expect(stripZwsp(`ក${ZWSP}ខ${ZWSP}គ`)).toBe('កខគ')
  })

  it('leaves a drill without a Zero Width Space untouched', () => {
    expect(stripZwsp('សូមស្វាគមន៏!')).toBe('សូមស្វាគមន៏!')
  })

  it('keeps COENG intact — it is invisible but typed', () => {
    expect(stripZwsp('ស្វា')).toBe('ស្វា')
  })

  it('yields an empty string for an empty drill', () => {
    expect(stripZwsp('')).toBe('')
  })
})

describe('toSigns, re-exported', () => {
  /*
   * The decomposition ships from `@/lib/signs` alongside the other pure text
   * logic, but the drills composable is where a caller looks for it. This test
   * exists so that reach stays wired — the strip, the on-screen keyboard, and
   * the per-sign stats all have to be reading the same one.
   */
  it('reaches the same decomposition the strip and the stats use', () => {
    expect(toSigns('ស្វា')).toEqual(['ស', '្វ', 'ា'])
  })
})

import { describe, expect, it } from 'vitest'
import {
  errorRate,
  expectedSignAt,
  hesitationMs,
  recordAttempt,
  signAtIndex,
  weakestSigns,
  type SignStats,
} from '@/lib/stats'

describe('signAtIndex', () => {
  it('answers with the sign each keystroke is aimed at', () => {
    // ស ្វ ា — four keystrokes, three signs, and the two presses of the
    // subscript are both attempts at `្វ`.
    expect(signAtIndex('ស្វា')).toEqual(['ស', '្វ', '្វ', 'ា'])
  })

  it('runs the whole drill, not one cluster', () => {
    expect(signAtIndex('សូម')).toEqual(['ស', 'ូ', 'ម'])
  })

  it('is empty for an empty drill', () => {
    expect(signAtIndex('')).toEqual([])
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

describe('recordAttempt', () => {
  it('counts an attempt and its time', () => {
    const stats = recordAttempt({}, 'ក', true, 400)
    expect(stats['ក']).toEqual({ sign: 'ក', attempts: 1, errors: 0, totalMs: 400 })
  })

  it('counts an error without losing the attempt', () => {
    const stats = recordAttempt({}, 'ក', false, 900)
    expect(stats['ក']).toEqual({ sign: 'ក', attempts: 1, errors: 1, totalMs: 900 })
  })

  it('adds to what is already there', () => {
    let stats: SignStats = {}
    stats = recordAttempt(stats, 'ក', true, 100)
    stats = recordAttempt(stats, 'ក', false, 300)

    expect(stats['ក']).toEqual({ sign: 'ក', attempts: 2, errors: 1, totalMs: 400 })
  })

  it('keeps a subscript apart from the base consonant it contains', () => {
    // The test the whole module exists for: `្ក` is a different key pressed
    // after a different key, and averaging the two hides the weakness.
    let stats: SignStats = {}
    stats = recordAttempt(stats, 'ក', true, 200)
    stats = recordAttempt(stats, '្ក', false, 800)

    expect(stats['ក']).toEqual({ sign: 'ក', attempts: 1, errors: 0, totalMs: 200 })
    expect(stats['្ក']).toEqual({ sign: '្ក', attempts: 1, errors: 1, totalMs: 800 })
  })

  it('leaves the record it was given alone', () => {
    const before: SignStats = {}
    recordAttempt(before, 'ក', true, 100)
    expect(before).toEqual({})
  })

  it('refuses to let a clock jump backwards subtract time', () => {
    const stats = recordAttempt({}, 'ក', true, -5000)
    expect(stats['ក'].totalMs).toBe(0)
  })
})

describe('errorRate and hesitationMs', () => {
  const stat = { sign: 'ក', attempts: 4, errors: 1, totalMs: 1200 }

  it('reads a rate and an average off a stat', () => {
    expect(errorRate(stat)).toBe(0.25)
    expect(hesitationMs(stat)).toBe(300)
  })

  it('says nothing about a sign never attempted', () => {
    // Not zero: a sign with no attempts is unattempted, not perfect, and a
    // heatmap that tinted it as a strength would congratulate a learner on
    // every sign they have been avoiding.
    expect(errorRate(undefined)).toBeUndefined()
    expect(hesitationMs({ sign: 'ក', attempts: 0, errors: 0, totalMs: 0 })).toBeUndefined()
  })
})

describe('weakestSigns', () => {
  const stats: SignStats = {
    'ក': { sign: 'ក', attempts: 10, errors: 1, totalMs: 2000 },
    '្ក': { sign: '្ក', attempts: 10, errors: 6, totalMs: 3000 },
    'ស': { sign: 'ស', attempts: 10, errors: 0, totalMs: 9000 },
    'ា': { sign: 'ា', attempts: 4, errors: 1, totalMs: 400 },
  }

  it('ranks by error rate for the accuracy view', () => {
    expect(weakestSigns(stats, 'accuracy').map(({ sign }) => sign)).toEqual(['្ក', 'ា', 'ក'])
  })

  it('ranks by average wait for the hesitation view', () => {
    // ស is never wrong and still the slowest by far — the signal accuracy
    // alone cannot show.
    expect(weakestSigns(stats, 'hesitation')[0].sign).toBe('ស')
  })

  it('leaves out signs with nothing to report', () => {
    expect(weakestSigns(stats, 'accuracy').map(({ sign }) => sign)).not.toContain('ស')
  })

  it('honours the limit', () => {
    expect(weakestSigns(stats, 'accuracy', 1)).toHaveLength(1)
  })

  it('breaks a tie towards the sign attempted more often', () => {
    const tied: SignStats = {
      'ក': { sign: 'ក', attempts: 2, errors: 1, totalMs: 0 },
      'ខ': { sign: 'ខ', attempts: 20, errors: 10, totalMs: 0 },
    }
    expect(weakestSigns(tied, 'accuracy')[0].sign).toBe('ខ')
  })

  it('has nothing to show for an empty history', () => {
    expect(weakestSigns({}, 'accuracy')).toEqual([])
  })
})

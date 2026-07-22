import { describe, expect, it } from 'vitest'
import {
  drillWeight,
  sampleWeightedIndex,
  signWeakness,
  weakestSigns,
} from '@/lib/weakness'
import { tagDrill } from '@/lib/drillTags'
import type { Drill } from '@/data/corpus'
import type { SignStats } from '@/lib/stats'

const drills: Drill[] = [
  { id: 'a', km: 'ក ក ក', kind: 'exercise' },
  { id: 'b', km: 'ស ស ស', kind: 'exercise' },
  { id: 'c', km: 'ម ម ម', kind: 'exercise' },
]

const tags = Object.fromEntries(drills.map((drill) => [drill.id, tagDrill(drill.km)]))

const stats: SignStats = {
  ក: { sign: 'ក', attempts: 10, errors: 8, totalMs: 1_000 },
  ស: { sign: 'ស', attempts: 10, errors: 0, totalMs: 20_000 },
  // ម has never been attempted.
}

/** The drill `sampleWeightedIndex` drew, for the tests that read better that way. */
function drew(random: () => number, pool: readonly Drill[] = drills) {
  const index = sampleWeightedIndex(pool, tags, stats, random)
  return index === undefined ? undefined : pool[index]
}

describe('signWeakness', () => {
  it('scores a sign the learner keeps missing', () => {
    expect(signWeakness('ក', stats)).toBeGreaterThan(0)
  })

  it('scores a sign typed correctly but slowly', () => {
    // The hesitation signal: right every time, two seconds a keystroke.
    expect(signWeakness('ស', stats)).toBeGreaterThan(0)
  })

  it('scores a sign typed quickly and correctly at zero', () => {
    expect(signWeakness('ក', { ក: { sign: 'ក', attempts: 10, errors: 0, totalMs: 500 } })).toBe(0)
  })

  it('scores an unattempted sign at zero, not at maximum', () => {
    // Signs a learner has not met are the curriculum's job. Treating unknown
    // as weak would fill practice with letters from lessons not yet reached.
    expect(signWeakness('ម', stats)).toBe(0)
    expect(signWeakness('ឡ', {})).toBe(0)
  })
})

describe('weakestSigns', () => {
  const history: SignStats = {
    'ក': { sign: 'ក', attempts: 10, errors: 1, totalMs: 2_000 },
    '្ក': { sign: '្ក', attempts: 10, errors: 6, totalMs: 3_000 },
    'ស': { sign: 'ស', attempts: 10, errors: 0, totalMs: 9_000 },
    'ា': { sign: 'ា', attempts: 4, errors: 1, totalMs: 400 },
  }

  it('ranks the sign missed most often first', () => {
    expect(weakestSigns(history)[0].sign).toBe('្ក')
  })

  /*
   * The whole reason there is one score rather than two. Ranking by error rate
   * alone dropped `ស` off the list entirely, while the draw was already
   * weighting towards it — so targeted practice named signs it was not aiming
   * at and stayed quiet about one it was.
   */
  it('includes a sign that is never wrong and always slow', () => {
    expect(weakestSigns(history).map(({ sign }) => sign)).toContain('ស')
  })

  it('names the same signs the draw weights towards', () => {
    const ranked = weakestSigns(history).map(({ sign }) => sign)
    const byScore = [...ranked].sort((a, b) => signWeakness(b, history) - signWeakness(a, history))

    expect(ranked).toEqual(byScore)
  })

  it('leaves out a sign that is quick and correct', () => {
    const fine = { ...history, ង: { sign: 'ង', attempts: 10, errors: 0, totalMs: 1_000 } }
    expect(weakestSigns(fine).map(({ sign }) => sign)).not.toContain('ង')
  })

  it('honours the limit', () => {
    expect(weakestSigns(history, 1)).toHaveLength(1)
  })

  it('breaks a tie towards the sign attempted more often', () => {
    const tied: SignStats = {
      'ក': { sign: 'ក', attempts: 2, errors: 1, totalMs: 0 },
      'ខ': { sign: 'ខ', attempts: 20, errors: 10, totalMs: 0 },
    }
    expect(weakestSigns(tied)[0].sign).toBe('ខ')
  })

  it('has nothing to show for an empty history', () => {
    expect(weakestSigns({})).toEqual([])
  })
})

describe('drillWeight', () => {
  it('weighs a drill by the weakness of what it asks for', () => {
    expect(drillWeight(tags.a, stats)).toBeGreaterThan(drillWeight(tags.c, stats))
  })

  it('leaves every drill some chance of being drawn', () => {
    // A pool that can only serve the same three drills stops being practice.
    expect(drillWeight(tags.c, stats)).toBeGreaterThan(0)
  })

  it('does not let length alone outrank weakness', () => {
    const long = tagDrill('ម ម ម ម ម ម ម ម ម ម ម ម')
    expect(drillWeight(tags.a, stats)).toBeGreaterThan(drillWeight(long, stats))
  })
})

describe('sampleWeightedIndex', () => {
  it('draws the heaviest drill for a draw at the top of the range', () => {
    // Weights run in pool order, so a draw of 0 lands on the first drill.
    expect(drew(() => 0)?.id).toBe('a')
  })

  it('reaches the last drill at the far end of the range', () => {
    expect(drew(() => 0.999)?.id).toBe('c')
  })

  it('favours the weak drill over many draws', () => {
    let index = 0
    // A deterministic sweep across the range, so this counts the distribution
    // rather than trusting it.
    const sweep = () => (index++ % 100) / 100

    const counts = new Map<string, number>()
    for (let draw = 0; draw < 100; draw++) {
      const drill = drew(sweep)!
      counts.set(drill.id, (counts.get(drill.id) ?? 0) + 1)
    }

    expect(counts.get('a')!).toBeGreaterThan(counts.get('c')!)
  })

  it('has nothing to draw from an empty pool', () => {
    expect(sampleWeightedIndex([], tags, stats)).toBeUndefined()
  })

  it('falls back to a plain draw when nothing is weighted', () => {
    expect(sampleWeightedIndex(drills, {}, {}, () => 0.5)).toBe(1)
  })
})

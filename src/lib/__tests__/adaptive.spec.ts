import { describe, expect, it } from 'vitest'
import { byWeakness, drillWeight, sampleWeighted, signWeakness } from '@/lib/adaptive'
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

describe('byWeakness', () => {
  it('puts the drill full of the worst sign first', () => {
    expect(byWeakness(drills, tags, stats)[0].id).toBe('a')
  })

  it('is stable when nothing has been recorded', () => {
    expect(byWeakness(drills, tags, {}).map(({ id }) => id)).toEqual(['a', 'b', 'c'])
  })
})

describe('sampleWeighted', () => {
  it('draws the heaviest drill for a draw at the top of the range', () => {
    // Weights run in pool order, so a draw of 0 lands on the first drill.
    expect(sampleWeighted(drills, tags, stats, () => 0)?.id).toBe('a')
  })

  it('reaches the last drill at the far end of the range', () => {
    expect(sampleWeighted(drills, tags, stats, () => 0.999)?.id).toBe('c')
  })

  it('favours the weak drill over many draws', () => {
    let index = 0
    // A deterministic sweep across the range, so this counts the distribution
    // rather than trusting it.
    const sweep = () => (index++ % 100) / 100

    const counts = new Map<string, number>()
    for (let draw = 0; draw < 100; draw++) {
      const drill = sampleWeighted(drills, tags, stats, sweep)!
      counts.set(drill.id, (counts.get(drill.id) ?? 0) + 1)
    }

    expect(counts.get('a')!).toBeGreaterThan(counts.get('c')!)
  })

  it('has nothing to draw from an empty pool', () => {
    expect(sampleWeighted([], tags, stats)).toBeUndefined()
  })

  it('falls back to a plain draw when nothing is weighted', () => {
    expect(sampleWeighted(drills, {}, {}, () => 0.5)?.id).toBe('b')
  })
})

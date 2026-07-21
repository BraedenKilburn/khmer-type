import { describe, expect, it } from 'vitest'
import {
  adaptiveOrder,
  selectorFor,
  sequentialOrder,
  shuffledOrder,
  type DrillSelector,
} from '@/lib/drillOrder'
import { tagDrill } from '@/lib/drillTags'
import type { Drill } from '@/data/corpus'
import type { SignStats } from '@/lib/stats'

const pool: Drill[] = [
  { id: 'a', km: 'ក', kind: 'exercise' },
  { id: 'b', km: 'ខ', kind: 'exercise' },
  { id: 'c', km: 'គ', kind: 'exercise' },
]

const tags = Object.fromEntries(pool.map(({ id, km }) => [id, tagDrill(km)]))

function stat(sign: string, errors: number, attempts: number): SignStats {
  return { [sign]: { sign, attempts, errors, totalMs: 0 } }
}

/** Every index the selector visits before it starts repeating. */
function drawAll(selector: DrillSelector, drills: Drill[] = pool): number[] {
  const seen = [selector.start(drills)]
  for (let draw = 1; draw < drills.length; draw++) {
    seen.push(selector.next(drills, seen[seen.length - 1]))
  }
  return seen
}

describe('sequentialOrder', () => {
  it('opens on the first drill — a lesson is a list to work through', () => {
    expect(sequentialOrder().start(pool)).toBe(0)
  })

  it('walks the drills in the order the lesson lays them out', () => {
    expect(drawAll(sequentialOrder())).toEqual([0, 1, 2])
  })

  it('stops at the end rather than wrapping', () => {
    // Where a finished lesson goes next is the view's decision, not the order's.
    expect(sequentialOrder().next(pool, 2)).toBe(2)
  })
})

describe('shuffledOrder', () => {
  it('opens on a draw rather than on the first drill', () => {
    expect(shuffledOrder(() => 0.99).start(pool)).toBe(2)
  })

  it('serves every drill once before any repeats', () => {
    const drawn = drawAll(shuffledOrder(() => 0))
    expect([...drawn].sort()).toEqual([0, 1, 2])
  })

  it('starts the pool over once it is exhausted', () => {
    const selector = shuffledOrder(() => 0)
    drawAll(selector)

    // A fourth draw has nothing unused left, so the pool comes back around.
    expect(selector.next(pool, 2)).toBe(0)
  })

  it('stays put when there is nothing to draw from', () => {
    expect(shuffledOrder(() => 0).next([], 0)).toBe(0)
  })
})

describe('adaptiveOrder', () => {
  it('draws towards the sign the learner keeps missing', () => {
    // `គ` is missed every time; `ក` and `ខ` are never wrong.
    const stats = stat('គ', 4, 4)
    const selector = adaptiveOrder({ tags, stats: () => stats, random: () => 0.99 })

    expect(selector.start(pool)).toBe(2)
  })

  it('reads the record at the moment of the draw, not when it was built', () => {
    let stats: SignStats = {}
    const selector = adaptiveOrder({ tags, stats: () => stats, random: () => 0 })

    // The learner gets worse at `ក` after the selector was built. A draw at the
    // bottom of the cumulative weight lands on the first drill either way, so
    // what this asserts is that `ក` is now heavy enough to hold it there.
    stats = stat('ក', 4, 4)

    expect(selector.start(pool)).toBe(0)
    expect(selector.next(pool, 0)).not.toBe(0)
  })

  it('still serves every drill once before any repeats', () => {
    const stats = stat('គ', 4, 4)
    const drawn = drawAll(adaptiveOrder({ tags, stats: () => stats, random: () => 0.99 }))

    // Weighting decides the order, never that a drill is skipped entirely.
    expect([...drawn].sort()).toEqual([0, 1, 2])
  })

  it('draws from the pool it was handed, not from an index it lost track of', () => {
    // The regression this seam exists to make impossible: the old picker got a
    // drill back and searched the slice for it by id, defaulting to 0 on a miss.
    // `ខ` carries almost all the weight, so the middle of the cumulative walk
    // lands inside its band — index 1, the position it actually occupies.
    const stats = stat('ខ', 4, 4)
    const selector = adaptiveOrder({ tags, stats: () => stats, random: () => 0.5 })

    expect(selector.start(pool)).toBe(1)
  })
})

describe('selectorFor', () => {
  const deps = { tags, stats: () => ({}) }

  it('names the sequential order', () => {
    expect(selectorFor('sequential', deps).start(pool)).toBe(0)
  })

  it('names an order that draws', () => {
    expect(selectorFor('random', { ...deps, random: () => 0.99 }).start(pool)).toBe(2)
  })

  it('names the adaptive order', () => {
    const stats = () => stat('គ', 4, 4)
    expect(selectorFor('adaptive', { tags, stats, random: () => 0.99 }).start(pool)).toBe(2)
  })
})

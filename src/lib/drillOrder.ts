/**
 * Which drill comes next.
 *
 * Three orders, one interface. A lesson works through its drills in the order
 * it lays them out; free practice serves every drill once before any repeats;
 * targeted practice weights the draw towards the signs the learner is worst at.
 * They differ in nothing else, which is why they sit behind one seam rather
 * than as three branches inside the picker.
 *
 * A selector keeps its own bookkeeping — which drills have come up since the
 * pool was last exhausted is the shuffled order's business and nobody else's —
 * and answers in indices, because an index is what the caller can act on. An
 * order that answered with a drill would force the caller to search the pool
 * for something it had just handed over.
 */

import type { Drill } from '@/data/corpus'
import { sampleWeightedIndex } from '@/lib/adaptive'
import type { DrillTags } from '@/lib/drillTags'
import type { SignStats } from '@/lib/stats'

/**
 * How the next drill is chosen.
 *
 * - `random` — free practice, every drill once before any repeats
 * - `sequential` — a lesson, in the order it lays its drills out
 * - `adaptive` — weighted towards the signs the learner is worst at
 */
export type DrillOrder = 'random' | 'sequential' | 'adaptive'

export interface DrillSelector {
  /**
   * Where to open, before anything has been typed. A lesson opens on its first
   * drill; an order that draws opens on a draw. Callers no longer have to know
   * which kind they were handed.
   */
  start(pool: readonly Drill[]): number
  /**
   * The index of the next drill, given the pool and where the picker is now.
   * Never out of range for a non-empty pool.
   */
  next(pool: readonly Drill[], current: number): number
}

/**
 * A lesson is an order, so it stops at the end rather than wrapping — the view
 * is what decides where a finished lesson goes next.
 */
export function sequentialOrder(): DrillSelector {
  return {
    start: () => 0,
    next: (pool, current) => Math.min(current + 1, pool.length - 1),
  }
}

/**
 * Every drill once before any repeats.
 *
 * `random` is injected so the draw can be tested rather than trusted — an
 * order that quietly favours the first entry looks fine until someone counts.
 */
export function shuffledOrder(random: () => number = Math.random): DrillSelector {
  return fromAvailable((available) => available[Math.floor(random() * available.length)])
}

export interface AdaptiveOrderDeps {
  /** What each drill asks of a learner — see `@/lib/drillTags`. */
  tags: Record<string, DrillTags>
  /**
   * The per-sign record, read at the moment of the draw rather than captured:
   * the whole point is that it moves as the learner types.
   */
  stats: () => SignStats
  random?: () => number
}

/** Weighted towards weakness, drawing only from what has not come up yet. */
export function adaptiveOrder({ tags, stats, random = Math.random }: AdaptiveOrderDeps): DrillSelector {
  return fromAvailable((available, pool) => {
    const candidates = available.map((index) => pool[index])
    const picked = sampleWeightedIndex(candidates, tags, stats(), random)
    return available[picked ?? 0]
  })
}

/**
 * Shared bookkeeping for the two orders that do not repeat: track what has come
 * up, hand the rest to `pick`, and start over once the pool is exhausted.
 */
function fromAvailable(
  pick: (available: number[], pool: readonly Drill[]) => number,
): DrillSelector {
  /** Drills seen since the pool was last exhausted, so nothing repeats early. */
  let used: number[] = []

  return {
    start(pool) {
      return this.next(pool, 0)
    },
    next(pool, current) {
      if (used.length >= pool.length) used = []

      const available = pool.map((_, index) => index).filter((index) => !used.includes(index))
      if (!available.length) return current

      const next = pick(available, pool)
      used.push(next)
      return next
    },
  }
}

export interface SelectorForOptions {
  tags: Record<string, DrillTags>
  stats: () => SignStats
  random?: () => number
}

/** The selector an order names. */
export function selectorFor(order: DrillOrder, deps: SelectorForOptions): DrillSelector {
  if (order === 'sequential') return sequentialOrder()
  if (order === 'adaptive') return adaptiveOrder(deps)
  return shuffledOrder(deps.random)
}

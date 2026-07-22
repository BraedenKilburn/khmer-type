/**
 * How much each sign is worth practising, and what follows from that.
 *
 * One score, read by everything that asks the question. It used to be two: the
 * draw weighted by the score below, while the sentence above it — "weighted
 * towards `្ត` `ា` `្ក`" — was written from a *different* ranking that read
 * error rate alone. So targeted practice could name signs it was not aiming at,
 * and
 * silently omit the sign it was aiming at hardest: one the learner never gets
 * wrong and always has to stop and think about.
 *
 * Hesitation is the reason the two disagreed and the reason this module ranks
 * the way it does. A sign you get right after a visible pause is one you are
 * deriving rather than recalling — see CONTEXT.md — and it is worth practising
 * even though accuracy has nothing to say about it.
 *
 * Weighted sampling, deliberately — not a spaced-repetition scheduler. A
 * scheduler models when you will forget, which needs review history this app
 * does not keep and evidence it does not have. Weighting by measured weakness
 * needs neither.
 */

import type { Drill } from '@/data/corpus'
import type { DrillTags } from '@/lib/drillTags'
import { errorRate, hesitationMs, type SignStat, type SignStats } from '@/lib/stats'

/** Above this, a sign is slow enough to be worth practising. Milliseconds. */
const SLOW_MS = 600

/**
 * How much a sign is worth practising, from 0 up.
 *
 * Errors dominate, hesitation contributes, and a sign never attempted scores
 * zero rather than something large: this function ranks practice among signs
 * the learner has *met*. Signs they have not met are the curriculum's job, and
 * treating "unknown" as "weak" would fill every practice session with letters
 * from lessons they have not reached.
 */
export function signWeakness(sign: string, stats: SignStats): number {
  const stat = stats[sign]
  if (!stat?.attempts) return 0

  const wrong = errorRate(stat) ?? 0
  const slow = Math.max(0, (hesitationMs(stat) ?? 0) - SLOW_MS) / 1000

  return wrong * 3 + slow
}

/**
 * The signs worth practising, worst first.
 *
 * What targeted practice says it is aiming at, and what the completion dialog
 * offers as the thing to work on. Both read the same score the draw does, so
 * the list and the draw cannot disagree.
 *
 * Signs with a single attempt are included — a learner who has seen a sign once
 * and missed it has learned something worth telling them — but ties break
 * towards the sign attempted more often, so a lucky miss does not outrank a
 * consistent one. A sign that is quick and correct scores zero and is left out
 * entirely: there is nothing to report about it.
 */
export function weakestSigns(stats: SignStats, limit = 5): SignStat[] {
  return Object.values(stats)
    .map((stat) => ({ stat, weakness: signWeakness(stat.sign, stats) }))
    .filter(({ stat, weakness }) => stat.attempts > 0 && weakness > 0)
    .sort((a, b) => b.weakness - a.weakness || b.stat.attempts - a.stat.attempts)
    .slice(0, limit)
    .map(({ stat }) => stat)
}

/**
 * A drill's weight: how much of what it asks for is weak.
 *
 * Averaged over the drill's distinct signs rather than summed, so a long
 * sentence does not outrank a short drill made entirely of the sign the learner
 * keeps missing. Every drill keeps a small floor of weight — a pool that can
 * only ever serve the same three drills stops being practice.
 */
export function drillWeight(tags: DrillTags, stats: SignStats): number {
  if (!tags.signs.length) return 0

  const total = tags.signs.reduce((sum, sign) => sum + signWeakness(sign, stats), 0)
  return 0.1 + total / tags.signs.length
}

/**
 * Draw one drill, weighted, and say *where* it was drawn from.
 *
 * An index rather than the drill itself: the caller is picking out of a slice
 * of a larger pool and has to map the answer back onto it. Handing back the
 * drill would leave it searching the slice for something it had just supplied.
 *
 * `random` is injected so the draw can be tested rather than trusted — a
 * sampler that quietly favours the first entry looks fine until someone counts.
 */
export function sampleWeightedIndex(
  drills: readonly Drill[],
  tags: Record<string, DrillTags>,
  stats: SignStats,
  random: () => number = Math.random,
): number | undefined {
  if (!drills.length) return undefined

  const weights = drills.map((drill) => (tags[drill.id] ? drillWeight(tags[drill.id], stats) : 0.1))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (total <= 0) return Math.floor(random() * drills.length)

  let remaining = random() * total
  for (const [index, weight] of weights.entries()) {
    remaining -= weight
    if (remaining < 0) return index
  }

  return drills.length - 1
}

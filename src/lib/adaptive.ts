/**
 * Practice aimed at what the learner is actually bad at.
 *
 * The per-sign record already knows which signs cost errors and which cost
 * time; this turns that into a drill order. It is the payoff of the heatmap:
 * seeing that `្ត` is your worst sign is useful, and being handed drills full
 * of `្ត` is more useful.
 *
 * Weighted sampling, deliberately — not a spaced-repetition scheduler. A
 * scheduler models when you will forget, which needs review history this app
 * does not keep and evidence it does not have. Weighting by measured weakness
 * needs neither.
 */

import type { Drill } from '@/data/corpus'
import type { DrillTags } from '@/lib/drillTags'
import { errorRate, hesitationMs, type SignStats } from '@/lib/stats'

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
 * Order a pool by weakness, worst first.
 *
 * Used to show what practice would target; `sampleWeighted` is what actually
 * picks. Both read the same weight, so the list and the draw never disagree.
 */
export function byWeakness(
  drills: readonly Drill[],
  tags: Record<string, DrillTags>,
  stats: SignStats,
): Drill[] {
  return [...drills]
    .map((drill) => ({ drill, weight: tags[drill.id] ? drillWeight(tags[drill.id], stats) : 0 }))
    .sort((a, b) => b.weight - a.weight || a.drill.id.localeCompare(b.drill.id))
    .map(({ drill }) => drill)
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

/** The drill `sampleWeightedIndex` drew. */
export function sampleWeighted(
  drills: readonly Drill[],
  tags: Record<string, DrillTags>,
  stats: SignStats,
  random: () => number = Math.random,
): Drill | undefined {
  const index = sampleWeightedIndex(drills, tags, stats, random)
  return index === undefined ? undefined : drills[index]
}

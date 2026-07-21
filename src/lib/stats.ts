/**
 * Per-sign performance: what the learner fumbles, and what they get right but
 * slowly.
 *
 * Nothing else tells a Khmer learner *which signs* they are weak on. Accuracy
 * for a whole drill says a run went badly; it never says that `្ត` is the
 * reason, and `្ត` is the thing you would practise.
 *
 * The unit is the sign, never the cluster and never the drill — see CONTEXT.md.
 * `្ក` is recorded apart from `ក` because typing it is a different motor skill:
 * a different key, pressed after a different key. Conflating them hides exactly
 * the weakness a learner most needs to see.
 */

import { toSigns } from '@/lib/signs'

export interface SignStat {
  /** The sign as typed — `្ក`, not `◌្ក`. */
  sign: string
  /** Keystrokes aimed at this sign, right or wrong. Backspace is not one. */
  attempts: number
  /** How many of those were wrong at the moment they were pressed. */
  errors: number
  /**
   * Total time waited before those keystrokes.
   *
   * Kept as a sum rather than an average so two sessions can be added together
   * without weighting one by how long it happened to be.
   */
  totalMs: number
}

/** Signs keyed by the sign itself. The shape that goes to `localStorage`. */
export type SignStats = Record<string, SignStat>

/**
 * Which sign each code unit of a drill belongs to.
 *
 * A subscript spans two keystrokes, so two consecutive positions answer with
 * the same sign — pressing COENG and pressing the consonant after it are both
 * attempts at `្ក`, which is the thing being learned.
 */
export function signAtIndex(drill: string): string[] {
  const positions: string[] = []

  for (const sign of toSigns(drill)) {
    for (let offset = 0; offset < sign.length; offset++) positions.push(sign)
  }

  return positions
}

/**
 * The sign a keystroke at `cursorIndex` is an attempt at, or `undefined` past
 * the end of the drill, where there is nothing to be right or wrong about.
 */
export function expectedSignAt(drill: string, cursorIndex: number): string | undefined {
  return signAtIndex(drill)[cursorIndex]
}

/**
 * Fold one keystroke into a stats record, returning a new one.
 *
 * Correctness is fixed here and never revisited: backspacing over a typo does
 * not restore the point, per CONTEXT.md. A Backspace itself is a correction
 * rather than an attempt and must never reach this function.
 */
export function recordAttempt(
  stats: SignStats,
  sign: string,
  wasCorrect: boolean,
  elapsedMs: number,
): SignStats {
  const existing = stats[sign] ?? { sign, attempts: 0, errors: 0, totalMs: 0 }

  return {
    ...stats,
    [sign]: {
      sign,
      attempts: existing.attempts + 1,
      errors: existing.errors + (wasCorrect ? 0 : 1),
      totalMs: existing.totalMs + Math.max(0, elapsedMs),
    },
  }
}

/** Error rate as a proportion, or `undefined` for a sign never attempted. */
export function errorRate(stat: SignStat | undefined): number | undefined {
  if (!stat?.attempts) return undefined
  return stat.errors / stat.attempts
}

/**
 * Average wait before this sign, in milliseconds — the hesitation signal.
 *
 * Often the more useful of the two: a sign you always get right after a
 * visible pause is one you are deriving rather than recalling, and no other
 * trainer shows it.
 */
export function hesitationMs(stat: SignStat | undefined): number | undefined {
  if (!stat?.attempts) return undefined
  return stat.totalMs / stat.attempts
}

export type WeaknessView = 'accuracy' | 'hesitation'

/**
 * The signs a learner is worst at, worst first.
 *
 * Signs with a single attempt are included — a learner who has seen a sign once
 * and missed it has learned something worth telling them — but ties break
 * towards the sign attempted more often, so a lucky miss does not outrank a
 * consistent one.
 */
export function weakestSigns(
  stats: SignStats,
  view: WeaknessView = 'accuracy',
  limit = 5,
): SignStat[] {
  const score = view === 'accuracy' ? errorRate : hesitationMs

  return Object.values(stats)
    .filter((stat) => stat.attempts > 0 && (score(stat) ?? 0) > 0)
    .sort((a, b) => (score(b) ?? 0) - (score(a) ?? 0) || b.attempts - a.attempts)
    .slice(0, limit)
}

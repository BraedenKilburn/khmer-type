import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { recordAttempt } from '@/lib/stats'
import { weakestSigns } from '@/lib/weakness'
import { expectedSignAt } from '@/lib/drillAnalysis'
import { record } from '@/composables/records'

/**
 * Records the keystrokes of one run at one drill.
 *
 * Holds the hesitation clock, which is why there is an object here at all. The
 * clock used to be a `let` at module scope, cleared by a `startDrill()` the
 * caller had to remember at every drill boundary — so a forgotten call charged
 * the gap spent reading the next drill to its first sign, two trainers on a page
 * shared one clock, and three test suites had to open with a `startDrill()` of
 * their own to undo whatever the previous test had left behind. A run that owns
 * its clock cannot be forgotten: a new run *is* a cleared clock.
 */
export interface RunRecorder {
  /**
   * Record one keystroke against the sign it was aimed at.
   *
   * `cursorIndex` is where the cursor sat **before** the key landed, which is
   * what decides the sign being attempted — so this is called before the cursor
   * moves past it, or every attempt is filed under the following sign.
   * Correctness is judged the way accuracy judges it, against the code point
   * under the cursor at the moment pressed, so a corrected typo leaves its error
   * behind, per CONTEXT.md.
   *
   * Backspace must not come through here. It is a correction, not an attempt,
   * and counting it would make a typo cost twice.
   */
  keystroke(cursorIndex: number, key: string, now?: number): void
}

/**
 * The per-sign record, kept across sessions.
 *
 * One record for the whole app rather than one per component: the completion
 * dialog and the heatmap are two views of the same history, and a second copy
 * would drift from the first the moment a drill ended. Where it is stored, what
 * it defaults to, and whether "start over" wipes it are
 * `@/composables/records`' business — asked for here on every call rather
 * than captured at import, so the store underneath can be swapped.
 */
export function useStats() {
  const stats = record('stats')

  /**
   * Begin recording a run at `drill`, with a fresh hesitation clock.
   *
   * The drill is read on every keystroke rather than captured, because the text
   * under a run can change — a lesson swapping its pool moves it — and a
   * recorder holding the old one would file attempts against signs the learner
   * is no longer looking at.
   */
  function recordRun(drill: MaybeRefOrGetter<string>): RunRecorder {
    /**
     * When the previous keystroke of *this run* landed. Null until the first
     * one: the gap before it is however long the learner spent reading, or away
     * from the keyboard, which is not hesitation over a sign.
     */
    let lastKeystrokeAt: number | null = null

    return {
      keystroke(cursorIndex, key, now = Date.now()) {
        const text = toValue(drill)
        const sign = expectedSignAt(text, cursorIndex)
        if (!sign) return

        const elapsedMs = lastKeystrokeAt === null ? 0 : now - lastKeystrokeAt
        lastKeystrokeAt = now

        stats.value = recordAttempt(stats.value, sign, key === text[cursorIndex], elapsedMs)
      },
    }
  }

  /** The signs worth practising, worst first — see `@/lib/weakness`. */
  function weakest(limit = 5) {
    return weakestSigns(stats.value, limit)
  }

  return {
    stats: computed(() => stats.value),
    recordRun,
    weakest,
  }
}

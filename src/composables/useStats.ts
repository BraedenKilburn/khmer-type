import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import {
  expectedSignAt,
  recordAttempt,
  weakestSigns,
  type SignStats,
  type WeaknessView,
} from '@/lib/stats'

/**
 * Versioned, so the stored shape can change later without silently reading old
 * numbers as if they meant the same thing.
 */
const STORAGE_KEY = 'khmer-type:stats:v1'

/**
 * The per-sign record, kept across sessions.
 *
 * One record for the whole app rather than one per component: the completion
 * dialog and the heatmap are two views of the same history, and a second copy
 * would drift from the first the moment a drill ended.
 */
const stats = useStorage<SignStats>(STORAGE_KEY, {})

/** When the previous keystroke landed, for the wait before the next one. */
let lastKeystrokeAt: number | null = null

export function useStats() {
  /**
   * Record one keystroke against the sign it was aimed at.
   *
   * `cursorIndex` is where the cursor sat **before** the key landed, which is
   * what decides the sign being attempted. Correctness is judged the same way
   * accuracy judges it — against the code point under the cursor at the moment
   * pressed — so a corrected typo leaves its error behind, per CONTEXT.md.
   *
   * Backspace must not come through here. It is a correction, not an attempt,
   * and counting it would make a typo cost twice.
   */
  function recordKeystroke(drill: string, cursorIndex: number, key: string, now = Date.now()) {
    const sign = expectedSignAt(drill, cursorIndex)
    if (!sign) return

    /*
     * The first keystroke of a drill has no previous one to wait after — the
     * gap before it is however long the user spent reading, or away from the
     * keyboard, which is not hesitation over a sign.
     */
    const elapsedMs = lastKeystrokeAt === null ? 0 : now - lastKeystrokeAt
    lastKeystrokeAt = now

    stats.value = recordAttempt(stats.value, sign, key === drill[cursorIndex], elapsedMs)
  }

  /**
   * Forget when the last keystroke was, without forgetting the stats.
   *
   * Called when a drill ends: the gap across that boundary includes reading the
   * next drill and is not the learner hesitating over its first sign.
   */
  function startDrill() {
    lastKeystrokeAt = null
  }

  function weakest(view: WeaknessView = 'accuracy', limit = 5) {
    return weakestSigns(stats.value, view, limit)
  }

  return {
    stats: computed(() => stats.value),
    recordKeystroke,
    startDrill,
    weakest,
    /** Throw the history away — the only way back to a clean heatmap. */
    clear: () => {
      stats.value = {}
      lastKeystrokeAt = null
    },
  }
}

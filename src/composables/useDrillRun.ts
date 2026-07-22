import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { isActive, toRenderClusters } from '@/lib/clusters'
import { accuracyFrom, tallyKeystrokes } from '@/lib/accuracy'
import {
  commitText,
  emptySession,
  rewind as rewindSession,
  withoutLatinLetters,
  type TypingSession,
} from '@/lib/typingSession'
import { useStats } from '@/composables/useStats'

/**
 * One run at one drill, from the first keystroke that lands to completion.
 *
 * The pure modules underneath — `@/lib/typingSession`, `@/lib/accuracy`,
 * `@/lib/clusters`, the per-sign record — are each correct on their own and
 * only correct *together* under an order that none of them states:
 *
 * - a keystroke is recorded against the sign it was aimed at **before** the
 *   cursor moves past it, or every attempt is filed under the following sign
 * - the clock starts on the first keystroke that lands, not the first that was
 *   refused, or a wrong-layout learner's speed includes their trip through
 *   system settings
 * - a new drill gets a new recorder, or the gap spent reading it is charged to
 *   its first sign as hesitation
 *
 * That order used to live in the component, which nothing tested. It lives
 * here now: the run is exercised through `commit` and `rewind` with no
 * component mounted.
 */

export interface DrillRunOptions {
  /**
   * The clock. Injected so speed can be asserted rather than waited on — a
   * drill completed in a test takes microseconds, and `kpm` off a real clock
   * is unrepeatable.
   */
  now?: () => number
}

export function useDrillRun(drill: MaybeRefOrGetter<string>, { now = Date.now }: DrillRunOptions = {}) {
  const { recordRun } = useStats()

  const text = computed(() => toValue(drill))

  /** The per-sign record's clock for the drill in front of the learner. */
  let recorder = recordRun(text)

  /** Typed text, cursor, and the raw key sequence — see `@/lib/typingSession`. */
  const session = ref<TypingSession>(emptySession)

  const startedAt = ref<number | null>(null)
  const finishedAt = ref<number | null>(null)

  /**
   * Whether the user is being shown how to install a Khmer layout.
   *
   * Raised by a Latin letter, which means the user is typing on their Latin
   * layout and no drill has anything for them to match. It stays raised while
   * that is still true: the fix is a trip through system settings, which is
   * longer than any toast lives. A Khmer keystroke landing is the proof it
   * worked, so that is what lowers it — and a new drill does not, because a
   * new drill fixes nothing about which layout is installed.
   */
  const isWrongLayout = ref(false)

  const isComplete = computed(() => session.value.cursorIndex === text.value.length)

  /** True once anything has landed — the drill is in flight and not restartable. */
  const isStarted = computed(() => session.value.cursorIndex > 0)

  /**
   * One entry per cluster, never split — see docs/adr/0001-clusters-are-atomic.md
   */
  const renderClusters = computed(() =>
    toRenderClusters(text.value, session.value.typedText, session.value.cursorIndex),
  )

  /**
   * The cursor sits before the first cluster it has not passed. A cluster the
   * cursor is partway through is `active`, and the cursor renders before it
   * rather than inside it — splitting it would shatter the glyph.
   */
  const cursorClusterIndex = computed(() =>
    renderClusters.value.findIndex(({ state }) => isActive(state) || state === 'untyped'),
  )

  /**
   * The cluster the cursor is inside, if it is inside one at all. Between
   * clusters there is nothing to decompose.
   */
  const activeCluster = computed(() => renderClusters.value.find(({ state }) => isActive(state)))

  /**
   * What the user has actually typed into the active cluster — which may not be
   * what the drill asked for. The sign strip compares the two to say which sign
   * went wrong, so it needs the text and not just how much of it there is.
   */
  const typedIntoActiveCluster = computed(() =>
    activeCluster.value
      ? session.value.typedText.slice(activeCluster.value.start, session.value.cursorIndex)
      : '',
  )

  /**
   * The code point the drill expects next — what the on-screen keyboard points
   * at. One code point, not one sign: a subscript is two presses, and the key to
   * show is the one for the press being asked for right now.
   */
  const nextCodePoint = computed(() => text.value[session.value.cursorIndex])

  /** How long the run took, or `null` while it is unfinished or never started. */
  const elapsedMs = computed(() =>
    startedAt.value === null || finishedAt.value === null ? null : finishedAt.value - startedAt.value,
  )

  // Speed is measured in keystrokes, not clusters — see docs/adr/0002
  const kpm = computed(() => (elapsedMs.value ? Math.round(text.value.length / (elapsedMs.value / 60000)) : 0))

  const kps = computed(() => (elapsedMs.value ? text.value.length / (elapsedMs.value / 1000) : 0))

  // Judged per keystroke, so a corrected typo still costs — see @/lib/accuracy
  const accuracy = computed(() =>
    accuracyFrom(tallyKeystrokes(text.value, session.value.keystrokes)),
  )

  /**
   * Fold committed text into the run — one code point from a keypress, a whole
   * sequence from an IME. Timing starts at the first keystroke that lands, not
   * at the first key that was refused.
   */
  function commit(input: string) {
    if (!input || isComplete.value) return

    const khmer = withoutLatinLetters(input)
    if (khmer !== input) isWrongLayout.value = true
    if (!khmer) return

    isWrongLayout.value = false

    startedAt.value ??= now()

    /*
     * Recorded per code point, before the cursor moves past it — a composed IME
     * commit is several keystrokes however it arrived, per ADR-0002, and each one
     * is an attempt at whichever sign it landed in.
     */
    for (const keystroke of khmer) {
      const cursor = session.value.cursorIndex
      if (cursor >= text.value.length) break
      recorder.keystroke(cursor, keystroke, now())
      session.value = commitText(session.value, text.value, keystroke)
    }

    if (isComplete.value) finishedAt.value = now()
  }

  /**
   * Rewind one code point. A correction, not an attempt: it never reaches the
   * per-sign record, and accuracy already knows a Backspace is not a keystroke.
   */
  function rewind() {
    session.value = rewindSession(session.value)
  }

  /**
   * Start a fresh run, on a fresh recorder — the gap across a drill boundary is
   * reading time, not the learner hesitating over the first sign.
   */
  function reset() {
    session.value = emptySession
    startedAt.value = null
    finishedAt.value = null
    recorder = recordRun(text)
  }

  /** The user has read the setup panel and wants it gone. */
  function dismissWrongLayout() {
    isWrongLayout.value = false
  }

  return {
    renderClusters,
    cursorClusterIndex,
    activeCluster,
    typedIntoActiveCluster,
    nextCodePoint,
    isComplete,
    isStarted,
    isWrongLayout: computed(() => isWrongLayout.value),
    accuracy,
    kpm,
    kps,
    commit,
    rewind,
    reset,
    dismissWrongLayout,
  }
}

/**
 * Accuracy for the typing line.
 *
 * Accuracy is the proportion of keystrokes that were correct **when pressed**.
 * A keystroke's correctness is fixed at the moment it happens, so backspacing
 * over a typo and retyping it does not restore the point — see CONTEXT.md.
 *
 * State here stays in code units, matching `typedText` / `cursorIndex`: each
 * keystroke is one code point, and a stacked cluster is several of them.
 */

/** The sequence read here is the one `@/lib/typingSession` writes. */
import { BACKSPACE } from '@/lib/typingSession'

export interface KeystrokeTally {
  /** Keystrokes attempted. Backspace produces no code point and is not one. */
  total: number
  /** How many of those were wrong when pressed. */
  errors: number
}

/**
 * Fold a raw key sequence — Backspaces and all — into a tally.
 *
 * Counting Backspace would mean a typo costs twice: once for the wrong sign,
 * again for the fix. It only rewinds the cursor, so the next keystroke is
 * judged against the code point the user is now facing. The error already
 * recorded stays recorded, which is the whole point.
 *
 * A keystroke past the end of the drill is nothing to be right or wrong
 * about; the trainer refuses it too, so it never reaches the tally.
 */
export function tallyKeystrokes(drill: string, keys: string[]): KeystrokeTally {
  let cursor = 0
  let total = 0
  let errors = 0

  for (const key of keys) {
    if (key === BACKSPACE) {
      if (cursor > 0) cursor--
      continue
    }

    if (cursor >= drill.length) continue

    // The code point under the cursor, read before the cursor advances past it.
    if (key !== drill[cursor]) errors++
    cursor++
    total++
  }

  return { total, errors }
}

/**
 * A tally as a whole percent.
 *
 * Nothing typed is nothing wrong: an empty tally is 100%, not a division by
 * zero.
 */
export function accuracyFrom({ total, errors }: KeystrokeTally): number {
  if (total === 0) return 100
  return Math.round(((total - errors) / total) * 100)
}

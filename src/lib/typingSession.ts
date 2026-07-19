/**
 * Progress through one drill.
 *
 * The trainer's input path is a hidden `<input>`, so text arrives as strings
 * rather than physical key events: one code point for a direct keypress, a
 * whole sequence at once when an IME commits a composition. This module is
 * where either shape becomes keystrokes.
 *
 * State stays in code units, matching the render side — see
 * docs/adr/0001-clusters-are-atomic.md. A composed commit is not one keystroke
 * however it arrived: speed counts keystrokes, and `ស្វា` is four of them
 * whether the user pressed four keys or the IME handed them over together.
 * See docs/adr/0002-speed-counts-keystrokes.md.
 */

/**
 * Correction, not an attempt — it moves the cursor and tallies nothing.
 *
 * Exported because `@/lib/accuracy` reads the sequence this module writes: if
 * the two spelled the sentinel separately and drifted, corrections would stop
 * being recognised and every backspace would count as a keystroke.
 */
export const BACKSPACE = 'Backspace'

export interface TypingSession {
  /** What the user has actually typed, in code units. */
  typedText: string
  /** Where the next keystroke lands, as a code unit offset into the drill. */
  cursorIndex: number
  /**
   * Every key pressed at this drill, in order, Backspaces included.
   * `typedText` cannot answer for accuracy: it holds the final state, in which
   * a corrected typo has left no trace. The sequence remembers.
   */
  keystrokes: string[]
}

export const emptySession: TypingSession = Object.freeze({
  typedText: '',
  cursorIndex: 0,
  keystrokes: [],
})

/**
 * Fold committed text into the session, one keystroke per code point.
 *
 * A keystroke past the end of the drill is nothing to be right or wrong about,
 * so it is refused outright and never reaches the tally — a composed sequence
 * running past the end stops there and keeps the keystrokes that fit.
 */
export function commitText(session: TypingSession, drill: string, text: string): TypingSession {
  let { typedText, cursorIndex } = session
  const keystrokes = [...session.keystrokes]

  for (const keystroke of text) {
    if (cursorIndex >= drill.length) break
    keystrokes.push(keystroke)
    typedText += keystroke
    cursorIndex += keystroke.length
  }

  return { typedText, cursorIndex, keystrokes }
}

/**
 * Rewind one code point.
 *
 * The Backspace is recorded even at the start of the drill, where it moves
 * nothing: the sequence is the raw record of what the user pressed, and
 * accuracy already knows a Backspace is not an attempt — see `@/lib/accuracy`.
 */
export function rewind(session: TypingSession): TypingSession {
  const { typedText, cursorIndex } = session
  const keystrokes = [...session.keystrokes, BACKSPACE]

  if (cursorIndex === 0) return { typedText, cursorIndex, keystrokes }

  return {
    typedText: typedText.slice(0, -1),
    cursorIndex: cursorIndex - 1,
    keystrokes,
  }
}

/**
 * Drop Latin letters from committed text.
 *
 * A Latin letter is the signal that the user is typing on their Latin layout
 * rather than a Khmer one: no drill has anything for it to match, so the
 * trainer refuses it and says why instead of scoring a run nobody can win.
 *
 * Refused per letter, not per commit. An IME can hand over a sequence that is
 * only partly Latin, and throwing away the Khmer alongside it would lose
 * keystrokes the user typed correctly. The caller compares the result against
 * what it passed in to know whether to say anything.
 */
export function withoutLatinLetters(text: string): string {
  return text.replace(/[a-zA-Z]/g, '')
}

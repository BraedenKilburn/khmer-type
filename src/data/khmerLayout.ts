/**
 * The standard Khmer (NiDA) keyboard layout.
 *
 * Ground truth for the on-screen keyboard and, later, lesson targeting. Keys
 * are identified by `KeyboardEvent.code` — the physical position, which is
 * stable regardless of which layout the user has active. That is what lets us
 * tell someone *where* to press rather than what they would get today.
 *
 * ## Sources
 *
 * Verified by cross-checking two independent implementations of the layout
 * designed by Cambodia's National Information Communications Technology
 * Development Authority (NiDA):
 *
 * 1. Windows "Khmer (NIDA)" (`KBDKNI`, KLID 00010453) — disassembled layout
 *    XML from https://kbdlayout.info/kbdkni/download/xml
 * 2. Linux `xkeyboard-config` `symbols/kh`, group `basic` — headed "Khmer
 *    Unicode standard keyboard layout as designed by [NiDA]"
 *    https://gitlab.freedesktop.org/xkeyboard-config/xkeyboard-config/-/blob/master/symbols/kh
 *
 * The two agree on `base` and `shift` for all 48 keys. They differ only on a
 * handful of `alt` slots, where xkb assigns archaic letters (ៜ ៝ ឨ ឝ ឞ) that
 * Windows leaves empty; this table follows Windows there, since none of those
 * appear in the corpus.
 *
 * ## macOS ships a near-variant, not this layout
 *
 * macOS's input source is named "Khmer" (`com.apple.keylayout.Khmer`) and is
 * *not* NiDA — it diverges on 10 of the 48 keys at `base` or `shift`, the
 * spacebar among them. That table is `@/data/macKhmerLayout`, dumped from the
 * OS, and the two are meant to disagree: **this file is NiDA and stays NiDA.**
 * Which one a given user is on is inferred at runtime by
 * `@/lib/layoutVariant`, per docs/adr/0003-two-layout-variants-user-overridable.md.
 *
 * ## Ligature keys
 *
 * NiDA gives five keys a two-code-point output (`KeyA`+Shift → `ាំ`, and
 * similar on `Semicolon`, `KeyV`, `Comma`). They are recorded faithfully, but
 * `keystrokeFor` in `@/lib/layoutVariant` never returns one: a keystroke is one
 * code point per `docs/adr/0002-speed-counts-keystrokes.md`, and every code
 * point reachable through a ligature is also reachable as a lone press
 * elsewhere on the board.
 */

/** COENG — stacks the following consonant beneath the preceding one. */
export const COENG = '្'

export type Finger =
  | 'leftPinky'
  | 'leftRing'
  | 'leftMiddle'
  | 'leftIndex'
  | 'rightIndex'
  | 'rightMiddle'
  | 'rightRing'
  | 'rightPinky'
  | 'thumb'

/** 1 is the digit row, 4 the bottom letter row, 5 the spacebar. */
export type Row = 1 | 2 | 3 | 4 | 5

/** Which modifier state a key's output sits on. */
export type Level = 'base' | 'shift' | 'alt'

export interface KeyDef {
  /** `KeyboardEvent.code` — layout-independent physical position. */
  code: string
  /** Emitted unshifted. Empty if the key produces nothing on this level. */
  base: string
  /** Emitted with Shift. */
  shift: string
  /** Emitted with AltGr (right Alt on Windows/Linux, Option on macOS). */
  alt: string
  row: Row
  finger: Finger
}

/** Where a keystroke lands — the key to press, and the modifier it needs. */
export interface Keystroke {
  code: string
  level: Level
}

export const nidaLayout: readonly KeyDef[] = [
  // row 1
  { code: 'Backquote', base: '«', shift: '»', alt: '‍', row: 1, finger: 'leftPinky' },
  { code: 'Digit1', base: '១', shift: '!', alt: '‌', row: 1, finger: 'leftPinky' },
  { code: 'Digit2', base: '២', shift: 'ៗ', alt: '@', row: 1, finger: 'leftRing' },
  { code: 'Digit3', base: '៣', shift: '"', alt: '៑', row: 1, finger: 'leftMiddle' },
  { code: 'Digit4', base: '៤', shift: '៛', alt: '$', row: 1, finger: 'leftIndex' },
  { code: 'Digit5', base: '៥', shift: '%', alt: '€', row: 1, finger: 'leftIndex' },
  { code: 'Digit6', base: '៦', shift: '៍', alt: '៙', row: 1, finger: 'rightIndex' },
  { code: 'Digit7', base: '៧', shift: '័', alt: '៚', row: 1, finger: 'rightIndex' },
  { code: 'Digit8', base: '៨', shift: '៏', alt: '*', row: 1, finger: 'rightMiddle' },
  { code: 'Digit9', base: '៩', shift: '(', alt: '{', row: 1, finger: 'rightRing' },
  { code: 'Digit0', base: '០', shift: ')', alt: '}', row: 1, finger: 'rightPinky' },
  { code: 'Minus', base: 'ឥ', shift: '៌', alt: '×', row: 1, finger: 'rightPinky' },
  { code: 'Equal', base: 'ឲ', shift: '=', alt: '៎', row: 1, finger: 'rightPinky' },

  // row 2
  { code: 'KeyQ', base: 'ឆ', shift: 'ឈ', alt: '', row: 2, finger: 'leftPinky' },
  { code: 'KeyW', base: 'ឹ', shift: 'ឺ', alt: '', row: 2, finger: 'leftRing' },
  { code: 'KeyE', base: 'េ', shift: 'ែ', alt: 'ឯ', row: 2, finger: 'leftMiddle' },
  { code: 'KeyR', base: 'រ', shift: 'ឬ', alt: 'ឫ', row: 2, finger: 'leftIndex' },
  { code: 'KeyT', base: 'ត', shift: 'ទ', alt: '', row: 2, finger: 'leftIndex' },
  { code: 'KeyY', base: 'យ', shift: 'ួ', alt: '', row: 2, finger: 'rightIndex' },
  { code: 'KeyU', base: 'ុ', shift: 'ូ', alt: '', row: 2, finger: 'rightIndex' },
  { code: 'KeyI', base: 'ិ', shift: 'ី', alt: 'ឦ', row: 2, finger: 'rightMiddle' },
  { code: 'KeyO', base: 'ោ', shift: 'ៅ', alt: 'ឱ', row: 2, finger: 'rightRing' },
  { code: 'KeyP', base: 'ផ', shift: 'ភ', alt: 'ឰ', row: 2, finger: 'rightPinky' },
  { code: 'BracketLeft', base: 'ៀ', shift: 'ឿ', alt: 'ឩ', row: 2, finger: 'rightPinky' },
  { code: 'BracketRight', base: 'ឪ', shift: 'ឧ', alt: 'ឳ', row: 2, finger: 'rightPinky' },
  { code: 'Backslash', base: 'ឮ', shift: 'ឭ', alt: '\\', row: 2, finger: 'rightPinky' },

  // row 3
  { code: 'KeyA', base: 'ា', shift: 'ាំ', alt: '', row: 3, finger: 'leftPinky' },
  { code: 'KeyS', base: 'ស', shift: 'ៃ', alt: '', row: 3, finger: 'leftRing' },
  { code: 'KeyD', base: 'ដ', shift: 'ឌ', alt: '', row: 3, finger: 'leftMiddle' },
  { code: 'KeyF', base: 'ថ', shift: 'ធ', alt: '', row: 3, finger: 'leftIndex' },
  { code: 'KeyG', base: 'ង', shift: 'អ', alt: '', row: 3, finger: 'leftIndex' },
  { code: 'KeyH', base: 'ហ', shift: 'ះ', alt: '', row: 3, finger: 'rightIndex' },
  { code: 'KeyJ', base: COENG, shift: 'ញ', alt: '', row: 3, finger: 'rightIndex' },
  { code: 'KeyK', base: 'ក', shift: 'គ', alt: '', row: 3, finger: 'rightMiddle' },
  { code: 'KeyL', base: 'ល', shift: 'ឡ', alt: '', row: 3, finger: 'rightRing' },
  { code: 'Semicolon', base: 'ើ', shift: 'ោះ', alt: '៖', row: 3, finger: 'rightPinky' },
  { code: 'Quote', base: '់', shift: '៉', alt: 'ៈ', row: 3, finger: 'rightPinky' },

  // row 4
  { code: 'KeyZ', base: 'ឋ', shift: 'ឍ', alt: '', row: 4, finger: 'leftPinky' },
  { code: 'KeyX', base: 'ខ', shift: 'ឃ', alt: '', row: 4, finger: 'leftRing' },
  { code: 'KeyC', base: 'ច', shift: 'ជ', alt: '', row: 4, finger: 'leftMiddle' },
  { code: 'KeyV', base: 'វ', shift: 'េះ', alt: '', row: 4, finger: 'leftIndex' },
  { code: 'KeyB', base: 'ប', shift: 'ព', alt: '', row: 4, finger: 'leftIndex' },
  { code: 'KeyN', base: 'ន', shift: 'ណ', alt: '', row: 4, finger: 'rightIndex' },
  { code: 'KeyM', base: 'ម', shift: 'ំ', alt: '', row: 4, finger: 'rightIndex' },
  { code: 'Comma', base: 'ុំ', shift: 'ុះ', alt: ',', row: 4, finger: 'rightMiddle' },
  { code: 'Period', base: '។', shift: '៕', alt: '.', row: 4, finger: 'rightRing' },
  { code: 'Slash', base: '៊', shift: '?', alt: '/', row: 4, finger: 'rightPinky' },

  // row 5
  { code: 'Space', base: '​', shift: ' ', alt: ' ', row: 5, finger: 'thumb' },
]

/**
 * Characters on this layout that render no glyph of their own.
 *
 * COENG is the one that matters: it costs a keystroke and shows the learner
 * nothing, which makes it the most confusing key on the board. The on-screen
 * keyboard labels these explicitly rather than printing an empty cap.
 */
const INVISIBLE = new Map<string, string>([
  [COENG, 'COENG'],
  ['​', 'zero-width space'],
  ['‌', 'zero-width non-joiner'],
  ['‍', 'zero-width joiner'],
  [' ', 'space'],
  [' ', 'no-break space'],
])

/** The name of a character that produces no glyph, or `undefined` if it does. */
export function invisibleLabel(char: string): string | undefined {
  return INVISIBLE.get(char)
}

export const LEVELS: readonly Level[] = ['base', 'shift', 'alt']

/**
 * Index every single-code-point output of a layout back to the key that
 * produces it.
 *
 * Ligature outputs are skipped: they emit two code points from one press, so
 * naming one as the way to type a lone `ា` would be a lie. Earlier levels win,
 * so a character reachable unshifted is never reported as needing a modifier.
 *
 * Exported because there is more than one layout to index — see
 * `@/lib/layoutVariant`, which holds one of these per variant.
 */
export function indexKeystrokes(layout: readonly KeyDef[]): Map<string, Keystroke> {
  const keystrokes = new Map<string, Keystroke>()

  for (const level of LEVELS) {
    for (const key of layout) {
      const output = key[level]
      if ([...output].length !== 1) continue
      if (!keystrokes.has(output)) keystrokes.set(output, { code: key.code, level })
    }
  }

  return keystrokes
}

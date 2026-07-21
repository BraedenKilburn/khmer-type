/**
 * Apple's macOS "Khmer" keyboard layout.
 *
 * Not NiDA. macOS ships one Khmer input source, named simply "Khmer"
 * (`com.apple.keylayout.Khmer`), and it diverges from the NiDA standard in
 * `@/data/khmerLayout` on 10 of 48 keys at base or shift — 22 keys once AltGr
 * counts. The spacebar is among them, which is the most-pressed key on the
 * board, so an on-screen keyboard that assumed NiDA would be wrong about it for
 * every macOS learner. See docs/adr/0003-two-layout-variants-user-overridable.md.
 *
 * **The two tables are meant to disagree.** Reconciling an entry here with its
 * NiDA counterpart would make both wrong. Nothing in this file is a fix for
 * anything in that one.
 *
 * ## Source
 *
 * Dumped from macOS itself rather than transcribed from a chart, by
 * `scripts/dump-macos-layout.swift`: `TISCreateInputSourceList` filtered to
 * `com.apple.keylayout.Khmer`, `kTISPropertyUnicodeKeyLayoutData` for its
 * `uchr` data, then `UCKeyTranslate` over virtual keycodes 0–127 at no
 * modifier, Shift, Option, and Shift+Option. Virtual keycodes were mapped to
 * `KeyboardEvent.code` through the standard ANSI assignment; `row` and `finger`
 * are carried over from the NiDA table, since the physical board is the same
 * board.
 *
 * Dumped on macOS 26 (Darwin 27.0.0). Apple has not changed this layout in
 * years, but if a future release moves a key, re-dump rather than patch.
 *
 * ## Divergences from NiDA at base or shift
 *
 * | Key       | NiDA          | macOS "Khmer" |
 * | --------- | ------------- | ------------- |
 * | Space     | ZWSP / space  | space / ZWSP  |
 * | Digit9    | ៩ / (         | ៩ / ឰ         |
 * | Digit0    | ០ / )         | ០ / ឳ         |
 * | Equal     | ឲ / =         | ឲ / ៎         |
 * | Backslash | ឮ / ឭ         | ឭ / ឮ         |
 * | KeyA      | ា / ាំ (lig.) | ា / ឫ         |
 * | KeyV      | វ / េះ (lig.) | វ / ៈ         |
 * | Semicolon | ើ / ោះ (lig.) | ើ / ៖         |
 * | Comma     | ុំ / ុះ (lig.) | ឦ / ឱ         |
 * | Slash     | ៊ / ?         | ៊ / ឯ         |
 *
 * Apple assigns no ligature: every key here emits one code point, so the four
 * NiDA ligature keys become four single signs, and the code points NiDA reaches
 * only through AltGr are on Shift instead.
 */

import { COENG, type KeyDef } from '@/data/khmerLayout'

export const macKhmerLayout: readonly KeyDef[] = [
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
  { code: 'Digit9', base: '៩', shift: 'ឰ', alt: '(', row: 1, finger: 'rightRing' },
  { code: 'Digit0', base: '០', shift: 'ឳ', alt: ')', row: 1, finger: 'rightPinky' },
  { code: 'Minus', base: 'ឥ', shift: '៌', alt: '+', row: 1, finger: 'rightPinky' },
  { code: 'Equal', base: 'ឲ', shift: '៎', alt: '=', row: 1, finger: 'rightPinky' },

  // row 2
  { code: 'KeyQ', base: 'ឆ', shift: 'ឈ', alt: '', row: 2, finger: 'leftPinky' },
  { code: 'KeyW', base: 'ឹ', shift: 'ឺ', alt: '', row: 2, finger: 'leftRing' },
  { code: 'KeyE', base: 'េ', shift: 'ែ', alt: '', row: 2, finger: 'leftMiddle' },
  { code: 'KeyR', base: 'រ', shift: 'ឬ', alt: '', row: 2, finger: 'leftIndex' },
  { code: 'KeyT', base: 'ត', shift: 'ទ', alt: 'ថ', row: 2, finger: 'leftIndex' },
  { code: 'KeyY', base: 'យ', shift: 'ួ', alt: '', row: 2, finger: 'rightIndex' },
  { code: 'KeyU', base: 'ុ', shift: 'ូ', alt: '', row: 2, finger: 'rightIndex' },
  { code: 'KeyI', base: 'ិ', shift: 'ី', alt: '', row: 2, finger: 'rightMiddle' },
  { code: 'KeyO', base: 'ោ', shift: 'ៅ', alt: '', row: 2, finger: 'rightRing' },
  { code: 'KeyP', base: 'ផ', shift: 'ភ', alt: '', row: 2, finger: 'rightPinky' },
  { code: 'BracketLeft', base: 'ៀ', shift: 'ឿ', alt: 'ឨ', row: 2, finger: 'rightPinky' },
  { code: 'BracketRight', base: 'ឪ', shift: 'ឧ', alt: 'ឩ', row: 2, finger: 'rightPinky' },
  { code: 'Backslash', base: 'ឭ', shift: 'ឮ', alt: '\\', row: 2, finger: 'rightPinky' },

  // row 3
  { code: 'KeyA', base: 'ា', shift: 'ឫ', alt: 'ៜ', row: 3, finger: 'leftPinky' },
  { code: 'KeyS', base: 'ស', shift: 'ៃ', alt: 'ឝ', row: 3, finger: 'leftRing' },
  { code: 'KeyD', base: 'ដ', shift: 'ឌ', alt: 'ឞ', row: 3, finger: 'leftMiddle' },
  { code: 'KeyF', base: 'ថ', shift: 'ធ', alt: '', row: 3, finger: 'leftIndex' },
  { code: 'KeyG', base: 'ង', shift: 'អ', alt: '', row: 3, finger: 'leftIndex' },
  { code: 'KeyH', base: 'ហ', shift: 'ះ', alt: '', row: 3, finger: 'rightIndex' },
  { code: 'KeyJ', base: COENG, shift: 'ញ', alt: '', row: 3, finger: 'rightIndex' },
  { code: 'KeyK', base: 'ក', shift: 'គ', alt: '', row: 3, finger: 'rightMiddle' },
  { code: 'KeyL', base: 'ល', shift: 'ឡ', alt: '', row: 3, finger: 'rightRing' },
  { code: 'Semicolon', base: 'ើ', shift: '៖', alt: ';', row: 3, finger: 'rightPinky' },
  { code: 'Quote', base: '់', shift: '៉', alt: "'", row: 3, finger: 'rightPinky' },

  // row 4
  { code: 'KeyZ', base: 'ឋ', shift: 'ឍ', alt: '', row: 4, finger: 'leftPinky' },
  { code: 'KeyX', base: 'ខ', shift: 'ឃ', alt: '', row: 4, finger: 'leftRing' },
  { code: 'KeyC', base: 'ច', shift: 'ជ', alt: '', row: 4, finger: 'leftMiddle' },
  { code: 'KeyV', base: 'វ', shift: 'ៈ', alt: '', row: 4, finger: 'leftIndex' },
  { code: 'KeyB', base: 'ប', shift: 'ព', alt: '', row: 4, finger: 'leftIndex' },
  { code: 'KeyN', base: 'ន', shift: 'ណ', alt: '', row: 4, finger: 'rightIndex' },
  { code: 'KeyM', base: 'ម', shift: 'ំ', alt: '', row: 4, finger: 'rightIndex' },
  { code: 'Comma', base: 'ឦ', shift: 'ឱ', alt: ',', row: 4, finger: 'rightMiddle' },
  { code: 'Period', base: '។', shift: '៕', alt: '.', row: 4, finger: 'rightRing' },
  { code: 'Slash', base: '៊', shift: 'ឯ', alt: '?', row: 4, finger: 'rightPinky' },

  // row 5
  { code: 'Space', base: ' ', shift: '​', alt: ' ', row: 5, finger: 'thumb' },
]

/**
 * Which Khmer layout the user is actually typing on.
 *
 * There is no single Khmer keyboard. NiDA is the standard, and Windows and
 * Linux ship it; macOS ships a near-variant of its own under the plain name
 * "Khmer", differing on 10 of 48 keys including the spacebar. An on-screen
 * keyboard that guessed would point a macOS learner at the wrong key on the
 * key they press most. See docs/adr/0003-two-layout-variants-user-overridable.md.
 *
 * ## Why detection is inferred rather than asked for
 *
 * `navigator.keyboard.getLayoutMap()` would answer directly and is not an
 * option: Chromium-only, with a negative standards position and no defined
 * behaviour for non-Latin layouts — and absent in Safari, which is exactly
 * where the affected users are.
 *
 * So it is inferred from typing already being captured. `keydown` gives the
 * physical key, the `beforeinput` that follows gives the character it produced,
 * and a pair that only one table can explain names the variant. The divergent
 * keys are the discriminators and the spacebar is one of them, so the answer
 * usually arrives within the first few keystrokes.
 */

import {
  indexKeystrokes,
  nidaLayout,
  type KeyDef,
  type Keystroke,
  type Level,
} from '@/data/khmerLayout'
import { macKhmerLayout } from '@/data/macKhmerLayout'
import type { Os } from '@/lib/platform'

export type LayoutVariant = 'nida' | 'macos'

export const LAYOUT_VARIANTS: readonly { id: LayoutVariant; label: string; hint: string }[] = [
  { id: 'nida', label: 'Khmer (NiDA)', hint: 'The standard. Windows and Linux ship this one.' },
  { id: 'macos', label: 'Khmer (macOS)', hint: "Apple's variant, named simply “Khmer”." },
]

const LAYOUTS: Record<LayoutVariant, readonly KeyDef[]> = {
  nida: nidaLayout,
  macos: macKhmerLayout,
}

/** The variant assumed where the platform says nothing — NiDA is the standard. */
export const DEFAULT_VARIANT: LayoutVariant = 'nida'

/**
 * The variant to draw before any keystroke has discriminated.
 *
 * Detection is passive and most drills never press a key that tells the tables
 * apart: at `base` level only Space and Backslash diverge, so a learner working
 * through single words can type for a long time without producing any evidence
 * at all. Until they do, this is the whole answer — which made a fixed NiDA
 * default a macOS user's permanent, silent, wrong keyboard.
 *
 * The OS is the best prior available. macOS ships exactly one Khmer input
 * source and it is Apple's, so a Mac is overwhelmingly likely to be on it;
 * Windows and Linux ship NiDA. This is still only a guess and is still the
 * weakest evidence there is — a keystroke overrules it and the user overrules
 * both, per ADR-0003. Someone who installed a NiDA layout on a Mac starts on
 * the wrong table now instead of the right one, which is the trade the ADR
 * already names: they are the case detection misreads, and the override is
 * what serves them.
 */
export function defaultVariantFor(os: Os): LayoutVariant {
  return os === 'macos' ? 'macos' : DEFAULT_VARIANT
}

/** The key table for a variant, in board order. */
export function layoutFor(variant: LayoutVariant): readonly KeyDef[] {
  return LAYOUTS[variant]
}

const KEYSTROKES: Record<LayoutVariant, Map<string, Keystroke>> = {
  nida: indexKeystrokes(nidaLayout),
  macos: indexKeystrokes(macKhmerLayout),
}

/** Where to press to produce `char`, or `undefined` if the variant cannot. */
export function keystrokeFor(char: string, variant: LayoutVariant): Keystroke | undefined {
  return KEYSTROKES[variant].get(char)
}

const KEYS_BY_CODE: Record<LayoutVariant, Map<string, KeyDef>> = {
  nida: new Map(nidaLayout.map((key) => [key.code, key])),
  macos: new Map(macKhmerLayout.map((key) => [key.code, key])),
}

/**
 * Which level the modifiers held during a keypress select.
 *
 * `undefined` where no table has an answer: nothing is recorded for Shift and
 * AltGr together, so a press holding both is not evidence of anything. AltGr is
 * right Alt on Windows and Linux and Option on macOS, both of which arrive as
 * `altKey`.
 */
export function levelFromModifiers(shiftKey: boolean, altKey: boolean): Level | undefined {
  if (shiftKey && altKey) return undefined
  if (altKey) return 'alt'
  return shiftKey ? 'shift' : 'base'
}

/** True when pressing `code` at `level` on `variant` produces exactly `text`. */
function produces(variant: LayoutVariant, code: string, level: Level, text: string): boolean {
  return KEYS_BY_CODE[variant].get(code)?.[level] === text
}

/**
 * Name the variant a single observed keystroke rules in, if it rules one in.
 *
 * The modifier level is part of the evidence, not a detail: both tables put
 * ZWSP on the spacebar, and it is *which level* they put it on that tells them
 * apart. Comparing outputs without it throws away the strongest discriminator
 * on the board.
 *
 * `undefined` covers three different situations, all of which mean the same
 * thing here — keep waiting:
 *
 * - both tables explain the keystroke, so it discriminates nothing (most keys)
 * - neither does, so the user is on some third layout, or an IME handed over
 *   text no single key produced
 * - the code is not one of the 48 keys either table describes
 *
 * A wrong guess is worse than no guess: it would point a learner at a key that
 * does not do what the picture says.
 */
export function variantFromKeystroke(
  code: string,
  level: Level,
  text: string,
): LayoutVariant | undefined {
  const matches = LAYOUT_VARIANTS.map(({ id }) => id).filter((variant) =>
    produces(variant, code, level, text),
  )

  return matches.length === 1 ? matches[0] : undefined
}

/**
 * Decomposition for the sign strip.
 *
 * A cluster is what the browser shapes and what the typing line renders whole —
 * see docs/adr/0001-clusters-are-atomic.md. A **sign** is the smallest
 * teachable unit inside it: a base consonant, a subscript consonant, a
 * dependent vowel, or a diacritic. See CONTEXT.md.
 *
 * The distinction matters because the typing line cannot show progress inside a
 * cluster without splitting a shaped run, and the unit a learner actually
 * fumbles is the sign, not the cluster. This module is the one place that says
 * where the sign boundaries are: the strip, the on-screen keyboard, and the
 * per-sign stats all read it rather than each walking code points their own
 * way, which is how two of them would end up disagreeing about `្ក`.
 */

/** COENG — stacks the following consonant beneath the preceding one. */
export const COENG = '្'

/** U+25CC, the placeholder a combining sign attaches to when shown alone. */
const DOTTED_CIRCLE = '◌'

/*
 * Ranges as escapes rather than literals: most of these bounds are combining
 * marks, which in a bracket expression render on top of the bracket itself and
 * make the class unreadable. These are the ranges the v3 tagging pass sorts by
 * — see docs/plans/v3-progression.md.
 */
/** `ក` through `អ`. */
const KHMER_CONSONANT = /^[ក-អ]$/
/** `ឣ` through `឵` — vowels that stand on their own, no consonant needed. */
const INDEPENDENT_VOWEL = /^[ឣ-឵]$/
/** `ា` through `ៅ` — attaches to a consonant and cannot stand alone. */
const DEPENDENT_VOWEL = /^[ា-ៅ]$/
/**
 * The combining marks, straddling COENG at U+17D2.
 *
 * Narrower than the range docs/plans/v3-progression.md tags by, which runs to
 * U+17DD and sweeps up `។` `៕` `៖` `៛` — punctuation and a currency sign that
 * combine with nothing and would be given a dotted circle they have no use for.
 * Only U+17DD (`៝`) above COENG is an actual mark.
 */
const DIACRITIC = /^[ំ-៑៓៝]$/
/** `០` through `៩`. */
const DIGIT = /^[០-៩]$/
/** Whitespace, ZWSP included: it is a key on the layout and costs a keystroke. */
const SPACE = /^[\s​]$/

/**
 * The 33 consonants of the Khmer alphabet, in traditional order.
 *
 * Unicode lists 35 code points from `ក` to `អ`; `ឝ` and `ឞ` are transliteration
 * letters for Pali and Sanskrit rather than letters of the alphabet, and no
 * learner is drilled on them. Code point order *is* the traditional order for
 * the rest, which is why this reads as a range with two holes rather than a
 * hand-written list.
 */
export const BASE_CONSONANTS: readonly string[] = Array.from(
  { length: 0x17a2 - 0x1780 + 1 },
  (_, index) => String.fromCodePoint(0x1780 + index),
).filter((consonant) => consonant !== 'ឝ' && consonant !== 'ឞ')

/** Every consonant in its subscript form — a different key, a different skill. */
export const SUBSCRIPT_CONSONANTS: readonly string[] = BASE_CONSONANTS.map(
  (consonant) => COENG + consonant,
)

export type SignKind =
  | 'baseConsonant'
  | 'subscriptConsonant'
  | 'independentVowel'
  | 'dependentVowel'
  | 'diacritic'
  | 'digit'
  | 'space'
  | 'symbol'

/**
 * Whether COENG binds what follows it.
 *
 * The one statement of the rule the whole app turns on. Segmentation asks it of
 * a whole segment — is this the consonant the previous segment's trailing COENG
 * was waiting for — and sign decomposition asks it of a single code point, so
 * it reads the first code point and answers about that. A COENG with nothing
 * stackable after it is malformed input rather than a stack, and must not
 * swallow the space or Latin letter that happens to follow.
 *
 * Stated once because two statements would drift, and the two things that would
 * then disagree are what a cluster is and what a sign is — the two units this
 * codebase counts in.
 */
export function stacksAfterCoeng(following: string): boolean {
  return KHMER_CONSONANT.test([...following][0] ?? '')
}

/**
 * Split a cluster into its signs.
 *
 * COENG binds the consonant after it: the pair is one sign and one motor skill,
 * and recording `្ក` as COENG-then-`ក` would file the subscript's difficulty
 * under the base consonant it looks nothing like. Everything else is one code
 * point, one sign.
 */
export function toSigns(cluster: string): string[] {
  const codePoints = [...cluster]
  const signs: string[] = []

  for (let index = 0; index < codePoints.length; index++) {
    const codePoint = codePoints[index]
    const next = codePoints[index + 1]

    if (codePoint === COENG && next && stacksAfterCoeng(next)) {
      signs.push(codePoint + next)
      index++
    } else {
      signs.push(codePoint)
    }
  }

  return signs
}

/** What kind of sign this is — the classification lessons and stats sort by. */
export function signKind(sign: string): SignKind {
  if (sign.startsWith(COENG) && sign.length > 1) return 'subscriptConsonant'
  if (KHMER_CONSONANT.test(sign)) return 'baseConsonant'
  if (INDEPENDENT_VOWEL.test(sign)) return 'independentVowel'
  if (DEPENDENT_VOWEL.test(sign)) return 'dependentVowel'
  if (DIACRITIC.test(sign) || sign === COENG) return 'diacritic'
  if (DIGIT.test(sign)) return 'digit'
  if (SPACE.test(sign)) return 'space'
  return 'symbol'
}

/** True for signs that render on top of, under, or beside another one. */
function isCombining(sign: string): boolean {
  const kind = signKind(sign)
  return kind === 'subscriptConsonant' || kind === 'dependentVowel' || kind === 'diacritic'
}

/**
 * A sign as it should be shown standing alone.
 *
 * A dependent vowel or a subscript has no form of its own — rendered by itself
 * it either collapses onto whatever precedes it or draws nothing at all. The
 * dotted circle gives it the base it is waiting for.
 */
export function displaySign(sign: string): string {
  return isCombining(sign) ? DOTTED_CIRCLE + sign : sign
}

/**
 * Name a sign in words.
 *
 * Structural, never linguistic: this is a typing trainer, and romanization and
 * gloss were cut on scope (issue #17). The learner needs to know which key
 * makes the mark, not how to pronounce it.
 *
 * COENG is why this function exists. It is invisible, it costs a keystroke, and
 * a learner staring at a glyph they cannot see has no way to guess that the
 * answer is two presses.
 */
export function describeSign(sign: string): string {
  switch (signKind(sign)) {
    case 'subscriptConsonant':
      return `Subscript ${sign.slice(1)} — press ${COENG} then ${sign.slice(1)}`
    case 'baseConsonant':
      return `Consonant ${sign}`
    case 'independentVowel':
      return `Independent vowel ${sign}`
    case 'dependentVowel':
      return `Vowel sign ${displaySign(sign)}`
    case 'diacritic':
      return sign === COENG
        ? 'COENG — stacks the next consonant beneath this one'
        : `Diacritic ${displaySign(sign)}`
    case 'digit':
      return `Digit ${sign}`
    case 'space':
      return 'Space'
    default:
      return `Symbol ${sign}`
  }
}

export type SignState = 'done' | 'current' | 'wrong' | 'pending'

export interface SignProgress {
  /** The sign itself, as typed — `្វ`, not `◌្វ`. */
  sign: string
  /** The same sign made legible standing alone. */
  display: string
  state: SignState
}

/**
 * Walk a cluster's signs against what has actually been typed into it.
 *
 * Takes the typed text rather than a count of it, because position alone cannot
 * answer the question the strip exists to answer. The typing line cannot mark an
 * error inside a cluster — splitting a shaped run is the one thing
 * docs/adr/0001-clusters-are-atomic.md forbids — so until the cluster is
 * finished, this is the *only* place a learner can be told that the keystroke
 * they just made was wrong, and which of the three or four signs it landed in.
 *
 * `typed` is the cluster's own slice of the drill's typed text, so its length
 * doubles as the cursor offset: the cursor moves one keystroke at a time and a
 * subscript takes two of them. A sign the cursor is partway through — COENG
 * pressed, consonant not yet — is still `current` as long as what has landed
 * matches, which is exactly the moment the strip's naming earns its place.
 */
export function toSignProgress(cluster: string, typed: string): SignProgress[] {
  let consumed = 0

  return toSigns(cluster).map((sign) => {
    const start = consumed
    consumed += sign.length

    /*
     * Only the part of this sign the cursor has actually reached. Comparing the
     * whole sign would call a half-typed subscript wrong for not being finished.
     */
    const typedHere = typed.slice(start, consumed)
    const expected = sign.slice(0, typedHere.length)

    let state: SignState
    if (typedHere !== expected) state = 'wrong'
    else if (consumed <= typed.length) state = 'done'
    else if (start <= typed.length) state = 'current'
    else state = 'pending'

    return { sign, display: displaySign(sign), state }
  })
}

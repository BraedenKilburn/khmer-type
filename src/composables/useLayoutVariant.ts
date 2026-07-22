import { computed } from 'vue'
import type { Level } from '@/data/khmerLayout'
import {
  DEFAULT_VARIANT,
  defaultVariantFor,
  variantFromKeystroke,
  type LayoutVariant,
} from '@/lib/layoutVariant'
import { detectOs } from '@/lib/platform'
import { record } from '@/composables/records'

/**
 * What the OS suggests, absent any evidence from typing.
 *
 * Read inside the computed rather than captured at module load so that it stays
 * testable — the composable's state is module-scoped, and a value frozen at
 * import time could only ever be exercised by whichever test imported first.
 * `navigator` is absent outside a DOM, where the standard is the right answer.
 */
function platformVariant(): LayoutVariant {
  if (typeof navigator === 'undefined') return DEFAULT_VARIANT
  return defaultVariantFor(detectOs(navigator.userAgent))
}

/**
 * Which layout the on-screen keyboard should draw.
 *
 * The user's word beats the inference beats the platform's guess. **Detection
 * never overrules an override** — someone who has told us they are on NiDA
 * while their machine says otherwise has a reason we do not know, and a
 * keyboard that flipped underneath them mid-drill would be worse than one that
 * is merely wrong.
 *
 * The platform guess sits last because it is the weakest evidence: it says what
 * the machine probably ships, not what the user actually switched to.
 */
export function useLayoutVariant() {
  /** `null` means "no override" — the app is free to infer. */
  const override = record('layoutOverride')
  /**
   * What typing has revealed so far. Not kept across visits, and declared so
   * beside the override — see `@/composables/records`.
   */
  const detected = record('detectedLayout')

  const variant = computed<LayoutVariant>(
    () => override.value ?? detected.value ?? platformVariant(),
  )

  /**
   * Offer up a keystroke: the physical key, the modifier level, and the text it
   * produced.
   *
   * Ignored entirely while an override stands, so a keystroke that contradicts
   * the user cannot quietly reverse them. Otherwise the first keystroke that
   * discriminates wins and later ones are cheap no-ops.
   */
  function observeKeystroke(code: string, level: Level, text: string) {
    if (override.value || detected.value) return

    const inferred = variantFromKeystroke(code, level, text)
    if (inferred) detected.value = inferred
  }

  return {
    variant,
    /** The user's choice, or `null` while they have not made one. */
    override,
    detected: computed(() => detected.value),
    observeKeystroke,
  }
}

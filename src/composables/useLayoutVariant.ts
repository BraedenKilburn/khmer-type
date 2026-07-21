import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Level } from '@/data/khmerLayout'
import { DEFAULT_VARIANT, variantFromKeystroke, type LayoutVariant } from '@/lib/layoutVariant'

/**
 * Versioned so the stored shape can migrate later without reading a value that
 * no longer means what it did.
 */
const OVERRIDE_KEY = 'khmer-type:layout-variant:v1'

/** `null` means "no override" — the app is free to infer. */
const override = useStorage<LayoutVariant | null>(OVERRIDE_KEY, null)

/**
 * What typing has revealed so far. Deliberately not persisted: a user can move
 * between machines, and a detection carried over from last week's laptop is a
 * guess wearing the clothes of a fact. An override is a statement, and that is
 * what survives a reload.
 */
const detected = ref<LayoutVariant | null>(null)

/**
 * Which layout the on-screen keyboard should draw.
 *
 * The user's word beats the inference beats the standard. **Detection never
 * overrules an override** — someone who has told us they are on NiDA while
 * their machine says otherwise has a reason we do not know, and a keyboard
 * that flipped underneath them mid-drill would be worse than one that is
 * merely wrong.
 */
export function useLayoutVariant() {
  const variant = computed<LayoutVariant>(
    () => override.value ?? detected.value ?? DEFAULT_VARIANT,
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

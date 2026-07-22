import { record } from '@/composables/records'

/**
 * Whether the on-screen keyboard is showing.
 *
 * Persisted, because this is a preference rather than a session state: a
 * learner who has memorised the board wants it gone and does not want to say so
 * again every visit, and a beginner wants it there tomorrow too. Which is also
 * why "start over" leaves it alone — see `@/composables/records`.
 */
export function useKeyboardVisible() {
  const visible = record('keyboardVisible')

  return {
    visible,
    toggle: () => {
      visible.value = !visible.value
    },
  }
}

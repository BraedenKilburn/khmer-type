import { useStorage } from '@vueuse/core'

/**
 * Whether the on-screen keyboard is showing.
 *
 * Persisted, because this is a preference rather than a session state: a
 * learner who has memorised the board wants it gone and does not want to say so
 * again every visit, and a beginner wants it there tomorrow too.
 */
const KEY = 'khmer-type:keyboard-visible:v1'

const visible = useStorage(KEY, true)

export function useKeyboardVisible() {
  return {
    visible,
    toggle: () => {
      visible.value = !visible.value
    },
  }
}

import { ref, computed } from 'vue'
import { corpus } from '@/data/corpus'

/**
 * Sign decomposition, the unit beneath the cluster.
 *
 * Re-exported here because the strip, the on-screen keyboard, and the per-sign
 * stats all reach for it through the drills they are describing; it lives in
 * `@/lib/signs` with the rest of the pure text logic.
 */
export { toSigns } from '@/lib/signs'

/**
 * Remove Zero Width Space (ZWSP) code points. They carry no keystroke, so a
 * drill that contains them would be impossible to finish.
 */
export function stripZwsp(drill: string): string {
  return drill.replace(/\u200B/g, '')
}

export function useDrills() {
  const currentIndex = ref(0)
  const currentDrill = computed(() => stripZwsp(corpus[currentIndex.value]))

  let usedIndices: number[] = []
  function setNextDrill() {
    // If we've used all drills, reset the used indices
    if (usedIndices.length === corpus.length) {
      usedIndices = []
    }

    // Get available indices (ones we haven't used yet)
    const availableIndices = corpus
      .map((_, index: number) => index)
      .filter((index: number) => !usedIndices.includes(index))

    // Randomly select from available indices
    const randomIndex = Math.floor(Math.random() * availableIndices.length)
    const nextIndex = availableIndices[randomIndex]

    // Update state
    currentIndex.value = nextIndex
    usedIndices.push(nextIndex)
  }

  return {
    currentDrill,
    setNextDrill
  }
}

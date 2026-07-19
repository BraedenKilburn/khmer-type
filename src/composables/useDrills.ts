import { ref, computed } from 'vue'
import { corpus } from '@/data/corpus'

export function useDrills() {
  const currentIndex = ref(0)
  const currentDrill = computed(() => {
    // Remove Zero Width Space (ZWSP) character
    return corpus[currentIndex.value].replace(/\u200B/g, '')
  })

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

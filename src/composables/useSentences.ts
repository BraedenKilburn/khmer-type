import { ref, computed } from 'vue'
import { khmerSentences } from '@/data/khmerSentences'

export function useSentences() {
  const currentIndex = ref(0)
  const currentSentence = computed(() => {
    // Remove Zero Width Space (ZWSP) character
    return khmerSentences[currentIndex.value].replace(/\u200B/g, '')
  })

  let usedIndices: number[] = []
  function setNextSentence() {
    // If we've used all sentences, reset the used indices
    if (usedIndices.length === khmerSentences.length) {
      usedIndices = []
    }

    // Get available indices (ones we haven't used yet)
    const availableIndices = khmerSentences
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
    currentSentence,
    setNextSentence
  }
}

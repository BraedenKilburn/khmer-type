<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed, useTemplateRef } from 'vue'

const currentSentence = ref('រៀនវាយអក្សរខ្មែរ')
const typedText = ref('')
const cursorIndex = ref(0)

const typingAreaRef = useTemplateRef('typingAreaRef')
const isFocused = ref(false)

function focusTypingArea() {
  if (typingAreaRef.value) typingAreaRef.value.focus()
}

/**
 * Find the index of the first incorrect character within the typed portion
 */
const firstErrorIndex = computed(() => {
  // Iterate only up to the current cursor position
  for (let i = 0; i < cursorIndex.value; i++) {
    if (currentSentence.value[i] !== typedText.value[i]) return i
  }
  return -1
})

/**
 * The part of the sentence that has been typed correctly
 */
const correctSubstring = computed(() => {
  const errorIdx = firstErrorIndex.value
  if (errorIdx !== -1) {
    // If there's an error, the correct part is the segment before the error
    return currentSentence.value.substring(0, errorIdx)
  } else {
    // If no error, the correct part is the entire typed portion up to the cursor
    return currentSentence.value.substring(0, cursorIndex.value)
  }
})

/**
 * The part of the sentence that has been typed incorrectly
 */
const incorrectSubstring = computed(() => {
  const errorIdx = firstErrorIndex.value
  if (errorIdx !== -1) {
    // If there's an error, the incorrect part is the segment from the error to the cursor
    return currentSentence.value.substring(errorIdx, cursorIndex.value)
  } else {
    // If no error, the incorrect part is empty
    return ''
  }
})

/**
 * The remaining part of the sentence that has not yet been typed
 */
const untypedSubstring = computed(() => {
  return currentSentence.value.substring(cursorIndex.value)
})

const handleKeydown = (event: KeyboardEvent) => {
  const key = event.key

  // Prevent default behavior for common keys in a typing test context
  // that might interfere (like space scrolling, backspace navigating)
  // Check for specific keys or single character keys while avoiding modifiers (Ctrl, Alt, Meta)
  if (
    [' ', 'Backspace', 'Enter'].includes(key) ||
    (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey)
  ) {
    event.preventDefault()
  }

  // Handle Backspace
  if (key === 'Backspace') {
    if (cursorIndex.value > 0) {
      cursorIndex.value--
      // Remove the last character from typedText state
      typedText.value = typedText.value.slice(0, -1)
    }
    return // Stop processing after handling backspace
  }

  // Handle standard character input
  // Check if it's a single character key (not a function key like 'Shift', 'ArrowUp', etc.)
  // and if we are not beyond the length of the current sentence.
  if (key.length === 1 && cursorIndex.value < currentSentence.value.length) {
    typedText.value += key
    cursorIndex.value++
  }
}

onMounted(() => {
  // Listen for keydown events on the entire window
  window.addEventListener('keydown', handleKeydown)

  // Use nextTick to ensure the DOM element is available before trying to focus
  nextTick(() => {
    focusTypingArea() // Focus the typing area on mount
  })
})

onBeforeUnmount(() => {
  // Clean up the keydown listener
  window.removeEventListener('keydown', handleKeydown)
})

function handleClickContainer() {
  focusTypingArea()
}

function handleFocus() {
  isFocused.value = true
}

function handleBlur() {
  isFocused.value = false
}
</script>

<template>
  <div class="typing-container" @click="handleClickContainer" :class="{ 'is-focused': isFocused }">
    <div
      class="typing-area"
      tabindex="0"
      ref="typingAreaRef"
      @focus="handleFocus"
      @blur="handleBlur"
    >
      <span class="char-correct">{{ correctSubstring }}</span>
      <span class="char-incorrect">{{ incorrectSubstring }}</span>
      <span id="cursor" v-if="isFocused"></span>
      <span class="char-untyped">{{ untypedSubstring }}</span>
    </div>
  </div>
</template>

<style scoped>
.typing-container {
  padding: 30px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 12px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.08);
  max-width: 1200px;
  width: 95%;
  text-align: left;
  line-height: 2;
  cursor: text;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;

  &.is-focused {
    border-color: #007bff;
    box-shadow: 0 6px 20px rgba(0, 123, 255, 0.15);
  }

  .typing-area {
    min-height: 100px;
    outline: none;
    padding: 15px;
    font-size: 2em;
    direction: ltr;
    word-wrap: break-word;

    span {
      display: inline;
      white-space: pre-wrap;

      &.char-correct {
        color: #333;
      }

      &.char-incorrect {
        color: #dc3545;
        font-weight: bold;
      }

      &.char-untyped {
        color: #aaa;
      }
    }

    #cursor {
      display: inline-block;
      width: 3px;
      height: 1em;
      background-color: #007bff;
      margin-left: 1px;
      margin-right: 1px;
      vertical-align: middle;
      animation: blink 0.8s step-end infinite;
    }

    @keyframes blink {
      0%,
      100% {
        opacity: 1;
      }

      50% {
        opacity: 0;
      }
    }
  }
}
</style>

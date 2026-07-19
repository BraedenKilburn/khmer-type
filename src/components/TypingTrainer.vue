<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  nextTick,
  computed,
  useTemplateRef,
  watch,
} from 'vue'
import { useToast } from 'primevue/usetoast';
import { useDrills } from '@/composables/useDrills'
import TypingCompletion from '@/components/TypingCompletion.vue'
import Button from 'primevue/button'

const { currentDrill, setNextDrill } = useDrills()
const typedText = ref('')
const cursorIndex = ref(0)

/**
 * Find the index of the first incorrect character within the typed portion
 */
const firstErrorIndex = computed(() => {
  // Iterate only up to the current cursor position
  for (let i = 0; i < cursorIndex.value; i++) {
    if (currentDrill.value[i] !== typedText.value[i]) return i
  }
  return -1
})

/**
 * The part of the drill that has been typed correctly
 */
const correctSubstring = computed(() => {
  const errorIdx = firstErrorIndex.value
  if (errorIdx !== -1) {
    // If there's an error, the correct part is the segment before the error
    return currentDrill.value.substring(0, errorIdx)
  } else {
    // If no error, the correct part is the entire typed portion up to the cursor
    return currentDrill.value.substring(0, cursorIndex.value)
  }
})

/**
 * The part of the drill that has been typed incorrectly
 */
const incorrectSubstring = computed(() => {
  const errorIdx = firstErrorIndex.value
  if (errorIdx !== -1) {
    // If there's an error, the incorrect part is the segment from the error to the cursor
    return currentDrill.value.substring(errorIdx, cursorIndex.value)
  } else {
    // If no error, the incorrect part is empty
    return ''
  }
})

/**
 * The remaining part of the drill that has not yet been typed
 */
const untypedSubstring = computed(() => {
  return currentDrill.value.substring(cursorIndex.value)
})

// ===============================
// Handle Typing (Keydown)
// ===============================

const toast = useToast()

const isFocused = ref(false)
const startTime = ref<number | null>(null)
const endTime = ref<number | null>(null)

const handleKeydown = (event: KeyboardEvent) => {
  if (!isFocused.value) return

  const key = event.key

  // Check for English input
  if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
    toast.removeAllGroups()
    toast.add({
      severity: 'info',
      summary: 'Unexpected English Input',
      detail: 'Please switch to Khmer input mode to type correctly.',
      life: 3000,
    })
    return
  }

  // Start timing on first keystroke
  if (!startTime.value && key.length === 1) {
    startTime.value = Date.now()
  }

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
  // and if we are not beyond the length of the current drill.
  if (key.length === 1 && cursorIndex.value < currentDrill.value.length) {
    typedText.value += key
    cursorIndex.value++

    // Check if we've completed the drill
    if (cursorIndex.value === currentDrill.value.length) {
      endTime.value = Date.now()
    }
  }
}

const typingAreaRef = useTemplateRef('typingAreaRef')
function focusTypingArea() {
  if (typingAreaRef.value) typingAreaRef.value.focus()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => focusTypingArea())
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// ===============================
// Completion Modal
// ===============================

const typingCompletionVisible = ref(false)
const isComplete = computed(() => cursorIndex.value === currentDrill.value.length);
watch(isComplete, (isCompleted) => {
  typingCompletionVisible.value = isCompleted
})

// Speed is measured in keystrokes, not clusters — see docs/adr/0002
const kpm = computed(() => {
  if (!startTime.value || !endTime.value) return 0
  const minutes = (endTime.value - startTime.value) / 60000
  return Math.round(currentDrill.value.length / minutes)
})

const kps = computed(() => {
  if (!startTime.value || !endTime.value) return 0
  const seconds = (endTime.value - startTime.value) / 1000
  return (currentDrill.value.length / seconds).toFixed(1)
})

const accuracy = computed(() => {
  if (cursorIndex.value === 0) return 100
  let correct = 0
  for (let i = 0; i < cursorIndex.value; i++) {
    if (currentDrill.value[i] === typedText.value[i]) correct++
  }
  return Math.round((correct / cursorIndex.value) * 100)
})

function resetTyping() {
  typedText.value = ''
  cursorIndex.value = 0
  startTime.value = null
  endTime.value = null
  setNextDrill()
  nextTick(() => focusTypingArea())
}
</script>

<template>
  <div class="typing-container" @click="focusTypingArea" :class="{ 'is-focused': isFocused }">
    <div
      class="typing-area"
      tabindex="0"
      ref="typingAreaRef"
      @focus="isFocused = true"
      @blur="isFocused = false"
    >
      <span class="char-correct">{{ correctSubstring }}</span>
      <span class="char-incorrect">{{ incorrectSubstring }}</span>
      <span id="cursor" v-if="isFocused && !isComplete"></span>
      <span class="char-untyped">{{ untypedSubstring }}</span>
    </div>
  </div>
  <div class="controls">
    <Button
      icon="pi pi-refresh"
      @click="resetTyping"
      :disabled="!isComplete && cursorIndex > 0"
      severity="secondary"
      variant="text"
      aria-label="New drill"
      title="Get a new drill"
    />
  </div>
  <TypingCompletion
      v-model:visible="typingCompletionVisible"
      :kpm="kpm"
      :kps="kps"
      :accuracy="accuracy"
      @update:visible="resetTyping"
    />
</template>

<style scoped>
.typing-container {
  padding: 30px;
  background-color: var(--p-surface-secondary);
  border-radius: 12px;
  max-width: 1200px;
  width: 95%;
  line-height: 2;
  cursor: text;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;

  &.is-focused {
    border-color: var(--p-primary-color);
    box-shadow: 0 0 12px var(--p-primary-color);
  }

  .typing-area {
    outline: none;
    font-size: 2em;

    span {
      /* Creates "safe space" for descenders to render without clipping */
      padding-bottom: 0.2em;

      &.char-correct {
        color: var(--p-text-primary);
      }

      &.char-incorrect {
        color: var(--p-text-error);
        font-weight: bold;
      }

      &.char-untyped {
        color: var(--p-text-primary);
        opacity: 0.5;
      }
    }

    #cursor {
      display: inline-block;
      width: 3px;
      height: 1em;
      background-color: var(--p-primary-color);
      margin-left: 1px;
      margin-right: 1px;
      vertical-align: middle;
      animation: blink 1s infinite;
    }
  }
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
</style>

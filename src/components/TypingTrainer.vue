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
import { toRenderClusters } from '@/lib/clusters'
import { accuracyFrom, tallyKeystrokes } from '@/lib/accuracy'
import TypingCompletion from '@/components/TypingCompletion.vue'
import Button from 'primevue/button'

const { currentDrill, setNextDrill } = useDrills()
const typedText = ref('')
const cursorIndex = ref(0)

/**
 * Every key pressed at this drill, in order, Backspaces included. `typedText`
 * cannot answer for accuracy: it holds the final state, in which a corrected
 * typo has left no trace. The sequence remembers.
 */
const keystrokes = ref<string[]>([])

/**
 * One entry per cluster, never split — see docs/adr/0001-clusters-are-atomic.md
 */
const renderClusters = computed(() =>
  toRenderClusters(currentDrill.value, typedText.value, cursorIndex.value),
)

/**
 * The cursor sits before the first cluster it has not passed. A cluster the
 * cursor is partway through is `active`, and the cursor renders before it
 * rather than inside it — splitting it would shatter the glyph.
 */
const cursorClusterIndex = computed(() =>
  renderClusters.value.findIndex(({ state }) => state === 'active' || state === 'untyped'),
)

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
    keystrokes.value.push(key)
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
    keystrokes.value.push(key)
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

// Judged per keystroke, so a corrected typo still costs — see @/lib/accuracy
const accuracy = computed(() =>
  accuracyFrom(tallyKeystrokes(currentDrill.value, keystrokes.value)),
)

function resetTyping() {
  typedText.value = ''
  cursorIndex.value = 0
  keystrokes.value = []
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
      <template v-for="(cluster, index) in renderClusters" :key="index">
        <span class="cursor" v-if="isFocused && !isComplete && index === cursorClusterIndex"></span>
        <span :class="`cluster-${cluster.state}`">{{ cluster.text }}</span>
      </template>
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
      /*
       * Creates "safe space" for descenders to render without clipping.
       * Kept: subscript consonants still descend once clusters shape
       * correctly, so this is a line-box concern the cluster fix doesn't
       * touch. It also gives the active tint room to clear the descender.
       */
      padding-bottom: 0.2em;

      &.cluster-correct {
        color: var(--p-text-primary);
      }

      &.cluster-incorrect {
        color: var(--p-text-error);
        font-weight: bold;
      }

      /*
       * A cluster the cursor is partway through. Tint only — a colour change
       * here would read as a judgement on a cluster that isn't finished yet,
       * and the glyph must keep rendering normally.
       */
      &.cluster-active {
        color: var(--p-text-primary);
        background-color: color-mix(in srgb, var(--p-primary-color) 25%, transparent);
        border-radius: 3px;
      }

      &.cluster-untyped {
        color: var(--p-text-primary);
        opacity: 0.5;
      }
    }

    .cursor {
      display: inline-block;
      padding-bottom: 0;
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

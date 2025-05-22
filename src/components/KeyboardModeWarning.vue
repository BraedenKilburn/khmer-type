<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const isVisible = ref(false)
let dismissTimeout: number | undefined

function dismiss() {
  isVisible.value = false
  // Wait for transition to complete before emitting
  setTimeout(() => {
    emit('update:show', false)
  }, 300) // Match transition duration
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    dismiss()
  }
}

// Watch for show prop changes
watch(() => props.show, (newValue) => {
  if (newValue) {
    isVisible.value = true
    // Auto-dismiss after 3 seconds
    dismissTimeout = window.setTimeout(() => {
      dismiss()
    }, 3000)
  }
})

onBeforeUnmount(() => {
  if (dismissTimeout) {
    clearTimeout(dismissTimeout)
  }
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isVisible"
      class="keyboard-warning"
      role="alert"
      @keydown="handleKeydown"
    >
      <div class="warning-content">
        <span class="warning-icon">⚠️</span>
        <p>Your keyboard is in English mode. Please switch to Khmer keyboard to type correctly.</p>
        <button
          class="dismiss-button"
          @click="dismiss"
          aria-label="Dismiss warning"
        >
          ×
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.keyboard-warning {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 100%;
  max-width: 600px;
  padding: 0 1rem;
}

.warning-content {
  background-color: #fff3cd;
  color: #856404;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

:root.dark .warning-content {
  background-color: #332701;
  color: #ffd700;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

p {
  margin: 0;
  flex-grow: 1;
  font-size: 0.95rem;
  line-height: 1.4;
}

.dismiss-button {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.5rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px currentColor;
    border-radius: 4px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -100%);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>

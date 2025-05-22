<script setup lang="ts">
import { onMounted } from 'vue'

interface Props {
  cpm: number
  cps: number | string
  accuracy: number
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'restart'): void
}>()

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('restart')
  }
}

onMounted(() => {
  // Focus the button when the overlay appears
  const button = document.querySelector('.restart-button') as HTMLButtonElement
  if (button) button.focus()
})
</script>

<template>
  <div
    class="completion-overlay"
    role="dialog"
    aria-labelledby="completion-title"
    aria-describedby="completion-stats"
  >
    <div class="completion-stats">
      <h2 id="completion-title">Great job! 🎉</h2>
      <div id="completion-stats" class="stats-grid">
        <div class="stat">
          <span class="stat-label">CPM</span>
          <span class="stat-value">{{ cpm }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">CPS</span>
          <span class="stat-value">{{ cps }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Accuracy</span>
          <span class="stat-value">{{ accuracy }}%</span>
        </div>
      </div>
      <button
        class="restart-button"
        @click="emit('restart')"
        @keydown="handleKeydown"
        tabindex="0"
      >
        Try Again
      </button>
    </div>
  </div>
</template>

<style scoped>
.completion-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: color-mix(in srgb, var(--color-background-secondary) 90%, black);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.completion-stats {
  text-align: center;
  padding: 2rem;
  background-color: var(--color-background-secondary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  h2 {
    margin-bottom: 1.5rem;
    color: var(--color-text);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-bottom: 2rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .stat-label {
    font-size: 0.9rem;
    color: var(--color-text);
    opacity: 0.7;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--color-text);
  }
}

.restart-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #0056b3;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.5);
  }

  &:focus-visible {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }
}
</style>

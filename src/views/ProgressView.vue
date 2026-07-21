<script setup lang="ts">
import Button from 'primevue/button'
import StatsHeatmap from '@/components/StatsHeatmap.vue'
import { useStats } from '@/composables/useStats'
import { useLesson } from '@/composables/useLesson'

const { clear } = useStats()
const { reset: resetProgress } = useLesson()

/**
 * Two records, cleared together.
 *
 * Keeping lesson progress after wiping the per-sign history would leave a
 * learner marked as having passed lessons the heatmap says they never typed.
 */
function startOver() {
  clear()
  resetProgress()
}
</script>

<template>
  <section class="progress-view">
    <StatsHeatmap />
    <footer>
      <Button
        label="Start over"
        icon="pi pi-trash"
        severity="danger"
        variant="text"
        size="small"
        @click="startOver"
      />
    </footer>
  </section>
</template>

<style scoped>
.progress-view {
  max-width: var(--kt-measure-page);
  width: 100%;

  footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.5rem;

    :deep(.p-button) {
      font-size: 0.6875rem;
      letter-spacing: 0.06em;
      text-transform: lowercase;
    }
  }
}
</style>

<script setup lang="ts">
import Button from 'primevue/button'
import StatsHeatmap from '@/components/StatsHeatmap.vue'
import { resetLearnerData } from '@/composables/records'

/*
 * *Which* records a reset wipes is declared beside the records themselves — see
 * `@/composables/records`. This view offers the button and nothing else,
 * so a record added later cannot be forgotten here.
 */
const startOver = resetLearnerData
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

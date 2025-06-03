<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

interface Props {
  cpm: number
  cps: number | string
  accuracy: number
}
defineProps<Props>()

const visible = defineModel<boolean>(
  'visible',
  { required: true },
);
</script>

<template>
  <Dialog v-model:visible="visible" header="Great job! 🎉" modal :closable="false">
    <div class="stats-grid">
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
    <div class="footer">
      <Button @click="visible = false">Try Again</Button>
    </div>
  </Dialog>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--p-dialog-header-padding);
  margin-bottom: var(--p-dialog-header-padding);

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    .stat-label {
      font-size: 0.9rem;
      opacity: 0.7;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
    }
  }
}

.footer {
  display: flex;
  justify-content: flex-end;
}
</style>

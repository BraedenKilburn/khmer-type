<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

interface Props {
  kpm: number
  kps: number | string
  accuracy: number
}
defineProps<Props>()

/**
 * Restarting is a thing the user asked for, not a consequence of this dialog
 * closing. The button is the only way out today (`:closable="false"` means no
 * close icon and no Escape), so should a dismissal path ever be added, it will
 * leave the drill alone rather than silently skipping to a new one.
 */
defineEmits<{ restart: [] }>()

const visible = defineModel<boolean>(
  'visible',
  { required: true },
);
</script>

<template>
  <Dialog v-model:visible="visible" header="Great job! 🎉" modal :closable="false">
    <div class="stats-grid">
      <div class="stat">
        <span class="stat-label">KPM</span>
        <span class="stat-value">{{ kpm }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">KPS</span>
        <span class="stat-value">{{ kps }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Accuracy</span>
        <span class="stat-value">{{ accuracy }}%</span>
      </div>
    </div>
    <div class="footer">
      <Button @click="$emit('restart')">Try Again</Button>
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

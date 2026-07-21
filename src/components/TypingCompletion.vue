<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { displaySign } from '@/lib/signs'
import { errorRate, hesitationMs, type SignStat } from '@/lib/stats'

interface Props {
  kpm: number
  kps: number | string
  accuracy: number
  /**
   * The signs to practise, worst first — across every session, not just this
   * drill. A single run is too few keystrokes to say anything about a sign.
   */
  weakestSigns?: SignStat[]
}
withDefaults(defineProps<Props>(), { weakestSigns: () => [] })

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
    <!--
      A plain list, deliberately: this is the first thing built on the per-sign
      record, and the numbers should be readable and checkable before any of
      them get tinted. The heatmap comes next.
    -->
    <section v-if="weakestSigns.length" class="weakest">
      <h3>Signs to practise</h3>
      <ul>
        <li v-for="stat in weakestSigns" :key="stat.sign">
          <span class="sign" lang="km">{{ displaySign(stat.sign) }}</span>
          <span class="detail">
            {{ Math.round((errorRate(stat) ?? 0) * 100) }}% wrong ·
            {{ Math.round(hesitationMs(stat) ?? 0) }}ms ·
            {{ stat.attempts }} {{ stat.attempts === 1 ? 'attempt' : 'attempts' }}
          </span>
        </li>
      </ul>
    </section>

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

.weakest {
  margin-bottom: var(--p-dialog-header-padding);

  h3 {
    margin: 0 0 0.5rem;
    font-size: 0.9rem;
    opacity: 0.7;
    font-weight: normal;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  li {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .sign {
    font-size: 1.5rem;
    min-width: 2ch;
  }

  .detail {
    font-size: 0.8rem;
    opacity: 0.7;
  }
}

.footer {
  display: flex;
  justify-content: flex-end;
}
</style>

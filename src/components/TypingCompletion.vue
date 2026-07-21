<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { displaySign } from '@/lib/signs'
import { errorRate, hesitationMs, type SignStat } from '@/lib/stats'

interface Props {
  kpm: number
  /** Rounded for display here rather than at the source — see the template. */
  kps: number
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
  <Dialog v-model:visible="visible" header="drill complete" modal :closable="false">
    <!--
      The numbers are the reward, so they are the only large thing here and the
      labels under them shrink to captions — the same weighting the typing
      screen gives the drill over its chrome.
    -->
    <div class="stats-grid">
      <div class="stat">
        <span class="stat-value">{{ kpm }}</span>
        <span class="stat-label">kpm</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ kps.toFixed(1) }}</span>
        <span class="stat-label">kps</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ accuracy }}%</span>
        <span class="stat-label">accuracy</span>
      </div>
    </div>
    <!--
      A plain list, deliberately: this is the first thing built on the per-sign
      record, and the numbers should be readable and checkable before any of
      them get tinted. The heatmap comes next.
    -->
    <section v-if="weakestSigns.length" class="weakest">
      <h3>signs to practise</h3>
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
      <Button @click="$emit('restart')" label="next drill" variant="outlined" size="small" />
    </div>
  </Dialog>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.75rem;

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    .stat-label {
      font-size: 0.6875rem;
      letter-spacing: 0.08em;
      color: var(--kt-faint);
    }

    .stat-value {
      font-size: 2.25rem;
      font-weight: 500;
      line-height: 1.1;
      color: var(--kt-accent);
      font-variant-numeric: tabular-nums;
    }
  }
}

.weakest {
  margin-bottom: 1.5rem;

  h3 {
    margin: 0 0 0.6rem;
    font-size: 0.6875rem;
    letter-spacing: 0.08em;
    color: var(--kt-faint);
    font-weight: 400;
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
    font-size: 1.75rem;
    min-width: 2ch;
    color: var(--kt-text);
  }

  .detail {
    font-size: 0.75rem;
    letter-spacing: 0.02em;
    color: var(--kt-sub);
    font-variant-numeric: tabular-nums;
  }
}

.footer {
  display: flex;
  justify-content: flex-end;
}
</style>

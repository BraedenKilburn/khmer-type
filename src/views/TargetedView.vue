<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import TypingTrainer from '@/components/TypingTrainer.vue'
import { useStats } from '@/composables/useStats'
import { corpus } from '@/data/corpus'
import { displaySign } from '@/lib/signs'

/**
 * Practice aimed at what the learner is measurably worst at.
 *
 * The payoff of the per-sign record: drills are drawn weighted towards the
 * signs that cost errors and the signs that cost time. It needs something to
 * aim at, so with no history recorded it says so rather than quietly serving
 * random drills and calling them targeted.
 */
const { weakest } = useStats()

const targets = computed(() => weakest('accuracy', 6))
const pool = computed(() => [...corpus])
</script>

<template>
  <header class="targeted-header">
    <h2>Targeted practice</h2>
    <p v-if="targets.length" class="targets">
      Weighted towards
      <span lang="km">{{ targets.map(({ sign }) => displaySign(sign)).join('  ') }}</span>
    </p>
    <p v-else class="targets">
      Nothing recorded yet. Finish a drill in
      <RouterLink :to="{ name: 'practice' }">free practice</RouterLink> or a
      <RouterLink :to="{ name: 'lessons' }">lesson</RouterLink> and this has something to aim at.
    </p>
  </header>

  <TypingTrainer :pool="pool" order="adaptive" />
</template>

<style scoped>
.targeted-header {
  max-width: 1200px;
  width: 95%;

  h2 {
    margin: 0;
  }

  .targets {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: var(--p-text-secondary);

    span {
      font-size: 1.1rem;
    }
  }
}
</style>

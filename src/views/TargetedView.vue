<script setup lang="ts">
import { ROUTE } from '@/router'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import TypingTrainer from '@/components/TypingTrainer.vue'
import { useStats } from '@/composables/useStats'
import { targetedPractice } from '@/composables/practiceSession'
import { displaySign } from '@/lib/signs'

/**
 * Practice aimed at what the learner is measurably worst at.
 *
 * The payoff of the per-sign record: drills are drawn weighted towards the
 * signs that cost errors and the signs that cost time. It needs something to
 * aim at, so with no history recorded it says so rather than quietly serving
 * random drills and calling them targeted.
 *
 * The signs named below are ranked by the same score the draw weights by — see
 * `@/lib/weakness` — so this sentence describes what actually happens.
 */
const { weakest } = useStats()

const targets = computed(() => weakest(6))
const session = targetedPractice()
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
      <RouterLink :to="{ name: ROUTE.practice }">free practice</RouterLink> or a
      <RouterLink :to="{ name: ROUTE.lessons }">lesson</RouterLink> and this has something to aim at.
    </p>
  </header>

  <TypingTrainer :session="session" />
</template>

<style scoped>
.targeted-header {
  max-width: var(--kt-measure-drill);
  width: 100%;

  h2 {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 400;
    text-transform: lowercase;
  }

  .targets {
    margin: 0.35rem 0 0;
    font-size: 0.75rem;
    line-height: 1.7;
    color: var(--kt-sub);

    /* The signs being aimed at are the point of the sentence, so they get the
       accent and a size the surrounding prose does not. */
    span[lang='km'] {
      font-size: 1.5rem;
      color: var(--kt-accent);
    }
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useLesson } from '@/composables/useLesson'
import { displaySign } from '@/lib/signs'

/**
 * The curriculum, laid out.
 *
 * A lesson whose prerequisite is unmet is labelled and still open. Adult
 * learners abandon apps that refuse to let them explore, and someone who wants
 * to see what stacking looks like on day one should be allowed to find out.
 */
const { curriculum, state, clearedDrills, nextLesson, passedCount } = useLesson()

const STATE_LABEL: Record<string, string> = {
  passed: 'Passed',
  started: 'In progress',
  available: 'Ready',
  locked: 'Earlier lessons first',
}

const summary = computed(() => `${passedCount.value} of ${curriculum.length} lessons passed`)
</script>

<template>
  <section class="lesson-map">
    <header>
      <h2>Lessons</h2>
      <p class="summary">
        {{ summary }}<span v-if="nextLesson"> · next up: {{ nextLesson.title }}</span>
      </p>
    </header>

    <ol class="lessons">
      <li v-for="lesson in curriculum" :key="lesson.id">
        <RouterLink :to="{ name: 'lesson', params: { id: lesson.id } }" :class="state(lesson)">
          <div class="line">
            <h3>{{ lesson.title }}</h3>
            <span class="badge">{{ STATE_LABEL[state(lesson)] }}</span>
          </div>
          <p class="description">{{ lesson.description }}</p>
          <p v-if="lesson.introduces.length" class="introduces" lang="km">
            {{ lesson.introduces.map(displaySign).join('  ') }}
          </p>
          <p class="count" lang="en">
            {{ clearedDrills(lesson).length }} / {{ lesson.drills.length }} drills
          </p>
        </RouterLink>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.lesson-map {
  max-width: 1200px;
  width: 100%;

  header {
    margin-bottom: 1.5rem;

    h2 {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 400;
      text-transform: lowercase;
      color: var(--kt-text);
    }

    .summary {
      margin: 0.3rem 0 0;
      color: var(--kt-sub);
      font-size: 0.75rem;
      letter-spacing: 0.02em;
    }
  }

  .lessons {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /*
   * Tiles, not cards: a flat fill and a single accent edge carry the state, so
   * there is no outline, no radius worth noticing, and no shadow. The grid
   * reads as one block of texture rather than as a dozen competing panels.
   */
  a {
    display: block;
    height: 100%;
    padding: 12px 14px;
    border-left: 2px solid transparent;
    border-radius: var(--p-border-radius-md);
    background-color: var(--kt-surface);
    color: var(--kt-text);

    &:hover {
      background-color: var(--kt-surface-dim);

      h3 {
        color: var(--kt-accent);
      }
    }

    /* State reads from the badge as well as the edge — never colour alone. */
    &.passed {
      border-left-color: var(--kt-accent);
    }

    &.started {
      border-left-color: color-mix(in srgb, var(--kt-accent) 50%, transparent);
    }

    &.locked {
      opacity: 0.6;
      border-left-style: dashed;
      border-left-color: var(--kt-faint);
    }
  }

  .line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;

    h3 {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 500;
    }
  }

  .badge {
    font-size: 0.6875rem;
    text-transform: lowercase;
    letter-spacing: 0.08em;
    color: var(--kt-faint);
    white-space: nowrap;
  }

  .description {
    margin: 0.45rem 0 0;
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--kt-sub);
  }

  .introduces {
    margin: 0.6rem 0 0;
    font-size: 1.5rem;
    color: var(--kt-text);
  }

  .count {
    margin: 0.5rem 0 0;
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: var(--kt-faint);
    font-variant-numeric: tabular-nums;
  }
}
</style>

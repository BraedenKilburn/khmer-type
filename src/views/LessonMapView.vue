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
  width: 95%;

  header {
    margin-bottom: 1rem;

    h2 {
      margin: 0;
    }

    .summary {
      margin: 0.25rem 0 0;
      color: var(--p-text-secondary);
      font-size: 0.9rem;
    }
  }

  .lessons {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  a {
    display: block;
    height: 100%;
    padding: 12px 14px;
    border: 1px solid var(--p-content-border-color);
    border-left-width: 4px;
    border-radius: 10px;
    background-color: var(--p-surface-secondary);
    color: var(--p-text-primary);

    &:hover {
      border-color: var(--p-primary-color);
    }

    /* State reads from the badge as well as the edge — never colour alone. */
    &.passed {
      border-left-color: var(--p-primary-color);
    }

    &.started {
      border-left-color: color-mix(in srgb, var(--p-primary-color) 50%, transparent);
    }

    &.locked {
      opacity: 0.7;
      border-left-style: dashed;
    }
  }

  .line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;

    h3 {
      margin: 0;
      font-size: 1rem;
    }
  }

  .badge {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--p-text-secondary);
    white-space: nowrap;
  }

  .description {
    margin: 0.35rem 0 0;
    font-size: 0.85rem;
    color: var(--p-text-secondary);
  }

  .introduces {
    margin: 0.4rem 0 0;
    font-size: 1.25rem;
  }

  .count {
    margin: 0.4rem 0 0;
    font-size: 0.75rem;
    color: var(--p-text-secondary);
    font-variant-numeric: tabular-nums;
  }
}
</style>

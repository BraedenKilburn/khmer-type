<script setup lang="ts">
import { ROUTE } from '@/router'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import TypingTrainer from '@/components/TypingTrainer.vue'
import { useLesson } from '@/composables/useLesson'
import { lessonSession } from '@/composables/practiceSession'
import { lessonById } from '@/data/lessons'

const props = defineProps<{ id: string }>()

const { state, clearedDrills } = useLesson()

const lesson = computed(() => lessonById(props.id))

const cleared = computed(() => (lesson.value ? clearedDrills(lesson.value) : []))

/** Which drills, in what order, counting towards what — all four in one place. */
const session = computed(() => (lesson.value ? lessonSession(lesson.value) : undefined))
</script>

<template>
  <template v-if="lesson">
    <header class="lesson-header">
      <div>
        <p class="crumb"><RouterLink :to="{ name: ROUTE.lessons }">← All lessons</RouterLink></p>
        <h2>{{ lesson.title }}</h2>
        <p class="description">{{ lesson.description }}</p>
      </div>
      <p class="progress" lang="en">
        {{ cleared.length }} / {{ lesson.drills.length }} drills at
        {{ lesson.passCriteria.minAccuracy }}%
        <span v-if="state(lesson) === 'locked'" class="note">
          — earlier lessons are unfinished, but you are welcome here anyway
        </span>
      </p>
    </header>

    <!--
      Said once the gate is met, not once the drills run out: a learner can
      reach the end of the list without clearing it, and telling them they had
      passed would be a lie the lesson map would then contradict.
    -->
    <p v-if="state(lesson) === 'passed'" class="passed">
      Lesson passed.
      <RouterLink :to="{ name: ROUTE.lessons }">Pick the next one</RouterLink>, or keep practising here.
    </p>

    <TypingTrainer v-if="session" :session="session" />
  </template>

  <p v-else class="missing">
    No such lesson. <RouterLink :to="{ name: ROUTE.lessons }">Back to the lessons.</RouterLink>
  </p>
</template>

<style scoped>
.lesson-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  max-width: var(--kt-measure-drill);
  width: 100%;

  h2 {
    margin: 0.3rem 0 0;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .crumb {
    margin: 0;
    font-size: 0.6875rem;
    letter-spacing: 0.04em;

    a {
      color: var(--kt-faint);

      &:hover {
        color: var(--kt-sub);
      }
    }
  }

  .description,
  .progress {
    margin: 0.3rem 0 0;
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--kt-sub);
  }

  .progress {
    font-variant-numeric: tabular-nums;
  }

  .note {
    color: var(--kt-faint);
  }
}

/* The one line of praise the app gives, so it gets the accent and nothing
   else — no fill, no box. */
.passed {
  max-width: var(--kt-measure-drill);
  width: 100%;
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  color: var(--kt-accent);
}

.missing {
  font-size: 0.75rem;
  color: var(--kt-sub);
}
</style>

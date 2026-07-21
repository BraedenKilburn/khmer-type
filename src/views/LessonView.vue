<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import TypingTrainer from '@/components/TypingTrainer.vue'
import { useLesson } from '@/composables/useLesson'
import { lessonById } from '@/data/lessons'
import { drillById } from '@/composables/useDrills'
import type { Drill } from '@/data/corpus'

const props = defineProps<{ id: string }>()

const { state, clearedDrills, recordDrill } = useLesson()

const lesson = computed(() => lessonById(props.id))

/** The lesson's drills, in the order it lays them out. */
const pool = computed<Drill[]>(() =>
  (lesson.value?.drills ?? [])
    .map((drillId) => drillById(drillId))
    .filter((drill): drill is Drill => Boolean(drill)),
)

const cleared = computed(() => (lesson.value ? clearedDrills(lesson.value) : []))

/**
 * Record the result against the gate.
 *
 * Accuracy only — speed follows accuracy, and gating on speed teaches people to
 * type badly and fast. The keystrokes-per-minute figure is reported to the
 * learner and ignored here on purpose.
 */
function handleComplete({ drillId, accuracy }: { drillId: string; accuracy: number }) {
  if (lesson.value) recordDrill(lesson.value.id, drillId, accuracy)
}
</script>

<template>
  <template v-if="lesson">
    <header class="lesson-header">
      <div>
        <p class="crumb"><RouterLink :to="{ name: 'lessons' }">← All lessons</RouterLink></p>
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
      <RouterLink :to="{ name: 'lessons' }">Pick the next one</RouterLink>, or keep practising here.
    </p>

    <TypingTrainer :pool="pool" order="sequential" @complete="handleComplete" />
  </template>

  <p v-else class="missing">
    No such lesson. <RouterLink :to="{ name: 'lessons' }">Back to the lessons.</RouterLink>
  </p>
</template>

<style scoped>
.lesson-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  max-width: 1200px;
  width: 95%;

  h2 {
    margin: 0.15rem 0 0;
  }

  .crumb {
    margin: 0;
    font-size: 0.8rem;

    a {
      color: var(--p-text-secondary);
    }
  }

  .description,
  .progress {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: var(--p-text-secondary);
  }

  .note {
    font-style: italic;
  }
}

.passed {
  max-width: 1200px;
  width: 95%;
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  background-color: var(--p-surface-secondary);
  border-left: 4px solid var(--p-primary-color);
  font-size: 0.9rem;
}

.missing {
  color: var(--p-text-secondary);
}
</style>

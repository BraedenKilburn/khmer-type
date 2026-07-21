import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { curriculum, lessonById, type Lesson } from '@/data/lessons'

/** Versioned, so the stored shape can change without being misread later. */
const STORAGE_KEY = 'khmer-type:progress:v1'

export interface DrillResult {
  /** Best accuracy recorded for this drill, as a whole percent. */
  bestAccuracy: number
}

/** Per lesson, the drills cleared and how well. */
export type Progress = Record<string, Record<string, DrillResult>>

const progress = useStorage<Progress>(STORAGE_KEY, {})

export type LessonState = 'passed' | 'started' | 'available' | 'locked'

/**
 * Progress through the curriculum.
 *
 * "Locked" is a label, never a barrier: `state` reports an unmet prerequisite
 * so the map can say so, and nothing anywhere refuses to open the lesson. A
 * learner who wants to jump to stacking on day one is allowed to find out how
 * that goes — see docs/plans/v3-progression.md.
 */
export function useLesson() {
  /** Drills of `lesson` cleared at or above its accuracy gate. */
  function clearedDrills(lesson: Lesson): string[] {
    const results = progress.value[lesson.id] ?? {}
    return lesson.drills.filter(
      (drillId) => (results[drillId]?.bestAccuracy ?? 0) >= lesson.passCriteria.minAccuracy,
    )
  }

  function isPassed(lesson: Lesson): boolean {
    return clearedDrills(lesson).length === lesson.drills.length
  }

  function state(lesson: Lesson): LessonState {
    if (isPassed(lesson)) return 'passed'
    if (clearedDrills(lesson).length > 0) return 'started'

    const unmet = lesson.requires.some((id) => {
      const required = lessonById(id)
      return required ? !isPassed(required) : false
    })

    return unmet ? 'locked' : 'available'
  }

  /**
   * Record a finished drill.
   *
   * Only the best accuracy is kept. A learner who has cleared a drill at 98%
   * and then fumbles it while practising has not un-learned it, and a
   * curriculum that took the gate back would be punishing the practice it asked
   * for. Speed is not recorded here at all — the gate is accuracy.
   */
  function recordDrill(lessonId: string, drillId: string, accuracy: number) {
    const lesson = lessonById(lessonId)
    if (!lesson?.drills.includes(drillId)) return

    const results = progress.value[lessonId] ?? {}
    const best = Math.max(results[drillId]?.bestAccuracy ?? 0, accuracy)

    progress.value = {
      ...progress.value,
      [lessonId]: { ...results, [drillId]: { bestAccuracy: best } },
    }
  }

  /** Where to pick up: the first lesson not yet passed. */
  const nextLesson = computed(() => curriculum.find((lesson) => !isPassed(lesson)))

  const passedCount = computed(() => curriculum.filter((lesson) => isPassed(lesson)).length)

  return {
    curriculum,
    progress: computed(() => progress.value),
    clearedDrills,
    isPassed,
    state,
    recordDrill,
    nextLesson,
    passedCount,
    reset: () => {
      progress.value = {}
    },
  }
}

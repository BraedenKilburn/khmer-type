// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useLesson } from '@/composables/useLesson'
import { lessonById } from '@/data/lessons'

const { curriculum, state, isPassed, recordDrill, scorerFor, clearedDrills, nextLesson, reset } =
  useLesson()

const first = curriculum[0]
const second = curriculum[1]

/** Clear every drill of a lesson at the accuracy its gate asks for. */
function pass(lessonId: string) {
  const lesson = lessonById(lessonId)!
  for (const drillId of lesson.drills) {
    recordDrill(lessonId, drillId, lesson.passCriteria.minAccuracy)
  }
}

beforeEach(() => {
  reset()
  localStorage.clear()
})

describe('useLesson', () => {
  it('opens the first lesson and marks the rest as unmet', () => {
    expect(state(first)).toBe('available')
    expect(state(second)).toBe('locked')
  })

  it('counts a lesson passed only when every drill clears the gate', () => {
    const lesson = lessonById(first.id)!

    recordDrill(first.id, lesson.drills[0], 100)

    expect(state(first)).toBe('started')
    expect(isPassed(first)).toBe(false)

    pass(first.id)

    expect(isPassed(first)).toBe(true)
    expect(state(first)).toBe('passed')
  })

  it('does not clear a drill typed below the gate', () => {
    const lesson = lessonById(first.id)!
    for (const drillId of lesson.drills) {
      recordDrill(first.id, drillId, lesson.passCriteria.minAccuracy - 1)
    }

    expect(isPassed(first)).toBe(false)
  })

  it('opens the next lesson once its prerequisite is passed', () => {
    pass(first.id)
    expect(state(second)).toBe('available')
  })

  it('keeps the best accuracy, not the latest', () => {
    // A learner who fumbles a drill they have already cleared has not
    // un-learned it, and taking the gate back would punish the practice.
    const drillId = lessonById(first.id)!.drills[0]

    recordDrill(first.id, drillId, 100)
    recordDrill(first.id, drillId, 40)

    expect(state(first)).toBe('started')
    expect(useLesson().progress.value[first.id][drillId].bestAccuracy).toBe(100)
  })

  it('ignores a result for a drill the lesson does not contain', () => {
    recordDrill(first.id, 's001', 100)
    expect(useLesson().progress.value[first.id]?.['s001']).toBeUndefined()
  })

  it('points at the first lesson not yet passed', () => {
    expect(nextLesson.value?.id).toBe(first.id)

    pass(first.id)

    expect(nextLesson.value?.id).toBe(second.id)
  })

  it('persists progress across a reload', async () => {
    pass(first.id)
    await nextTick()

    const { useLesson: reload } = await import('@/composables/useLesson')
    expect(reload().isPassed(first)).toBe(true)
    expect(localStorage.getItem('khmer-type:progress:v1')).toContain(first.drills[0])
  })

  it('reports an unmet prerequisite without refusing entry', () => {
    // "Locked" is a label the map shows, never a barrier: nothing in this
    // composable can stop a lesson being opened, which is the point.
    const stacking = lessonById('stacking-1')!

    expect(state(stacking)).toBe('locked')

    recordDrill('stacking-1', stacking.drills[0], 100)

    expect(state(stacking)).toBe('started')
  })
})

describe('scorerFor', () => {
  it('records a finished run against the lesson it was built for', () => {
    const drillId = first.drills[0]

    scorerFor(first.id)({ drillId, accuracy: 100 })

    expect(clearedDrills(first)).toContain(drillId)
  })

  it('keeps the best accuracy, like recording by hand', () => {
    const drillId = first.drills[0]
    const score = scorerFor(first.id)

    score({ drillId, accuracy: 100 })
    score({ drillId, accuracy: 40 })

    // Practising after clearing a gate must not take the gate back.
    expect(clearedDrills(first)).toContain(drillId)
  })

  it('ignores a drill that is not in the lesson', () => {
    scorerFor(first.id)({ drillId: second.drills[0], accuracy: 100 })

    expect(clearedDrills(first)).toEqual([])
  })
})

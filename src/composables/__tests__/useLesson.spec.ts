// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useLesson } from '@/composables/useLesson'
import { curriculum, lessonById } from '@/data/lessons'
import { resetLearnerData } from '@/composables/records'
import { isolateRecords } from '@/testing/records'

const first = curriculum[0]
const second = curriculum[1]

let records: ReturnType<typeof isolateRecords>
/**
 * Read per test, not at import: the composable asks the record registry for its
 * progress on every call, and a copy taken before the store was connected would
 * be reading the one this suite replaced.
 */
let lesson: ReturnType<typeof useLesson>

beforeEach(() => {
  records = isolateRecords()
  lesson = useLesson()
})

/** Clear every drill of a lesson at the accuracy its gate asks for. */
function pass(lessonId: string) {
  const target = lessonById(lessonId)!
  for (const drillId of target.drills) {
    lesson.recordDrill(lessonId, drillId, target.passCriteria.minAccuracy)
  }
}

describe('useLesson', () => {
  it('opens the first lesson and marks the rest as unmet', () => {
    expect(lesson.state(first)).toBe('available')
    expect(lesson.state(second)).toBe('locked')
  })

  it('counts a lesson passed only when every drill clears the gate', () => {
    const target = lessonById(first.id)!

    lesson.recordDrill(first.id, target.drills[0], 100)

    expect(lesson.state(first)).toBe('started')
    expect(lesson.isPassed(first)).toBe(false)

    pass(first.id)

    expect(lesson.isPassed(first)).toBe(true)
    expect(lesson.state(first)).toBe('passed')
  })

  it('does not clear a drill typed below the gate', () => {
    const target = lessonById(first.id)!
    for (const drillId of target.drills) {
      lesson.recordDrill(first.id, drillId, target.passCriteria.minAccuracy - 1)
    }

    expect(lesson.isPassed(first)).toBe(false)
  })

  it('opens the next lesson once its prerequisite is passed', () => {
    pass(first.id)
    expect(lesson.state(second)).toBe('available')
  })

  it('keeps the best accuracy, not the latest', () => {
    // A learner who fumbles a drill they have already cleared has not
    // un-learned it, and taking the gate back would punish the practice.
    const drillId = lessonById(first.id)!.drills[0]

    lesson.recordDrill(first.id, drillId, 100)
    lesson.recordDrill(first.id, drillId, 40)

    expect(lesson.state(first)).toBe('started')
    expect(lesson.progress.value[first.id][drillId].bestAccuracy).toBe(100)
  })

  it('ignores a result for a drill the lesson does not contain', () => {
    lesson.recordDrill(first.id, 's001', 100)
    expect(lesson.progress.value[first.id]?.['s001']).toBeUndefined()
  })

  it('points at the first lesson not yet passed', () => {
    expect(lesson.nextLesson.value?.id).toBe(first.id)

    pass(first.id)

    expect(lesson.nextLesson.value?.id).toBe(second.id)
  })

  it('persists progress across a reload', async () => {
    pass(first.id)
    await nextTick()

    records.reload()

    expect(useLesson().isPassed(first)).toBe(true)
    expect(records.storage.getItem('khmer-type:progress:v1')).toContain(first.drills[0])
  })

  it('is thrown away with the rest of the learner’s history', () => {
    pass(first.id)

    resetLearnerData()

    expect(lesson.isPassed(first)).toBe(false)
  })

  it('reports an unmet prerequisite without refusing entry', () => {
    // "Locked" is a label the map shows, never a barrier: nothing in this
    // composable can stop a lesson being opened, which is the point.
    const stacking = lessonById('stacking-1')!

    expect(lesson.state(stacking)).toBe('locked')

    lesson.recordDrill('stacking-1', stacking.drills[0], 100)

    expect(lesson.state(stacking)).toBe('started')
  })
})

describe('scorerFor', () => {
  it('records a finished run against the lesson it was built for', () => {
    const drillId = first.drills[0]

    lesson.scorerFor(first.id)({ drillId, accuracy: 100 })

    expect(lesson.clearedDrills(first)).toContain(drillId)
  })

  it('keeps the best accuracy, like recording by hand', () => {
    const drillId = first.drills[0]
    const score = lesson.scorerFor(first.id)

    score({ drillId, accuracy: 100 })
    score({ drillId, accuracy: 40 })

    // Practising after clearing a gate must not take the gate back.
    expect(lesson.clearedDrills(first)).toContain(drillId)
  })

  it('ignores a drill that is not in the lesson', () => {
    lesson.scorerFor(first.id)({ drillId: second.drills[0], accuracy: 100 })

    expect(lesson.clearedDrills(first)).toEqual([])
  })
})

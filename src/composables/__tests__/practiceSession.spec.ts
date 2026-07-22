// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { freePractice, lessonSession, targetedPractice } from '@/composables/practiceSession'
import { useLesson } from '@/composables/useLesson'
import { curriculum, lessonById } from '@/data/lessons'
import { corpus } from '@/data/corpus'
import { isolateRecords } from '@/testing/records'

const first = curriculum[0]

beforeEach(() => {
  isolateRecords()
})

describe('freePractice', () => {
  it('draws real Khmer, never the key-location exercises', () => {
    const { pool } = freePractice()

    expect(pool.length).toBeGreaterThan(0)
    expect(pool.every(({ kind }) => kind === 'sentence')).toBe(true)
  })

  it('counts towards nothing, and says so by having no scorer', () => {
    expect(freePractice().scorer).toBeUndefined()
  })

  it('is a stream, so there is no position to show', () => {
    expect(freePractice()).toMatchObject({ order: 'random', showsPosition: false })
  })
})

describe('lessonSession', () => {
  it('lays the drills out in the order the lesson names them', () => {
    const { pool, order } = lessonSession(first)

    expect(pool.map(({ id }) => id)).toEqual(first.drills)
    expect(order).toBe('sequential')
  })

  it('is a list to work through, so the count means something', () => {
    expect(lessonSession(first).showsPosition).toBe(true)
  })

  it('drops a drill id the corpus no longer has rather than leaving a hole', () => {
    const withGap = { ...first, drills: [first.drills[0], 'no-such-drill'] }

    expect(lessonSession(withGap).pool.map(({ id }) => id)).toEqual([first.drills[0]])
  })

  it('scores a finished run against its own lesson', () => {
    const drillId = first.drills[0]

    lessonSession(first).scorer?.({ drillId, accuracy: 100 })

    expect(useLesson().clearedDrills(first)).toContain(drillId)
  })

  it('scores nothing for a drill the lesson does not contain', () => {
    const other = lessonById(curriculum[1].id)!.drills[0]

    lessonSession(first).scorer?.({ drillId: other, accuracy: 100 })

    expect(useLesson().clearedDrills(first)).toEqual([])
  })
})

describe('targetedPractice', () => {
  /*
   * The exercises are in on purpose. A learner whose worst sign is `ក` is best
   * served by `ក ខ គ ឃ ង`; a sentence carries that sign along with thirty
   * others and cannot aim as tightly.
   */
  it('draws from the whole corpus, exercises included', () => {
    const { pool } = targetedPractice()

    expect(pool).toHaveLength(corpus.length)
    expect(pool.some(({ kind }) => kind === 'exercise')).toBe(true)
  })

  it('weights the draw, and grades nothing', () => {
    expect(targetedPractice()).toMatchObject({ order: 'adaptive', showsPosition: false })
    expect(targetedPractice().scorer).toBeUndefined()
  })
})

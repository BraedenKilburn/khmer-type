import { describe, expect, it } from 'vitest'
import { curriculum, lessonById } from '@/data/lessons'
import { corpus } from '@/data/corpus'
import { drillTags } from '@/data/drillTags'
import { BASE_CONSONANTS } from '@/lib/signs'

const drillIds = new Set(corpus.map(({ id }) => id))

describe('the curriculum', () => {
  it('refers only to drills that exist', () => {
    for (const lesson of curriculum) {
      for (const drillId of lesson.drills) {
        expect(drillIds.has(drillId), `${lesson.id} → ${drillId}`).toBe(true)
      }
    }
  })

  it('gives every lesson at least one drill and a unique id', () => {
    const ids = new Set(curriculum.map(({ id }) => id))
    expect(ids.size).toBe(curriculum.length)
    for (const lesson of curriculum) expect(lesson.drills.length, lesson.id).toBeGreaterThan(0)
  })

  it('names prerequisites that exist and come earlier', () => {
    curriculum.forEach((lesson, index) => {
      for (const required of lesson.requires) {
        expect(lessonById(required), `${lesson.id} requires ${required}`).toBeDefined()
        expect(curriculum.findIndex(({ id }) => id === required)).toBeLessThan(index)
      }
    })
  })

  it('gates on accuracy and never on speed', () => {
    // Speed follows accuracy; requiring speed early teaches people to type
    // badly and fast — see docs/plans/v3-progression.md.
    for (const lesson of curriculum) {
      expect(lesson.passCriteria.minAccuracy).toBeGreaterThan(0)
      expect(lesson.passCriteria.minKpm).toBeUndefined()
    }
  })

  it('reviews earlier material in every lesson that has any', () => {
    // Without cumulative review, lesson 3 is forgotten by lesson 9.
    const seen = new Set<string>()

    for (const [index, lesson] of curriculum.entries()) {
      if (index > 0 && lesson.drills.length > 1) {
        const reviewed = lesson.drills.filter((drillId) => seen.has(drillId))
        expect(reviewed.length, `${lesson.id} reviews nothing`).toBeGreaterThan(0)
      }
      for (const drillId of lesson.drills) seen.add(drillId)
    }
  })

  it('introduces every one of the 33 consonants somewhere', () => {
    // The gap this whole plan exists to close: the sentence corpus uses 29.
    const introduced = new Set(curriculum.flatMap(({ introduces }) => introduces))
    for (const consonant of BASE_CONSONANTS) {
      expect(introduced.has(consonant), consonant).toBe(true)
    }
  })

  it('introduces every dependent vowel sign somewhere', () => {
    const introduced = new Set(curriculum.flatMap(({ introduces }) => introduces))
    for (const vowel of 'ាិីឹឺុូួើឿៀេែៃោៅ') {
      expect(introduced.has(vowel), vowel).toBe(true)
    }
  })

  it('starts shallow and ends deep', () => {
    const difficultyOf = (lessonId: string) => {
      const lesson = lessonById(lessonId)!
      const scores = lesson.drills.map((id) => drillTags[id]?.difficulty ?? 0)
      return scores.reduce((sum, score) => sum + score, 0) / scores.length
    }

    expect(difficultyOf('consonants-1')).toBeLessThan(difficultyOf('stacking-1'))
    expect(difficultyOf('stacking-1')).toBeLessThan(difficultyOf('sentences-3'))
  })

  it('asks for no stacking before the stacking lessons', () => {
    const firstStacking = curriculum.findIndex(({ id }) => id === 'stacking-1')

    for (const lesson of curriculum.slice(0, firstStacking)) {
      for (const drillId of lesson.drills) {
        expect(
          drillTags[drillId]?.features.includes('subscriptConsonant'),
          `${lesson.id} → ${drillId}`,
        ).toBe(false)
      }
    }
  })
})

import { describe, expect, it } from 'vitest'
import { curriculum, lessonById } from '@/data/lessons'
import { corpus } from '@/data/corpus'
import { drillTags } from '@/data/drillTags'
import { BASE_CONSONANTS } from '@/lib/signs'
import { keystrokeFor } from '@/lib/layoutVariant'

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

  it('introduces every independent vowel both layouts can produce', () => {
    // Task 2 of the v3 plan names ឝ ឞ ឥ ឦ ឧ ឨ as letters no drill reaches.
    // Four of those six are drillable; ឝ ឞ ឨ are not, because NiDA has no key
    // for them and a drill nobody on the standard layout can finish is not a
    // drill. `reachable` is the honest version of that bullet.
    const introduced = new Set(curriculum.flatMap(({ introduces }) => introduces))
    const independents = Array.from({ length: 0x17b3 - 0x17a3 + 1 }, (_, index) =>
      String.fromCodePoint(0x17a3 + index),
    )
    const reachable = independents.filter(
      (vowel) => keystrokeFor(vowel, 'nida') && keystrokeFor(vowel, 'macos'),
    )

    expect(reachable).toHaveLength(14)
    for (const vowel of reachable) {
      expect(introduced.has(vowel), vowel).toBe(true)
    }
  })

  it('drills no letter that NiDA cannot type', () => {
    // The three the plan asked for and the corpus cannot carry. Pinned, so a
    // future edit that slips one into a drill fails here and not in a learner's
    // hands.
    for (const unreachable of 'ឝឞឨឣឤ') {
      expect(keystrokeFor(unreachable, 'nida'), unreachable).toBeUndefined()
      expect(
        corpus.some(({ km }) => km.includes(unreachable)),
        unreachable,
      ).toBe(false)
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

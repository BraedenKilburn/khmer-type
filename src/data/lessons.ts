/**
 * The curriculum: an order to meet the Khmer keyboard in.
 *
 * Random sentences are the deep end. A learner who has never typed Khmer needs
 * consonants before vowel signs and vowel signs before stacking, and needs to
 * meet each of the 33 consonants somewhere rather than only the 29 the sentence
 * corpus happens to use.
 *
 * Three commitments, from docs/plans/v3-progression.md:
 *
 * - **Cumulative review.** Every lesson after the first ends with a drill from
 *   an earlier one. Without it, lesson 3 is forgotten by lesson 9.
 * - **Gate on accuracy, never speed.** Speed follows accuracy; the reverse
 *   teaches people to type badly and fast. `minKpm` exists and is unset.
 * - **Never hard-lock.** `requires` marks a prerequisite as unmet; it does not
 *   stop anyone entering. Adult learners abandon apps that refuse to let them
 *   explore.
 */

import { corpus } from '@/data/corpus'
import { drillTags } from '@/data/drillTags'

export interface Lesson {
  id: string
  title: string
  description: string
  /** Signs this lesson is the first to ask for. */
  introduces: string[]
  /** Lessons that should come first. A suggestion, not a lock. */
  requires: string[]
  /** Drill ids, in order. The tail of each is review from earlier lessons. */
  drills: string[]
  passCriteria: {
    /** Percent, judged per keystroke — see docs/adr/0002. */
    minAccuracy: number
    /**
     * Keystrokes per minute, not characters: a stacked cluster is one glyph
     * and several keystrokes, so CPM would measure the script rather than the
     * typing. Left unset on purpose — see the header.
     */
    minKpm?: number
  }
}

const PASS = { minAccuracy: 95 }

/** `e007` → `e009`, the ids the generator laid down in order. */
function exerciseRange(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, index) => `e${String(from + index).padStart(3, '0')}`)
}

const VARGA_LESSONS: { title: string; signs: string[]; from: number }[] = [
  { title: 'ក ខ គ ឃ ង', signs: ['ក', 'ខ', 'គ', 'ឃ', 'ង'], from: 1 },
  { title: 'ច ឆ ជ ឈ ញ', signs: ['ច', 'ឆ', 'ជ', 'ឈ', 'ញ'], from: 4 },
  { title: 'ដ ឋ ឌ ឍ ណ', signs: ['ដ', 'ឋ', 'ឌ', 'ឍ', 'ណ'], from: 7 },
  { title: 'ត ថ ទ ធ ន', signs: ['ត', 'ថ', 'ទ', 'ធ', 'ន'], from: 10 },
  { title: 'ប ផ ព ភ ម', signs: ['ប', 'ផ', 'ព', 'ភ', 'ម'], from: 13 },
  { title: 'យ រ ល វ ស', signs: ['យ', 'រ', 'ល', 'វ', 'ស'], from: 16 },
  { title: 'ហ ឡ អ', signs: ['ហ', 'ឡ', 'អ'], from: 19 },
]

const VOWEL_LESSONS: { title: string; signs: string[]; from: number }[] = [
  { title: 'ា ិ ី ឹ', signs: ['ា', 'ិ', 'ី', 'ឹ'], from: 28 },
  { title: 'ឺ ុ ូ ួ', signs: ['ឺ', 'ុ', 'ូ', 'ួ'], from: 36 },
  { title: 'ើ ឿ ៀ េ', signs: ['ើ', 'ឿ', 'ៀ', 'េ'], from: 44 },
  { title: 'ែ ៃ ោ ៅ', signs: ['ែ', 'ៃ', 'ោ', 'ៅ'], from: 52 },
]

const STACK_LESSONS: { title: string; signs: string[]; from: number }[] = [
  { title: '្រ ្វ ្ត', signs: ['្រ', '្វ', '្ត'], from: 60 },
  { title: '្ន ្ម ្យ', signs: ['្ន', '្ម', '្យ'], from: 66 },
  { title: '្ល ្ស ្ក', signs: ['្ល', '្ស', '្ក'], from: 72 },
  { title: '្ង ្ប ្ច', signs: ['្ង', '្ប', '្ច'], from: 78 },
]

const lessons: Lesson[] = []

/** Append a lesson, wiring its prerequisite and review drill to the one before. */
function add(lesson: Omit<Lesson, 'requires' | 'passCriteria'> & { review?: string }) {
  const previous = lessons[lessons.length - 1]

  lessons.push({
    ...lesson,
    drills: lesson.review ? [...lesson.drills, lesson.review] : lesson.drills,
    requires: previous ? [previous.id] : [],
    passCriteria: PASS,
  })
}

VARGA_LESSONS.forEach(({ title, signs, from }, index) => {
  add({
    id: `consonants-${index + 1}`,
    title: `Consonants ${title}`,
    description: 'Where these five letters live. No vowel signs, no stacking.',
    introduces: signs,
    drills: exerciseRange(from, from + 2),
    review: index > 0 ? exerciseRange(VARGA_LESSONS[index - 1].from, VARGA_LESSONS[index - 1].from)[0] : undefined,
  })
})

add({
  id: 'consonants-across',
  title: 'Across the board',
  description: 'Both hands, alternating between the groups you have met.',
  introduces: [],
  drills: exerciseRange(22, 27),
  review: 'e002',
})

VOWEL_LESSONS.forEach(({ title, signs, from }, index) => {
  add({
    id: `vowels-${index + 1}`,
    title: `Vowel signs ${title}`,
    description: 'One vowel sign at a time, against consonants you already know.',
    introduces: signs,
    drills: exerciseRange(from, from + 7),
    review: index > 0 ? `e${String(VOWEL_LESSONS[index - 1].from).padStart(3, '0')}` : 'e022',
  })
})

STACK_LESSONS.forEach(({ title, signs, from }, index) => {
  add({
    id: `stacking-${index + 1}`,
    title: `Stacking ${title}`,
    description:
      'COENG stacks the consonant after it. Two keystrokes, one mark, and the hardest habit to build.',
    introduces: signs,
    drills: exerciseRange(from, from + 5),
    review: index > 0 ? `e${String(STACK_LESSONS[index - 1].from).padStart(3, '0')}` : 'e052',
  })
})

add({
  id: 'rare-letters',
  title: 'The letters you rarely meet',
  description: 'Ten consonants the sentences hardly ever use, and the keys are cold.',
  introduces: ['ឈ', 'ឡ', 'ភ', 'ថ', 'ធ', 'ឆ', 'ផ', 'ដ', 'ឍ', 'ឋ'],
  drills: exerciseRange(84, 93),
  review: 'e060',
})

add({
  id: 'mixed-review',
  title: 'Everything so far',
  description: 'Consonants and vowel signs from every group, mixed.',
  introduces: [],
  drills: exerciseRange(94, 103),
  review: 'e078',
})

/*
 * The sentence tiers are drawn from the corpus by difficulty rather than listed
 * by hand: the score already ranks them, and a hand-written list would go stale
 * the moment a sentence is added. Sorted by score then id, so the tiers are the
 * same on every machine and every build.
 */
const sentencesByDifficulty = corpus
  .filter(({ kind }) => kind === 'sentence')
  .map((drill) => ({ drill, tags: drillTags[drill.id] }))
  .filter(({ tags }) => tags)
  .sort((a, b) => a.tags.difficulty - b.tags.difficulty || a.drill.id.localeCompare(b.drill.id))

const TIER_SIZE = 12
const middle = Math.floor(sentencesByDifficulty.length / 2)

/**
 * Three tiers cut from the ranking: the gentlest sentences, the median ones,
 * and the hardest. Sampling across the range rather than taking the first
 * thirty-six means the last lesson is genuinely the deep end — which is where
 * a curriculum has to end if free practice is the thing it prepares you for.
 */
const SENTENCE_TIERS: { id: string; title: string; description: string; from: number }[] = [
  {
    id: 'sentences-1',
    title: 'First sentences',
    description: 'Short, and the gentlest the corpus has.',
    from: 0,
  },
  {
    id: 'sentences-2',
    title: 'Longer sentences',
    description: 'Middling length, and stacking that is no longer a special occasion.',
    from: middle - TIER_SIZE / 2,
  },
  {
    id: 'sentences-3',
    title: 'Real Khmer, at length',
    description: 'The deep end: the hardest sentences the corpus has.',
    from: sentencesByDifficulty.length - TIER_SIZE,
  },
]

SENTENCE_TIERS.forEach((tier, index) => {
  add({
    id: tier.id,
    title: tier.title,
    description: tier.description,
    introduces: [],
    drills: sentencesByDifficulty
      .slice(tier.from, tier.from + TIER_SIZE)
      .map(({ drill }) => drill.id),
    // Cumulative review reaches back into the exercises: the sentences are
    // where stacking stops being announced, so the stacking drills are what a
    // learner is most likely to have gone rusty on.
    review: index === 0 ? 'e094' : `e${String(78 + index * 2).padStart(3, '0')}`,
  })
})

export const curriculum: readonly Lesson[] = lessons

export function lessonById(id: string): Lesson | undefined {
  return curriculum.find((lesson) => lesson.id === id)
}

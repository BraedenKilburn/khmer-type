import { corpus, drillById, sentences, type Drill } from '@/data/corpus'
import type { Lesson } from '@/data/lessons'
import type { DrillOrder } from '@/lib/drillOrder'
import { useLesson, type DrillScorer } from '@/composables/useLesson'

/**
 * A practice session: what the learner is sitting down to do.
 *
 * There are three, and they differ in four small ways — which drills, in what
 * order, counting towards what, and whether "drill 4 of 12" means anything. The
 * trainer used to take those as three separate props with the fourth inferred
 * from one of the others, so each view assembled its own answer and the
 * assembly was the part nothing tested.
 *
 * Naming the session is what makes the three read as three of a kind rather
 * than as three arrangements of the same knobs. See CONTEXT.md.
 */
export interface PracticeSession {
  /** The drills to draw from. */
  pool: Drill[]
  /** How the next drill is chosen — see `@/lib/drillOrder`. */
  order: DrillOrder
  /**
   * Who is keeping score, if anyone. Absent is a decision, not an omission: a
   * run that counts towards nothing is what free practice *is*.
   */
  scorer?: DrillScorer
  /**
   * Whether the drill counter means anything here.
   *
   * Its own fact rather than a reading of `order`. A lesson is a list to work
   * through and the count is progress; free practice is a stream, where "drill 4
   * of 308" would be a countdown nobody asked for. The two happen to line up
   * with `sequential` today, and inferring one from the other is how a fourth
   * session would arrive with a counter it never asked for.
   */
  showsPosition: boolean
}

/**
 * Free practice: real Khmer, drawn at random, counting towards nothing.
 *
 * What the app was before the curriculum existed, and it stays exactly that.
 * Sentences only — the key-location exercises are teaching aids, and serving
 * `ក ខ គ ឃ ង` to someone who came here to type would be a lesson in disguise.
 */
export function freePractice(): PracticeSession {
  return {
    pool: sentences(),
    order: 'random',
    showsPosition: false,
  }
}

/**
 * One lesson, worked through in the order it lays its drills out.
 *
 * The lesson names its drills by id and this is where those become drills — an
 * id the corpus no longer has is dropped rather than left as a hole the trainer
 * would have to render.
 */
export function lessonSession(lesson: Lesson): PracticeSession {
  return {
    pool: lesson.drills
      .map((drillId) => drillById(drillId))
      .filter((drill): drill is Drill => Boolean(drill)),
    order: 'sequential',
    /** Runs here count towards this lesson's gate — see `useLesson().scorerFor`. */
    scorer: useLesson().scorerFor(lesson.id),
    showsPosition: true,
  }
}

/**
 * Practice weighted towards the signs the learner is measurably worst at.
 *
 * Draws from the whole corpus, exercises included, and that is the point rather
 * than an oversight: a learner whose worst sign is `ក` is best served by
 * `ក ខ គ ឃ ង`, and the sentences alone cannot aim that tightly — a sentence
 * carries its weak sign along with thirty others. Nothing is scored, because
 * targeted practice is where you go to work rather than to be graded.
 */
export function targetedPractice(): PracticeSession {
  return {
    pool: [...corpus],
    order: 'adaptive',
    showsPosition: false,
  }
}

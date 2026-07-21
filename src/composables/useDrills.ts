import { ref, computed, type MaybeRefOrGetter, toValue } from 'vue'
import { corpus, type Drill } from '@/data/corpus'
import { drillTags } from '@/data/drillTags'
import { sampleWeighted } from '@/lib/adaptive'
import { useStats } from '@/composables/useStats'

/**
 * Sign decomposition, the unit beneath the cluster.
 *
 * Re-exported here because the strip, the on-screen keyboard, and the per-sign
 * stats all reach for it through the drills they are describing; it lives in
 * `@/lib/signs` with the rest of the pure text logic.
 */
export { toSigns } from '@/lib/signs'

/**
 * Remove Zero Width Space (ZWSP) code points. They carry no keystroke, so a
 * drill that contains them would be impossible to finish.
 */
export function stripZwsp(drill: string): string {
  return drill.replace(/​/g, '')
}

/** Free practice: real Khmer, never the key-location exercises. */
export function sentences(): Drill[] {
  return corpus.filter(({ kind }) => kind === 'sentence')
}

export function drillById(id: string): Drill | undefined {
  return corpus.find((drill) => drill.id === id)
}

/**
 * How the next drill is chosen.
 *
 * - `random` — free practice, every drill once before any repeats
 * - `sequential` — a lesson, in the order it lays its drills out
 * - `adaptive` — weighted towards the signs the learner is worst at
 */
export type DrillOrder = 'random' | 'sequential' | 'adaptive'

export interface DrillsOptions {
  /** The drills to draw from. A getter, so a lesson can swap it reactively. */
  pool?: MaybeRefOrGetter<Drill[]>
  order?: DrillOrder
}

/**
 * The drill on screen, and how to get another one.
 *
 * The pool is passed in rather than fixed, so free practice, a lesson, and
 * targeted practice differ in what they draw from and in nothing else. All
 * three share the typing surface, which is the only way it stays one surface.
 */
export function useDrills({ pool = sentences, order = 'random' }: DrillsOptions = {}) {
  const drills = computed(() => toValue(pool))
  const currentIndex = ref(0)

  const currentDrill = computed(() => stripZwsp(drills.value[currentIndex.value]?.km ?? ''))
  const currentDrillId = computed(() => drills.value[currentIndex.value]?.id)
  const position = computed(() => ({ index: currentIndex.value, total: drills.value.length }))

  const { stats } = useStats()

  /** Drills seen since the pool was last exhausted, so nothing repeats early. */
  let usedIndices: number[] = []

  function setNextDrill() {
    if (!drills.value.length) return

    if (order === 'sequential') {
      // A lesson is an order, so it stops at the end rather than wrapping —
      // the view is what decides where a finished lesson goes next.
      currentIndex.value = Math.min(currentIndex.value + 1, drills.value.length - 1)
      return
    }

    if (usedIndices.length >= drills.value.length) usedIndices = []

    const available = drills.value
      .map((_, index) => index)
      .filter((index) => !usedIndices.includes(index))
    if (!available.length) return

    const nextIndex =
      order === 'adaptive'
        ? pickWeakest(available)
        : available[Math.floor(Math.random() * available.length)]

    currentIndex.value = nextIndex
    usedIndices.push(nextIndex)
  }

  /** Weighted towards weakness, drawing only from what has not come up yet. */
  function pickWeakest(available: number[]): number {
    const candidates = available.map((index) => drills.value[index])
    const picked = sampleWeighted(candidates, drillTags, stats.value)
    const pickedIndex = candidates.findIndex((drill) => drill.id === picked?.id)
    return available[pickedIndex === -1 ? 0 : pickedIndex]
  }

  /*
   * Free practice opens on a random drill; a lesson opens on its first, which
   * is where `currentIndex` already sits.
   */
  if (order !== 'sequential') setNextDrill()

  return {
    currentDrill,
    currentDrillId,
    position,
    setNextDrill,
  }
}

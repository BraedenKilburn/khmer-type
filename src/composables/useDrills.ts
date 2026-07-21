import { ref, computed, type MaybeRefOrGetter, toValue } from 'vue'
import { sentences, stripZwsp, type Drill } from '@/data/corpus'
import { drillTags } from '@/data/drillTags'
import { selectorFor, type DrillOrder, type DrillSelector } from '@/lib/drillOrder'
import { useStats } from '@/composables/useStats'

export interface DrillsOptions {
  /** The drills to draw from. A getter, so a lesson can swap it reactively. */
  pool?: MaybeRefOrGetter<Drill[]>
  /** Which order to draw in. Ignored when `selector` is given. */
  order?: DrillOrder
  /**
   * The order itself, for a caller that wants to supply one — a test that must
   * not draw at random, or a pool that needs an order this app does not name.
   */
  selector?: DrillSelector
}

/**
 * The drill on screen, and how to get another one.
 *
 * The pool is passed in rather than fixed, so free practice, a lesson, and
 * targeted practice differ in what they draw from and in nothing else. All
 * three share the typing surface, which is the only way it stays one surface.
 *
 * *Which* drill comes next is `@/lib/drillOrder`'s business, not this module's.
 */
export function useDrills({ pool = sentences, order = 'random', selector }: DrillsOptions = {}) {
  const drills = computed(() => toValue(pool))
  const currentIndex = ref(0)

  const currentDrill = computed(() => stripZwsp(drills.value[currentIndex.value]?.km ?? ''))
  const currentDrillId = computed(() => drills.value[currentIndex.value]?.id)
  const position = computed(() => ({ index: currentIndex.value, total: drills.value.length }))

  const { stats } = useStats()
  const selection =
    selector ?? selectorFor(order, { tags: drillTags, stats: () => stats.value })

  function setNextDrill() {
    if (!drills.value.length) return
    currentIndex.value = selection.next(drills.value, currentIndex.value)
  }

  // Free practice opens on a draw; a lesson opens on its first drill. Which of
  // those it is, is the selector's to say.
  if (drills.value.length) currentIndex.value = selection.start(drills.value)

  return {
    currentDrill,
    currentDrillId,
    position,
    setNextDrill,
  }
}

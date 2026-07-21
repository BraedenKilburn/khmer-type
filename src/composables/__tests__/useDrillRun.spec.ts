// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

/**
 * The run reaches the per-sign record, which is held at module scope — so each
 * test gets a fresh registry and an empty `localStorage`.
 */
async function freshRun(drill: string | ReturnType<typeof ref<string>>, now?: () => number) {
  vi.resetModules()
  const { useDrillRun } = await import('@/composables/useDrillRun')
  const { useStats } = await import('@/composables/useStats')
  const source = typeof drill === 'string' ? () => drill : () => drill.value ?? ''
  return { run: useDrillRun(source, { now }), stats: useStats() }
}

/** A stopwatch the test winds by hand — see `DrillRunOptions.now`. */
function clock(start = 0) {
  let value = start
  return {
    now: () => value,
    advance: (ms: number) => {
      value += ms
    },
  }
}

beforeEach(() => {
  localStorage.clear()
})

/** `ស` `្វ` `ា` — three signs, four keystrokes, one cluster. */
const DRILL = 'ស្វា'

describe('useDrillRun', () => {
  describe('committing', () => {
    it('advances one keystroke per code point', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('ស')

      expect(run.isStarted.value).toBe(true)
      expect(run.nextCodePoint.value).toBe('្')
    })

    it('splits a composed commit back into its keystrokes', async () => {
      const { run, stats } = await freshRun(DRILL)

      // However the IME delivered it, `ស្វា` is four keystrokes — ADR-0002.
      run.commit(DRILL)

      expect(run.isComplete.value).toBe(true)
      expect(stats.stats.value['ស'].attempts).toBe(1)
      expect(stats.stats.value['្វ'].attempts).toBe(2)
      expect(stats.stats.value['ា'].attempts).toBe(1)
    })

    it('refuses a keystroke past the end of the drill', async () => {
      const { run, stats } = await freshRun('ក')

      run.commit('ក')
      run.commit('ខ')

      expect(run.accuracy.value).toBe(100)
      expect(stats.stats.value['ខ']).toBeUndefined()
    })

    it('ignores an empty commit', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('')

      expect(run.isStarted.value).toBe(false)
    })
  })

  describe('the order the pure modules depend on', () => {
    it('records a keystroke against the sign it was aimed at, not the next one', async () => {
      const { run, stats } = await freshRun(DRILL)

      run.commit('ក')

      // Recorded before the cursor moved past `ស`. Filing it after would have
      // charged the error to `្វ`.
      expect(stats.stats.value['ស']).toMatchObject({ attempts: 1, errors: 1 })
      expect(stats.stats.value['្វ']).toBeUndefined()
    })

    it('starts the clock at the first keystroke that lands, not the first refused', async () => {
      const { advance, now } = clock(1_000)
      const { run } = await freshRun('ក', now)

      run.commit('a') // Latin — refused, and the clock must not start
      advance(60_000)
      run.commit('ក')

      // One keystroke in zero elapsed time, not one in a minute.
      expect(run.kpm.value).toBe(0)
    })

    it('does not charge the gap between drills to the next drill first sign', async () => {
      const { advance, now } = clock(1_000)
      const drill = ref(DRILL)
      const { run, stats } = await freshRun(drill, now)

      run.commit('ស')
      run.reset()

      advance(60_000) // the learner reads the next drill
      run.commit('ស')

      expect(stats.stats.value['ស'].totalMs).toBe(0)
    })
  })

  describe('rewinding', () => {
    it('moves the cursor back without restoring accuracy', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('ក') // wrong
      run.rewind()
      run.commit('ស') // corrected

      // Two keystrokes, one of them wrong when pressed — see CONTEXT.md.
      expect(run.accuracy.value).toBe(50)
      expect(run.nextCodePoint.value).toBe('្')
    })

    it('does not record a Backspace as an attempt', async () => {
      const { run, stats } = await freshRun(DRILL)

      run.commit('ស')
      run.rewind()

      expect(stats.stats.value['ស'].attempts).toBe(1)
    })
  })

  describe('the typing line', () => {
    it('never splits a cluster', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('ស')

      // One cluster, whole, in flight — docs/adr/0001-clusters-are-atomic.md.
      expect(run.renderClusters.value).toHaveLength(1)
      expect(run.renderClusters.value[0]).toMatchObject({ text: DRILL, state: 'active' })
    })

    it('marks a cluster the cursor is still inside as gone wrong', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('ក')

      expect(run.renderClusters.value[0].state).toBe('active-incorrect')
    })

    it('hands the strip what was typed into the active cluster, not how much', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('ក')

      expect(run.activeCluster.value?.text).toBe(DRILL)
      expect(run.typedIntoActiveCluster.value).toBe('ក')
    })

    it('has no active cluster between clusters', async () => {
      const { run } = await freshRun('កក')

      run.commit('ក')

      expect(run.activeCluster.value).toBeUndefined()
      expect(run.typedIntoActiveCluster.value).toBe('')
      expect(run.cursorClusterIndex.value).toBe(1)
    })
  })

  describe('speed', () => {
    it('counts keystrokes rather than clusters', async () => {
      const { advance, now } = clock(1_000)
      const { run } = await freshRun(DRILL, now)

      run.commit('ស')
      advance(60_000)
      run.commit('្វា')

      // Four keystrokes in a minute, though it is only one cluster — ADR-0002.
      expect(run.kpm.value).toBe(4)
      expect(run.kps.value).toBeCloseTo(4 / 60)
    })

    it('reports nothing until the run is finished', async () => {
      const { advance, now } = clock(1_000)
      const { run } = await freshRun(DRILL, now)

      run.commit('ស')
      advance(60_000)

      expect(run.kpm.value).toBe(0)
      expect(run.kps.value).toBe(0)
    })
  })

  describe('the wrong layout', () => {
    it('is raised by a Latin letter, which no drill can match', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('s')

      expect(run.isWrongLayout.value).toBe(true)
      expect(run.isStarted.value).toBe(false)
    })

    it('keeps the Khmer out of a partly-Latin composed commit', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('sស')

      // The Latin is dropped per letter rather than the whole commit refused —
      // throwing away the `ស` would lose a keystroke the user typed correctly.
      // And it landed, so the panel has its proof and stays down.
      expect(run.isStarted.value).toBe(true)
      expect(run.isWrongLayout.value).toBe(false)
    })

    it('is lowered by a Khmer keystroke landing, which is the proof it was fixed', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('s')
      run.commit('ស')

      expect(run.isWrongLayout.value).toBe(false)
    })

    it('survives a new drill, which fixes nothing about the installed layout', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('s')
      run.reset()

      expect(run.isWrongLayout.value).toBe(true)
    })

    it('is lowered on request, for a user who has read the panel', async () => {
      const { run } = await freshRun(DRILL)

      run.commit('s')
      run.dismissWrongLayout()

      expect(run.isWrongLayout.value).toBe(false)
    })
  })

  describe('resetting', () => {
    it('clears the run without clearing the history', async () => {
      const { run, stats } = await freshRun(DRILL)

      run.commit('ក')
      run.reset()

      expect(run.isStarted.value).toBe(false)
      expect(run.accuracy.value).toBe(100)
      expect(stats.stats.value['ស']).toMatchObject({ attempts: 1, errors: 1 })
    })

    it('follows the drill when it changes underneath', async () => {
      const drill = ref(DRILL)
      const { run } = await freshRun(drill)

      run.commit('ស')
      drill.value = 'ក'
      run.reset()

      expect(run.nextCodePoint.value).toBe('ក')
      expect(run.isComplete.value).toBe(false)
    })
  })
})

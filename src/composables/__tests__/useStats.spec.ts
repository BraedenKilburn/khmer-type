// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useStats } from '@/composables/useStats'
import { resetLearnerData } from '@/composables/records'
import { isolateRecords } from '@/testing/records'

let records: ReturnType<typeof isolateRecords>

beforeEach(() => {
  records = isolateRecords()
})

const DRILL = 'ស្វា'

/** A run at `drill`, with its own hesitation clock. */
function run(drill = DRILL) {
  return useStats().recordRun(drill)
}

describe('recordRun', () => {
  it('records a keystroke against the sign it was aimed at', () => {
    const { stats } = useStats()

    run().keystroke(0, 'ស')

    expect(stats.value['ស']).toMatchObject({ attempts: 1, errors: 0 })
  })

  it('records an error against the sign that was expected, not the one typed', () => {
    const { stats } = useStats()

    run().keystroke(0, 'ក')

    expect(stats.value['ស']).toMatchObject({ attempts: 1, errors: 1 })
    expect(stats.value['ក']).toBeUndefined()
  })

  it('files both presses of a subscript under the subscript', () => {
    const { stats } = useStats()
    const drill = run()

    drill.keystroke(1, '្')
    drill.keystroke(2, 'វ')

    expect(stats.value['្វ']).toMatchObject({ attempts: 2, errors: 0 })
    expect(stats.value['វ']).toBeUndefined()
  })

  it('keeps ្ក apart from ក', () => {
    const { stats } = useStats()

    run('ក').keystroke(0, 'ក')
    run('ខ្ក').keystroke(1, '្')

    expect(Object.keys(stats.value).sort()).toEqual(['្ក', 'ក'].sort())
  })

  it('leaves a corrected typo counted as an error', () => {
    const { stats } = useStats()
    const drill = run()

    // Wrong, backspaced — the Backspace never reaches the record — then right.
    drill.keystroke(0, 'ក')
    drill.keystroke(0, 'ស')

    expect(stats.value['ស']).toMatchObject({ attempts: 2, errors: 1 })
  })

  it('records nothing for a keystroke past the end of the drill', () => {
    const { stats } = useStats()

    run('ក').keystroke(1, 'ក')

    expect(stats.value).toEqual({})
  })

  it('follows the drill under it rather than the one it started on', () => {
    const { stats } = useStats()
    const drill = ref('ក')
    const recorder = useStats().recordRun(drill)

    drill.value = 'ស'
    recorder.keystroke(0, 'ស')

    // Filed against the sign the learner is actually looking at.
    expect(stats.value['ស']).toMatchObject({ attempts: 1, errors: 0 })
    expect(stats.value['ក']).toBeUndefined()
  })
})

describe('the hesitation clock', () => {
  it('measures the wait before a keystroke, not the wait before the drill', () => {
    const { stats } = useStats()
    const drill = run()

    // The first keystroke has no previous one to wait after; the gap before it
    // is the user reading the drill, or away from the keyboard entirely.
    drill.keystroke(0, 'ស', 10_000)
    drill.keystroke(1, '្', 10_400)

    expect(stats.value['ស'].totalMs).toBe(0)
    expect(stats.value['្វ'].totalMs).toBe(400)
  })

  it('does not carry a wait across the end of a drill', () => {
    const { stats } = useStats()

    run('ក').keystroke(0, 'ក', 1_000)
    // A new run is a cleared clock — there is no call to forget.
    run('ស').keystroke(0, 'ស', 60_000)

    expect(stats.value['ស'].totalMs).toBe(0)
  })

  it('gives two runs of the same drill clocks of their own', () => {
    const { stats } = useStats()
    const first = run('ក')
    const second = run('ក')

    first.keystroke(0, 'ក', 1_000)
    second.keystroke(0, 'ក', 90_000)

    // Two attempts, neither of them charged the gap between the runs.
    expect(stats.value['ក']).toMatchObject({ attempts: 2, totalMs: 0 })
  })
})

describe('the record itself', () => {
  it('survives a reload', async () => {
    const drill = run()
    drill.keystroke(0, 'ស', 1_000)
    drill.keystroke(1, '្', 1_500)
    await nextTick()

    records.reload()
    const reloaded = useStats()

    expect(reloaded.stats.value['ស']).toMatchObject({ attempts: 1, errors: 0 })
    expect(reloaded.stats.value['្វ']).toMatchObject({ attempts: 1, totalMs: 500 })
  })

  it('stores under a versioned key', async () => {
    run().keystroke(0, 'ស')
    await nextTick()

    const stored = records.storage.getItem('khmer-type:stats:v1')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!)['ស']).toMatchObject({ sign: 'ស', attempts: 1 })
  })

  it('adds to a history from an earlier session rather than replacing it', async () => {
    run().keystroke(0, 'ស')
    await nextTick()

    records.reload()
    const reloaded = useStats()
    reloaded.recordRun(DRILL).keystroke(0, 'ក')

    expect(reloaded.stats.value['ស']).toMatchObject({ attempts: 2, errors: 1 })
  })

  it('reports the weakest signs across sessions', () => {
    const { weakest } = useStats()
    const drill = run()

    drill.keystroke(0, 'ក') // wrong
    drill.keystroke(1, '្') // right

    expect(weakest().map(({ sign }) => sign)).toEqual(['ស'])
  })

  it('is thrown away with the rest of the learner’s history', () => {
    const { stats } = useStats()
    run().keystroke(0, 'ស')

    resetLearnerData()

    expect(stats.value).toEqual({})
  })
})

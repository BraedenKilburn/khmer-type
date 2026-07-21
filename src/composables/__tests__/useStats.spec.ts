// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

/**
 * One record for the whole app, held at module scope — so each test gets a
 * fresh registry and an empty `localStorage`, which is also how this suite
 * stages a reload.
 */
async function freshStats() {
  vi.resetModules()
  const { useStats } = await import('@/composables/useStats')
  return useStats()
}

beforeEach(() => {
  localStorage.clear()
})

const DRILL = 'ស្វា'

describe('useStats', () => {
  it('records a keystroke against the sign it was aimed at', async () => {
    const { stats, recordKeystroke } = await freshStats()

    recordKeystroke(DRILL, 0, 'ស')

    expect(stats.value['ស']).toMatchObject({ attempts: 1, errors: 0 })
  })

  it('records an error against the sign that was expected, not the one typed', async () => {
    const { stats, recordKeystroke } = await freshStats()

    recordKeystroke(DRILL, 0, 'ក')

    expect(stats.value['ស']).toMatchObject({ attempts: 1, errors: 1 })
    expect(stats.value['ក']).toBeUndefined()
  })

  it('files both presses of a subscript under the subscript', async () => {
    const { stats, recordKeystroke } = await freshStats()

    recordKeystroke(DRILL, 1, '្')
    recordKeystroke(DRILL, 2, 'វ')

    expect(stats.value['្វ']).toMatchObject({ attempts: 2, errors: 0 })
    expect(stats.value['វ']).toBeUndefined()
  })

  it('keeps ្ក apart from ក', async () => {
    const { stats, recordKeystroke } = await freshStats()

    recordKeystroke('ក', 0, 'ក')
    recordKeystroke('ខ្ក', 1, '្')

    expect(Object.keys(stats.value).sort()).toEqual(['្ក', 'ក'].sort())
  })

  it('leaves a corrected typo counted as an error', async () => {
    const { stats, recordKeystroke } = await freshStats()

    // Wrong, backspaced — the Backspace never reaches the record — then right.
    recordKeystroke(DRILL, 0, 'ក')
    recordKeystroke(DRILL, 0, 'ស')

    expect(stats.value['ស']).toMatchObject({ attempts: 2, errors: 1 })
  })

  it('records nothing for a keystroke past the end of the drill', async () => {
    const { stats, recordKeystroke } = await freshStats()

    recordKeystroke('ក', 1, 'ក')

    expect(stats.value).toEqual({})
  })

  it('measures the wait before a keystroke, not the wait before the drill', async () => {
    const { stats, recordKeystroke, startDrill } = await freshStats()
    startDrill()

    // The first keystroke has no previous one to wait after; the gap before it
    // is the user reading the drill, or away from the keyboard entirely.
    recordKeystroke(DRILL, 0, 'ស', 10_000)
    recordKeystroke(DRILL, 1, '្', 10_400)

    expect(stats.value['ស'].totalMs).toBe(0)
    expect(stats.value['្វ'].totalMs).toBe(400)
  })

  it('does not carry a wait across the end of a drill', async () => {
    const { stats, recordKeystroke, startDrill } = await freshStats()

    recordKeystroke('ក', 0, 'ក', 1_000)
    startDrill()
    recordKeystroke('ស', 0, 'ស', 60_000)

    expect(stats.value['ស'].totalMs).toBe(0)
  })

  it('survives a reload', async () => {
    const first = await freshStats()
    first.recordKeystroke(DRILL, 0, 'ស', 1_000)
    first.recordKeystroke(DRILL, 1, '្', 1_500)
    await nextTick()

    const reloaded = await freshStats()

    expect(reloaded.stats.value['ស']).toMatchObject({ attempts: 1, errors: 0 })
    expect(reloaded.stats.value['្វ']).toMatchObject({ attempts: 1, totalMs: 500 })
  })

  it('stores under a versioned key', async () => {
    const { recordKeystroke } = await freshStats()
    recordKeystroke(DRILL, 0, 'ស')
    await nextTick()

    const stored = localStorage.getItem('khmer-type:stats:v1')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!)['ស']).toMatchObject({ sign: 'ស', attempts: 1 })
  })

  it('adds to a history from an earlier session rather than replacing it', async () => {
    const first = await freshStats()
    first.recordKeystroke(DRILL, 0, 'ស')
    await nextTick()

    const reloaded = await freshStats()
    reloaded.recordKeystroke(DRILL, 0, 'ក')

    expect(reloaded.stats.value['ស']).toMatchObject({ attempts: 2, errors: 1 })
  })

  it('reports the weakest signs across sessions', async () => {
    const { recordKeystroke, weakest } = await freshStats()

    recordKeystroke(DRILL, 0, 'ក') // wrong
    recordKeystroke(DRILL, 1, '្') // right

    expect(weakest().map(({ sign }) => sign)).toEqual(['ស'])
  })

  it('clears the history when asked', async () => {
    const { stats, recordKeystroke, clear } = await freshStats()
    recordKeystroke(DRILL, 0, 'ស')

    clear()

    expect(stats.value).toEqual({})
  })
})

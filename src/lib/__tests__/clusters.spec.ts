import { describe, expect, it } from 'vitest'
import { isActive, toRenderClusters } from '@/lib/clusters'
import { toClusters } from '@/lib/drillAnalysis'

describe('toRenderClusters', () => {
  const drill = 'សូមស្វាគមន៏!'

  it('marks every cluster untyped at cursor 0', () => {
    const rendered = toRenderClusters(drill, '', 0)
    expect(rendered.map((c) => c.text)).toEqual(toClusters(drill))
    expect(rendered.every((c) => c.state === 'untyped')).toBe(true)
  })

  it('marks every cluster correct once the drill is fully and correctly typed', () => {
    const rendered = toRenderClusters(drill, drill, drill.length)
    expect(rendered.every((c) => c.state === 'correct')).toBe(true)
  })

  it('never splits a cluster — the rendered text always reassembles to the drill', () => {
    for (let cursor = 0; cursor <= drill.length; cursor++) {
      const rendered = toRenderClusters(drill, drill.slice(0, cursor), cursor)
      expect(rendered.map((c) => c.text).join('')).toBe(drill)
    }
  })

  it('walks the cursor through every position and buckets each cluster', () => {
    // Cluster boundaries in code-unit offsets: សូ[0,2) ម[2,3) ស្វា[3,7) គ[7,8) ម[8,9) ន៏[9,11) ![11,12)
    const bounds = [
      [0, 2],
      [2, 3],
      [3, 7],
      [7, 8],
      [8, 9],
      [9, 11],
      [11, 12],
    ]

    for (let cursor = 0; cursor <= drill.length; cursor++) {
      const rendered = toRenderClusters(drill, drill.slice(0, cursor), cursor)

      const expected = bounds.map(([start, end]) => {
        if (cursor >= end) return 'correct'
        if (cursor > start) return 'active'
        return 'untyped'
      })

      expect(rendered.map((c) => c.state), `cursor ${cursor}`).toEqual(expected)
    }
  })

  it('keeps ស្វា active at every cursor position inside it, never split', () => {
    // ស្វា spans [3, 7). Cursors 4, 5, and 6 sit inside it.
    for (const cursor of [4, 5, 6]) {
      const rendered = toRenderClusters(drill, drill.slice(0, cursor), cursor)
      const stacked = rendered.find((c) => c.text === 'ស្វា')
      expect(stacked, `cursor ${cursor}`).toBeDefined()
      expect(stacked!.state, `cursor ${cursor}`).toBe('active')
    }
  })

  /*
   * The cluster still cannot be part-coloured — ADR-0001 stands — but it can say
   * "something in here is already wrong" the keystroke it becomes true, instead
   * of waiting for the cluster to finish. The sign strip says which sign.
   */
  it('flags a stacked cluster as gone-wrong while the cursor is still inside it', () => {
    // ស្វា spans [3, 7). Get its subscript consonant wrong at cursor 6.
    const typed = 'សូម' + 'ស្ត'
    const rendered = toRenderClusters(drill, typed, typed.length)
    expect(rendered.find((c) => c.text === 'ស្វា')!.state).toBe('active-incorrect')
  })

  it('keeps a gone-wrong cluster active so the caret and strip stay on it', () => {
    const typed = 'សូម' + 'ស្ត'
    const rendered = toRenderClusters(drill, typed, typed.length)
    expect(isActive(rendered.find((c) => c.text === 'ស្វា')!.state)).toBe(true)
  })

  it('does not flag a cluster whose typed prefix is still correct', () => {
    const typed = 'សូម' + 'ស្'
    const rendered = toRenderClusters(drill, typed, typed.length)
    expect(rendered.find((c) => c.text === 'ស្វា')!.state).toBe('active')
  })

  it('marks the whole stacked cluster incorrect when a keystroke inside it was wrong', () => {
    // Type through ស្វា but get the subscript consonant wrong.
    const typed = 'សូម' + 'ស្ត' + 'ា'
    const rendered = toRenderClusters(drill, typed, typed.length)
    expect(rendered.find((c) => c.text === 'ស្វា')!.state).toBe('incorrect')
  })

  it('leaves clusters before the error untouched', () => {
    const typed = 'សូម' + 'ស្ត' + 'ា'
    const rendered = toRenderClusters(drill, typed, typed.length)
    expect(rendered.slice(0, 2).map((c) => c.state)).toEqual(['correct', 'correct'])
  })

  it('yields an empty array for an empty drill', () => {
    expect(toRenderClusters('', '', 0)).toEqual([])
  })
})

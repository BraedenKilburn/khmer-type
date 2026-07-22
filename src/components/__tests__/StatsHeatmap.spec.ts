// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import StatsHeatmap from '@/components/StatsHeatmap.vue'
import { useStats } from '@/composables/useStats'
import { BASE_CONSONANTS } from '@/lib/signs'
import { isolateRecords } from '@/testing/records'

let records: ReturnType<typeof isolateRecords>

/**
 * A sign typed `attempts` times, `errors` of them wrong, `ms` apart.
 *
 * Recorded against a drill that is only that sign, so which sign a keystroke
 * was aimed at is never in doubt. The right key is the drill's first code
 * point: a subscript takes two presses and one is enough to stage.
 */
function type(sign: string, attempts: number, errors: number, ms: number) {
  const run = useStats().recordRun(sign)
  for (let attempt = 0; attempt < attempts; attempt++) {
    run.keystroke(0, attempt < errors ? 'ឞ' : sign[0], attempt * ms)
  }
}

function cellFor(wrapper: ReturnType<typeof mount>, sign: string) {
  return wrapper.findAll('.cell').find((cell) => cell.attributes('title')?.startsWith(sign))
}

beforeEach(() => {
  records = isolateRecords()
})

describe('StatsHeatmap', () => {
  it('renders the 33 consonants and their subscripts as separate entries', () => {
    const wrapper = mount(StatsHeatmap)
    expect(BASE_CONSONANTS).toHaveLength(33)
    expect(wrapper.findAll('.cell')).toHaveLength(66)
  })

  it('lists the consonants in traditional order', () => {
    const wrapper = mount(StatsHeatmap)
    const first = wrapper.findAll('.grid')[0].findAll('.cell')

    expect(first[0].text()).toContain('ក')
    expect(first.at(-1)!.text()).toContain('អ')
  })

  it('shows a sign with no attempts as unattempted, not as perfect', () => {
    // The failure this guards against congratulates a learner on every sign
    // they have been avoiding.
    const wrapper = mount(StatsHeatmap)
    const cell = cellFor(wrapper, 'ក')!

    expect(cell.classes()).toContain('is-unattempted')
    expect(cell.classes().some((name) => name.startsWith('level-'))).toBe(false)
    expect(cell.attributes('title')).toContain('not yet typed')
  })

  it('separates a flawless sign from an untouched one', async () => {
    type('ក', 4, 0, 200)
    const wrapper = mount(StatsHeatmap)
    await nextTick()

    expect(cellFor(wrapper, 'ក')!.classes()).toContain('level-0')
    expect(cellFor(wrapper, 'ខ')!.classes()).toContain('is-unattempted')
  })

  it('darkens with trouble', async () => {
    type('ក', 4, 0, 100) // never wrong
    type('ខ', 4, 3, 100) // wrong most of the time
    const wrapper = mount(StatsHeatmap)
    await nextTick()

    expect(cellFor(wrapper, 'ក')!.classes()).toContain('level-0')
    expect(cellFor(wrapper, 'ខ')!.classes()).toContain('level-4')
  })

  it('records a subscript apart from its base consonant', async () => {
    type('្ក', 4, 4, 100)
    const wrapper = mount(StatsHeatmap)
    await nextTick()

    expect(cellFor(wrapper, '្ក')!.classes()).toContain('level-4')
    expect(cellFor(wrapper, 'ក')!.classes()).toContain('is-unattempted')
  })

  it('switches to hesitation, which ranks a sign accuracy calls perfect', async () => {
    type('ក', 4, 0, 3_000) // always right, always slow
    const wrapper = mount(StatsHeatmap)
    await nextTick()

    expect(cellFor(wrapper, 'ក')!.classes()).toContain('level-0')

    await wrapper.findAll('[role="radio"], .p-togglebutton')[1].trigger('click')
    await nextTick()

    expect(cellFor(wrapper, 'ក')!.classes()).toContain('level-4')
  })

  it('prints every cell’s number, so nothing rests on colour alone', async () => {
    type('ក', 4, 1, 100)
    const wrapper = mount(StatsHeatmap)
    await nextTick()

    expect(cellFor(wrapper, 'ក')!.text()).toContain('25%')
    expect(cellFor(wrapper, 'ខ')!.text()).toContain('—')
  })

  it('carries a scale legend, including the unattempted state', () => {
    const legend = mount(StatsHeatmap).find('.legend')

    expect(legend.exists()).toBe(true)
    expect(legend.text()).toContain('not yet typed')
  })

  it('reflects stats persisted from an earlier session', () => {
    records.storage.setItem(
      'khmer-type:stats:v1',
      JSON.stringify({ 'ក': { sign: 'ក', attempts: 10, errors: 9, totalMs: 100 } }),
    )

    // A record is read from its store the first time it is asked for, so the
    // earlier session is staged by planting it and then reloading into it.
    records.reload()
    const wrapper = mount(StatsHeatmap)

    expect(cellFor(wrapper, 'ក')!.text()).toContain('90%')
    expect(cellFor(wrapper, 'ក')!.classes()).toContain('level-4')
  })
})

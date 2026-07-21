// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SignStrip from '@/components/SignStrip.vue'

function mountStrip(cluster?: string, typedCodeUnits = 0) {
  return mount(SignStrip, { props: { cluster, typedCodeUnits } })
}

describe('SignStrip', () => {
  it('decomposes the active cluster, one element per sign', () => {
    const signs = mountStrip('ស្វា', 1).findAll('.signs li')

    expect(signs).toHaveLength(3)
    expect(signs.map((sign) => sign.text())).toEqual(
      expect.arrayContaining([expect.stringContaining('ស'), expect.stringContaining('◌្វ')]),
    )
  })

  it('marks the sign under the cursor, the ones behind it, and the ones ahead', () => {
    const wrapper = mountStrip('ស្វា', 1)

    expect(wrapper.findAll('.sign-done')).toHaveLength(1)
    expect(wrapper.findAll('.sign-current')).toHaveLength(1)
    expect(wrapper.findAll('.sign-pending')).toHaveLength(1)
  })

  it('stays out of the way for a cluster of one sign', () => {
    const wrapper = mountStrip('ក', 0)

    expect(wrapper.findAll('.signs li')).toHaveLength(0)
    expect(wrapper.find('.sign-strip').classes()).toContain('is-hidden')
  })

  it('stays out of the way when the cursor is between clusters', () => {
    const wrapper = mountStrip(undefined, 0)

    expect(wrapper.findAll('.signs li')).toHaveLength(0)
    expect(wrapper.find('.sign-strip').classes()).toContain('is-hidden')
  })

  it('keeps its element in the document when hidden, so nothing above it shifts', () => {
    // `visibility: hidden`, not `v-if`: unmounting would collapse the height
    // and move the typing line every time the cursor entered a stacked cluster.
    expect(mountStrip('ក', 0).find('.sign-strip').exists()).toBe(true)
  })

  it('names the current sign', () => {
    expect(mountStrip('សូ', 1).find('.prompt').text()).toContain('Vowel sign')
  })

  it('spells out the two presses when the current sign is a subscript', () => {
    // The moment the naming exists for: COENG renders nothing, so a glyph
    // would tell the learner nothing about what to press.
    const prompt = mountStrip('ស្វា', 2).find('.prompt').text()

    expect(prompt).toContain('Subscript វ')
    expect(prompt).toContain('press ្ then វ')
  })

  it('follows the cursor through the cluster', async () => {
    const wrapper = mountStrip('ស្វា', 1)
    expect(wrapper.findAll('.sign-done')).toHaveLength(1)

    await wrapper.setProps({ typedCodeUnits: 3 })

    expect(wrapper.findAll('.sign-done')).toHaveLength(2)
    expect(wrapper.find('.sign-current').text()).toContain('◌ា')
  })
})

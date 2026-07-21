// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SignStrip from '@/components/SignStrip.vue'

/**
 * `typed` is what the user actually pressed into the cluster, which is not
 * always its own prefix — that is the whole point of the wrong-key cases below.
 */
function mountStrip(cluster?: string, typed = '') {
  return mount(SignStrip, { props: { cluster, typed } })
}

describe('SignStrip', () => {
  it('decomposes the active cluster, one element per sign', () => {
    const signs = mountStrip('ស្វា', 'ស').findAll('.signs li')

    expect(signs).toHaveLength(3)
    expect(signs.map((sign) => sign.text())).toEqual(
      expect.arrayContaining([expect.stringContaining('ស'), expect.stringContaining('◌្វ')]),
    )
  })

  it('marks the sign under the cursor, the ones behind it, and the ones ahead', () => {
    const wrapper = mountStrip('ស្វា', 'ស')

    expect(wrapper.findAll('.sign-done')).toHaveLength(1)
    expect(wrapper.findAll('.sign-current')).toHaveLength(1)
    expect(wrapper.findAll('.sign-pending')).toHaveLength(1)
  })

  it('stays out of the way for a cluster of one sign', () => {
    const wrapper = mountStrip('ក')

    expect(wrapper.findAll('.signs li')).toHaveLength(0)
    expect(wrapper.find('.sign-strip').classes()).toContain('is-hidden')
  })

  it('stays out of the way when the cursor is between clusters', () => {
    const wrapper = mountStrip(undefined)

    expect(wrapper.findAll('.signs li')).toHaveLength(0)
    expect(wrapper.find('.sign-strip').classes()).toContain('is-hidden')
  })

  it('keeps its element in the document when hidden, so nothing above it shifts', () => {
    // `visibility: hidden`, not `v-if`: unmounting would collapse the height
    // and move the typing line every time the cursor entered a stacked cluster.
    expect(mountStrip('ក').find('.sign-strip').exists()).toBe(true)
  })

  it('names the current sign', () => {
    expect(mountStrip('សូ', 'ស').find('.prompt').text()).toContain('Vowel sign')
  })

  it('spells out the two presses when the current sign is a subscript', () => {
    // The moment the naming exists for: COENG renders nothing, so a glyph
    // would tell the learner nothing about what to press.
    const prompt = mountStrip('ស្វា', 'ស្').find('.prompt').text()

    expect(prompt).toContain('Subscript វ')
    expect(prompt).toContain('press ្ then វ')
  })

  /*
   * The typing line renders a cluster whole and so cannot mark part of it wrong
   * — see docs/adr/0001-clusters-are-atomic.md. That makes the strip the only
   * place a learner can be told, mid-cluster, that a key was wrong and which of
   * the signs it landed in.
   */
  it('marks the sign a wrong keystroke landed in', () => {
    // `ស` correct, then the wrong key where the subscript was wanted.
    const wrapper = mountStrip('ស្វា', 'សត')

    expect(wrapper.findAll('.sign-wrong')).toHaveLength(1)
    expect(wrapper.find('.sign-wrong').text()).toContain('◌្វ')
  })

  it('says a key was wrong rather than what to press next', () => {
    const prompt = mountStrip('ស្វា', 'សត').find('.prompt')

    expect(prompt.text()).toContain('Wrong key')
    expect(prompt.classes()).toContain('is-wrong')
  })

  it('names the first wrong sign, not the last', () => {
    // Both signs are wrong; the earlier one is the one to go back and fix.
    const prompt = mountStrip('ស្វា', 'កូ').find('.prompt').text()

    expect(prompt).toContain('Consonant ស')
  })

  it('marks a mistake with a cross, so it does not read by colour alone', () => {
    expect(mountStrip('ស្វា', 'សត').find('.sign-wrong .marker').text()).toBe('✗')
  })

  it('does not call a half-typed subscript wrong for being unfinished', () => {
    const wrapper = mountStrip('ស្វា', 'ស្')

    expect(wrapper.findAll('.sign-wrong')).toHaveLength(0)
    expect(wrapper.find('.prompt').classes()).not.toContain('is-wrong')
  })

  it('clears the warning once the mistake is backspaced away', async () => {
    const wrapper = mountStrip('ស្វា', 'សត')
    expect(wrapper.findAll('.sign-wrong')).toHaveLength(1)

    await wrapper.setProps({ typed: 'ស' })

    expect(wrapper.findAll('.sign-wrong')).toHaveLength(0)
    expect(wrapper.find('.prompt').classes()).not.toContain('is-wrong')
  })

  it('follows the cursor through the cluster', async () => {
    const wrapper = mountStrip('ស្វា', 'ស')
    expect(wrapper.findAll('.sign-done')).toHaveLength(1)

    await wrapper.setProps({ typed: 'ស្វ' })

    expect(wrapper.findAll('.sign-done')).toHaveLength(2)
    expect(wrapper.find('.sign-current').text()).toContain('◌ា')
  })
})

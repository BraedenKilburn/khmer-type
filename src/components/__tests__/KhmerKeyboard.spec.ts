// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import KhmerKeyboard from '@/components/KhmerKeyboard.vue'
import { useLayoutVariant } from '@/composables/useLayoutVariant'
import { COENG } from '@/data/khmerLayout'
import type { LayoutVariant } from '@/lib/layoutVariant'

/**
 * The variant is one piece of state for the whole app, not one per component —
 * so the tests set it the way the app does, through the override, and reset it
 * between tests rather than pretending each mount gets its own.
 */
const { override } = useLayoutVariant()

function mountKeyboard(next?: string) {
  return mount(KhmerKeyboard, { props: { next } })
}

function capsOf(wrapper: ReturnType<typeof mountKeyboard>): string[] {
  return wrapper.findAll('.key').map((key) => key.text())
}

async function setVariant(variant: LayoutVariant) {
  override.value = variant
  await nextTick()
}

beforeEach(() => {
  override.value = null
  localStorage.clear()
})

describe('KhmerKeyboard', () => {
  it('renders the 48 keys of the layout, plus modifier caps', () => {
    const wrapper = mountKeyboard()
    expect(wrapper.findAll('.key:not(.modifier)')).toHaveLength(48)
    expect(wrapper.findAll('.key.modifier').length).toBeGreaterThan(0)
  })

  it('highlights the key producing the next expected character', () => {
    const target = mountKeyboard('ក').findAll('.key.is-target')

    expect(target).toHaveLength(1)
    expect(target[0].text()).toContain('ក')
  })

  it('moves the highlight when the next character changes', async () => {
    const wrapper = mountKeyboard('ក')
    expect(wrapper.find('.key.is-target').text()).toContain('ក')

    await wrapper.setProps({ next: 'ស' })

    expect(wrapper.find('.key.is-target').text()).toContain('ស')
  })

  it('arms the Shift caps when the next character needs Shift', () => {
    // គ is Shift+KeyK on NiDA.
    const wrapper = mountKeyboard('គ')
    expect(wrapper.findAll('.key.modifier.is-armed').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('Hold')
  })

  it('leaves the modifier caps alone for an unshifted key', () => {
    expect(mountKeyboard('ក').findAll('.key.modifier.is-armed')).toHaveLength(0)
  })

  it('highlights nothing once the drill is finished', () => {
    expect(mountKeyboard(undefined).findAll('.key.is-target')).toHaveLength(0)
  })

  it('gives COENG a dotted circle and its name, not an empty cap', () => {
    const coeng = mountKeyboard()
      .findAll('.key')
      .find((key) => key.text().includes('COENG'))

    expect(coeng).toBeDefined()
    // U+25CC, so the invisible sign has something to sit on.
    expect(coeng!.text()).toContain('◌')
  })

  it('explains COENG in words when it is the next key', () => {
    expect(mountKeyboard(COENG).text()).toContain('stacks the next consonant')
  })

  it('is a guide, not an input device — no key is clickable', () => {
    const wrapper = mountKeyboard()

    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.findAll('input')).toHaveLength(0)
    for (const key of wrapper.findAll('.key')) {
      expect(key.attributes('onclick')).toBeUndefined()
      expect(key.element.tagName).toBe('DIV')
    }
  })

  it('redraws when the layout variant changes under it', async () => {
    // Backslash carries ឮ unshifted on NiDA and ឭ unshifted on Apple's, so a
    // keyboard pinned to one table would show the same caps for both.
    const wrapper = mountKeyboard()
    const nidaCaps = capsOf(wrapper)

    await setVariant('macos')

    expect(capsOf(wrapper)).not.toEqual(nidaCaps)
  })

  it('points a macOS user at the key Apple actually assigned', async () => {
    // ឯ is AltGr+KeyE on NiDA but Shift+Slash on Apple's variant. Getting this
    // wrong is the whole reason the second table exists.
    await setVariant('macos')
    const wrapper = mountKeyboard('ឯ')

    expect(wrapper.findAll('.key.modifier.is-armed').length).toBeGreaterThan(0)
    expect(wrapper.find('.key.is-target').text()).toContain('ឯ')
  })

  it('tells a screen reader which key to press, since the caps are decoration', () => {
    const wrapper = mountKeyboard('គ')
    expect(wrapper.find('[aria-live]').text()).toContain('Shift')
    expect(wrapper.find('.board').attributes('aria-hidden')).toBe('true')
  })
})

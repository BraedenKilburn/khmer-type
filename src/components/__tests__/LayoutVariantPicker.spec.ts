// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import LayoutVariantPicker from '@/components/LayoutVariantPicker.vue'
import { useLayoutVariant } from '@/composables/useLayoutVariant'

/*
 * PrimeVue's Select binds an orientation listener on mount and jsdom ships no
 * `matchMedia`. Nothing here depends on the query's answer, so a listener-shaped
 * stub is enough to let the component mount.
 */
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia

function mountPicker() {
  return mount(LayoutVariantPicker, { global: { plugins: [PrimeVue] } })
}

/** What the closed control actually shows the user. */
function shownLabel(wrapper: ReturnType<typeof mountPicker>): string {
  return wrapper.find('.p-select-label').text()
}

describe('LayoutVariantPicker', () => {
  beforeEach(() => {
    // The composable's override is module-scoped and persisted, so a test that
    // set it would otherwise leak into the next one.
    useLayoutVariant().override.value = null
    window.localStorage.clear()
  })

  /*
   * The automatic option is stored as `null`, which PrimeVue's Select reads as
   * "nothing selected" — it rendered an empty box, and the only way to find out
   * what was in force was to open the menu and infer it. Automatic is a choice,
   * and the one nearly everybody is on, so it has to name itself.
   */
  it('names the layout in force while detection is automatic', () => {
    const label = shownLabel(mountPicker())

    expect(label).not.toBe('')
    expect(label).toContain('Khmer (NiDA)')
  })

  it('says detection is what is choosing, not the user', () => {
    expect(shownLabel(mountPicker())).toContain('Detect layout')
  })

  it('shows the override once the user has picked one', async () => {
    useLayoutVariant().override.value = 'macos'
    const wrapper = mountPicker()
    await wrapper.vm.$nextTick()

    expect(shownLabel(wrapper)).toBe('Khmer (macOS)')
  })

  it('maps the automatic sentinel back to no override', () => {
    const { override } = useLayoutVariant()
    override.value = 'macos'

    // Selecting automatic must clear the override, not store 'auto' as a
    // variant — detection is gated on the override being absent.
    mountPicker().findComponent({ name: 'Select' }).vm.$emit('update:modelValue', 'auto')

    expect(override.value).toBeNull()
  })
})

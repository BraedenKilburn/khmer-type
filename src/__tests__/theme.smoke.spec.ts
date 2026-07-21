// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import { KhmerTypePreset } from '@/theme'

describe('theme preset', () => {
  it('emits the monkeytype palette as PrimeVue variables', () => {
    mount(Button, {
      props: { label: 'x' },
      global: {
        plugins: [
          [
            PrimeVue,
            { theme: { preset: KhmerTypePreset, options: { darkModeSelector: '.dark' } } },
          ],
        ],
      },
    })

    const css = Array.from(document.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .join('\n')

    // The accent, both schemes.
    expect(css).toContain('--p-primary-500:#3fc6b4')
    // The dark page and surface.
    expect(css).toContain('#262629')
    expect(css).toContain('#2e3033')
    // The light scheme's warm neutrals.
    expect(css).toContain('#eceae4')
    // Radius, flattened from Aura's 6px default.
    expect(css).toContain('--p-border-radius-md:4px')

    /*
     * Aura's own primary must be gone from the *semantic* layer. Its primitive
     * palette (--p-blue-*, --p-emerald-*, …) is still emitted whatever the
     * preset says and nothing references it, so it is not worth asserting on.
     */
    expect(css).not.toContain('--p-primary-500:#10b981')
  })

  it('binds a deeper accent for the light scheme', () => {
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n')
    /*
     * Dark binds primary.color to 500 (the design's #3fc6b4); light binds it to
     * 800, which is the step that clears 4.5:1 on a pale surface. Both must be
     * emitted — if the light scheme ever falls back to 500 the nav, the links
     * and the key caps all drop to 2.5:1.
     */
    expect(css).toContain('--p-primary-800:#1f665c')
    expect(css).toContain('--p-primary-500:#3fc6b4')
  })
})

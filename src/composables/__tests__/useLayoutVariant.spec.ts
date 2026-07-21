// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

/**
 * The composable holds its state at module scope — one variant for the whole
 * app, not one per component that asks. So each test gets a fresh module
 * registry and a cleared `localStorage`, which is also the closest thing to a
 * reload this suite can stage.
 */
async function freshComposable() {
  vi.resetModules()
  const { useLayoutVariant } = await import('@/composables/useLayoutVariant')
  return useLayoutVariant()
}

const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const WINDOWS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

/**
 * Stated outright in every test that depends on it. jsdom's own user agent
 * reads as Windows — "darwin" contains "win" — so a suite that left it alone
 * would be asserting NiDA by coincidence rather than by intent.
 */
function onPlatform(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true })
}

beforeEach(() => {
  localStorage.clear()
  onPlatform(WINDOWS_UA)
})

describe('useLayoutVariant', () => {
  it('assumes NiDA until typing says otherwise', async () => {
    const { variant } = await freshComposable()
    expect(variant.value).toBe('nida')
  })

  /*
   * Detection is passive and rarely fires: only Space and Backslash tell the
   * tables apart without a modifier. So the pre-evidence guess is what a macOS
   * learner actually sees, and a fixed NiDA default meant they sat on the wrong
   * board — wrong about the spacebar, the most-pressed key there is.
   */
  it('assumes Apple’s layout on a Mac, before anything has been typed', async () => {
    onPlatform(MAC_UA)
    const { variant } = await freshComposable()
    expect(variant.value).toBe('macos')
  })

  it('still lets a keystroke overrule the platform guess', async () => {
    onPlatform(MAC_UA)
    const { variant, observeKeystroke } = await freshComposable()

    // A NiDA layout installed on a Mac: the evidence beats the machine.
    observeKeystroke('Slash', 'shift', '?')

    expect(variant.value).toBe('nida')
  })

  it('still lets the user overrule the platform guess', async () => {
    onPlatform(MAC_UA)
    const { variant, override } = await freshComposable()

    override.value = 'nida'

    expect(variant.value).toBe('nida')
  })

  it('switches to macOS on a keystroke only Apple’s layout explains', async () => {
    const { variant, observeKeystroke } = await freshComposable()
    observeKeystroke('Slash', 'shift', 'ឯ')
    expect(variant.value).toBe('macos')
  })

  it('stays put through keystrokes that discriminate nothing', async () => {
    const { variant, observeKeystroke } = await freshComposable()
    observeKeystroke('KeyK', 'base', 'ក')
    observeKeystroke('KeyJ', 'base', '្')
    expect(variant.value).toBe('nida')
  })

  it('never lets a contradicting keystroke overrule the user', async () => {
    const { variant, override, observeKeystroke } = await freshComposable()
    override.value = 'nida'

    observeKeystroke('Slash', 'shift', 'ឯ')

    expect(variant.value).toBe('nida')
  })

  it('lets an override take over a detection already made', async () => {
    const { variant, override, observeKeystroke } = await freshComposable()
    observeKeystroke('Slash', 'shift', 'ឯ')
    expect(variant.value).toBe('macos')

    override.value = 'nida'

    expect(variant.value).toBe('nida')
  })

  it('persists the override across a reload', async () => {
    const first = await freshComposable()
    first.override.value = 'macos'

    const reloaded = await freshComposable()
    expect(reloaded.override.value).toBe('macos')
    expect(reloaded.variant.value).toBe('macos')
  })

  it('does not persist a detection — a laptop is not the machine you are on', async () => {
    const first = await freshComposable()
    first.observeKeystroke('Slash', 'shift', 'ឯ')
    expect(first.variant.value).toBe('macos')

    const reloaded = await freshComposable()
    expect(reloaded.variant.value).toBe('nida')
  })

  it('clearing the override hands the question back to detection', async () => {
    const { variant, override, observeKeystroke } = await freshComposable()
    override.value = 'nida'
    observeKeystroke('Slash', 'shift', 'ឯ')
    override.value = null

    // Nothing was learned while the override stood, so it starts over.
    expect(variant.value).toBe('nida')
    observeKeystroke('Slash', 'shift', 'ឯ')
    expect(variant.value).toBe('macos')
  })

  it('stores the override under a versioned key', async () => {
    const { override } = await freshComposable()
    override.value = 'macos'

    // `useStorage` writes on a watcher, so the value lands after the tick.
    await nextTick()

    expect(localStorage.getItem('khmer-type:layout-variant:v1')).toBe('macos')
  })
})

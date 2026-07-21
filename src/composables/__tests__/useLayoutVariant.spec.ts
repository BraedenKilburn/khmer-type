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

beforeEach(() => {
  localStorage.clear()
})

describe('useLayoutVariant', () => {
  it('assumes NiDA until typing says otherwise', async () => {
    const { variant } = await freshComposable()
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

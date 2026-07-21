import { describe, expect, it } from 'vitest'
import { layoutFor, levelFromModifiers, variantFromKeystroke } from '@/lib/layoutVariant'

describe('variantFromKeystroke', () => {
  it('names the variant from the spacebar, where the two differ most', () => {
    // Both put ZWSP on Space — NiDA unshifted, Apple on Shift. Which level it
    // sits on is the whole discriminator; comparing outputs alone learns
    // nothing from the most-pressed key on the board.
    expect(variantFromKeystroke('Space', 'base', '​')).toBe('nida')
    expect(variantFromKeystroke('Space', 'base', ' ')).toBe('macos')
    expect(variantFromKeystroke('Space', 'shift', ' ')).toBe('nida')
    expect(variantFromKeystroke('Space', 'shift', '​')).toBe('macos')
  })

  it('names macOS from a key Apple moved', () => {
    // Shift+Slash is `?` on NiDA and ឯ on Apple's variant.
    expect(variantFromKeystroke('Slash', 'shift', 'ឯ')).toBe('macos')
    expect(variantFromKeystroke('Slash', 'shift', '?')).toBe('nida')
  })

  it('reads Backslash, where the two swap the same pair of letters', () => {
    expect(variantFromKeystroke('Backslash', 'base', 'ឮ')).toBe('nida')
    expect(variantFromKeystroke('Backslash', 'base', 'ឭ')).toBe('macos')
  })

  it('stays undecided on a key both layouts agree about', () => {
    // COENG is on KeyJ either way — the majority of keystrokes look like this.
    expect(variantFromKeystroke('KeyJ', 'base', '្')).toBeUndefined()
    expect(variantFromKeystroke('KeyK', 'base', 'ក')).toBeUndefined()
  })

  it('stays undecided when neither layout explains the keystroke', () => {
    // A third layout, or an IME handing over text no single key produced.
    expect(variantFromKeystroke('KeyK', 'base', 'k')).toBeUndefined()
    expect(variantFromKeystroke('KeyK', 'base', 'ស្វា')).toBeUndefined()
  })

  it('stays undecided for a key neither table describes', () => {
    expect(variantFromKeystroke('F13', 'base', 'ក')).toBeUndefined()
    expect(variantFromKeystroke('NumpadEnter', 'base', '\n')).toBeUndefined()
  })

  it('reads a ligature press as NiDA — Apple assigns none', () => {
    expect(variantFromKeystroke('KeyA', 'shift', 'ាំ')).toBe('nida')
  })
})

describe('levelFromModifiers', () => {
  it('maps the modifier state to the level it selects', () => {
    expect(levelFromModifiers(false, false)).toBe('base')
    expect(levelFromModifiers(true, false)).toBe('shift')
    expect(levelFromModifiers(false, true)).toBe('alt')
  })

  it('has no answer for Shift and AltGr together — no table records one', () => {
    expect(levelFromModifiers(true, true)).toBeUndefined()
  })
})

describe('layoutFor', () => {
  it('hands back a different table per variant', () => {
    expect(layoutFor('nida')).not.toBe(layoutFor('macos'))
  })
})

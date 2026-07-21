// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useKeystrokeIntake } from '@/composables/useKeystrokeIntake'
import type { Level } from '@/data/khmerLayout'

/**
 * A real input and real events. The point of the seam is that the browser's
 * event path can be driven without mounting anything, so these tests dispatch
 * the same `InputEvent`s and `CompositionEvent`s a browser would.
 */
function intake() {
  const element = document.createElement('input')
  const onCommit = vi.fn<(text: string) => void>()
  const onRewind = vi.fn<() => void>()
  const onKeystroke = vi.fn<(code: string, level: Level, text: string) => void>()

  return {
    element,
    onCommit,
    onRewind,
    onKeystroke,
    handlers: useKeystrokeIntake({ element, onCommit, onRewind, onKeystroke }),
  }
}

function keydown(init: KeyboardEventInit) {
  return new KeyboardEvent('keydown', { cancelable: true, ...init })
}

function beforeinput(init: InputEventInit) {
  return new InputEvent('beforeinput', { cancelable: true, inputType: 'insertText', ...init })
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('useKeystrokeIntake', () => {
  describe('direct entry', () => {
    it('commits the text the key produced', () => {
      const { handlers, onCommit } = intake()

      handlers.beforeinput(beforeinput({ data: 'ស' }))

      expect(onCommit).toHaveBeenCalledWith('ស')
    })

    it('prevents the default so the input stays empty', () => {
      const { handlers } = intake()
      const event = beforeinput({ data: 'ស' })

      handlers.beforeinput(event)

      // The browser must never draw its own text over the drill.
      expect(event.defaultPrevented).toBe(true)
    })

    it('refuses a paste, which is not a typing run', () => {
      const { handlers, onCommit } = intake()
      const event = beforeinput({ data: 'សូមស្វាគមន៏', inputType: 'insertFromPaste' })

      handlers.beforeinput(event)

      expect(event.defaultPrevented).toBe(true)
      expect(onCommit).not.toHaveBeenCalled()
    })

    it('ignores an input type that is not an insertion', () => {
      const { handlers, onCommit } = intake()

      handlers.beforeinput(beforeinput({ data: null, inputType: 'deleteContentBackward' }))

      expect(onCommit).not.toHaveBeenCalled()
    })
  })

  describe('Backspace', () => {
    it('rewinds, and stops the key navigating the page back', () => {
      const { handlers, onRewind } = intake()
      const event = keydown({ key: 'Backspace', code: 'Backspace' })

      handlers.keydown(event)

      expect(onRewind).toHaveBeenCalledOnce()
      expect(event.defaultPrevented).toBe(true)
    })

    it('belongs to the composition buffer while an IME is composing', () => {
      const { handlers, onRewind } = intake()

      handlers.compositionstart()
      handlers.keydown(keydown({ key: 'Backspace', code: 'Backspace' }))

      // Rewinding the drill under an uncommitted sequence would desync the two.
      expect(onRewind).not.toHaveBeenCalled()
    })

    it('stays out of the way when the event itself reports composing', () => {
      const { handlers, onRewind } = intake()

      handlers.keydown(keydown({ key: 'Backspace', code: 'Backspace', isComposing: true }))

      expect(onRewind).not.toHaveBeenCalled()
    })
  })

  describe('Enter', () => {
    it('is prevented so it cannot submit an ancestor form', () => {
      const { handlers } = intake()
      const event = keydown({ key: 'Enter', code: 'Enter' })

      handlers.keydown(event)

      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('Space', () => {
    it('is left alone, so the space reaches the drill', () => {
      const { handlers } = intake()
      const event = keydown({ key: ' ', code: 'Space' })

      handlers.keydown(event)

      // Preventing it here would suppress the `beforeinput` that carries it.
      expect(event.defaultPrevented).toBe(false)
    })
  })

  describe('IME composition', () => {
    it('commits the whole sequence once, at compositionend', () => {
      const { handlers, onCommit } = intake()

      handlers.compositionstart()
      handlers.beforeinput(beforeinput({ data: 'ស', inputType: 'insertCompositionText' }))
      handlers.compositionend(new CompositionEvent('compositionend', { data: 'ស្វា' }))

      expect(onCommit).toHaveBeenCalledOnce()
      expect(onCommit).toHaveBeenCalledWith('ស្វា')
    })

    it('does not count the sequence twice when WebKit ends the composition early', () => {
      const { handlers, onCommit } = intake()

      handlers.compositionstart()
      // WebKit fires `compositionend` before the final `beforeinput`, so the
      // flag has already cleared by the time the composed text arrives.
      handlers.compositionend(new CompositionEvent('compositionend', { data: 'ស្វា' }))
      handlers.beforeinput(beforeinput({ data: 'ស្វា', inputType: 'insertCompositionText' }))

      expect(onCommit).toHaveBeenCalledOnce()
      expect(onCommit).toHaveBeenCalledWith('ស្វា')
    })

    it('clears the buffer the IME wrote into the input', () => {
      const { handlers, element } = intake()

      handlers.compositionstart()
      element.value = 'ស្'
      handlers.compositionend(new CompositionEvent('compositionend', { data: 'ស្វា' }))

      expect(element.value).toBe('')
    })

    it('leaves the in-flight buffer alone while it is still composing', () => {
      const { handlers, element } = intake()

      handlers.compositionstart()
      element.value = 'ស្'
      handlers.input()

      expect(element.value).toBe('ស្')
    })

    it('clears anything the browser inserted on its own', () => {
      const { handlers, element } = intake()

      element.value = 'ស'
      handlers.input()

      expect(element.value).toBe('')
    })
  })

  describe('layout evidence', () => {
    it('pairs the physical key with the text it produced', () => {
      const { handlers, onKeystroke } = intake()

      handlers.keydown(keydown({ key: 'a', code: 'KeyA' }))
      handlers.beforeinput(beforeinput({ data: 'ា' }))

      expect(onKeystroke).toHaveBeenCalledWith('KeyA', 'base', 'ា')
    })

    it('carries the modifier level, which is what tells the tables apart', () => {
      const { handlers, onKeystroke } = intake()

      // Both tables put ZWSP on the spacebar; the level is the discriminator.
      handlers.keydown(keydown({ key: ' ', code: 'Space', shiftKey: true }))
      handlers.beforeinput(beforeinput({ data: '​' }))

      expect(onKeystroke).toHaveBeenCalledWith('Space', 'shift', '​')
    })

    it('offers nothing for a modifier combination no table records', () => {
      const { handlers, onKeystroke, onCommit } = intake()

      handlers.keydown(keydown({ key: 'a', code: 'KeyA', shiftKey: true, altKey: true }))
      handlers.beforeinput(beforeinput({ data: 'ា' }))

      expect(onKeystroke).not.toHaveBeenCalled()
      // Still typed, still counted — it is only the evidence that is withheld.
      expect(onCommit).toHaveBeenCalledWith('ា')
    })

    it('offers nothing for a composed sequence, which has no single key behind it', () => {
      const { handlers, onKeystroke } = intake()

      handlers.keydown(keydown({ key: 'a', code: 'KeyA' }))
      handlers.compositionstart()
      handlers.compositionend(new CompositionEvent('compositionend', { data: 'ស្វា' }))

      expect(onKeystroke).not.toHaveBeenCalled()
    })

    it('offers nothing for a paste', () => {
      const { handlers, onKeystroke } = intake()

      handlers.keydown(keydown({ key: 'v', code: 'KeyV', metaKey: true }))
      handlers.beforeinput(beforeinput({ data: 'ស', inputType: 'insertFromPaste' }))

      expect(onKeystroke).not.toHaveBeenCalled()
    })
  })
})

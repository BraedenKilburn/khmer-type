import { ref, toValue, type MaybeRefOrGetter } from 'vue'
import { levelFromModifiers } from '@/lib/layoutVariant'
import type { Level } from '@/data/khmerLayout'

/**
 * The browser event path, from a hidden `<input>` to keystrokes.
 *
 * Everything awkward about typing in a browser lives here: an IME that commits
 * a whole sequence at once, a WebKit ordering that fires `compositionend`
 * before the final `beforeinput`, a Backspace with nothing to delete, a paste
 * that must be refused, and an input that has to stay empty or the browser
 * draws its own text over the drill.
 *
 * On the other side of this seam are three things and no events:
 *
 * - `onCommit` — text that landed, one code point or a whole composition
 * - `onRewind` — a correction
 * - `onKeystroke` — a physical key paired with what it produced
 *
 * That last pairing is the reason this is a module rather than five handlers
 * on a component. `beforeinput` says what was produced but not which key
 * produced it, and `keydown` says the opposite; the layout can only be told
 * apart from the pair — see docs/adr/0003-two-layout-variants-user-overridable.md.
 * Holding one event to meet the next is state, and state that lived in the
 * component was state nothing could test.
 */

export interface KeystrokeIntakeOptions {
  /**
   * The hidden input. Its value is cleared on the way past, because a
   * composition cannot be prevented and whatever it left behind would render
   * over the drill.
   */
  element: MaybeRefOrGetter<HTMLInputElement | null | undefined>
  /** Text that landed. One code point from a keypress, a sequence from an IME. */
  onCommit: (text: string) => void
  /** Backspace. A correction, not an attempt. */
  onRewind: () => void
  /**
   * A physical key and the text it produced — the evidence that tells NiDA
   * from Apple's variant. Only direct entry carries it: a composed sequence
   * has no single key behind it, and a modifier combination no table records
   * is not evidence of anything.
   */
  onKeystroke?: (code: string, level: Level, text: string) => void
}

/**
 * Composition commits at `compositionend`, never at `beforeinput` — recognised
 * by input type rather than by `isComposing`, which is not reliable at the
 * boundary. WebKit fires `compositionend` before the final `beforeinput`, so
 * the flag has already cleared by the time the composed text arrives and the
 * sequence would be counted a second time.
 */
const COMPOSITION_INPUT_TYPES = ['insertCompositionText', 'insertFromComposition']

export function useKeystrokeIntake({
  element,
  onCommit,
  onRewind,
  onKeystroke,
}: KeystrokeIntakeOptions) {
  /** True between `compositionstart` and `compositionend`. */
  const isComposing = ref(false)

  /**
   * The physical key of the `keydown` in flight, held for the `beforeinput`
   * that follows it. `level` is `undefined` when the modifiers select nothing
   * either table records — see `levelFromModifiers`.
   */
  const pendingKey = ref<{ code: string; level?: Level }>()

  function clearInput() {
    const input = toValue(element)
    if (input?.value) input.value = ''
  }

  /**
   * Backspace is handled here rather than through `beforeinput`: the input is
   * always empty, so there is nothing for the browser to delete and no
   * `deleteContentBackward` to listen for. Preventing the default also stops
   * the key navigating the page back.
   *
   * While an IME is composing, Backspace belongs to the composition buffer —
   * the user is editing a sequence they have not committed yet, and rewinding
   * the drill underneath them would desync the two.
   */
  function keydown(event: KeyboardEvent) {
    if (event.isComposing || isComposing.value) return

    pendingKey.value = { code: event.code, level: levelFromModifiers(event.shiftKey, event.altKey) }

    if (event.key === 'Backspace') {
      event.preventDefault()
      onRewind()
      return
    }

    // Enter would submit an ancestor form. Space is left alone: a focused input
    // swallows it rather than scrolling the page, and preventing the default
    // here would suppress the `beforeinput` that carries the space into a drill.
    if (event.key === 'Enter') event.preventDefault()
  }

  /**
   * Direct entry. Prevented so the input's value stays empty, which is what
   * keeps the browser from rendering its own text over the drill.
   *
   * Paste is refused: a drill filled in wholesale is not a typing run, and
   * counting it as keystrokes would report a speed nobody typed.
   */
  function beforeinput(payload: Event) {
    // Vue types every `beforeinput` listener as `Event`; the DOM only ever
    // dispatches `InputEvent` here.
    const event = payload as InputEvent
    if (event.isComposing || COMPOSITION_INPUT_TYPES.includes(event.inputType)) return

    event.preventDefault()

    if (event.inputType.startsWith('insertFrom')) return
    if (!event.inputType.startsWith('insert')) return

    const key = pendingKey.value
    if (key?.level && event.data) onKeystroke?.(key.code, key.level, event.data)

    onCommit(event.data ?? '')
  }

  function compositionstart() {
    isComposing.value = true
  }

  /**
   * The input has to stay empty or the browser renders its own text over the
   * drill. Direct entry is already prevented, so anything that reaches here is
   * composed text the browser inserted on its own — including, on WebKit, a
   * composition that arrives after `compositionend` has run its clear.
   */
  function input() {
    if (isComposing.value) return
    clearInput()
  }

  /**
   * The composed sequence lands as one commit and is split back into its
   * keystrokes by whoever receives it — `ស្វា` is four of them however the IME
   * delivered it, per docs/adr/0002-speed-counts-keystrokes.md. The in-flight
   * buffer was written into the input's value (composition cannot be
   * prevented), so clear it.
   */
  function compositionend(event: CompositionEvent) {
    isComposing.value = false
    onCommit(event.data)
    clearInput()
  }

  return { keydown, beforeinput, input, compositionstart, compositionend }
}

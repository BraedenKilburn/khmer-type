<script setup lang="ts">
import { ref, onMounted, nextTick, computed, useTemplateRef, watch } from 'vue'
import { useDrills } from '@/composables/useDrills'
import { toRenderClusters } from '@/lib/clusters'
import { accuracyFrom, tallyKeystrokes } from '@/lib/accuracy'
import {
  commitText,
  emptySession,
  rewind,
  withoutLatinLetters,
  type TypingSession,
} from '@/lib/typingSession'
import TypingCompletion from '@/components/TypingCompletion.vue'
import SignStrip from '@/components/SignStrip.vue'
import LayoutSetupPanel from '@/components/LayoutSetupPanel.vue'
import Button from 'primevue/button'

const { currentDrill, setNextDrill } = useDrills()

/** Typed text, cursor, and the raw key sequence — see `@/lib/typingSession`. */
const session = ref<TypingSession>(emptySession)
const typedText = computed(() => session.value.typedText)
const cursorIndex = computed(() => session.value.cursorIndex)

/**
 * One entry per cluster, never split — see docs/adr/0001-clusters-are-atomic.md
 */
const renderClusters = computed(() =>
  toRenderClusters(currentDrill.value, typedText.value, cursorIndex.value),
)

/**
 * The cursor sits before the first cluster it has not passed. A cluster the
 * cursor is partway through is `active`, and the cursor renders before it
 * rather than inside it — splitting it would shatter the glyph.
 */
const cursorClusterIndex = computed(() =>
  renderClusters.value.findIndex(({ state }) => state === 'active' || state === 'untyped'),
)

/**
 * The cluster the cursor is inside, if it is inside one at all — `active` is
 * exactly that state. Between clusters there is nothing to decompose.
 */
const activeCluster = computed(() => renderClusters.value.find(({ state }) => state === 'active'))

// ===============================
// Handle Typing (hidden input)
// ===============================

const isFocused = ref(false)
const startTime = ref<number | null>(null)
const endTime = ref<number | null>(null)

const isComplete = computed(() => cursorIndex.value === currentDrill.value.length)

/**
 * The input the user actually types into: a real, labelled, focusable control
 * rather than a `tabindex="0"` div. It is kept empty — every commit is folded
 * into `session` and the value reset — so the browser never renders text of
 * its own over the drill.
 */
const keyboardInputRef = useTemplateRef<HTMLInputElement>('keyboardInputRef')
function focusTypingArea() {
  keyboardInputRef.value?.focus()
}

/** True between `compositionstart` and `compositionend`. */
const isComposing = ref(false)

/**
 * Whether the user is being shown how to install a Khmer layout.
 *
 * Raised by a Latin letter, which means the user is typing on their Latin
 * layout and no drill has anything for them to match. It stays raised while
 * that is still true: the fix is a trip through system settings, which is
 * longer than any toast lives. A Khmer keystroke landing is the proof it
 * worked, so that is what lowers it.
 */
const isWrongLayout = ref(false)

/**
 * Fold committed text into the session — one code point from a keypress, a
 * whole sequence from an IME. Timing starts at the first keystroke that lands,
 * not at the first key that was refused.
 */
function commit(text: string) {
  if (!text || isComplete.value) return

  const khmer = withoutLatinLetters(text)
  if (khmer !== text) isWrongLayout.value = true
  if (!khmer) return

  isWrongLayout.value = false

  startTime.value ??= Date.now()
  session.value = commitText(session.value, currentDrill.value, khmer)
  if (isComplete.value) endTime.value = Date.now()
}

/**
 * Backspace is handled here rather than through `beforeinput`: the input is
 * always empty, so there is nothing for the browser to delete and no
 * `deleteContentBackward` to listen for. Preventing the default also stops the
 * key navigating the page back.
 *
 * While an IME is composing, Backspace belongs to the composition buffer — the
 * user is editing a sequence they have not committed yet, and rewinding the
 * drill underneath them would desync the two.
 */
function handleKeydown(event: KeyboardEvent) {
  if (event.isComposing || isComposing.value) return

  if (event.key === 'Backspace') {
    event.preventDefault()
    session.value = rewind(session.value)
    return
  }

  // Enter would submit an ancestor form. Space is left alone: a focused input
  // swallows it rather than scrolling the page, and preventing the default
  // here would suppress the `beforeinput` that carries the space into a drill.
  if (event.key === 'Enter') event.preventDefault()
}

/**
 * Composition commits at `compositionend`, never here — recognised by input
 * type rather than by `isComposing`, which is not reliable at the boundary.
 * WebKit fires `compositionend` before the final `beforeinput`, so the flag has
 * already cleared by the time the composed text arrives and the sequence would
 * be counted a second time.
 */
const COMPOSITION_INPUT_TYPES = ['insertCompositionText', 'insertFromComposition']

/**
 * Direct entry. Prevented so the input's value stays empty, which is what keeps
 * the browser from rendering its own text over the drill.
 *
 * Paste is refused: a drill filled in wholesale is not a typing run, and
 * counting it as keystrokes would report a speed nobody typed.
 */
function handleBeforeInput(payload: Event) {
  // Vue types every `beforeinput` listener as `Event`; the DOM only ever
  // dispatches `InputEvent` here.
  const event = payload as InputEvent
  if (event.isComposing || COMPOSITION_INPUT_TYPES.includes(event.inputType)) return

  event.preventDefault()

  if (event.inputType.startsWith('insertFrom')) return
  if (event.inputType.startsWith('insert')) commit(event.data ?? '')
}

function handleCompositionStart() {
  isComposing.value = true
}

/**
 * The input has to stay empty or the browser renders its own text over the
 * drill. Direct entry is already prevented, so anything that reaches here is
 * composed text the browser inserted on its own — including, on WebKit, a
 * composition that arrives after `compositionend` has run its clear.
 */
function handleInput() {
  if (isComposing.value) return
  if (keyboardInputRef.value?.value) keyboardInputRef.value.value = ''
}

/**
 * The composed sequence lands as one commit and is split back into its
 * keystrokes — `ស្វា` is four of them however the IME delivered it, per
 * docs/adr/0002-speed-counts-keystrokes.md. The in-flight buffer was written
 * into the input's value (composition cannot be prevented), so clear it.
 */
function handleCompositionEnd(event: CompositionEvent) {
  isComposing.value = false
  commit(event.data)
  if (keyboardInputRef.value) keyboardInputRef.value.value = ''
}

onMounted(() => {
  nextTick(() => focusTypingArea())
})

// ===============================
// Completion Modal
// ===============================

const typingCompletionVisible = ref(false)
watch(isComplete, (isCompleted) => {
  typingCompletionVisible.value = isCompleted
})

// Speed is measured in keystrokes, not clusters — see docs/adr/0002
const kpm = computed(() => {
  if (!startTime.value || !endTime.value) return 0
  const minutes = (endTime.value - startTime.value) / 60000
  return Math.round(currentDrill.value.length / minutes)
})

const kps = computed(() => {
  if (!startTime.value || !endTime.value) return 0
  const seconds = (endTime.value - startTime.value) / 1000
  return (currentDrill.value.length / seconds).toFixed(1)
})

// Judged per keystroke, so a corrected typo still costs — see @/lib/accuracy
const accuracy = computed(() =>
  accuracyFrom(tallyKeystrokes(currentDrill.value, session.value.keystrokes)),
)

/**
 * The dialog stays on screen through its leave transition, so "Try Again" can
 * be clicked twice. Only the click that dismissed it counts — otherwise the
 * second one advances past a drill the user never saw.
 */
function handleRestart() {
  if (!typingCompletionVisible.value) return
  resetTyping()
}

function resetTyping() {
  session.value = emptySession
  startTime.value = null
  endTime.value = null
  setNextDrill()
  nextTick(() => focusTypingArea())
}
</script>

<template>
  <p class="desktop-notice">Khmer Type is best on a desktop with a Khmer keyboard layout.</p>
  <div class="typing-container" @click="focusTypingArea" :class="{ 'is-focused': isFocused }">
    <input
      class="keyboard-input"
      ref="keyboardInputRef"
      lang="km"
      type="text"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      aria-label="Khmer typing drill"
      aria-describedby="drill-text"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @keydown="handleKeydown"
      @beforeinput="handleBeforeInput"
      @input="handleInput"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
    />
    <div class="typing-area" id="drill-text" lang="km">
      <template v-for="(cluster, index) in renderClusters" :key="index">
        <span class="cursor" v-if="isFocused && !isComplete && index === cursorClusterIndex"></span>
        <span :class="`cluster-${cluster.state}`">{{ cluster.text }}</span>
      </template>
    </div>
    <!--
      Per-sign progress inside the cluster the typing line has to render whole —
      see docs/adr/0001-clusters-are-atomic.md.
    -->
    <SignStrip
      :cluster="activeCluster?.text"
      :typed-code-units="activeCluster ? cursorIndex - activeCluster.start : 0"
    />
  </div>
  <!--
    Below the typing container, never above it: the panel appears mid-drill, and
    anything that reserved space above would either shift the line the user is
    reading or hold a gap open for a problem most users never hit.
  -->
  <LayoutSetupPanel v-if="isWrongLayout" @dismiss="isWrongLayout = false" />
  <div class="controls">
    <Button
      icon="pi pi-refresh"
      @click="resetTyping"
      :disabled="!isComplete && cursorIndex > 0"
      severity="secondary"
      variant="text"
      aria-label="New drill"
      title="Get a new drill"
    />
  </div>
  <TypingCompletion
      v-model:visible="typingCompletionVisible"
      :kpm="kpm"
      :kps="kps"
      :accuracy="accuracy"
      @restart="handleRestart"
    />
</template>

<style scoped>
/*
 * A touch keyboard trains a different motor skill, so there is no mobile
 * experience to offer — just say so. Deliberately out of scope; see
 * docs/plans/v2-make-it-a-trainer.md.
 */
.desktop-notice {
  display: none;
  max-width: 1200px;
  width: 95%;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: var(--p-surface-secondary);
  color: var(--p-text-secondary);
  font-size: 0.9rem;
  text-align: center;
}

@media (max-width: 640px) {
  .desktop-notice {
    display: block;
  }
}

.typing-container {
  position: relative;
  padding: 30px;
  background-color: var(--p-surface-secondary);
  border-radius: 12px;
  max-width: 1200px;
  width: 95%;
  line-height: 2;
  cursor: text;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;

  &.is-focused {
    border-color: var(--p-primary-color);
    box-shadow: 0 0 12px var(--p-primary-color);
  }

  /*
   * Hidden from sight, not from the accessibility tree or the keyboard: this
   * is the real focus target, so it must stay rendered and focusable. It sits
   * at the container's top-left rather than off-screen, because focusing an
   * off-screen control scrolls the page to it.
   */
  .keyboard-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    padding: 0;
    border: none;
    outline: none;
    background: transparent;
    color: transparent;
    caret-color: transparent;
    /*
     * The IME's in-flight composition renders in the input itself, and there
     * is nowhere sensible to show it — the drill occupies that space. One
     * code point wide is enough for the candidate window to anchor to.
     */
    font-size: 1px;
  }

  .typing-area {
    outline: none;
    font-size: 2em;

    span {
      /*
       * Creates "safe space" for descenders to render without clipping.
       * Kept: subscript consonants still descend once clusters shape
       * correctly, so this is a line-box concern the cluster fix doesn't
       * touch. It also gives the active tint room to clear the descender.
       */
      padding-bottom: 0.2em;

      &.cluster-correct {
        color: var(--p-text-primary);
      }

      &.cluster-incorrect {
        color: var(--p-text-error);
        font-weight: bold;
      }

      /*
       * A cluster the cursor is partway through. Tint only — a colour change
       * here would read as a judgement on a cluster that isn't finished yet,
       * and the glyph must keep rendering normally.
       */
      &.cluster-active {
        color: var(--p-text-primary);
        background-color: color-mix(in srgb, var(--p-primary-color) 25%, transparent);
        border-radius: 3px;
      }

      &.cluster-untyped {
        color: var(--p-text-primary);
        opacity: 0.5;
      }
    }

    .cursor {
      display: inline-block;
      padding-bottom: 0;
      width: 3px;
      height: 1em;
      background-color: var(--p-primary-color);
      margin-left: 1px;
      margin-right: 1px;
      vertical-align: middle;
      animation: blink 1s infinite;
    }
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}
</style>

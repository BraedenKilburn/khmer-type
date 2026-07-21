<script setup lang="ts">
import { ref, onMounted, nextTick, computed, useTemplateRef, watch } from 'vue'
import { useDrills, sentences, type DrillOrder } from '@/composables/useDrills'
import type { Drill } from '@/data/corpus'
import { useLayoutVariant } from '@/composables/useLayoutVariant'
import { levelFromModifiers } from '@/lib/layoutVariant'
import type { Level } from '@/data/khmerLayout'
import { isActive, toRenderClusters } from '@/lib/clusters'
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
import LayoutVariantPicker from '@/components/LayoutVariantPicker.vue'
import KhmerKeyboard from '@/components/KhmerKeyboard.vue'
import { useKeyboardVisible } from '@/composables/useKeyboardVisible'
import { useStats } from '@/composables/useStats'
import type { SignStat } from '@/lib/stats'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import StatsHeatmap from '@/components/StatsHeatmap.vue'

interface Props {
  /** The drills to draw from. Defaults to free practice over the sentences. */
  pool?: Drill[]
  order?: DrillOrder
}

const props = withDefaults(defineProps<Props>(), { order: 'random' })

/**
 * Reported when a drill is finished, for whoever is keeping score — a lesson
 * records it against its pass criteria; free practice ignores it.
 */
const emit = defineEmits<{ complete: [{ drillId: string; accuracy: number; kpm: number }] }>()

const { currentDrill, currentDrillId, position, setNextDrill } = useDrills({
  pool: () => props.pool ?? sentences(),
  order: props.order,
})
const { visible: isKeyboardVisible, toggle: toggleKeyboard } = useKeyboardVisible()
const { recordKeystroke, startDrill, weakest } = useStats()

/** The heatmap is a thing you go and look at, not a thing on screen while typing. */
const isStatsVisible = ref(false)

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
  renderClusters.value.findIndex(({ state }) => isActive(state) || state === 'untyped'),
)

/**
 * The cluster the cursor is inside, if it is inside one at all. Between clusters
 * there is nothing to decompose.
 */
const activeCluster = computed(() => renderClusters.value.find(({ state }) => isActive(state)))

/**
 * What the user has actually typed into the active cluster — which may not be
 * what the drill asked for. The sign strip compares the two to say which sign
 * went wrong, so it needs the text and not just how much of it there is.
 */
const typedIntoActiveCluster = computed(() =>
  activeCluster.value ? typedText.value.slice(activeCluster.value.start, cursorIndex.value) : '',
)

/**
 * The code point the drill expects next — what the on-screen keyboard points
 * at. One code point, not one sign: a subscript is two presses, and the key to
 * show is the one for the press being asked for right now.
 */
const nextCodePoint = computed(() => currentDrill.value[cursorIndex.value])

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
 * The physical key of the `keydown` in flight, held for the `beforeinput` that
 * follows it.
 *
 * `beforeinput` says what was produced but not which key produced it, and
 * `keydown` says the opposite; the layout can only be told apart from the pair.
 * `level` is `undefined` when the modifiers select nothing either table
 * records — see `levelFromModifiers`.
 */
const pendingKey = ref<{ code: string; level?: Level }>()
const { observeKeystroke } = useLayoutVariant()

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

  /*
   * Recorded per code point, before the cursor moves past it — a composed IME
   * commit is several keystrokes however it arrived, per ADR-0002, and each one
   * is an attempt at whichever sign it landed in.
   */
  for (const keystroke of khmer) {
    const cursor = session.value.cursorIndex
    if (cursor >= currentDrill.value.length) break
    recordKeystroke(currentDrill.value, cursor, keystroke)
    session.value = commitText(session.value, currentDrill.value, keystroke)
  }

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

  pendingKey.value = { code: event.code, level: levelFromModifiers(event.shiftKey, event.altKey) }

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
  if (!event.inputType.startsWith('insert')) return

  /*
   * The physical key from `keydown`, paired with the text it just produced —
   * the evidence that tells NiDA from Apple's variant. Only direct entry
   * carries it: a composed sequence has no single key behind it.
   */
  const key = pendingKey.value
  if (key?.level && event.data) observeKeystroke(key.code, key.level, event.data)

  commit(event.data ?? '')
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

/**
 * The signs to practise, read when the drill ends rather than live: a list that
 * reordered itself under the user's eyes mid-drill would be noise.
 */
const weakestSigns = ref<SignStat[]>([])

watch(isComplete, (isCompleted) => {
  typingCompletionVisible.value = isCompleted
  if (!isCompleted) return

  weakestSigns.value = weakest()
  if (currentDrillId.value) {
    emit('complete', { drillId: currentDrillId.value, accuracy: accuracy.value, kpm: kpm.value })
  }
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
  startDrill()
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
    <SignStrip :cluster="activeCluster?.text" :typed="typedIntoActiveCluster" />
  </div>
  <!--
    Below the typing container, never above it: the panel appears mid-drill, and
    anything that reserved space above would either shift the line the user is
    reading or hold a gap open for a problem most users never hit.
  -->
  <LayoutSetupPanel v-if="isWrongLayout" @dismiss="isWrongLayout = false" />
  <div class="controls">
    <!--
      Only where the order means something: a lesson is a list to work through,
      while free practice is a stream and "drill 4 of 308" would be a countdown
      nobody asked for.
    -->
    <p v-if="order === 'sequential'" class="position" lang="en">
      Drill {{ position.index + 1 }} of {{ position.total }}
    </p>
    <Button
      icon="pi pi-refresh"
      @click="resetTyping"
      :disabled="!isComplete && cursorIndex > 0"
      severity="secondary"
      variant="text"
      aria-label="New drill"
      title="Get a new drill"
    />
    <Button
      :icon="isKeyboardVisible ? 'pi pi-eye-slash' : 'pi pi-eye'"
      @click="toggleKeyboard"
      severity="secondary"
      variant="text"
      :aria-label="isKeyboardVisible ? 'Hide the on-screen keyboard' : 'Show the on-screen keyboard'"
      :title="isKeyboardVisible ? 'Hide the on-screen keyboard' : 'Show the on-screen keyboard'"
    />
    <Button
      icon="pi pi-chart-bar"
      @click="isStatsVisible = true"
      severity="secondary"
      variant="text"
      aria-label="Your progress"
      title="Your progress, sign by sign"
    />
    <LayoutVariantPicker />
  </div>

  <!--
    In a dialog rather than on the page: it is a thing you go and look at
    between drills, and putting it inline would push the keyboard off screen.
  -->
  <Dialog v-model:visible="isStatsVisible" header="Your progress" modal dismissable-mask>
    <StatsHeatmap />
  </Dialog>
  <!--
    Below the controls, so showing or hiding it never moves the typing line.
    A guide only — see `KhmerKeyboard.vue`; the keys do not type.
  -->
  <KhmerKeyboard v-if="isKeyboardVisible" :next="nextCodePoint" />
  <TypingCompletion
      v-model:visible="typingCompletionVisible"
      :kpm="kpm"
      :kps="kps"
      :accuracy="accuracy"
      :weakest-signs="weakestSigns"
      @restart="handleRestart"
    />
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;

  .position {
    margin: 0 0.75rem 0 0;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    color: var(--kt-faint);
    font-variant-numeric: tabular-nums;
  }

  /*
   * The controls sit below the drill and must not compete with it: no fills, no
   * borders, faint until pointed at. They are still full-size hit targets — it
   * is the ink that is quiet, not the button.
   */
  :deep(.p-button) {
    color: var(--kt-faint);

    &:hover:not(:disabled) {
      color: var(--kt-accent);
      background-color: transparent;
    }

    &:disabled {
      opacity: 0.4;
    }
  }
}

/*
 * A touch keyboard trains a different motor skill, so there is no mobile
 * experience to offer — just say so. Deliberately out of scope; see
 * docs/plans/v2-make-it-a-trainer.md.
 */
.desktop-notice {
  display: none;
  max-width: 1200px;
  width: 100%;
  color: var(--kt-sub);
  font-size: 0.75rem;
  line-height: 1.6;
  letter-spacing: 0.02em;
  text-align: center;
}

@media (max-width: 640px) {
  .desktop-notice {
    display: block;
  }
}

/*
 * No card, no border, no fill.
 *
 * The drill used to sit in a rounded panel, which drew a box around the one
 * thing on the page that does not need pointing at. What remains is the text on
 * the page itself; the space around it is the only framing it gets.
 */
.typing-container {
  position: relative;
  max-width: 860px;
  width: 100%;
  line-height: 1.9;
  /* Padding with nothing drawn on it: the whole block focuses the drill on
     click, and losing the card should not shrink that target to the glyphs. */
  padding: 1rem 0;
  cursor: text;

  /*
   * Focus is signalled by dimming the line when it is *absent*, not by
   * decorating it when present — an unfocused drill is the state worth
   * flagging, because keystrokes go nowhere. The caret already disappears with
   * focus; this makes it legible at a glance rather than only on inspection.
   */
  transition: opacity 0.15s ease;

  &:not(.is-focused) .typing-area {
    opacity: 0.55;
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
    /* Large enough that a stacked cluster is legible without leaning in, and
       capped so a long drill still fits the measure above. */
    font-size: clamp(2rem, 4.5vw, 3rem);
    text-align: center;

    span {
      /*
       * Creates "safe space" for descenders to render without clipping.
       * Kept: subscript consonants still descend once clusters shape
       * correctly, so this is a line-box concern the cluster fix doesn't
       * touch. It also gives the active tint room to clear the descender.
       */
      padding-bottom: 0.2em;

      /*
       * Three inks, not four: what you have typed is the page's own text
       * colour, what you have not is the muted grey, and a mistake is the one
       * red on the site. Nothing is tinted for being merely correct — being
       * correct is the resting state.
       */
      &.cluster-correct {
        color: var(--kt-text);
      }

      &.cluster-incorrect {
        color: var(--kt-error);
        font-weight: bold;
        border-bottom: 2px solid var(--kt-error);
      }

      /*
       * A cluster the cursor is partway through, marked with a rule beneath
       * rather than a wash behind. A colour change here would read as a
       * judgement on a cluster that isn't finished yet, and a fill sat over the
       * subscripts — the glyph has to keep rendering normally, which for Khmer
       * means leaving the space under the baseline alone.
       */
      &.cluster-active {
        color: var(--kt-text);
        border-bottom: 2px solid var(--kt-accent);
      }

      /*
       * A cluster the cursor is still inside that has already gone wrong. The
       * rule turns red the moment the bad keystroke lands rather than when the
       * cluster ends — the glyph itself stays the drill's own colour, because
       * what is drawn here is the target, not the mistake, and reddening it
       * would say the thing on screen is wrong when it is what to aim for.
       * Which sign was fumbled is the sign strip's job.
       */
      &.cluster-active-incorrect {
        color: var(--kt-text);
        border-bottom: 2px solid var(--kt-error);
      }

      &.cluster-untyped {
        color: var(--kt-untyped);
      }
    }

    /* The caret: a thin bar in the accent, blinking on the step so it reads as
       a caret rather than as a pulse. */
    .cursor {
      display: inline-block;
      padding-bottom: 0;
      width: 2px;
      height: 1em;
      background-color: var(--kt-accent);
      margin-left: 1px;
      margin-right: 1px;
      vertical-align: middle;
      animation: blink 1s step-end infinite;
    }
  }
}

@keyframes blink {
  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0.25;
  }
}

/* A blinking caret is a motion effect like any other, and it sits at the exact
   spot the eye is fixed on. */
@media (prefers-reduced-motion: reduce) {
  .typing-container .typing-area .cursor {
    animation: none;
  }
}
</style>

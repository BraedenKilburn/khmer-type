<script setup lang="ts">
import { ref, onMounted, nextTick, useTemplateRef, watch } from 'vue'
import { useDrills } from '@/composables/useDrills'
import type { DrillOrder } from '@/lib/drillOrder'
import { sentences, type Drill } from '@/data/corpus'
import { useLayoutVariant } from '@/composables/useLayoutVariant'
import { useDrillRun } from '@/composables/useDrillRun'
import { useKeystrokeIntake } from '@/composables/useKeystrokeIntake'
import TypingCompletion from '@/components/TypingCompletion.vue'
import SignStrip from '@/components/SignStrip.vue'
import LayoutSetupPanel from '@/components/LayoutSetupPanel.vue'
import LayoutVariantPicker from '@/components/LayoutVariantPicker.vue'
import KhmerKeyboard from '@/components/KhmerKeyboard.vue'
import { useKeyboardVisible } from '@/composables/useKeyboardVisible'
import type { DrillScorer } from '@/composables/useLesson'
import { useStats } from '@/composables/useStats'
import type { SignStat } from '@/lib/stats'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import StatsHeatmap from '@/components/StatsHeatmap.vue'

interface Props {
  /** The drills to draw from. Defaults to free practice over the sentences. */
  pool?: Drill[]
  order?: DrillOrder
  /**
   * Who is keeping score, if anyone. A lesson passes one built from its own id
   * — see `useLesson().scorerFor`; free practice passes none, which is how it
   * says a run here counts towards nothing.
   */
  scorer?: DrillScorer
}

const props = withDefaults(defineProps<Props>(), { order: 'random' })

const { currentDrill, currentDrillId, position, setNextDrill } = useDrills({
  pool: () => props.pool ?? sentences(),
  order: props.order,
})
const { visible: isKeyboardVisible, toggle: toggleKeyboard } = useKeyboardVisible()
const { weakest } = useStats()

/**
 * The run in progress: the session, the clocks, accuracy, and the per-sign
 * record, behind one interface — see `@/composables/useDrillRun`. This
 * component owns the browser events and the template, and nothing else.
 */
const {
  renderClusters,
  cursorClusterIndex,
  activeCluster,
  typedIntoActiveCluster,
  nextCodePoint,
  isComplete,
  isStarted,
  isWrongLayout,
  accuracy,
  kpm,
  kps,
  commit,
  rewind,
  reset,
  dismissWrongLayout,
} = useDrillRun(currentDrill)

/** The heatmap is a thing you go and look at, not a thing on screen while typing. */
const isStatsVisible = ref(false)

// ===============================
// Handle Typing (hidden input)
// ===============================

const isFocused = ref(false)

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

const { observeKeystroke } = useLayoutVariant()

/**
 * The browser event path — see `@/composables/useKeystrokeIntake`. Composition,
 * paste refusal, and the `keydown`/`beforeinput` pairing that ADR-0003 detects
 * the layout from all sit behind it; what arrives here is keystrokes.
 */
const intake = useKeystrokeIntake({
  element: keyboardInputRef,
  onCommit: commit,
  onRewind: rewind,
  onKeystroke: observeKeystroke,
})

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
    props.scorer?.({ drillId: currentDrillId.value, accuracy: accuracy.value })
  }
})

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
  setNextDrill()
  reset()
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
      @keydown="intake.keydown"
      @beforeinput="intake.beforeinput"
      @input="intake.input"
      @compositionstart="intake.compositionstart"
      @compositionend="intake.compositionend"
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
  <LayoutSetupPanel v-if="isWrongLayout" @dismiss="dismissWrongLayout" />
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
      :disabled="!isComplete && isStarted"
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
  max-width: var(--kt-measure-page);
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
  max-width: var(--kt-measure-drill);
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

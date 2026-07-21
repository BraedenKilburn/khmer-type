<script setup lang="ts">
import { computed } from 'vue'
import { COENG, invisibleLabel, type KeyDef, type Level, type Row } from '@/data/khmerLayout'
import { keystrokeFor, layoutFor } from '@/lib/layoutVariant'
import { useLayoutVariant } from '@/composables/useLayoutVariant'
import { displaySign } from '@/lib/signs'

interface Props {
  /** The code point the drill expects next, or `undefined` when it is over. */
  next?: string
}

const props = defineProps<Props>()

/**
 * A guide, never an input device.
 *
 * Keys are `<div>`s and nothing here handles a click. The skill being trained
 * is knowing where a key *is*; clicking a picture of one teaches none of it,
 * and a run typed by clicking would poison accuracy and the per-sign stats with
 * a different motor action entirely. Task 5 of the v2 plan unblocks the user
 * who has no Khmer layout, by teaching them to install one.
 */
const { variant } = useLayoutVariant()

const rows = computed(() => {
  const layout = layoutFor(variant.value)
  return ([1, 2, 3, 4, 5] as Row[]).map((row) => layout.filter((key) => key.row === row))
})

/** Where the next expected code point lives on the layout the user is on. */
const target = computed(() =>
  props.next ? keystrokeFor(props.next, variant.value) : undefined,
)

const modifier = computed<Level | undefined>(() =>
  target.value?.level === 'base' ? undefined : target.value?.level,
)

function isTarget(key: KeyDef): boolean {
  return key.code === target.value?.code
}

/**
 * What to print on a cap.
 *
 * A combining sign gets its dotted circle so it has something to sit on, and a
 * character that draws nothing gets named instead of printed. COENG is why:
 * it is the single most confusing key on the board — a keystroke that shows the
 * learner nothing — and an empty cap would be the least helpful thing to put
 * where the explanation belongs.
 */
function capLabel(char: string): string {
  if (!char) return ''
  // COENG draws nothing on its own but draws perfectly well on a dotted
  // circle, which is exactly what the learner needs to see on the cap.
  if (char === COENG) return displaySign(char)
  return invisibleLabel(char) ? '' : displaySign(char)
}

/** The name of a key that prints nothing, shown in place of its glyph. */
function capName(char: string): string {
  const label = invisibleLabel(char)
  if (!label) return ''
  return label === 'COENG' ? 'COENG' : label.replace(/zero-width /, 'ZW ')
}

const COENG_HINT = 'stacks the next consonant beneath this one'

/** What a screen reader is told, since the caps themselves are decoration. */
const spokenTarget = computed(() => {
  if (!target.value) return ''
  const key = rows.value.flat().find((entry) => entry.code === target.value?.code)
  if (!key) return ''

  const press = modifier.value === 'shift' ? 'Shift and ' : modifier.value === 'alt' ? 'AltGr and ' : ''
  const named = invisibleLabel(props.next ?? '')
  return `Next key: press ${press}the ${key.code.replace(/^(Key|Digit)/, '')} key${
    named ? ` for ${named}` : ''
  }.`
})
</script>

<template>
  <section class="keyboard" :class="`level-${modifier ?? 'base'}`" lang="km">
    <p class="visually-hidden" aria-live="polite" lang="en">{{ spokenTarget }}</p>

    <div class="board" aria-hidden="true">
      <div v-for="(row, index) in rows" :key="index" :class="`row row-${index + 1}`">
        <!--
          Shift caps are drawn rather than read from the layout data, which
          holds only the 48 printable keys. They exist so the modifier the next
          keystroke needs has somewhere to light up.
        -->
        <div v-if="index === 3" class="key modifier" :class="{ 'is-armed': modifier === 'shift' }">
          <span class="cap-name">Shift</span>
        </div>

        <div
          v-for="key in row"
          :key="key.code"
          class="key"
          :class="{
            'is-target': isTarget(key),
            'is-space': key.code === 'Space',
          }"
        >
          <span class="shift-level">{{ capLabel(key.shift) }}</span>
          <span class="base-level">{{ capLabel(key.base) }}</span>
          <span v-if="capName(key.base)" class="cap-name" lang="en">{{ capName(key.base) }}</span>
        </div>

        <div v-if="index === 3" class="key modifier" :class="{ 'is-armed': modifier === 'shift' }">
          <span class="cap-name">Shift</span>
        </div>
        <div v-if="index === 4" class="key modifier" :class="{ 'is-armed': modifier === 'alt' }">
          <span class="cap-name">AltGr / ⌥</span>
        </div>
      </div>
    </div>

    <p class="legend" lang="en">
      <span v-if="modifier === 'shift'">Hold <kbd>Shift</kbd> for the next key.</span>
      <span v-else-if="modifier === 'alt'">Hold <kbd>AltGr</kbd> (<kbd>⌥</kbd> on macOS) for the next key.</span>
      <span v-else-if="next === COENG">COENG — {{ COENG_HINT }}.</span>
      <span v-else>&nbsp;</span>
    </p>
  </section>
</template>

<style scoped>
.keyboard {
  max-width: 1200px;
  width: 95%;
  padding: 12px;
  border-radius: 12px;
  background-color: var(--p-surface-secondary);

  .board {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row {
    display: flex;
    gap: 4px;
    justify-content: center;
  }

  .key {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1 1 0;
    min-width: 0;
    aspect-ratio: 1;
    max-height: 3.25rem;
    padding: 2px;
    border: 1px solid var(--p-content-border-color);
    border-radius: 6px;
    line-height: 1.1;
    /* A guide, not a control: nothing here is clickable, so nothing here
       should invite a click. */
    cursor: default;
    user-select: none;

    .shift-level {
      font-size: 0.75rem;
      opacity: 0.55;
      min-height: 1em;
    }

    .base-level {
      font-size: 1.05rem;
    }

    .cap-name {
      font-size: 0.5rem;
      letter-spacing: 0.02em;
      opacity: 0.7;
      text-transform: uppercase;
    }

    &.is-space {
      flex: 6 1 0;
      aspect-ratio: auto;
    }

    &.modifier {
      flex: 2 1 0;
      aspect-ratio: auto;
      opacity: 0.7;
    }

    /*
     * The target reads as the target three ways over — fill, border, and
     * weight — so it survives both themes and a reader who cannot separate
     * the tint from the surface behind it.
     */
    &.is-target {
      background-color: var(--p-primary-color);
      border-color: var(--p-primary-color);
      color: var(--p-primary-contrast-color);
      font-weight: bold;

      .shift-level,
      .cap-name {
        opacity: 0.9;
      }
    }

    &.modifier.is-armed {
      background-color: color-mix(in srgb, var(--p-primary-color) 35%, transparent);
      border-color: var(--p-primary-color);
      opacity: 1;
    }
  }

  .legend {
    margin: 0.5rem 0 0;
    text-align: center;
    font-size: 0.8rem;
    color: var(--p-text-secondary);
    /* Reserved so the board never jumps when the hint appears. */
    min-height: 1.2em;
  }

  kbd {
    padding: 0.1em 0.35em;
    border: 1px solid var(--p-content-border-color);
    border-radius: 4px;
    font-size: 0.9em;
    font-family: monospace;
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* The board is dense; below this it stops being readable and starts being
   decoration. The desktop notice already says as much. */
@media (max-width: 640px) {
  .keyboard {
    display: none;
  }
}
</style>

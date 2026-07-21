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
/*
 * The board sits on the page, not in a panel. Each cap is a filled tile and the
 * fills alone describe the grid, so there are no borders and no container —
 * removing both is most of what separates this from a settings screen.
 */
.keyboard {
  /*
   * Wider than the typing measure on purpose. The board is 14 keys across, and
   * every pixel taken off its width comes straight off the Khmer on the caps —
   * which is the only thing on it a learner is actually reading.
   */
  max-width: 1100px;
  width: 100%;

  .board {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .row {
    display: flex;
    gap: 5px;
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
    max-height: 4.25rem;
    padding: 3px;
    border: 1px solid transparent;
    border-radius: var(--p-border-radius-md);
    background-color: var(--kt-surface);
    color: var(--kt-sub);
    line-height: 1.1;
    /* A guide, not a control: nothing here is clickable, so nothing here
       should invite a click. */
    cursor: default;
    user-select: none;

    /*
     * The cap's two Khmer glyphs carry the whole guide, so they get the room.
     * The shift level is smaller than the base level but not by much — it is
     * still a Khmer character somebody has to identify, not a decoration.
     */
    .shift-level {
      font-size: 0.9375rem;
      color: var(--kt-faint);
      align-self: flex-end;
      padding-right: 0.15em;
      min-height: 1em;
      line-height: 1.2;
    }

    .base-level {
      font-size: 1.375rem;
      line-height: 1.2;
    }

    .cap-name {
      font-size: 0.5625rem;
      letter-spacing: 0.04em;
      color: var(--kt-faint);
      text-transform: uppercase;
    }

    &.is-space {
      flex: 6 1 0;
      aspect-ratio: auto;
    }

    &.modifier {
      flex: 2 1 0;
      aspect-ratio: auto;
      background-color: var(--kt-surface-dim);

      /* These caps are all label and no glyph, and they are wide enough to
         carry it at a readable size. */
      .cap-name {
        font-size: 0.6875rem;
        text-transform: none;
      }
    }

    /*
     * The target reads as the target three ways over — fill, border, and
     * weight — so it survives both themes and a reader who cannot separate
     * the tint from the surface behind it.
     *
     * A tint of the accent rather than a slab of it: on a board this dense a
     * solid cap is a hole punched in the grid, and the tint plus the accent ink
     * is the louder signal despite being the quieter colour.
     */
    &.is-target {
      background-color: color-mix(in srgb, var(--kt-accent) 22%, var(--kt-surface));
      border-color: var(--kt-accent);
      color: var(--kt-accent-ink);
      font-weight: bold;

      /* Full strength, not a faded inherit: these carry the shift glyph and
         the COENG name, which are exactly what the highlight is asking for. */
      .shift-level,
      .cap-name {
        color: inherit;
      }
    }

    &.modifier.is-armed {
      background-color: color-mix(in srgb, var(--kt-accent) 22%, var(--kt-surface));
      border-color: var(--kt-accent);
      color: var(--kt-accent-ink);

      .cap-name {
        color: inherit;
      }
    }
  }

  .legend {
    margin: 0.75rem 0 0;
    text-align: center;
    font-size: 0.8125rem;
    letter-spacing: 0.02em;
    color: var(--kt-sub);
    /* Reserved so the board never jumps when the hint appears. */
    min-height: 1.4em;
  }

  kbd {
    padding: 0.1em 0.4em;
    border-radius: var(--p-border-radius-sm);
    background-color: var(--kt-surface);
    color: var(--kt-sub);
    font-size: 0.9em;
    font-family: inherit;
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

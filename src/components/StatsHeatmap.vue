<script setup lang="ts">
import { computed, ref } from 'vue'
import SelectButton from 'primevue/selectbutton'
import { useStats } from '@/composables/useStats'
import { BASE_CONSONANTS, SUBSCRIPT_CONSONANTS, displaySign } from '@/lib/signs'
import { errorRate, hesitationMs, type SignStat, type WeaknessView } from '@/lib/stats'

/**
 * Per-sign performance, as a picture.
 *
 * Two views of the same record, because they answer different questions.
 * Accuracy says what you get wrong; **hesitation** says what you get right and
 * slowly — a sign you are deriving rather than recalling. That second signal is
 * usually the more useful one and nobody else visualises it.
 *
 * Encoding follows the `dataviz` guidance: one hue, light to dark, magnitude
 * meaning *trouble* in both views, so more colour always reads the same way. No
 * cell is colour alone — every one carries its own number, and an unattempted
 * sign is drawn as an outline rather than given a tint it has not earned.
 */
const { stats } = useStats()

const views: { label: string; value: WeaknessView }[] = [
  { label: 'Accuracy', value: 'accuracy' },
  { label: 'Hesitation', value: 'hesitation' },
]
const view = ref<WeaknessView>('accuracy')

/**
 * Five steps of trouble, plus `undefined` for a sign never attempted.
 *
 * A sign with no attempts must not read as perfect — otherwise the heatmap
 * congratulates a learner on every sign they have been avoiding, which is
 * exactly backwards.
 */
type Level = 0 | 1 | 2 | 3 | 4

const ACCURACY_BREAKS = [0.0001, 0.1, 0.25, 0.5]
/** Milliseconds. A practised sign lands well inside half a second. */
const HESITATION_BREAKS = [300, 600, 1000, 1600]

function levelOf(stat: SignStat | undefined): Level | undefined {
  const value = view.value === 'accuracy' ? errorRate(stat) : hesitationMs(stat)
  if (value === undefined) return undefined

  const breaks = view.value === 'accuracy' ? ACCURACY_BREAKS : HESITATION_BREAKS
  return breaks.filter((threshold) => value >= threshold).length as Level
}

/** The number printed in the cell, so identity never rests on colour alone. */
function valueLabel(stat: SignStat | undefined): string {
  if (!stat?.attempts) return '—'
  if (view.value === 'accuracy') return `${Math.round((errorRate(stat) ?? 0) * 100)}%`

  const ms = hesitationMs(stat) ?? 0
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

function describe(sign: string, stat: SignStat | undefined): string {
  if (!stat?.attempts) return `${sign}: not yet typed`

  const wrong = Math.round((errorRate(stat) ?? 0) * 100)
  const wait = Math.round(hesitationMs(stat) ?? 0)
  return `${sign}: ${stat.attempts} attempts, ${wrong}% wrong, ${wait}ms average wait`
}

const groups = computed(() => [
  { title: 'Consonants', signs: BASE_CONSONANTS },
  { title: 'Subscripts', signs: SUBSCRIPT_CONSONANTS },
])

const attempted = computed(
  () => Object.values(stats.value).filter((stat) => stat.attempts > 0).length,
)

const legend = computed(() =>
  view.value === 'accuracy'
    ? ['none wrong', 'under 10%', 'under 25%', 'under 50%', '50% or more']
    : ['under 0.3s', 'under 0.6s', 'under 1s', 'under 1.6s', '1.6s or more'],
)
</script>

<template>
  <section class="heatmap">
    <header>
      <div>
        <h2>Where you are strong, and where you are not</h2>
        <p class="subtitle" lang="en">
          {{
            attempted
              ? `${attempted} signs typed so far. Colour means trouble in both views.`
              : 'Nothing recorded yet — finish a drill and this fills in.'
          }}
        </p>
      </div>
      <SelectButton
        v-model="view"
        :options="views"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
        aria-label="Heatmap view"
      />
    </header>

    <div v-for="group in groups" :key="group.title" class="group">
      <h3>{{ group.title }}</h3>
      <ul class="grid">
        <li
          v-for="sign in group.signs"
          :key="sign"
          class="cell"
          :class="[
            levelOf(stats[sign]) === undefined ? 'is-unattempted' : `level-${levelOf(stats[sign])}`,
          ]"
          :title="describe(sign, stats[sign])"
        >
          <span class="glyph" lang="km">{{ displaySign(sign) }}</span>
          <span class="value" lang="en">{{ valueLabel(stats[sign]) }}</span>
          <span class="visually-hidden">{{ describe(sign, stats[sign]) }}</span>
        </li>
      </ul>
    </div>

    <!--
      A scale legend, always: a sequential ramp is unreadable without one, and
      the unattempted swatch is the entry that stops "pale" being mistaken for
      "perfect".
    -->
    <ul class="legend" lang="en">
      <li v-for="(label, level) in legend" :key="label">
        <span class="swatch" :class="`level-${level}`"></span>{{ label }}
      </li>
      <li><span class="swatch is-unattempted"></span>not yet typed</li>
    </ul>
  </section>
</template>

<style scoped>
.heatmap {
  /*
   * The ramp is the app's own primary hue, one hue light to dark, per the
   * dataviz guidance. In dark mode it runs the other way — the step nearest
   * the surface is the quiet end, and on a dark surface that is the dark step,
   * not the light one. Selected for the mode, never flipped automatically.
   */
  --level-0: var(--p-primary-100);
  --level-1: var(--p-primary-300);
  --level-2: var(--p-primary-500);
  --level-3: var(--p-primary-700);
  --level-4: var(--p-primary-900);
  --ink-on-fill: var(--p-primary-contrast-color);

  display: flex;
  flex-direction: column;
  gap: 1rem;

  header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;

    h2 {
      margin: 0;
      font-size: 1.05rem;
    }

    .subtitle {
      margin: 0.15rem 0 0;
      font-size: 0.85rem;
      color: var(--p-text-secondary);
    }
  }

  h3 {
    margin: 0 0 0.4rem;
    font-size: 0.8rem;
    font-weight: normal;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--p-text-secondary);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(11, minmax(0, 1fr));
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 2px;
    border: 1px solid transparent;
    border-radius: 6px;
    line-height: 1.2;

    .glyph {
      font-size: 1.2rem;
    }

    .value {
      font-size: 0.6rem;
      opacity: 0.85;
      font-variant-numeric: tabular-nums;
    }

    /* An outline, not a tint: never typed is a different state from typed
       perfectly, and the two must not look alike. */
    &.is-unattempted {
      border-style: dashed;
      border-color: var(--p-content-border-color);
      color: var(--p-text-secondary);
      opacity: 0.55;
    }

    &.level-0 {
      background-color: var(--level-0);
      color: var(--p-surface-950);
    }
    &.level-1 {
      background-color: var(--level-1);
      color: var(--p-surface-950);
    }
    &.level-2 {
      background-color: var(--level-2);
      color: var(--ink-on-fill);
    }
    &.level-3 {
      background-color: var(--level-3);
      color: var(--ink-on-fill);
    }
    &.level-4 {
      background-color: var(--level-4);
      color: var(--ink-on-fill);
    }
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.75rem;
    color: var(--p-text-secondary);

    li {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .swatch {
      width: 0.9rem;
      height: 0.9rem;
      border-radius: 3px;
      border: 1px solid transparent;

      &.level-0 {
        background-color: var(--level-0);
      }
      &.level-1 {
        background-color: var(--level-1);
      }
      &.level-2 {
        background-color: var(--level-2);
      }
      &.level-3 {
        background-color: var(--level-3);
      }
      &.level-4 {
        background-color: var(--level-4);
      }

      &.is-unattempted {
        border-style: dashed;
        border-color: var(--p-content-border-color);
      }
    }
  }
}

/*
 * Dark mode is its own set of steps from the same ramp: the quiet end is the
 * step closest to the dark surface, so the ramp runs dark to light rather than
 * light to dark. Ink flips with it.
 */
:global(:root.dark) .heatmap {
  --level-0: var(--p-primary-900);
  --level-1: var(--p-primary-700);
  --level-2: var(--p-primary-500);
  --level-3: var(--p-primary-300);
  --level-4: var(--p-primary-100);

  .cell {
    &.level-0,
    &.level-1 {
      color: var(--p-surface-0);
    }

    &.level-2,
    &.level-3,
    &.level-4 {
      color: var(--p-surface-950);
    }
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .heatmap .grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
</style>

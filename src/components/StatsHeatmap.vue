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
/*
 * The ramp itself is `--kt-heat-*` in `assets/main.css`, together with the ink
 * each step needs. It is not defined here, and must not be: a scoped component
 * cannot carry a `:root.dark` override — Vue's transform rewrites
 * `:global(:root.dark) .heatmap` to `:root.dark[data-v-…]`, which matches
 * nothing, so the dark ramp silently never applied and dark mode drew the light
 * ramp under the dark scheme's ink. This file now just spends the tokens.
 */
.heatmap {
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
      font-size: 0.8125rem;
      font-weight: 400;
      color: var(--kt-text);
    }

    .subtitle {
      margin: 0.3rem 0 0;
      font-size: 0.75rem;
      line-height: 1.6;
      color: var(--kt-sub);
    }
  }

  h3 {
    margin: 0 0 0.5rem;
    font-size: 0.6875rem;
    font-weight: 400;
    text-transform: lowercase;
    letter-spacing: 0.08em;
    color: var(--kt-faint);
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
    padding: 5px 2px;
    border: 1px solid transparent;
    border-radius: var(--p-border-radius-md);
    line-height: 1.2;

    .glyph {
      font-size: 1.5rem;
    }

    .value {
      font-size: 0.6875rem;
      opacity: 0.85;
      font-variant-numeric: tabular-nums;
    }

    /* An outline, not a tint: never typed is a different state from typed
       perfectly, and the two must not look alike. */
    &.is-unattempted {
      border-style: dashed;
      /* On the modal's own surface, a dim border is no border at all — this
         has to stay visible or "never typed" reads as an empty cell. */
      border-color: var(--kt-faint);
      color: var(--kt-faint);
    }

    /* Each step takes the ink chosen for it, whichever scheme is in force. */
    &.level-0 {
      background-color: var(--kt-heat-0);
      color: var(--kt-heat-0-ink);
    }
    &.level-1 {
      background-color: var(--kt-heat-1);
      color: var(--kt-heat-1-ink);
    }
    &.level-2 {
      background-color: var(--kt-heat-2);
      color: var(--kt-heat-2-ink);
    }
    &.level-3 {
      background-color: var(--kt-heat-3);
      color: var(--kt-heat-3-ink);
    }
    &.level-4 {
      background-color: var(--kt-heat-4);
      color: var(--kt-heat-4-ink);
    }
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.6875rem;
    letter-spacing: 0.02em;
    color: var(--kt-faint);

    li {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .swatch {
      width: 0.8rem;
      height: 0.8rem;
      border-radius: var(--p-border-radius-sm);
      border: 1px solid transparent;

      &.level-0 {
        background-color: var(--kt-heat-0);
      }
      &.level-1 {
        background-color: var(--kt-heat-1);
      }
      &.level-2 {
        background-color: var(--kt-heat-2);
      }
      &.level-3 {
        background-color: var(--kt-heat-3);
      }
      &.level-4 {
        background-color: var(--kt-heat-4);
      }

      &.is-unattempted {
        border-style: dashed;
        border-color: var(--kt-faint);
      }
    }
  }

  :deep(.p-selectbutton) {
    font-size: 0.75rem;
    text-transform: lowercase;
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

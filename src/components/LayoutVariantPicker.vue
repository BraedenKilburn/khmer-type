<script setup lang="ts">
import { computed } from 'vue'
import Select from 'primevue/select'
import { useLayoutVariant } from '@/composables/useLayoutVariant'
import { LAYOUT_VARIANTS, type LayoutVariant } from '@/lib/layoutVariant'

/**
 * Which Khmer layout the on-screen keyboard should draw.
 *
 * There are two, they disagree on ten keys, and the app works out which one the
 * user is on from their typing — see `@/lib/layoutVariant`. Detection can be
 * wrong, and being wrong here means pointing a learner at the wrong key, so it
 * is always overridable. Per
 * docs/adr/0003-two-layout-variants-user-overridable.md, the override wins for
 * good: nothing the user types afterwards moves it back.
 */
const { variant, override, detected } = useLayoutVariant()

/**
 * The stored override is `LayoutVariant | null`, and `null` genuinely means "no
 * override" — see `useLayoutVariant`. But PrimeVue's Select reads a `null` model
 * as *nothing selected* and renders its placeholder, so automatic — which is a
 * choice, and the one almost everybody is on — showed up as an empty box.
 *
 * The sentinel exists only for the widget, and is mapped back to `null` on the
 * way out. Changing the stored shape instead would make "the user has chosen
 * nothing" and "the user has chosen automatic" indistinguishable everywhere
 * else, which is a distinction detection depends on.
 */
const AUTOMATIC = 'auto'
type Choice = LayoutVariant | typeof AUTOMATIC

const choice = computed<Choice>({
  get: () => override.value ?? AUTOMATIC,
  set: (value) => {
    override.value = value === AUTOMATIC ? null : value
  },
})

const options = computed(() => [
  {
    value: AUTOMATIC,
    /*
     * Names the layout being used, not just the mode. "Detect layout" alone
     * tells the user the app is guessing but not what it guessed, which is the
     * thing they came to this control to find out.
     */
    label: detected.value
      ? `Detect layout — ${labelOf(detected.value)}`
      : `Detect layout — ${labelOf(variant.value)} so far`,
  },
  ...LAYOUT_VARIANTS.map(({ id, label, hint }) => ({ value: id, label, hint })),
])

function labelOf(id: LayoutVariant): string {
  return LAYOUT_VARIANTS.find((entry) => entry.id === id)?.label ?? id
}
</script>

<template>
  <Select
    v-model="choice"
    :options="options"
    option-label="label"
    option-value="value"
    size="small"
    class="layout-picker"
    aria-label="Keyboard layout"
    :title="`Showing the ${labelOf(variant)} layout`"
  />
</template>

<style scoped>
/*
 * Sits in the control row under the drill, beside the icon buttons, so it is
 * quiet in the same way they are: no fill, no border, faint until pointed at.
 */
.layout-picker {
  background: transparent;
  border-color: transparent;

  :deep(.p-select-label) {
    font-size: 0.75rem;
    letter-spacing: 0.02em;
    color: var(--kt-faint);
  }

  :deep(.p-select-dropdown) {
    color: var(--kt-faint);
    width: 1.5rem;
  }

  &:hover,
  &:focus-within {
    border-color: var(--kt-surface-dim);

    :deep(.p-select-label),
    :deep(.p-select-dropdown) {
      color: var(--kt-sub);
    }
  }
}
</style>

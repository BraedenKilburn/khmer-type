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

const AUTOMATIC = null

const options = computed(() => [
  {
    value: AUTOMATIC,
    label: detected.value
      ? `Detect layout (${labelOf(detected.value)})`
      : 'Detect layout from typing',
  },
  ...LAYOUT_VARIANTS.map(({ id, label, hint }) => ({ value: id, label, hint })),
])

function labelOf(id: LayoutVariant): string {
  return LAYOUT_VARIANTS.find((entry) => entry.id === id)?.label ?? id
}
</script>

<template>
  <Select
    v-model="override"
    :options="options"
    option-label="label"
    option-value="value"
    size="small"
    aria-label="Keyboard layout"
    :title="`Showing the ${labelOf(variant)} layout`"
  />
</template>

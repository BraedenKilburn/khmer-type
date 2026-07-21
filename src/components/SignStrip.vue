<script setup lang="ts">
import { computed } from 'vue'
import { describeSign, toSignProgress } from '@/lib/signs'

interface Props {
  /** The cluster the cursor is inside, or `undefined` when it is between them. */
  cluster?: string
  /** How far the cursor has advanced into that cluster, in code units. */
  typedCodeUnits: number
}

const props = defineProps<Props>()

const signs = computed(() =>
  props.cluster ? toSignProgress(props.cluster, props.typedCodeUnits) : [],
)

/**
 * A cluster of one sign is already the whole story — the typing line has said
 * it. Decomposing it would add nothing and make the strip flash in and out on
 * every plain consonant.
 */
const isVisible = computed(() => signs.value.length > 1)

const current = computed(() => signs.value.find(({ state }) => state === 'current'))
</script>

<template>
  <!--
    Always in the document, so the typing line above it never moves. `hidden`
    empties it out rather than unmounting it, which would collapse the height
    and shift everything below by a line.
  -->
  <div class="sign-strip" :class="{ 'is-hidden': !isVisible }" aria-live="polite" lang="km">
    <template v-if="isVisible">
      <ol class="signs">
        <li v-for="({ display, state }, index) in signs" :key="index" :class="`sign-${state}`">
          <span class="glyph">{{ display }}</span>
          <span class="marker" aria-hidden="true">{{
            state === 'done' ? '✓' : state === 'current' ? '●' : '○'
          }}</span>
        </li>
      </ol>
      <!--
        The naming is the part COENG needs: it renders no glyph, so a learner
        looking at the strip alone cannot tell what they are being asked to
        press. `lang="en"` because this is English prose about Khmer, and the
        Khmer webfont should not claim it.
      -->
      <p class="prompt" lang="en">{{ current ? describeSign(current.sign) : '' }}</p>
    </template>
  </div>
</template>

<style scoped>
.sign-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  /*
   * Reserved, not reactive: the glyph row, its markers, and one line of prompt.
   * The strip appears and disappears mid-drill, and a typing line that jumped
   * every time the cursor entered a stacked cluster would be unusable.
   */
  min-height: 4.5rem;

  &.is-hidden {
    visibility: hidden;
  }

  .signs {
    display: flex;
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 1.5em;
      line-height: 1.4;

      .marker {
        font-size: 0.6rem;
        line-height: 1;
      }

      /* Done, current, and pending differ in weight and marker as well as in
         colour — the strip has to read for someone who cannot separate the
         two tints. */
      &.sign-done {
        color: var(--p-text-primary);
        opacity: 0.6;
      }

      &.sign-current {
        color: var(--p-primary-color);
        font-weight: bold;
      }

      &.sign-pending {
        color: var(--p-text-secondary);
        opacity: 0.5;
      }
    }
  }

  .prompt {
    margin: 0;
    font-size: 0.85rem;
    color: var(--p-text-secondary);
  }
}
</style>

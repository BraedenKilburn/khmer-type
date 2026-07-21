<script setup lang="ts">
import { computed } from 'vue'
import { describeSign, toSignProgress } from '@/lib/signs'

interface Props {
  /** The cluster the cursor is inside, or `undefined` when it is between them. */
  cluster?: string
  /** What the user has typed into that cluster — not necessarily what it asked for. */
  typed: string
}

const props = defineProps<Props>()

const signs = computed(() => (props.cluster ? toSignProgress(props.cluster, props.typed) : []))

/**
 * A cluster of one sign is already the whole story — the typing line has said
 * it. Decomposing it would add nothing and make the strip flash in and out on
 * every plain consonant.
 */
const isVisible = computed(() => signs.value.length > 1)

const current = computed(() => signs.value.find(({ state }) => state === 'current'))

/**
 * The first sign that went wrong, which is the one worth naming: a mistake early
 * in a cluster makes everything after it suspect, and pointing at the last of
 * four would send the learner to fix the wrong key.
 */
const firstWrong = computed(() => signs.value.find(({ state }) => state === 'wrong'))
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
          <!--
            A mistake reads as a cross, not merely as red — the marker row is
            what makes each sign's state legible without relying on colour.
          -->
          <span class="marker" aria-hidden="true">{{
            state === 'wrong' ? '✗' : state === 'done' ? '✓' : state === 'current' ? '●' : '○'
          }}</span>
        </li>
      </ol>
      <!--
        The naming is the part COENG needs: it renders no glyph, so a learner
        looking at the strip alone cannot tell what they are being asked to
        press. A wrong sign takes priority over the current one — being told
        what to press next is no use while an earlier key is still wrong.
        `lang="en"` because this is English prose about Khmer, and the Khmer
        webfont should not claim it.
      -->
      <p v-if="firstWrong" class="prompt is-wrong" lang="en">
        Wrong key. Wanted {{ describeSign(firstWrong.sign) }}. Backspace to retry.
      </p>
      <p v-else class="prompt" lang="en">{{ current ? describeSign(current.sign) : '' }}</p>
    </template>
  </div>
</template>

<style scoped>
.sign-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  margin-top: 2rem;
  /*
   * Reserved, not reactive: the glyph row, its markers, and up to two lines of
   * prompt. The strip appears and disappears mid-drill, and a typing line that
   * jumped every time the cursor entered a stacked cluster — or every time a
   * key went wrong and the longer message wrapped — would be unusable.
   */
  min-height: 8.5rem;

  &.is-hidden {
    visibility: hidden;
  }

  .signs {
    display: flex;
    gap: 2.25rem;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      /*
       * Big, and bigger than the chrome around it. This is the one place a
       * learner can see a subscript's shape on its own, and Khmer's
       * distinguishing marks — the difference between ្ត and ្ដ — vanish below
       * about 2rem. Legibility here outranks the design's small-caption look.
       */
      font-size: 2.5rem;
      line-height: 1.25;

      .marker {
        font-size: 0.75rem;
        line-height: 1;
      }

      /* Done, current, wrong, and pending differ in weight and marker as well
         as in colour — the strip has to read for someone who cannot separate
         the tints. */
      &.sign-done {
        color: var(--kt-sub);
      }

      &.sign-current {
        color: var(--kt-accent);
        font-weight: bold;
      }

      /* The whole point of the strip: the sign the wrong key landed in. */
      &.sign-wrong {
        color: var(--kt-error);
        font-weight: bold;

        /* The cross is 12px next to a 40px glyph, so it needs the lifted red
           the glyph itself does not. */
        .marker {
          color: var(--kt-error-text);
        }
      }

      &.sign-pending {
        color: var(--kt-faint);
      }
    }
  }

  .prompt {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.5;
    letter-spacing: 0.02em;
    color: var(--kt-sub);
    text-align: center;
    /* Wraps to two lines at most, so the reserved height above holds. */
    max-width: 46ch;

    &.is-wrong {
      color: var(--kt-error-text);
    }
  }
}
</style>

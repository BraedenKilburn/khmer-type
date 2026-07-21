<script setup lang="ts">
import { ROUTE } from '@/router'
import { RouterLink, RouterView } from 'vue-router'
import GlobalFooter from '@/components/GlobalFooter.vue'

/**
 * Free practice keeps `/` and keeps its place first in the nav. The curriculum
 * is an offer, not a funnel — see `@/router`.
 */
const links = [
  { name: ROUTE.practice, label: 'Practice' },
  { name: ROUTE.lessons, label: 'Lessons' },
  { name: ROUTE.targeted, label: 'Targeted' },
  { name: ROUTE.progress, label: 'Progress' },
]
</script>

<template>
  <main>
    <header class="masthead">
      <!--
        The wordmark is set in the chrome's own face and size — it is a label on
        the page, not a banner over it. The accent falls on the single
        underscore, which is the only thing here that gets a colour.
      -->
      <h1>
        <RouterLink :to="{ name: ROUTE.practice }" aria-label="Khmer Type — free practice">
          khmer<span class="mark">_</span>type
        </RouterLink>
      </h1>
      <nav aria-label="Sections">
        <RouterLink v-for="link in links" :key="link.name" :to="{ name: link.name }">
          {{ link.label }}
        </RouterLink>
      </nav>
    </header>
    <RouterView />
  </main>
  <GlobalFooter />
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  /*
   * Generous, and deliberately so: the typing line is the only thing on this
   * page that is meant to be looked at, and the space around it is what makes
   * that true. Everything else is a label at the edge.
   */
  gap: 2.5rem;
  flex: 1;
  padding: 1.75rem 1.5rem 0;
}

.masthead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem 1.5rem;
  flex-wrap: wrap;
  max-width: var(--kt-measure-page);
  width: 100%;

  h1 {
    font-size: 0.8125rem;
    font-weight: 400;
    letter-spacing: 0.02em;

    a {
      color: var(--kt-faint);

      &:hover {
        color: var(--kt-sub);
      }
    }

    /* The only colour in the masthead, on the smallest glyph in it. */
    .mark {
      color: var(--kt-accent);
    }
  }

  nav {
    display: flex;
    gap: 1.25rem;

    a {
      color: var(--kt-faint);
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      text-transform: lowercase;

      &:hover {
        color: var(--kt-sub);
      }

      /*
       * The current section reads from colour and from the rule beneath it, so
       * it survives a reader who cannot separate the accent from the greys —
       * the pill-and-bold treatment it replaces was carrying more weight than
       * a nav this quiet can afford.
       */
      &.router-link-active {
        color: var(--kt-accent);
        border-bottom: 1px solid var(--kt-accent);
        padding-bottom: 2px;
      }
    }
  }
}
</style>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import GlobalFooter from '@/components/GlobalFooter.vue'

/**
 * Free practice keeps `/` and keeps its place first in the nav. The curriculum
 * is an offer, not a funnel — see `@/router`.
 */
const links = [
  { name: 'practice', label: 'Practice' },
  { name: 'lessons', label: 'Lessons' },
  { name: 'targeted', label: 'Targeted' },
  { name: 'progress', label: 'Progress' },
]
</script>

<template>
  <main>
    <header class="masthead">
      <h1>Khmer Type</h1>
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
  gap: 16px;
  flex: 1;
  padding-top: 16px;
}

.masthead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  max-width: 1200px;
  width: 95%;

  h1 {
    font-size: 1.5rem;
  }

  nav {
    display: flex;
    gap: 0.25rem;

    a {
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      color: var(--p-text-secondary);
      font-size: 0.9rem;

      &:hover {
        background-color: var(--p-surface-secondary);
      }

      /* The current section reads from weight and fill, not colour alone. */
      &.router-link-active {
        background-color: var(--p-surface-secondary);
        color: var(--p-text-primary);
        font-weight: bold;
      }
    }
  }
}
</style>

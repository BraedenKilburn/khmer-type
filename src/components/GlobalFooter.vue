<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import Button from 'primevue/button';

const githubUrl = 'https://github.com/BraedenKilburn/khmer-type'
const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <footer class="footer">
    <p>© {{ new Date().getFullYear() }} Braeden Kilburn</p>
    <!--
      Both controls are icon-and-label at the same quiet weight — the footer is
      the one place in the design where nothing competes, so neither the theme
      toggle nor the source link gets a filled button to itself.
    -->
    <div class="footer-controls">
      <Button
        @click="toggleDark()"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        variant="text"
        severity="secondary"
        size="small"
      />
      <Button
        as="a"
        label="github"
        :href="githubUrl"
        target="_blank"
        rel="noopener noreferrer"
        icon="pi pi-github"
        variant="text"
        severity="secondary"
        size="small"
      />
    </div>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-width: var(--kt-measure-page);
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem;

  p {
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    color: var(--kt-faint);
  }

  .footer-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;

    /* Deliberately dimmer than the nav: the footer is the last thing you
       should notice on a page whose job is a line of Khmer. */
    :deep(.p-button) {
      color: var(--kt-faint);
      font-size: 0.75rem;
      letter-spacing: 0.04em;

      &:hover {
        color: var(--kt-sub);
        background-color: transparent;
      }
    }
  }
}
</style>

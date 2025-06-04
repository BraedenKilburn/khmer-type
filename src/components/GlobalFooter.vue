<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import Button from 'primevue/button';

const githubUrl = 'https://github.com/BraedenKilburn/khmer-type'
const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <footer class="footer">
    <p>© {{ new Date().getFullYear() }} Khmer Type - Braeden Kilburn</p>
    <div class="footer-controls">
      <Button
        @click="toggleDark()"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        variant="text"
        severity="contrast"
      />
      <Button
        as="a"
        label="View on Github"
        :href="githubUrl"
        target="_blank"
        rel="noopener noreferrer"
        icon="pi pi-github"
        severity="secondary"
      />
    </div>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 0 auto;
  padding: 1rem;

  .footer-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
}
</style>

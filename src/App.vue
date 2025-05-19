<script setup lang="ts">
import TypingTrainer from '@/components/TypingTrainer.vue'
</script>

<template>
  <main>
    <h1>Khmer Type</h1>
    <TypingTrainer />
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100vh;
}
</style>

<script setup lang="ts">
import TypingTrainer from '@/components/TypingTrainer.vue'
import GlobalFooter from '@/components/GlobalFooter.vue'
import Toast from 'primevue/toast';
</script>

<template>
  <main>
    <h1>Khmer Type</h1>
    <TypingTrainer />
  </main>
  <GlobalFooter />
  <Toast />
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex: 1;
}
</style>

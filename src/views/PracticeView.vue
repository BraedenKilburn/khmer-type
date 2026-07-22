<script setup lang="ts">
import TypingTrainer from '@/components/TypingTrainer.vue'
import { freePractice } from '@/composables/practiceSession'

/*
  Free practice: random sentences, no pass criteria, nothing recorded beyond
  the per-sign stats every drill feeds. This is what the app was before the
  curriculum existed and it stays exactly that.
*/
const session = freePractice()
</script>

<template>
  <TypingTrainer :session="session" />
</template>

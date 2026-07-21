import './assets/main.css'

import { createApp } from 'vue'
import App from '@/App.vue'
import PrimeVue from 'primevue/config';
import { KhmerTypePreset } from '@/theme';
import { router } from '@/router';

createApp(App)
  .use(PrimeVue, {
    theme: {
      preset: KhmerTypePreset,
      options: {
        darkModeSelector: '.dark',
      },
    },
  })
  .use(router)
  .mount('#app')

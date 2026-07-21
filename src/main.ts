import './assets/main.css'

import { createApp } from 'vue'
import App from '@/App.vue'
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

createApp(App)
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: '.dark',
      },
    },
  })
  .mount('#app')

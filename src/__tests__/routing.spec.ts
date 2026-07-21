// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { router as appRouter } from '@/router'

/**
 * A smoke test for the shell: every route mounts, and free practice is what a
 * visitor lands on. It is deliberately shallow — the components have their own
 * suites — but it is the only thing that notices a route pointing at a view
 * that no longer imports cleanly.
 */
async function mountApp(path = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: appRouter.options.routes,
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(App, { global: { plugins: [router, PrimeVue] } })
  // Views are lazily imported, so give the dynamic import a turn to land.
  await new Promise((resolve) => setTimeout(resolve))

  return { router, wrapper }
}

beforeEach(() => {
  localStorage.clear()

  // jsdom ships no matchMedia, and PrimeVue's Select asks for one on mount.
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
})

describe('the app shell', () => {
  it('lands on free practice', async () => {
    const { wrapper } = await mountApp('/')
    expect(wrapper.find('.typing-area').exists()).toBe(true)
  })

  it('keeps free practice one click away from everywhere', async () => {
    const { wrapper } = await mountApp('/lessons')
    const links = wrapper.findAll('nav a').map((link) => link.text())

    expect(links[0]).toBe('Practice')
    expect(links).toContain('Lessons')
    expect(links).toContain('Progress')
  })

  it('opens the lesson map', async () => {
    const { wrapper } = await mountApp('/lessons')
    expect(wrapper.text()).toContain('lessons passed')
  })

  it('opens a lesson and gives it the drills of that lesson', async () => {
    const { wrapper } = await mountApp('/lessons/consonants-1')

    expect(wrapper.text()).toContain('ក ខ គ ឃ ង')
    expect(wrapper.text()).toContain('Drill 1 of')
  })

  it('sends an unknown route to practice rather than to nothing', async () => {
    const { router } = await mountApp('/does-not-exist')
    expect(router.currentRoute.value.name).toBe('practice')
  })

  it('opens the progress view', async () => {
    const { wrapper } = await mountApp('/progress')
    expect(wrapper.findAll('.cell').length).toBe(66)
  })

  it('opens targeted practice and says when it has nothing to aim at', async () => {
    const { wrapper } = await mountApp('/targeted')

    expect(wrapper.text()).toContain('Targeted practice')
    expect(wrapper.text()).toContain('Nothing recorded yet')
  })
})

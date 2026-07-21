import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import PracticeView from '@/views/PracticeView.vue'

/**
 * Four places, and free practice is the front door.
 *
 * The app was a single screen of free practice before the curriculum existed,
 * and some people will only ever want that — so it keeps `/`, and every other
 * route is one click from it. Lessons are an offer, not a gate; nothing here
 * redirects a learner into the curriculum.
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'practice',
    component: PracticeView,
    meta: { title: 'Free practice' },
  },
  {
    path: '/lessons',
    name: 'lessons',
    component: () => import('@/views/LessonMapView.vue'),
    meta: { title: 'Lessons' },
  },
  {
    path: '/lessons/:id',
    name: 'lesson',
    component: () => import('@/views/LessonView.vue'),
    props: true,
    meta: { title: 'Lesson' },
  },
  {
    path: '/targeted',
    name: 'targeted',
    component: () => import('@/views/TargetedView.vue'),
    meta: { title: 'Targeted practice' },
  },
  {
    path: '/progress',
    name: 'progress',
    component: () => import('@/views/ProgressView.vue'),
    meta: { title: 'Progress' },
  },
  // A stale bookmark or a typo lands on practice rather than on nothing.
  { path: '/:pathMatch(.*)*', redirect: { name: 'practice' } },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

import {
  createRouter,
  createWebHistory,
  type RouteMeta,
  type RouteRecordRaw,
} from 'vue-router'
import PracticeView from '@/views/PracticeView.vue'

/**
 * The route names, spelled once.
 *
 * `RouterLink :to="{ name }"` needs the name at every call site, and those were
 * string literals in five files — so renaming a route meant finding all of them
 * and a missed one failed at runtime, not at build. Read `ROUTE.lessons` and a
 * typo is a type error.
 */
export const ROUTE = {
  practice: 'practice',
  lessons: 'lessons',
  lesson: 'lesson',
  targeted: 'targeted',
  progress: 'progress',
} as const

export type RouteName = (typeof ROUTE)[keyof typeof ROUTE]

/** The document title for a route, or the bare app name off a route. */
export const APP_NAME = 'Khmer Type'

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
    name: ROUTE.practice,
    component: PracticeView,
    meta: { title: 'Free practice' },
  },
  {
    path: '/lessons',
    name: ROUTE.lessons,
    component: () => import('@/views/LessonMapView.vue'),
    meta: { title: 'Lessons' },
  },
  {
    path: '/lessons/:id',
    name: ROUTE.lesson,
    component: () => import('@/views/LessonView.vue'),
    props: true,
    meta: { title: 'Lesson' },
  },
  {
    path: '/targeted',
    name: ROUTE.targeted,
    component: () => import('@/views/TargetedView.vue'),
    meta: { title: 'Targeted practice' },
  },
  {
    path: '/progress',
    name: ROUTE.progress,
    component: () => import('@/views/ProgressView.vue'),
    meta: { title: 'Progress' },
  },
  // A stale bookmark or a typo lands on practice rather than on nothing.
  { path: '/:pathMatch(.*)*', redirect: { name: ROUTE.practice } },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * The document title for a route.
 *
 * Every route already carried a `meta.title` and nothing read it, so the tab
 * said "Khmer Type" on all five pages and browser history was five identical
 * entries. A route without one falls back to the bare app name rather than
 * rendering "undefined".
 */
export function titleFor(meta: RouteMeta): string {
  return typeof meta.title === 'string' ? `${meta.title} · ${APP_NAME}` : APP_NAME
}

/*
 * Written after navigation rather than before, so a title never describes a
 * page the router then declined to show.
 */
router.afterEach((to) => {
  document.title = titleFor(to.meta)
})

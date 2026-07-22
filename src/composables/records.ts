import { ref, type Ref } from 'vue'
import { useStorage, type StorageLike } from '@vueuse/core'
import type { SignStats } from '@/lib/stats'
import type { LayoutVariant } from '@/lib/layoutVariant'
import type { Progress } from '@/composables/useLesson'

/**
 * What the app remembers, declared once.
 *
 * A **record** is state for the whole app rather than for whichever component
 * asked — the completion dialog and the heatmap are two views of the same
 * history, and a second copy would drift from the first the moment a drill
 * ended. Most records are kept across visits; one deliberately is not.
 *
 * Five of these used to be five module-scoped consts spread across four
 * composables, each spelling its own key, its own `:v1`, and its own default.
 * Three consequences, all of which this module exists to remove:
 *
 * - **The reset policy lived in a view.** `ProgressView` knew that wiping the
 *   learner's history means clearing two records and leaving the others alone.
 *   A record added later would have had to remember to go and say so there. It
 *   is declared per record now, as `clearedByReset`.
 * - **The version was a promise, not a mechanism.** Comments said the stored
 *   shape could change later; hand-written `:v1` suffixes are what actually
 *   enforced it. The version now sits beside the shape it describes, and the key
 *   is composed in one place — see `versionedKey`.
 * - **Tests had to reach past the interface.** With every record fixed at module
 *   load, the only way to get a clean one was `vi.resetModules()` and a dynamic
 *   import — four suites did exactly that. `connectStorage` is the seam that
 *   replaces it: `localStorage` in the app, `inMemoryStorage()` in tests.
 */

interface RecordDefinition<T> {
  /** Without the version. `versionedKey` adds that. */
  key: string
  /**
   * Bumped when the stored shape changes meaning, so an old value is read under
   * a key nothing looks for rather than misread under one that is.
   *
   * Nothing migrates: a shape that changed meaning has no honest translation
   * from the old numbers, and the learner's history is cheap to rebuild by
   * typing. On a bump the previous key's value is left behind — remove it here
   * if that ever matters more than the simplicity does.
   */
  version: number
  /** A fresh value. A function, so records with object defaults never share one. */
  initial: () => T
  /**
   * Whether the record is written down at all.
   *
   * `false` is a statement about evidence, not an oversight — see
   * `detectedLayout`. An unkept record is still one record for the whole app;
   * it just does not outlive the visit.
   */
  kept: boolean
  /**
   * Whether "start over" wipes this record.
   *
   * True for what the learner earned, false for what they chose. Someone
   * clearing their history has not asked to be handed the wrong keyboard again.
   */
  clearedByReset: boolean
}

const RECORDS = {
  /** The per-sign record — see `@/lib/stats`. */
  stats: {
    key: 'khmer-type:stats',
    version: 1,
    initial: (): SignStats => ({}),
    kept: true,
    clearedByReset: true,
  },
  /** Drills cleared per lesson, and how well — see `@/composables/useLesson`. */
  progress: {
    key: 'khmer-type:progress',
    version: 1,
    initial: (): Progress => ({}),
    kept: true,
    clearedByReset: true,
  },
  /**
   * The layout the user has told us they are on. A statement, not a guess, which
   * is why it is kept — see docs/adr/0003-two-layout-variants-user-overridable.md.
   */
  layoutOverride: {
    key: 'khmer-type:layout-variant',
    version: 1,
    initial: (): LayoutVariant | null => null,
    kept: true,
    clearedByReset: false,
  },
  /**
   * What typing has revealed about the layout so far.
   *
   * Deliberately not kept: a user can move between machines, and a detection
   * carried over from last week's laptop is a guess wearing the clothes of a
   * fact. Declared here beside the override it always loses to, rather than as a
   * bare `ref` in the composable, so the two read as the one decision they are.
   */
  detectedLayout: {
    key: 'khmer-type:layout-detected',
    version: 1,
    initial: (): LayoutVariant | null => null,
    kept: false,
    clearedByReset: false,
  },
  /** Whether the on-screen keyboard is showing. A preference, so it is kept. */
  keyboardVisible: {
    key: 'khmer-type:keyboard-visible',
    version: 1,
    initial: (): boolean => true,
    kept: true,
    clearedByReset: false,
  },
} satisfies Record<string, RecordDefinition<unknown>>

export type RecordName = keyof typeof RECORDS

type RecordValue<N extends RecordName> = ReturnType<(typeof RECORDS)[N]['initial']>

function versionedKey({ key, version }: RecordDefinition<unknown>): string {
  return `${key}:v${version}`
}

/**
 * Where kept records are read and written. `undefined` means `localStorage`,
 * which is what the app runs on and what nothing has to ask for.
 */
let storage: StorageLike | undefined

/** The refs handed out so far, so every caller gets the same one. */
const live = new Map<RecordName, Ref<unknown>>()

/**
 * The record under `name`, as a ref.
 *
 * Read inside a composable's body rather than at its module scope, so that
 * reconnecting the storage underneath is possible at all — a ref captured at
 * import time would outlive every reconnection and quietly keep writing to the
 * store it was born on.
 */
export function record<N extends RecordName>(name: N): Ref<RecordValue<N>> {
  const existing = live.get(name)
  if (existing) return existing as Ref<RecordValue<N>>

  const definition = RECORDS[name]
  const created = definition.kept
    ? useStorage(versionedKey(definition), definition.initial(), storage, {
        // An in-memory adapter cannot fire a `storage` event, and listening for
        // one on every reconnection would pile up listeners across a test run.
        listenToStorageChanges: storage === undefined,
      })
    : ref(definition.initial())

  live.set(name, created as Ref<unknown>)
  return created as Ref<RecordValue<N>>
}

/**
 * Throw away what the learner earned, and keep what they chose.
 *
 * The one statement of what "start over" means. Keeping lesson progress after
 * wiping the per-sign history would leave a learner marked as having passed
 * lessons the heatmap says they never typed, so the two go together — and the
 * layout they picked and the keyboard they hid are not history, so they stay.
 */
export function resetLearnerData(): void {
  for (const name of Object.keys(RECORDS) as RecordName[]) {
    const definition = RECORDS[name]
    if (definition.clearedByReset) record(name).value = definition.initial()
  }
}

/**
 * Point the records at a different store, and drop the refs handed out so far.
 *
 * The app never calls this — `localStorage` is the default and needs no wiring.
 * Tests call it with a fresh `inMemoryStorage()` for isolation, and call it a
 * second time with *the same* store to stage a reload: same disk, new process,
 * which is exactly the thing that used to need `vi.resetModules()`. An unkept
 * record starts over either way, which is what makes a reload a real test of
 * what survives one.
 *
 * Refs already handed out keep writing to the store they were born on. That is
 * harmless where it happens — a test's previous store is about to be discarded
 * — and is the reason composables ask for their record on every call.
 */
export function connectStorage(adapter: StorageLike): void {
  storage = adapter
  live.clear()
}

/**
 * A store that keeps its contents in a `Map`. The second adapter, and the
 * reason this seam exists rather than being hypothetical.
 */
export function inMemoryStorage(): StorageLike {
  const entries = new Map<string, string>()

  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value)
    },
    removeItem: (key) => {
      entries.delete(key)
    },
  }
}

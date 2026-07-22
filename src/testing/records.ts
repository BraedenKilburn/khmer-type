import { connectStorage, inMemoryStorage } from '@/composables/records'

/**
 * Give one test its own store, and a way to stage a reload.
 *
 * Called from a `beforeEach`. Every saved record the test touches is then its
 * own — no `localStorage` to clear, and no shared history arriving from
 * whichever test ran before.
 *
 * `reload()` reconnects the *same* store, which drops the refs handed out so
 * far and reads them back from what was written: same disk, new process. That
 * is what these suites used to stage with `vi.resetModules()` and a dynamic
 * import, which meant reaching past the interface into the module registry to
 * test behaviour the interface would not expose.
 */
export function isolateRecords() {
  const storage = inMemoryStorage()
  connectStorage(storage)

  return {
    reload: () => connectStorage(storage),
    /**
     * The store itself — to assert the key a record landed under, or to plant a
     * value and then `reload()` into it, which is how a test stages an earlier
     * session without going near `localStorage`.
     */
    storage,
  }
}

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Vue's scoped-CSS transform silently breaks a whole shape of selector, and the
 * breakage is invisible in the source.
 *
 * `:global(:root.dark) .heatmap { … }` reads as "when the page is dark, restyle
 * my root element". It compiles to `:root.dark[data-v-…]` — the descendant is
 * dropped and the scope attribute lands on `<html>`, which never carries one.
 * The rule matches nothing. Worse, *nested* rules inside that block compile to
 * something that does match, so a scheme override half-applies: the heatmap
 * shipped its light ramp under the dark scheme's ink for months, and cells whose
 * text and background were the same colour.
 *
 * Whole-selector `:global(...)` is fine — the trap is specifically a descendant
 * written outside the closing paren.
 */
const OFFENDING = /:global\([^)]*\)\s*[^\s{,][^{,]*\{/

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return vueFiles(path)
    return path.endsWith('.vue') ? [path] : []
  })
}

describe('scoped CSS', () => {
  it('never puts a descendant after :global(), which the transform drops', () => {
    const offenders = vueFiles('src').filter((path) => OFFENDING.test(readFileSync(path, 'utf8')))

    expect(offenders).toEqual([])
  })

  /* The guard is worth nothing if it does not fire on the shape it exists for. */
  it('recognises the selector that caused the heatmap bug', () => {
    expect(OFFENDING.test(':global(:root.dark) .heatmap {')).toBe(true)
  })

  it('leaves a whole-selector :global() alone', () => {
    expect(OFFENDING.test(':global(:root.dark .heatmap) {')).toBe(false)
  })
})

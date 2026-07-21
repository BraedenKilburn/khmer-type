/**
 * What a drill is made of: its clusters, its signs, and which sign each
 * keystroke is aimed at.
 *
 * Three different modules used to walk the drill's text with their own copy of
 * the rules — the typing line to segment it, the per-sign record to find the
 * sign under the cursor, the tagger to classify it — and two of them carried
 * their own statement of where COENG binds. This module walks it once.
 *
 * The units are the ones CONTEXT.md names and they are not interchangeable. A
 * **cluster** is the indivisible visual unit the browser shapes and the typing
 * line renders whole (docs/adr/0001-clusters-are-atomic.md). A **sign** is the
 * smallest teachable unit inside it. `ស្វា` is one cluster, three signs, and —
 * per docs/adr/0002-speed-counts-keystrokes.md — four keystrokes.
 */

import { stacksAfterCoeng, toSigns, COENG } from '@/lib/signs'

const segmenter = new Intl.Segmenter('km', { granularity: 'grapheme' })

export interface DrillCluster {
  text: string
  /**
   * Where the cluster starts in the drill, in code units.
   *
   * The sign strip needs it: it decomposes the cluster the cursor is inside,
   * and "how far into this cluster" is `cursor - start`. Computing it a second
   * time by re-walking the clusters is how the two would drift apart.
   */
  start: number
  /** The cluster's signs, in order. */
  signs: readonly string[]
}

export interface DrillAnalysis {
  clusters: readonly DrillCluster[]
  /** Every sign in the drill, in order, subscripts counted as one. */
  signs: readonly string[]
  /**
   * Which sign each code unit belongs to.
   *
   * A subscript spans two keystrokes, so two consecutive positions answer with
   * the same sign — pressing COENG and pressing the consonant after it are both
   * attempts at `្ក`, which is the thing being learned.
   */
  signAt: readonly string[]
}

/**
 * Split a drill into clusters.
 *
 * `Intl.Segmenter` gets us extended grapheme clusters, but it does not apply a
 * Khmer conjunct tailoring: it breaks `ស្វា` after COENG into `ស្` + `វា`. Since
 * COENG's whole job is to bind the next consonant underneath, a segment ending
 * in COENG is by definition unfinished — join it with the one that follows,
 * when `stacksAfterCoeng` says that one can be stacked.
 */
export function toClusters(drill: string): string[] {
  const clusters: string[] = []

  for (const { segment } of segmenter.segment(drill)) {
    const previous = clusters[clusters.length - 1]
    if (previous?.endsWith(COENG) && stacksAfterCoeng(segment)) {
      clusters[clusters.length - 1] = previous + segment
    } else {
      clusters.push(segment)
    }
  }

  return clusters
}

/**
 * The drills analysed so far.
 *
 * A drill's text does not change while it is being typed, but the sign under
 * the cursor is asked for on every keystroke — which used to re-walk the whole
 * drill each time. Keyed by the text itself, so two runs at the same drill
 * share the answer and a corpus of 308 drills costs 308 walks at most.
 */
const cache = new Map<string, DrillAnalysis>()

/** Beyond this the cache is dropped whole — a session cannot outgrow it twice. */
const CACHE_LIMIT = 512

export function analyseDrill(drill: string): DrillAnalysis {
  const cached = cache.get(drill)
  if (cached) return cached

  const clusters: DrillCluster[] = []
  const signAt: string[] = []
  let start = 0

  for (const text of toClusters(drill)) {
    const signs = toSigns(text)
    clusters.push({ text, start, signs })

    for (const sign of signs) {
      for (let offset = 0; offset < sign.length; offset++) signAt.push(sign)
    }

    start += text.length
  }

  const analysis: DrillAnalysis = {
    clusters,
    signs: clusters.flatMap(({ signs }) => [...signs]),
    signAt,
  }

  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(drill, analysis)

  return analysis
}

/**
 * The sign a keystroke at `cursorIndex` is an attempt at, or `undefined` past
 * the end of the drill, where there is nothing to be right or wrong about.
 */
export function expectedSignAt(drill: string, cursorIndex: number): string | undefined {
  return analyseDrill(drill).signAt[cursorIndex]
}

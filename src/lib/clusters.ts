/**
 * Segmentation for the typing line.
 *
 * A cluster is the indivisible visual unit — the browser shapes it into a
 * single glyph and cannot shape one across an element boundary. See
 * docs/adr/0001-clusters-are-atomic.md.
 *
 * State elsewhere stays in code units: each keystroke is one code point, and
 * `typedText` / `cursorIndex` are untouched by anything here. Segmentation is a
 * render-time concern only.
 */

/** COENG — stacks the following consonant beneath the preceding one. */
const COENG = '្'

/** The Khmer consonants, the only signs COENG can legally stack. */
const KHMER_CONSONANT = /^[ក-អ]/

const segmenter = new Intl.Segmenter('km', { granularity: 'grapheme' })

export type ClusterState = 'correct' | 'incorrect' | 'active' | 'untyped'

export interface RenderCluster {
  text: string
  state: ClusterState
  /**
   * Where the cluster starts in the drill, in code units.
   *
   * The sign strip needs it: it decomposes the cluster the cursor is inside,
   * and "how far into this cluster" is `cursor - start`. Computing it a second
   * time by re-walking the clusters is how the two would drift apart.
   */
  start: number
}

/**
 * Split a drill into clusters.
 *
 * `Intl.Segmenter` gets us extended grapheme clusters, but it does not apply a
 * Khmer conjunct tailoring: it breaks `ស្វា` after COENG into `ស្` + `វា`. Since
 * COENG's whole job is to bind the next consonant underneath, a segment ending
 * in COENG is by definition unfinished — join it with the one that follows.
 *
 * The join requires a consonant on the other side. A COENG with nothing
 * stackable after it is malformed input rather than a stack, and must not
 * swallow the space or Latin letter that happens to follow.
 */
export function toClusters(drill: string): string[] {
  const clusters: string[] = []

  for (const { segment } of segmenter.segment(drill)) {
    const previous = clusters[clusters.length - 1]
    if (previous?.endsWith(COENG) && KHMER_CONSONANT.test(segment)) {
      clusters[clusters.length - 1] = previous + segment
    } else {
      clusters.push(segment)
    }
  }

  return clusters
}

/**
 * Bucket each cluster of a drill against what has been typed so far.
 *
 * A cluster the cursor sits inside is `active` as a whole — never part-correct.
 * Colouring a partial cluster would put a style boundary mid-glyph, which is
 * the exact shattering this module exists to prevent.
 */
export function toRenderClusters(drill: string, typed: string, cursor: number): RenderCluster[] {
  let start = 0

  return toClusters(drill).map((text) => {
    const end = start + text.length
    const state = classify(text, typed.slice(start, end), cursor - start)
    const cluster = { text, state, start }
    start = end
    return cluster
  })
}

/**
 * Bucket one cluster. `keystrokesInto` is how far the cursor has advanced past
 * the cluster's first code point — negative before it, zero at its start.
 */
function classify(text: string, typed: string, keystrokesInto: number): ClusterState {
  if (keystrokesInto >= text.length) return typed === text ? 'correct' : 'incorrect'
  if (keystrokesInto > 0) return 'active'
  return 'untyped'
}

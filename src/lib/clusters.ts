/**
 * How each cluster of a drill should be drawn.
 *
 * A cluster is the indivisible visual unit — the browser shapes it into a
 * single glyph and cannot shape one across an element boundary. See
 * docs/adr/0001-clusters-are-atomic.md. Where the clusters *are* is
 * `@/lib/drillAnalysis`; this module only says what state each one is in.
 *
 * State elsewhere stays in code units: each keystroke is one code point, and
 * `typedText` / `cursorIndex` are untouched by anything here. Classification is
 * a render-time concern only.
 */

import { analyseDrill, type DrillCluster } from '@/lib/drillAnalysis'

export type ClusterState = 'correct' | 'incorrect' | 'active' | 'active-incorrect' | 'untyped'

/**
 * True while the cursor is still inside the cluster, right or wrong so far.
 *
 * The caret's position and the sign strip's subject both follow the cursor, not
 * the verdict — a cluster that has already gone wrong is still the one being
 * typed. Kept here so the two callers cannot drift on which states count.
 */
export function isActive(state: ClusterState): boolean {
  return state === 'active' || state === 'active-incorrect'
}

/**
 * A cluster of the drill, plus the state it should be drawn in.
 *
 * Extends the analysis rather than restating two of its fields: `text` and
 * `start` mean exactly what `DrillCluster` says they mean, and a second copy of
 * that definition is a second thing to keep true.
 */
export interface RenderCluster extends DrillCluster {
  state: ClusterState
}

/**
 * Bucket each cluster of a drill against what has been typed so far.
 *
 * A cluster the cursor sits inside is judged as a whole — never part-correct.
 * Colouring a partial cluster would put a style boundary mid-glyph, which is
 * the exact shattering ADR-0001 exists to prevent. `active-incorrect` is how
 * a mistake still surfaces immediately: the whole cluster is marked as having
 * gone wrong the keystroke it goes wrong, and the sign strip — which is outside
 * the shaped run and free to style each sign — says which sign it was.
 */
export function toRenderClusters(drill: string, typed: string, cursor: number): RenderCluster[] {
  return analyseDrill(drill).clusters.map((cluster) => ({
    ...cluster,
    state: classify(
      cluster.text,
      typed.slice(cluster.start, cluster.start + cluster.text.length),
      cursor - cluster.start,
    ),
  }))
}

/**
 * Bucket one cluster. `keystrokesInto` is how far the cursor has advanced past
 * the cluster's first code point — negative before it, zero at its start.
 */
function classify(text: string, typed: string, keystrokesInto: number): ClusterState {
  if (keystrokesInto >= text.length) return typed === text ? 'correct' : 'incorrect'
  /*
   * Judged against the prefix the cursor has reached, not the whole cluster —
   * otherwise every cluster would read as wrong until its last keystroke landed.
   */
  if (keystrokesInto > 0) {
    return typed.slice(0, keystrokesInto) === text.slice(0, keystrokesInto)
      ? 'active'
      : 'active-incorrect'
  }
  return 'untyped'
}

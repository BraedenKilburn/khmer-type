/**
 * What a drill contains, and roughly how hard it is.
 *
 * A curriculum needs to know what each drill asks of a learner before it can
 * order them, and 308 sentences is too many to classify by hand. This module is
 * the classification; `scripts/tag-drills.ts` runs it over the corpus and
 * commits the result, so nothing is recomputed at page load for a corpus that
 * does not change.
 *
 * The scoring is deliberately ordinal. It ranks drills against each other well
 * enough to build a progression; it does not claim that a 14 is twice a 7.
 */

import { analyseDrill } from '@/lib/drillAnalysis'
import { signKind } from '@/lib/signs'

export type DrillFeature =
  | 'baseConsonant'
  | 'independentVowel'
  | 'dependentVowel'
  | 'subscriptConsonant'
  | 'diacritic'
  | 'digit'

export interface DrillTags {
  /** Which kinds of sign the drill contains, in a stable order. */
  features: DrillFeature[]
  /** Distinct base consonants used, in traditional order. */
  consonants: string[]
  /** Distinct signs used, subscripts counted apart from their base. */
  signs: string[]
  clusters: number
  /** Signs in the drill's biggest cluster — its stacking depth. */
  maxClusterSigns: number
  /**
   * An ordinal difficulty score.
   *
   * Cluster count stands in for length, and stacking is what actually makes a
   * drill hard: a subscript is two keystrokes producing one mark, and a
   * beginner meets it long after they can type a plain consonant. Diacritics
   * cost less than that but more than nothing — they are small, easily missed,
   * and often on a shifted key.
   */
  difficulty: number
}

const FEATURE_ORDER: DrillFeature[] = [
  'baseConsonant',
  'independentVowel',
  'dependentVowel',
  'subscriptConsonant',
  'diacritic',
  'digit',
]

/** Everything the curriculum knows about one drill's text. */
export function tagDrill(km: string): DrillTags {
  const { clusters, signs } = analyseDrill(km)

  const features = new Set<DrillFeature>()
  const consonants = new Set<string>()
  let coeng = 0
  let diacritics = 0

  for (const sign of signs) {
    const kind = signKind(sign)

    if (FEATURE_ORDER.includes(kind as DrillFeature)) features.add(kind as DrillFeature)
    if (kind === 'baseConsonant') consonants.add(sign)
    if (kind === 'subscriptConsonant') coeng++
    // A bare COENG is malformed rather than a stack — it stacked nothing — so
    // it is classified as a diacritic and costs what one costs.
    if (kind === 'diacritic') diacritics++
  }

  const maxClusterSigns = clusters.reduce(
    (deepest, cluster) => Math.max(deepest, cluster.signs.length),
    0,
  )

  return {
    features: FEATURE_ORDER.filter((feature) => features.has(feature)),
    consonants: [...consonants].sort(),
    signs: [...new Set(signs)].sort(),
    clusters: clusters.length,
    maxClusterSigns,
    difficulty: clusters.length + 3 * coeng + 2 * diacritics,
  }
}

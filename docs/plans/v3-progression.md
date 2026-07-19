# v3 — Graded Progression

**Depends on:** [v2](./v2-make-it-a-trainer.md)

**Goal:** replace random sentence selection with a structured curriculum that introduces the Khmer writing system in a learnable order.

**Outcome:** a beginner has a path from "never typed Khmer" to "typing full sentences," instead of being dropped into the deep end on keystroke one.

---

## Finding: the corpus cannot support this yet

I profiled all 308 sentences by Unicode feature. The distribution is severely skewed toward advanced content:

| Feature | Sentences |
|---|---|
| Base consonants only (no vowel signs, no COENG) | **2** |
| Vowel signs, no COENG | 62 |
| Contains COENG (subscript stacking) | **244** |
| Contains diacritics (U+17C6–U+17D1, U+17D3–U+17DD) | 271 |
| Contains Khmer digits (០–៩) | 2 |
| Contains Latin characters | 0 |

Distinct base consonants used: **29 of 35**. Six never appear at all; eight more are rare (`ឈ` 9 occurrences, `ឡ` 11, `ភ` 22, `ថ` 26, `ធ` 29, `ឆ` 35, `ផ` 40, `ដ` 49).

**Read this carefully: 79% of the corpus requires subscript stacking, and exactly 2 sentences are simple enough for a true beginner.** Auto-tagging what exists will produce a curriculum that is empty at the bottom and saturated at the top.

So v3 is **not** primarily an engineering task. It is a content authoring task with a modest engine attached. Budget accordingly — this is the largest of the three plans by effort, and most of that effort is writing Khmer drill content, not code.

---

## Task 1 — Feature tagging (scripted)

**New:** `scripts/tag-drills.ts`

Auto-classify every sentence by Unicode range. This is cheap, deterministic, and worth doing first so the gap is measurable rather than guessed:

| Feature | Range |
|---|---|
| `baseConsonant` | U+1780–U+17A2 |
| `independentVowel` | U+17A3–U+17B5 |
| `dependentVowel` | U+17B6–U+17C5 |
| `coeng` | U+17D2 |
| `diacritic` | U+17C6–U+17D1, U+17D3–U+17DD |
| `digit` | U+17E0–U+17E9 |

Emit per sentence: feature set, distinct consonants used, cluster count (via `toClusters` from v1), max cluster length.

Derive a difficulty score from those — cluster count and stacking depth are better proxies than raw character length.

Commit the generated tags rather than computing at runtime. The corpus is static; there's no reason to pay for this on every page load.

---

## Task 2 — Author beginner content

**This is the real work.** The corpus needs roughly 80–120 new short drills covering the bottom of the curriculum, which currently does not exist:

- **Single consonants** in traditional order — pure key-location practice
- **Consonant pairs and short syllables** — no vowel signs
- **Each dependent vowel sign** introduced individually against a known consonant
- **COENG introduced deliberately**, one stacking pattern at a time
- **The six unused consonants** (`ឝ ឞ ឥ ឦ ឧ ឨ` and any others the tagging script reports) — plus deliberate coverage for the eight rare ones

Drills at this level are not sentences and should not pretend to be. A lesson can legitimately be `ក ខ គ ឃ ង` repeated — that is what learning a layout looks like.

**You have an advantage here that almost nobody else does.** Culturally correct ordering, natural phrasing, and knowing which distinctions actually matter to a learner are exactly the parts that can't be outsourced or scraped. This is why this project is worth building instead of the other ideas.

---

## Task 3 — Lesson engine

**New:** `src/data/lessons.ts`, `src/composables/useLesson.ts`

```ts
export interface Lesson {
  id: string
  title: string
  description: string
  introduces: string[]      // chars taught here for the first time
  requires: string[]        // lesson ids that must be completed first
  drills: string[]          // sentence/drill ids
  passCriteria: {
    minAccuracy: number     // e.g. 95
    minCpm?: number
  }
}
```

Design constraints worth committing to:

- **Cumulative review.** Each lesson draws a portion of its drills from previously introduced characters. Without this, learners forget lesson 3 by lesson 9.
- **Gate on accuracy, not speed.** Speed follows accuracy; the reverse is not true. Requiring CPM early teaches people to type badly and fast.
- **Never hard-lock progression.** Show a lesson as unmet-prerequisite but let users skip ahead. Adult learners abandon apps that refuse to let them explore.

Persist progress via the same versioned `localStorage` approach from v2's `useStats`.

---

## Task 4 — Adaptive drills

Once v2's per-character stats exist, generate practice sessions targeting a user's actual weaknesses: sample from the corpus weighted toward characters with high error rate or high latency.

This is the natural payoff of v2's heatmap and is genuinely useful — but it depends on having enough tagged corpus to sample from, which is why it comes after Task 2.

Keep it simple: weighted random sampling over already-introduced characters. Resist building a spaced-repetition scheduler unless usage shows it's needed.

---

## Task 5 — Navigation

**New:** `src/components/LessonMap.vue`

The app is currently a single view (`App.vue` renders `TypingTrainer` directly, no router).

v3 needs at minimum: lesson list with progress, lesson detail/drill view, free-practice mode (the current behavior, preserved), and the stats heatmap from v2.

Add `vue-router` at this point. Keep free practice reachable in one click from anywhere — it's the existing experience and some users will only ever want that.

---

## Risks

- **Content authoring is the bottleneck**, not code. Tasks 1, 3, 4, 5 are perhaps a few focused sittings. Task 2 is an ongoing effort. Don't start the engine expecting the corpus to fill itself in.
- **Scope creep toward "language learning app."** This is a *typing* trainer. Vocabulary, grammar, and reading comprehension are a different product. The romanization/gloss from v2 is the right amount of language support; stop there.
- **v3 may not be necessary.** If v1 + v2 ship and nobody uses the app, a curriculum won't change that. Ship v2, see whether anyone engages, then decide.

---

## Definition of done

- [ ] Every sentence carries generated feature tags and a difficulty score
- [ ] Beginner drills exist for all 35 consonants and every dependent vowel sign
- [ ] Lessons gate on accuracy, allow skipping, and include cumulative review
- [ ] Adaptive practice targets a user's measured weak characters
- [ ] Free practice remains one click away

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

## Task 1 — Feature tagging (scripted) ✅

**New:** `scripts/tag-drills.ts`, `src/lib/drillTags.ts`, generated `src/data/drillTags.ts`

**Shipped:** `npm run tag-drills` walks the corpus and commits the tags. The
classification is narrower than the table below in one place: the diacritic
range here runs to U+17DD and sweeps up `។` `៕` `៖` `៛`, which are punctuation
and a currency sign. `signKind` classifies those as symbols instead — giving
them a dotted circle to combine with would be nonsense.

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

## Task 2 — Author beginner content ✅

**Shipped:** 117 key-location exercises (`e001`–`e117`), against the 80–120 this
task asked for, one for each bullet below:

| Bullet | Drills |
|---|---|
| Single consonants in traditional order | `e001`–`e021`, the seven vargas |
| Consonant pairs, no vowel signs | `e022`–`e027` |
| Each dependent vowel sign individually | `e028`–`e059`, all sixteen |
| COENG one pattern at a time | `e060`–`e083`, twelve subscripts |
| The unused and rare letters | `e084`–`e093` rare consonants, `e104`–`e117` independent vowels |

The corpus now holds 27 drills of base consonants alone where it held none, and
157 with no stacking against the 64 it started with. All 33 consonants appear,
where the sentences alone reached 29.

**A correction to the fifth bullet.** It names `ឝ ឞ ឥ ឦ ឧ ឨ`; only three of
those can be drilled. **NiDA has no key for `ឝ`, `ឞ`, or `ឨ`** — Windows
`KBDKNI` leaves those slots empty, and only Apple's variant reaches them — and
neither layout produces `ឣ` or `ឤ`. A drill containing one would be impossible
to finish on the standard layout, so the lesson covers the fourteen independent
vowels both tables can produce and a test pins the five that are excluded.

**These are exercises, not sentences, as this task instructed** — "drills at
this level are not sentences and should not pretend to be." They are sequences
and say so, which is exactly why they could be generated. The judgement this
task reserves for a speaker is ordering, and the ordering used is the
traditional one: the consonants in their vargas.

**Optional, separate, and still yours:** *more real Khmer sentences*. The 308 in
the corpus are all a speaker wrote, and lesson `sentences-1` already draws the
twelve gentlest of them, so the curriculum has a real-Khmer shallow end. Adding
more short sentences would improve it and is not something to generate — an
agent filling that in unsupervised produces plausible-looking wrong Khmer. It is
not a gap in this task's checklist.


**This is the real work.** The corpus needs roughly 80–120 new short drills covering the bottom of the curriculum, which currently does not exist:

- **Single consonants** in traditional order — pure key-location practice
- **Consonant pairs and short syllables** — no vowel signs
- **Each dependent vowel sign** introduced individually against a known consonant
- **COENG introduced deliberately**, one stacking pattern at a time
- **The six unused consonants** (`ឝ ឞ ឥ ឦ ឧ ឨ` and any others the tagging script reports) — plus deliberate coverage for the eight rare ones

Drills at this level are not sentences and should not pretend to be. A lesson can legitimately be `ក ខ គ ឃ ង` repeated — that is what learning a layout looks like.

**You have an advantage here that almost nobody else does.** Culturally correct ordering, natural phrasing, and knowing which distinctions actually matter to a learner are exactly the parts that can't be outsourced or scraped. This is why this project is worth building instead of the other ideas.

---

## Task 3 — Lesson engine ✅

**New:** `src/data/lessons.ts`, `src/composables/useLesson.ts`

**Shipped:** 21 lessons — seven consonant groups, one crossing drill, four vowel
lessons, four stacking lessons, rare letters, mixed review, and three sentence
tiers cut from the difficulty ranking at its bottom, middle, and top. Each
lesson after the first ends with a drill from an earlier one.

**One correction:** `passCriteria` takes `minKpm`, not `minCpm`. A stacked
cluster is one glyph and several keystrokes, so characters-per-minute would
measure the script rather than the typing — see
[ADR-0002](../adr/0002-speed-counts-keystrokes.md). It is left unset, per the
gate-on-accuracy rule below.

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

## Task 4 — Adaptive drills ✅

**New:** `src/lib/adaptive.ts`, `src/views/TargetedView.vue`

**Shipped:** weighted sampling over drill tags and the per-sign record, at
`/targeted`. A sign never attempted weighs nothing rather than everything —
unmet signs are the curriculum's job, and treating unknown as weak would fill
practice with letters from lessons the learner has not reached. No
spaced-repetition scheduler, as instructed.


Once v2's per-character stats exist, generate practice sessions targeting a user's actual weaknesses: sample from the corpus weighted toward characters with high error rate or high latency.

This is the natural payoff of v2's heatmap and is genuinely useful — but it depends on having enough tagged corpus to sample from, which is why it comes after Task 2.

Keep it simple: weighted random sampling over already-introduced characters. Resist building a spaced-repetition scheduler unless usage shows it's needed.

---

## Task 5 — Navigation ✅

**New:** `src/router/index.ts` and `src/views/` — practice, lesson map, lesson,
targeted, progress

**Shipped:** `vue-router`, with free practice keeping `/` and first place in the
nav. An unmet prerequisite is a label on the map, never a barrier.

The app is currently a single view (`App.vue` renders `TypingTrainer` directly, no router).

v3 needs at minimum: lesson list with progress, lesson detail/drill view, free-practice mode (the current behavior, preserved), and the stats heatmap from v2.

Add `vue-router` at this point. Keep free practice reachable in one click from anywhere — it's the existing experience and some users will only ever want that.

---

## Risks

- **Content authoring is the bottleneck**, not code. Tasks 1, 3, 4, 5 are perhaps a few focused sittings. Task 2 is an ongoing effort. Don't start the engine expecting the corpus to fill itself in.
- **Scope creep toward "language learning app."** This is a *typing* trainer. Vocabulary, grammar, and reading comprehension are a different product. The line moved tighter than this plan first drew it: [#17](https://github.com/BraedenKilburn/khmer-type/issues/17) cut romanization and gloss too, so the answer is **no language support at all**.
- **v3 may not be necessary.** If v1 + v2 ship and nobody uses the app, a curriculum won't change that. Ship v2, see whether anyone engages, then decide.

---

## Definition of done

- [x] Every sentence carries generated feature tags and a difficulty score
- [x] Beginner drills exist for all 33 consonants, every dependent vowel sign, and every independent vowel both layouts can type
- [x] Lessons gate on accuracy, allow skipping, and include cumulative review
- [x] Adaptive practice targets a user's measured weak characters
- [x] Free practice remains one click away

The consonant count is 33, not 35: `ឝ` and `ឞ` are transliteration letters for
Pali and Sanskrit rather than letters of the alphabet — and NiDA has no key for
either, so no learner on the standard layout *could* be drilled on them.

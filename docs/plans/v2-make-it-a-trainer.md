# v2 — Make It a Trainer, Not a Test

**Depends on:** [v1](./v1-make-it-correct.md)

**Goal:** close the gap between what the app currently is (a typing *test* that assumes you already know the Khmer layout) and what a learner needs (a *trainer* that teaches it).

**Outcome:** someone who has never typed Khmer can sit down and start learning.

---

## The gap

`TypingTrainer.vue:82-91` — when a user types a Latin character, the app shows:

> "Please switch to Khmer input mode to type correctly."

...and then abandons them. It correctly detects the single most common failure state for a new user and offers no path out of it. Even a user who *has* switched to a Khmer layout has no idea where the keys are — the Khmer keyboard has 33 consonants plus vowel signs mapped across shifted and unshifted positions, and nobody memorizes that from a blank text field.

**This is the highest-value work in the entire project.** It's what makes this a tool that doesn't otherwise exist.

---

## Task 1 — Sign decomposition and the sign strip

**New:** `src/components/SignStrip.vue`, `toSigns` in `src/composables/useDrills.ts`

**Blocks:** Task 2 (keyboard), Task 4 (heatmap) — both consume `toSigns`

The answer to v1's deliberate lack of intra-cluster feedback ([ADR-0001](../adr/0001-clusters-are-atomic.md)). When the cursor sits inside a multi-sign cluster, render that cluster decomposed beneath the typing line:

```
      សូម ស្វា គមន៏!          ← typing line: shaped whole, ស្វា highlighted
           ───
       ស    ◌្វ    ◌ា         ← strip: the active cluster, decomposed
       ✓     ●      ○
```

Each sign is an independent element, so each carries its own colour with no ligature to break — the typing line stays untouched and ADR-0001 holds.

### Decomposition

```ts
export function toSigns(cluster: string): string[]
```

Walk code points; COENG plus the following consonant is one sign, everything else is one sign each. Verified against the corpus:

| Cluster | Keystrokes | Signs |
|---|---|---|
| `ក` | 1 | `ក` |
| `សូ` | 2 | `ស` `◌ូ` |
| `ស្វា` | 4 | `ស` `◌្វ` `◌ា` |
| `ស្ត្រី` | 6 | `ស` `◌្ត` `◌្រ` `◌ី` |

Prefix combining signs with a dotted circle (U+25CC) for display so they're legible standing alone.

**This function is why the task goes first.** The keyboard needs it to know which sign is next; the heatmap needs it to record `្ក` separately from `ក`. Build it once in `useDrills`, with tests, and have both consume it — a second copy will drift.

### Behavior

- Show only while the cursor is inside a cluster of **two or more** signs; a single-sign cluster needs no breakdown and the strip would just flicker
- Three states per sign: done, current, pending
- Name the current sign — especially COENG, where the useful prompt is "press `្` then `វ`" rather than a glyph the user cannot see
- Reserve the strip's vertical space permanently so the typing line never shifts when it appears

### Cursor inside the cluster

`Range.getBoundingClientRect()` gives caret geometry at a code-unit offset within a shaped run without splitting it, so the existing cursor can sit mid-cluster. Works for spacing marks like `ា`; for stacked subscripts the caret won't visibly move, since they occupy the same horizontal space. Nearly free, but the strip is what actually carries the feedback — don't over-invest here.

### Ships alone

The strip is useful on its own — a user with a working Khmer layout gets per-sign feedback with no keyboard on screen. Land and evaluate it before starting Task 2.

---

## Task 2 — On-screen Khmer keyboard

**New:** `src/components/KhmerKeyboard.vue`, `src/data/khmerLayout.ts`

**Blocked by:** Task 1 (`toSigns`) · **Blocks:** Task 3

A visual keyboard beneath the typing area that highlights the next key to press. Where the strip shows *which sign*, the keyboard shows *which key* — the same guidance one altitude down.

### Layout data

Encode the standard Khmer (NiDA) layout — the default on macOS, Windows, and Linux. Map physical key positions to the Khmer characters they produce, unshifted and shifted:

```ts
export interface KeyDef {
  code: string        // KeyboardEvent.code, e.g. 'KeyA' — layout-independent
  base: string        // char produced unshifted
  shift: string       // char produced with Shift
  row: number
  finger?: Finger     // for v3 lesson targeting
}
```

Key on `event.code`, not `event.key`. `code` is the physical position and stays stable regardless of the user's active layout — which is exactly what you need to tell someone *where* to press.

**Verify the mapping against a real Khmer keyboard rather than trusting a chart; NiDA has several near-variants.** This is a research task with a real chance of being wrong in ways that are hard to notice — a good candidate for `/research` against primary sources before encoding anything.

### Behavior

- Highlight the key producing the next expected character
- Show a distinct Shift indicator when the target is a shifted glyph
- **COENG needs special handling.** U+17D2 is invisible — it has a key position but produces no visible glyph. Label that key explicitly (e.g. `◌្` with a dotted circle) so learners understand they're pressing "stack the next consonant," not a character. This is the single most confusing key on the layout for beginners and deserves its own affordance.
- Toggleable, persisted — experienced users will want it off

---

## Task 3 — Wrong-layout fallback and click-to-type

**File:** `src/components/TypingTrainer.vue:82-91`

**Blocked by:** Task 2 (click-to-type needs the on-screen keyboard)

Replace the dead-end toast with something actionable: when Latin input is detected, surface a short inline panel explaining how to add the Khmer keyboard on macOS / Windows / Linux, and offer a **click-to-type** mode using the on-screen keyboard so the user can start immediately without configuring anything.

### Open question — do clicks count as keystrokes?

Click-to-type produces the same characters through a different motor action. Before building it, decide:

- Do clicked characters feed `tallyKeystrokes` and affect accuracy?
- Do they feed per-sign stats in Task 4, given that clicking teaches nothing about key location?
- Does a session typed entirely by clicking belong in speed history at all?

**Recommendation: clicks produce text but are excluded from all measurement** — the mode exists to unblock someone who hasn't configured a layout, not to record their performance. But this is genuinely unsettled and worth grilling before it gets built in.

---

## Task 4 — Per-sign accuracy heatmap

**New:** `src/composables/useStats.ts`, `src/components/StatsHeatmap.vue`

**Blocked by:** Task 1 (`toSigns`)

Nothing on the internet tells a Khmer learner *which specific signs they fumble*. You'd be first.

### Tracking

On each keystroke, record `(expectedSign, wasCorrect, msSinceLastKeystroke)`. Aggregate per sign:

```ts
interface CharStat {
  char: string
  attempts: number
  errors: number
  totalMs: number    // → average latency, a better weakness signal than raw error rate
}
```

Persist to `localStorage` via `@vueuse/core`'s `useStorage` (already a dependency). Version the storage key (`khmer-type:stats:v1`) so the shape can migrate later.

### Display

Render the 33 consonants in their traditional order, each tinted by error rate. Two views worth having:

- **Accuracy** — error rate per character
- **Hesitation** — average latency, which surfaces characters you get *right* but slowly. Often the more useful signal, and nobody visualizes it.

Include subscript forms as distinct entries — typing `្ក` is a different motor skill from typing `ក`, and conflating them hides exactly the weakness a learner most needs to see.

> Consult `dataviz` skill guidance before building the heatmap.

---

## Task 5 — Romanization and gloss

**File:** `src/data/corpus.ts` (schema change), new toggle in `TypingTrainer.vue`

Currently the corpus is a bare `string[]`. A learner types 308 sentences of meaningless glyphs and learns nothing but muscle memory.

Migrate to:

```ts
export interface Drill {
  km: string
  romanization?: string  // e.g. 'sohm svaakuhm'
  en?: string            // e.g. 'Welcome!'
}
```

`Drill`, not `Sentence` — v3 adds key-location drills like `ក ខ គ ឃ ង`, which have no meaningful gloss. Both fields are optional for the same reason, which also gives you the incremental-population path below for free.

Display both below the typing area, each independently toggleable and persisted. Beginners want all three lines; advanced users want Khmer only.

**Effort warning — this is the expensive task in v2.** 308 sentences × 2 fields, and machine translation of Khmer is unreliable enough that it needs human review. Two mitigations:

1. Ship the schema change with `romanization`/`en` optional, populate incrementally, hide the toggle when a field is absent
2. Start with the ~50 most common sentences rather than all 308

Khmer romanization has no single universal standard (UNGEGN vs. ALA-LC vs. ad-hoc phonetic). Pick one, note the choice in the README, and stay consistent.

---

## Task 6 — IME and mobile input

**File:** `src/components/TypingTrainer.vue:76-140`

v1 deliberately shipped desktop-only. `window.addEventListener('keydown')` reads physical key events; mobile keyboards and IME composition emit `event.key === 'Process'` or `'Unidentified'`, so nothing registers.

Migrate to a visually-hidden `<input>` with:

- `beforeinput` / `input` for character entry
- `compositionstart` / `compositionupdate` / `compositionend` for IME sequences
- Focus the hidden input on container click (already the interaction pattern at line 188)

This also improves accessibility — a real focusable input with proper labelling beats a `tabindex="0"` div.

Decide deliberately whether mobile is in scope at all. A typing trainer on a phone touch keyboard teaches a different (arguably useless) motor skill. **Recommendation: fix IME for desktop, and show a "best on desktop" notice on small viewports** rather than building a mobile-optimized experience.

---

## Task 7 — Tests

Vitest, the segmentation tests, and the accuracy tests all landed in v1. Extend the existing suite to cover v2's new logic:

- Stats aggregation per sign, and the `localStorage` round-trip
- Sign extraction: `្ក` is recorded as one sign distinct from `ក` (see [`CONTEXT.md`](../../CONTEXT.md))

The sign-level aggregation is the part most likely to go quietly wrong — a bug there produces a heatmap that looks plausible and is simply false.

---

## Definition of done

- [ ] A user who has never typed Khmer can start learning without leaving the app
- [ ] On-screen keyboard highlights the next key, with COENG clearly explained
- [ ] Sign strip shows per-sign progress inside a multi-sign cluster, without splitting the typing line
- [ ] Heatmap shows per-sign accuracy *and* hesitation, persisted across sessions
- [ ] Romanization/gloss toggles work for at least the top 50 sentences
- [ ] IME composition works on desktop
- [ ] Test suite extended to cover per-sign stats and their persistence

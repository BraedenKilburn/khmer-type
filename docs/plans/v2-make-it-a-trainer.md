# v2 — Make It a Trainer, Not a Test

**Depends on:** [v1](./v1-make-it-correct.md)

**Goal:** close the gap between what the app currently is (a typing *test* that assumes you already know the Khmer layout) and what a learner needs (a *trainer* that teaches it).

**Outcome:** someone who has never typed Khmer can sit down and start learning.

**Tracked as:** [#14](https://github.com/BraedenKilburn/khmer-type/issues/14) – [#21](https://github.com/BraedenKilburn/khmer-type/issues/21). The tickets are authoritative on scope and acceptance; this document is the reasoning behind them.

---

## The gap

`TypingTrainer.vue:82-91` — when a user types a Latin character, the app shows:

> "Please switch to Khmer input mode to type correctly."

...and then abandons them. It correctly detects the single most common failure state for a new user and offers no path out of it. Even a user who *has* switched to a Khmer layout has no idea where the keys are — the Khmer keyboard has 33 consonants plus vowel signs mapped across shifted and unshifted positions, and nobody memorizes that from a blank text field.

**This is the highest-value work in the entire project.** It's what makes this a tool that doesn't otherwise exist.

---

## Task 1 — Hidden input and IME composition ✅

**Ticket:** [#14](https://github.com/BraedenKilburn/khmer-type/issues/14) — landed in `39742ae` · **File:** `src/components/TypingTrainer.vue`

**Blocks:** Task 2 (sign strip), and transitively everything downstream of it

**Shipped:** the input path is a visually-hidden `<input>` — `beforeinput` for direct
entry, `compositionend` for composed sequences, `keydown` for Backspace. The state
transitions live in `src/lib/typingSession.ts` as pure functions with tests, which is
the seam Task 6 hooks. Composition is recognised by input type rather than by
`isComposing`: WebKit fires `compositionend` before the final `beforeinput`, so the
flag has cleared by the time the composed text arrives and the sequence would
otherwise count twice.

**Still unverified:** the IME path has not been exercised against a real Khmer input
method in a browser — the event wiring is reasoned from spec, and the repo has no
component-level test harness (no jsdom / `@vue/test-utils`). If Task 2 or Task 6 turn
up keystrokes going missing or double-counted, start here.

v1 deliberately shipped desktop-only. `window.addEventListener('keydown')` reads physical key events; IME composition emits `event.key === 'Process'` or `'Unidentified'`, so a user typing Khmer through a real input method registers nothing.

Migrate to a visually-hidden `<input>` with:

- `beforeinput` / `input` for character entry
- `compositionstart` / `compositionupdate` / `compositionend` for IME sequences
- Focus the hidden input on container click (already the interaction pattern at line 188)

This also improves accessibility — a real focusable input with proper labelling beats a `tabindex="0"` div.

### Why this goes first

The per-sign stat capture in Task 6 hooks the same keystroke path. Rewriting the input layer afterwards means wiring that work twice. Make the change easy, then make the easy change.

Everything the current path guarantees has to survive the move: one keystroke is one code point, Backspace rewinds the cursor without tallying, keystrokes past the end of the drill are refused, and the raw key sequence keeps feeding accuracy per [ADR-0002](../adr/0002-speed-counts-keystrokes.md).

### Mobile is out of scope

A typing trainer on a phone touch keyboard teaches a different, arguably useless motor skill. **Decided:** fix IME for desktop, show a "best on desktop" notice on small viewports, and build no mobile-optimized experience.

---

## Task 2 — Sign decomposition and the sign strip ✅

**Ticket:** [#18](https://github.com/BraedenKilburn/khmer-type/issues/18) — landed in `b5fd362` · **New:** `src/components/SignStrip.vue`, `toSigns` in `src/lib/signs.ts`

**Blocked by:** Task 1 · **Blocks:** Task 4 (keyboard), Task 6 (stats) — both consume `toSigns`

**Shipped:** `toSigns` lives in `src/lib/signs.ts` with the rest of the pure text
logic and is re-exported from the drills composable, which is where the ticket
said to look for it. The strip names the current sign structurally — "Subscript
វ — press ្ then វ" — never linguistically, since romanization was cut in #17.
Its vertical space is reserved permanently, so entering a stacked cluster never
shifts the typing line.

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

**This function is why the task comes before the keyboard and the heatmap.** The keyboard needs it to know which sign is next; the heatmap needs it to record `្ក` separately from `ក`. Build it once in `useDrills`, with tests, and have both consume it — a second copy will drift.

### Behavior

- Show only while the cursor is inside a cluster of **two or more** signs; a single-sign cluster needs no breakdown and the strip would just flicker
- Three states per sign: done, current, pending
- Name the current sign — especially COENG, where the useful prompt is "press `្` then `វ`" rather than a glyph the user cannot see
- Reserve the strip's vertical space permanently so the typing line never shifts when it appears

### Cursor inside the cluster

`Range.getBoundingClientRect()` gives caret geometry at a code-unit offset within a shaped run without splitting it, so the existing cursor can sit mid-cluster. Works for spacing marks like `ា`; for stacked subscripts the caret won't visibly move, since they occupy the same horizontal space. Nearly free, but the strip is what actually carries the feedback — don't over-invest here.

### Ships alone

The strip is useful on its own — a user with a working Khmer layout gets per-sign feedback with no keyboard on screen. Land and evaluate it before starting Task 4.

---

## Task 3 — Khmer layout data ✅

**Ticket:** [#15](https://github.com/BraedenKilburn/khmer-type/issues/15) · **New:** `src/data/khmerLayout.ts`

**Blocks:** Task 4 · **Blocked by:** nothing — can run in parallel with Tasks 1–2

**Shipped:** NiDA encoded and verified by diffing two independent implementations
(Windows `KBDKNI`, Linux `xkb kh(basic)`), which agree on `base` and `shift` for
all 48 keys. `keystrokeFor` indexes characters back to the key that produces
them; a test asserts every code point in the corpus is reachable.

**Two corrections to what this task assumed.** NiDA is *not* the default on
macOS — Apple ships a near-variant under the name "Khmer" that differs on 10 of
48 keys, including the spacebar. That is now [ADR-0003](../adr/0003-two-layout-variants-user-overridable.md):
both tables ship, detection is inferred from keystrokes, and the user can
override. And `KeyDef` needs an `alt` level: NiDA puts four code points the
corpus uses (`,` `ឯ` `ឱ` `៎`) on AltGr, so base and shift alone cannot satisfy
the completeness test.

Encode the standard Khmer (NiDA) layout. Map physical key positions to the Khmer characters they produce, unshifted and shifted:

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

Split out from the keyboard component because the research is the expensive half and the data is independently verifiable: every code point in the corpus must be producible from the layout. If a drill contains a sign no key produces, the layout is wrong or incomplete.

---

## Task 4 — On-screen Khmer keyboard ✅

**Ticket:** [#19](https://github.com/BraedenKilburn/khmer-type/issues/19) — landed in `399c97b` · **New:** `src/components/KhmerKeyboard.vue`

**Blocked by:** Task 2 (`toSigns`), Task 3 (layout data)

**Shipped:** the board highlights the key for the next expected code point and
arms a Shift or AltGr cap when the press needs one. It renders whichever variant
`useLayoutVariant` reports, so a macOS learner is pointed at Apple's keys — the
second table and its detection landed as [#22](https://github.com/BraedenKilburn/khmer-type/issues/22)
in `598edaf`, with the table dumped from `UCKeyTranslate` by
`scripts/dump-macos-layout.swift` rather than transcribed.

A visual keyboard beneath the typing area that highlights the next key to press. Where the strip shows *which sign*, the keyboard shows *which key* — the same guidance one altitude down.

### Behavior

- Highlight the key producing the next expected character
- Show a distinct Shift indicator when the target is a shifted glyph
- **COENG needs special handling.** U+17D2 is invisible — it has a key position but produces no visible glyph. Label that key explicitly (e.g. `◌្` with a dotted circle) so learners understand they're pressing "stack the next consonant," not a character. This is the single most confusing key on the layout for beginners and deserves its own affordance.
- Toggleable, persisted — experienced users will want it off
- **Render a layout variant, not "the" layout.** Per [ADR-0003](../adr/0003-two-layout-variants-user-overridable.md)
  the keyboard shows NiDA or Apple's macOS variant; it infers which from
  `event.code` paired with the character that key produced, and offers a
  persisted manual override that detection never overrules.

### The keyboard is a guide, never an input device

**Decided:** keys are not clickable and produce no text.

An earlier draft of this plan proposed a click-to-type mode, on the theory that it would unblock a user who hasn't configured a Khmer layout. It's cut. Clicking a key teaches nothing about key location, which is the entire skill being trained, and it forces an unanswerable question about whether clicked characters feed accuracy, per-sign stats, and speed history. Every answer is bad: count them and the heatmap is poisoned by a different motor action; exclude them and the mode is a toy that silently records nothing. Task 5 unblocks the unconfigured user instead, by teaching them to configure their layout.

---

## Task 5 — Wrong-layout fallback ✅

**Ticket:** [#16](https://github.com/BraedenKilburn/khmer-type/issues/16) — landed in `7bb4513` · **New:** `src/components/LayoutSetupPanel.vue`

**Blocked by:** nothing — can start immediately

**Shipped:** per-OS steps for macOS, Windows, and Linux, with the OS detected
only to pick the starting tab. The panel stays up while the problem does and
comes down on the first Khmer keystroke. PrimeVue's toast service went with the
toast — nothing else was using it.

Replace the dead-end toast with something actionable: when Latin input is detected, surface a short inline panel explaining how to add the Khmer keyboard on macOS / Windows / Linux, so the user can follow it, switch layouts, and start typing without leaving the app.

A panel that persists while the problem does, rather than a toast that expires in three seconds and takes the instructions with it.

---

## Task 6 — Per-sign stat capture ✅

**Ticket:** [#20](https://github.com/BraedenKilburn/khmer-type/issues/20) — landed in `682536f` · **New:** `src/composables/useStats.ts`, `src/lib/stats.ts`

**Blocked by:** Task 2 (`toSigns`) · **Blocks:** Task 7

**Shipped:** every keystroke files its expected sign, its correctness at the
moment pressed, and the wait before it. One correction to what this task
assumed: the wait before a drill's *first* keystroke is discarded rather than
recorded — it is the user reading, or away from the keyboard, and filing it as
hesitation would make every drill's opening sign look like a weakness.

Nothing on the internet tells a Khmer learner *which specific signs they fumble*. You'd be first.

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

Include subscript forms as distinct entries — typing `្ក` is a different motor skill from typing `ក`, and conflating them hides exactly the weakness a learner most needs to see.

Ends at a plain list of weakest signs on the completion dialog. That's enough to prove the pipeline end to end and to sanity-check the numbers before any of it gets tinted and charted.

**The sign-level aggregation is the part most likely to go quietly wrong** — a bug there produces a heatmap that looks plausible and is simply false. Test aggregation, subscript-vs-base separation, and the `localStorage` round-trip.

---

## Task 7 — Accuracy and hesitation heatmap ✅

**Ticket:** [#21](https://github.com/BraedenKilburn/khmer-type/issues/21) — landed in `196a518` · **New:** `src/components/StatsHeatmap.vue`

**Blocked by:** Task 6

**Shipped:** one hue light to dark from the app's own ramp, with magnitude
meaning *trouble* in both views so more colour always reads the same way; dark
mode gets its own steps rather than an automatic flip. Every cell prints its own
number, and an unattempted sign is a dashed outline, never a pale tint.

Render the 33 consonants in their traditional order, plus subscript forms, each tinted by performance. Two views worth having:

- **Accuracy** — error rate per sign
- **Hesitation** — average latency, which surfaces signs you get *right* but slowly. Often the more useful signal, and nobody visualizes it.

A sign with no attempts must read as unattempted, not as perfect — otherwise the heatmap congratulates a learner on every sign they've been avoiding.

> Consult `dataviz` skill guidance before building the heatmap.

---

## Task 8 — Romanization and gloss ❌ cut

**Ticket:** [#17](https://github.com/BraedenKilburn/khmer-type/issues/17) — **closed on scope, not built**

**Cut.** Romanization and an English gloss are language instruction, and they
pull the product towards teaching Khmer rather than teaching the keyboard. The
boundary v3 draws against "scope creep toward a language learning app" now sits
one notch tighter: no language support at all.

**What survived the cut:** the corpus migrating from `string[]` to objects. That
half is load-bearing for v3 — generated tags need somewhere to live and lessons
reference drills by id — and it shipped in v3 with `id` and `kind` and no
language fields. The rest of this section is kept for the reasoning, not as a
plan.

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

### Scope: schema and toggles only

**The 308-sentence content pass is not in v2 and is not tracked.** 308 sentences × 2 fields, and machine translation of Khmer is unreliable enough that it needs human review — an agent filling it unsupervised produces plausible-looking wrong data, which is worse than an empty field.

So the ticket ships the schema with `romanization`/`en` optional, populates a handful of drills as proof the display works, and hides a toggle's line when its field is absent. Content gets populated incrementally, out of band, whenever someone with the language is willing to sit down and do it.

Khmer romanization has no single universal standard (UNGEGN vs. ALA-LC vs. ad-hoc phonetic). Pick one, note the choice in the README, and stay consistent.

---

## Tests

Vitest, the segmentation tests, and the accuracy tests all landed in v1. v2's new logic is covered inside the ticket that introduces it rather than in a trailing test task — sign extraction in Task 2, layout completeness in Task 3, stat aggregation and the `localStorage` round-trip in Task 6.

The two that matter most: `្ក` is recorded as one sign distinct from `ក` (see [`CONTEXT.md`](../../CONTEXT.md)), and the per-sign aggregation is right.

---

## Definition of done

- [x] A user who has never typed Khmer can start learning without leaving the app
- [x] IME composition works on desktop; small viewports say so — landed in `39742ae`, not yet confirmed against a real Khmer IME
- [x] Sign strip shows per-sign progress inside a multi-sign cluster, without splitting the typing line
- [x] On-screen keyboard highlights the next key, with COENG clearly explained
- [x] Heatmap shows per-sign accuracy *and* hesitation, persisted across sessions
- [x] ~~Romanization and gloss toggles~~ — cut on scope, see Task 8
- [x] Test suite extended to cover per-sign stats and their persistence

**Not yet verified in a browser.** The strip, the keyboard, and the heatmap have
component tests but nobody has looked at them on screen, and the IME path is
still unexercised against a real Khmer input method.

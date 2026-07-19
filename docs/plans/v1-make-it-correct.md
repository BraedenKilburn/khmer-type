# v1 — Make It Correct, Then Ship It

**Goal:** fix the rendering bug that makes typing feel broken, fix two metric/wiring bugs, load a real Khmer font, and deploy. No new features.

**Outcome:** a live URL where typing Khmer feels smooth.

---

## Background: the bug

79% of the sentence corpus (244 of 308) contains **COENG (U+17D2)**, the invisible marker that stacks one consonant beneath another.

`សូមស្វាគមន៏!` decomposes to:

```
U+179F  ស   KHMER LETTER SA
U+17BC  ូ    KHMER VOWEL SIGN UU      (combining)
U+1798  ម   KHMER LETTER MO
U+179F  ស   KHMER LETTER SA
U+17D2  ្    KHMER SIGN COENG         (combining, invisible)
U+179C  វ   KHMER LETTER VO
...
```

`ស + ្ + វ` is **one visual glyph** — `វ` renders tucked underneath `ស`.

`TypingTrainer.vue:196-199` renders the sentence as three sibling spans split at the cursor:

```html
<span class="char-correct">{{ correctSubstring }}</span>
<span class="char-incorrect">{{ incorrectSubstring }}</span>
<span class="char-untyped">{{ untypedSubstring }}</span>
```

When the cursor sits between `ស` and `្វ`, those code points land in *different elements*. **Browsers cannot shape a ligature across element boundaries.** The stacked glyph shatters into loose parts and the line reflows — on nearly every keystroke, in 4 out of 5 sentences.

The `padding-bottom: 0.2em` descender hack at `TypingTrainer.vue:246` is a partial symptom of the same underlying issue.

---

## Task 1 — Grapheme-cluster segmentation

**Files:** `src/composables/useDrills.ts`, `src/components/TypingTrainer.vue` (assumes Task 7 has landed)

Use `Intl.Segmenter` (built in; Chrome 87+, Safari 14.1+, Firefox 125+; zero deps):

```ts
const segmenter = new Intl.Segmenter('km', { granularity: 'grapheme' })

export function toClusters(drill: string): string[] {
  return [...segmenter.segment(drill)].map((s) => s.segment)
}
```

Verified: `សូមស្វាគមន៏!` segments to 7 clusters, with `ស្វា` (U+179F U+17D2 U+179C U+17B6) held together as one. ICU applies Khmer conjunct tailoring, so COENG does not break the cluster.

Expose from `useDrills`, alongside the existing `currentDrill`:

```ts
const clusters = computed(() => toClusters(currentDrill.value))
```

### Rendering model

Keep `typedText` and `cursorIndex` as **code-unit** state — each keystroke still produces exactly one code point, so input handling is unchanged. Segmentation is a **render-time** concern only.

Build a computed that walks clusters and assigns each to one of four buckets by comparing against `typedText`:

| Bucket | Condition | Style |
|---|---|---|
| `correct` | cluster fully typed, matches target | normal text color |
| `incorrect` | cluster fully typed, does not match | red, bold |
| `active` | cursor falls *inside* this cluster | whole cluster, highlighted |
| `untyped` | cursor has not reached it | 50% opacity |

```ts
interface RenderCluster {
  text: string
  state: 'correct' | 'incorrect' | 'active' | 'untyped'
}

const renderClusters = computed<RenderCluster[]>(() => {
  const out: RenderCluster[] = []
  let offset = 0
  for (const text of clusters.value) {
    const end = offset + text.length
    let state: RenderCluster['state']
    if (cursorIndex.value >= end) {
      state = currentDrill.value.slice(offset, end) === typedText.value.slice(offset, end)
        ? 'correct'
        : 'incorrect'
    } else if (cursorIndex.value > offset) {
      state = 'active'
    } else {
      state = 'untyped'
    }
    out.push({ text, state })
    offset = end
  }
  return out
})
```

Template becomes one span per cluster:

```html
<span v-for="(c, i) in renderClusters" :key="i" :class="`char-${c.state}`">{{ c.text }}</span>
```

### Key design decision: don't color-split a partial cluster

When the user is midway through `ស្វ` (typed `ស`, still owes `្វ`), we render the **whole target cluster** with an `active` highlight rather than trying to color part of it. Any attempt to show partial progress *inside* a cluster reintroduces the exact split that causes the bug.

Progress within a cluster is communicated by the cursor position and the highlight — not by partial coloring. This is a deliberate tradeoff and the correct one: intra-cluster progress is not visually representable in Khmer without breaking shaping.

Style `active` as a subtle background tint or underline (not a color change), so the glyph reads normally while marking it as in-flight.

Recorded as [ADR-0001](../adr/0001-clusters-are-atomic.md). The missing intra-cluster feedback is a real gap, and the fix is the sign strip in [v2 Task 1](./v2-make-it-a-trainer.md#task-1--sign-decomposition-and-the-sign-strip) — feedback *beside* the typing line, never inside it. Don't attempt to close it here by colouring within a cluster; that reintroduces the exact bug v1 exists to fix.

### Extract the bucket logic as a pure function

`renderClusters` above is written as a computed inside `TypingTrainer.vue`, which cannot be unit tested. Extract it into `useDrills.ts` (or a sibling module) as a pure function, and let the component hold a thin computed that feeds it:

```ts
export function toRenderClusters(
  drill: string,
  typed: string,
  cursor: number,
): RenderCluster[]
```

Three arguments in, an array out, no Vue reactivity involved. The component becomes `computed(() => toRenderClusters(currentDrill.value, typedText.value, cursorIndex.value))`.

### Set up Vitest

There is no test runner in this repo. Add one here rather than in v2 — the segmentation logic is the highest-risk code in the whole project, and writing its tests while building it is far cheaper than reconstructing the cases later.

```sh
bun add -D vitest
```

Add a `"test": "vitest"` script. Vitest reads the existing `vite.config.ts`, so the `@` alias resolves with no extra configuration; switch that file's import to `defineConfig` from `vitest/config` to get types for a `test` block. These are pure-TypeScript tests over plain functions — no `jsdom`, no `@vue/test-utils`, no component mounting.

### Tests

`toClusters`:

- `ស្វា` is **one** cluster (U+179F U+17D2 U+179C U+17B6) — the case the entire fix exists for
- `សូមស្វាគមន៏!` is **7** clusters
- A doubly-stacked cluster (two COENGs, e.g. `ស្ត្រី`) stays whole
- A bare consonant, a consonant + dependent vowel, and a consonant + diacritic each cluster as expected
- Mixed Khmer / Latin / punctuation splits at the right boundaries
- Empty string yields an empty array
- **Invariant:** `toClusters(d).join('') === d` for every drill in the corpus — cheap, and catches any future segmentation change that drops or duplicates code points

`toRenderClusters`:

- Walk the cursor through **every** position `0..drill.length` of a drill containing `ស្វា` and assert the bucket for each cluster. The interesting positions are the ones *inside* the stack — cursor at 1, 2 and 3 code points into `ស្វា` must all yield `active` for that cluster, never a split.
- Cursor at 0 → every cluster `untyped`
- Cursor at end with matching input → every cluster `correct`
- A wrong keystroke inside a stacked cluster marks that whole cluster `incorrect`, not a partial

### Verify

Beyond the tests: type through `ស្វ` in `សូមស្វាគមន៏!` in the browser and confirm the subscript `វ` stays tucked under `ស` on every keystroke, with no reflow or glyph shatter. The tests prove the bucket assignment; only the eye proves the shaping.

---

## Task 2 — Keystroke-based accuracy

**File:** `src/components/TypingTrainer.vue:168-175`

Current implementation compares *final state*, so backspacing to fix a typo yields 100% accuracy. That is not what any typing trainer means by accuracy.

Add an error counter incremented at keystroke time in `handleKeydown`, right after a character is appended:

```ts
const totalKeystrokes = ref(0)
const errorKeystrokes = ref(0)

// inside handleKeydown, after typedText.value += key
totalKeystrokes.value++
if (key !== currentDrill.value[cursorIndex.value]) errorKeystrokes.value++
```

(Read `currentDrill[cursorIndex]` **before** incrementing `cursorIndex`.)

Then:

```ts
const accuracy = computed(() => {
  if (!totalKeystrokes.value) return 100
  return Math.round(((totalKeystrokes.value - errorKeystrokes.value) / totalKeystrokes.value) * 100)
})
```

Reset both counters in `resetTyping`.

### Does Backspace count as a keystroke?

**No.** Only character-producing keystrokes go into `total`. Backspace is a correction, not an attempt — counting it would mean fixing a typo costs you twice. The error already recorded stays recorded, which is the whole point of the change.

So typing `x`, `Backspace`, `ក` against the drill `ក` is 2 keystrokes, 1 error, 50%. Decide this explicitly now; it's the kind of thing that gets silently "corrected" later.

### Extract the tally, same as Task 1

The counters above are refs mutated inside `handleKeydown`, which is untestable for the same reason `renderClusters` was. Fold the sequence instead:

```ts
export interface KeystrokeTally {
  total: number
  errors: number
}

export function tallyKeystrokes(drill: string, keys: string[]): KeystrokeTally
export function accuracyFrom(tally: KeystrokeTally): number
```

`keys` is the raw sequence including `'Backspace'` entries. The component keeps the running tally; the function decides what it means.

### Tests

- `tallyKeystrokes('ក', ['ក'])` → 1 total, 0 errors → 100%
- `tallyKeystrokes('ក', ['x', 'Backspace', 'ក'])` → 2 total, 1 error → **50%**, the bug this task exists to fix
- Backspace at cursor 0 is a no-op and tallies nothing
- Trailing Backspaces don't change accuracy already earned
- An empty sequence → 100%, not a divide-by-zero
- A drill typed perfectly through a stacked cluster is 100% — the COENG keystroke counts like any other, per [ADR-0002](../adr/0002-speed-counts-keystrokes.md)

---

## Task 3 — Fix the modal reset wiring

**File:** `src/components/TypingTrainer.vue:218`

```html
@update:visible="resetTyping"
```

This fires on *any* visibility change, including open. It only works today because the modal is opened by the watcher at line 152 rather than by user action — fragile, and it breaks the moment a close button is added.

Bind the reset to the "Try Again" button explicitly instead. Emit a dedicated `restart` event from `TypingCompletion.vue` and handle that.

---

## Task 4 — Self-host a Khmer webfont

**Files:** `src/assets/main.css:29`, `package.json`

```css
font-family: 'Khmer OS Battambang', 'Moul', 'Arial', sans-serif;
```

Both Khmer faces are **local-only** — nothing is loaded. Visitors without them installed (most people) fall back to a system Khmer font or tofu boxes. `Moul` is also a decorative display face, wrong for body text.

Install a proper webfont — you already use this pattern in `ezra`:

```sh
bun add @fontsource/battambang
```

Import in `main.ts` and set the stack to `'Battambang', 'Noto Sans Khmer', sans-serif`. Drop `Moul`.

Font choice matters more than usual here: Khmer subscript rendering quality varies a lot between faces, and a bad one will look broken even after Task 1 is correct.

---

## Task 5 — Language attributes

**Files:** `index.html:2`, `src/components/TypingTrainer.vue`

- `<html lang="">` is empty → set `lang="en"`
- Add `lang="km"` to the typing area element

The `lang` attribute drives font selection and text shaping. Without it the browser guesses.

---

## Task 6 — Deploy

Nothing is live. A URL changes how this repo feels.

Static Vite build — Netlify, Vercel, or Cloudflare Pages all work with zero config. Your other projects sit on `*.braedenkilburn.com`, so `khmer-type.braedenkilburn.com` fits the pattern.

Add the live link to the repo description and `README.md` (currently three lines).

---

## Task 7 — Align names with the glossary

**Files:** `src/composables/useSentences.ts`, `src/data/khmerSentences.ts`, `src/components/TypingTrainer.vue`

[`CONTEXT.md`](../../CONTEXT.md) makes **Drill** the parent term — any typeable target — and **Sentence** a drill that happens to be a real sentence. v3 introduces drills like `ក ខ គ ឃ ង` that are explicitly not sentences. The code currently calls everything a sentence.

Pure rename, no behaviour change:

| Current | Becomes |
|---|---|
| `src/composables/useSentences.ts` | `src/composables/useDrills.ts` |
| `src/data/khmerSentences.ts` | `src/data/corpus.ts` |
| `useSentences()` | `useDrills()` |
| `khmerSentences` | `corpus` |
| `currentSentence` | `currentDrill` |
| `setNextSentence` | `setNextDrill` |

### Do this first

Task 1 substantially rewrites `useSentences.ts` and the render block in `TypingTrainer.vue` — the same two files this task renames. Landing the rename **before** Task 1 means the segmentation work is written in final names; landing it after means renaming code you just wrote, twice over.

So despite the number: **Task 7 first, then Task 1.** It's mechanical and takes minutes. Tasks 2–6 don't touch these names and can go in any order.

### Why now rather than in v3

The composable is 36 lines with a single consumer today. By v3 it's load-bearing for the lesson engine, and the rename collides with new code instead of preceding it. This is the cheapest this change will ever be.

---

## Explicitly out of scope

- **Mobile / IME support.** `window.addEventListener('keydown')` at line 138 reads physical keys. Mobile keyboards and IME composition emit `event.key === 'Process'` or `'Unidentified'` and will not work. Desktop-only is a fine v1. Deferred to [v2](./v2-make-it-a-trainer.md).
- On-screen keyboard, persistence, lessons — v2/v3.

---

## Definition of done

- [ ] Typing through a COENG cluster produces no glyph shatter or reflow
- [ ] Backspace-to-fix lowers accuracy below 100%
- [ ] "Try Again" reset is bound to the button, not a visibility side effect
- [ ] Khmer font loads for a visitor with no Khmer fonts installed
- [ ] No `sentence` identifier remains where the glossary means `drill`
- [ ] `toClusters`, `toRenderClusters`, and `tallyKeystrokes` are pure, exported, and covered by tests
- [ ] `bun run build`, `bun run lint`, and `bun run test` pass
- [ ] Live URL in the README

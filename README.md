# Khmer Type

A typing trainer that teaches the Khmer keyboard layout.

**[Try it live → khmer-type.pages.dev](https://khmer-type.pages.dev/)**

Khmer text stacks and combines in ways Latin text does not — `ស្វា` is a single
visual unit built from four keystrokes, one of which (COENG) renders no glyph at
all. Khmer Type teaches the layout rather than assuming it:

- **A graded curriculum** — 21 lessons from single consonants to full sentences,
  gated on accuracy and never on speed. Nothing is ever locked; an unfinished
  prerequisite is a label, not a barrier.
- **Free practice** — random sentences, the original experience, still at `/`.
- **An on-screen keyboard** that highlights the next key, in whichever Khmer
  layout you are actually on. NiDA and Apple's macOS variant disagree on ten
  keys including the spacebar, so the app works out which you have from your
  typing and lets you overrule it.
- **A sign strip** that decomposes the cluster you are inside, so a half-typed
  `ស្វា` can say which sign is next — including COENG, which is invisible.
- **A per-sign heatmap** of accuracy *and* hesitation: the signs you get right
  but slowly, which nothing else shows you.
- **Targeted practice** weighted towards the signs you measurably fumble.

It is desktop-only on purpose: a phone touch keyboard trains a different motor
skill.

Speed is counted in keystrokes rather than clusters, and accuracy is judged at
the moment each keystroke lands — correcting a typo does not restore it. There
is no romanization or English gloss, deliberately: this teaches the keyboard,
not the language. The reasoning behind those choices lives in
[`docs/adr/`](docs/adr/), the roadmap in [`docs/plans/`](docs/plans/), and the
project's vocabulary in [`CONTEXT.md`](CONTEXT.md).

## Local development

Requires [Bun](https://bun.sh/).

```sh
bun install
bun run dev
```

The dev server prints a local URL to open.

## Tests

```sh
bun run test        # single run
bun run test:watch  # re-run on change
```

## Other scripts

```sh
bun run type-check  # vue-tsc
bun run lint        # oxlint + eslint, both with --fix
bun run format      # prettier over src/
bun run build       # type-check and production build
bun run tag-drills  # regenerate src/data/drillTags.ts after editing the corpus
```

The macOS layout table is dumped from the OS rather than transcribed, by
`scripts/dump-macos-layout.swift`. Re-run it only if Apple changes the layout:

```sh
swiftc -O scripts/dump-macos-layout.swift -o dump-khmer && ./dump-khmer
```

## Deployment

`main` deploys automatically to [Cloudflare Pages](https://khmer-type.pages.dev/)
on every push.

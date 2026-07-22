# Drill analysis and render state stay apart

## Status

Accepted, 2026-07-21.

## Context

`@/lib/drillAnalysis` and `@/lib/clusters` sit next to each other and look like
one module that got split. `clusters` is small — three exports over about thirty
lines — and it used to restate two of `DrillCluster`'s fields, doc paragraph and
all. An architecture review proposed folding `toRenderClusters` and `classify`
into `drillAnalysis` and deleting `clusters` outright.

## Decision

They stay apart.

The two answer different questions, and only one of the answers is stable:

- `drillAnalysis` says **what a drill is made of** — its clusters, its signs, and
  which sign each keystroke is aimed at. A drill's text does not change while it
  is being typed, which is what lets the analysis be cached and keyed by the text
  itself.
- `clusters` says **how far through it you are** — a function of what has been
  typed and where the cursor sits, which changes on every keystroke and can never
  be cached.

Merging them would put a per-keystroke function behind a module whose contract is
"this is cached by drill text", which is exactly the kind of thing a later reader
gets wrong. And `classify` is not a pass-through: delete `clusters` and its dozen
lines of state logic go back into the component they came from, where nothing
tested them.

The duplication the review found was real and was fixed without merging:
`RenderCluster` now extends `DrillCluster`, so `text` and `start` are defined
once.

## Consequences

- `clusters` stays a small module. Small is not the same as shallow: its
  interface is three exports and its implementation is the one statement of what
  state a cluster is in.
- Anything needing both a cluster's identity and its render state gets both from
  `RenderCluster`, which is now literally the analysis plus a state.
- If a third question about clusters ever appears that is neither "what is this
  drill" nor "how far through it am I", revisit — three modules would be worse
  than two.

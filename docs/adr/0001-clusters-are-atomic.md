# Clusters are atomic within a shaped run

Browsers cannot shape a ligature across element boundaries, so splitting a cluster into differently-styled spans shatters the glyph and reflows the line. 79% of the corpus contains COENG, so this happens on nearly every keystroke. We therefore render one element per cluster on the typing line and never split one — a cluster the user is partway through is highlighted whole rather than coloured part-correct.

## Scope of the constraint

This binds **a single shaped run**, not the page. Rendering the same cluster a second time, decomposed into its signs, is unconstrained: each sign becomes its own run with no ligature to break. Intra-cluster progress is therefore *not* representable inline, but *is* representable out of line — see the sign strip in [v2 Task 2](../plans/v2-make-it-a-trainer.md#task-2--sign-decomposition-and-the-sign-strip).

## Consequences

On the typing line, when the user has typed `ស` of `ស្វា` and still owes three keystrokes, the whole cluster reads as in-flight; position within it is communicated by the cursor and the strip, never by partial colouring. This looks like missing feedback and will invite a "fix" that reintroduces the shattering. Add feedback beside the line, not inside it.

Style the in-flight state with a background tint or underline, not a colour change, so the glyph itself renders normally.

Inline colouring could not have solved this even if shaping allowed it: COENG produces no glyph, so the single most confusing keystroke on the layout would show no visible change. Out-of-line decomposition can give it a discrete, labelled unit — which is why the strip is the better answer and not a workaround.

# Khmer Type — Plans

| Plan | Goal | Nature of the work |
|---|---|---|
| [v1 — Make It Correct](./v1-make-it-correct.md) | Fix the rendering bug that makes typing feel broken; ship it live | Small, well-understood engineering |
| [v2 — Make It a Trainer](./v2-make-it-a-trainer.md) | Teach the Khmer layout instead of assuming it | The differentiating work |
| [v3 — Graded Progression](./v3-progression.md) | A curriculum from zero to full sentences | Mostly Khmer content authoring |

**Status:** v1 and v2 have shipped. v2's tickets were [#14](https://github.com/BraedenKilburn/khmer-type/issues/14) – [#22](https://github.com/BraedenKilburn/khmer-type/issues/22), which are authoritative on scope; the plan documents hold the reasoning behind them. [#17](https://github.com/BraedenKilburn/khmer-type/issues/17) (romanization and gloss) was closed on scope rather than built — this is a typing trainer, not a language course.

v3 has shipped: tagging, 117 beginner exercises, 22 lessons, adaptive practice, and routing. Every task in all three plans is done.

The exercises are key-location drills — sequences, not sentences, which is what v3 Task 2 asked for and why they could be generated. Adding *more real Khmer sentences* would still improve the corpus and is not agent work; it is optional and tracked in that task rather than pending in it.

**Not yet verified in a browser.** Everything below has tests and nothing has been looked at on screen. The IME path in particular has never met a real Khmer input method.

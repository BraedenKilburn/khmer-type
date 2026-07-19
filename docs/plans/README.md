# Khmer Type — Plans

| Plan | Goal | Nature of the work |
|---|---|---|
| [v1 — Make It Correct](./v1-make-it-correct.md) | Fix the rendering bug that makes typing feel broken; ship it live | Small, well-understood engineering |
| [v2 — Make It a Trainer](./v2-make-it-a-trainer.md) | Teach the Khmer layout instead of assuming it | The differentiating work |
| [v3 — Graded Progression](./v3-progression.md) | A curriculum from zero to full sentences | Mostly Khmer content authoring |

**Status:** v1 has shipped. v2 is broken into tickets [#14](https://github.com/BraedenKilburn/khmer-type/issues/14) – [#21](https://github.com/BraedenKilburn/khmer-type/issues/21), which are authoritative on scope; the plan document holds the reasoning behind them.

**Suggested order:** start with the hidden-input migration ([#14](https://github.com/BraedenKilburn/khmer-type/issues/14)) — it's a prefactor the sign strip and stat capture both sit on. The layout research ([#15](https://github.com/BraedenKilburn/khmer-type/issues/15)), the wrong-layout panel ([#16](https://github.com/BraedenKilburn/khmer-type/issues/16)), and the corpus schema change ([#17](https://github.com/BraedenKilburn/khmer-type/issues/17)) are independent and can run alongside it. Reassess before starting v3 — see the risks section there.

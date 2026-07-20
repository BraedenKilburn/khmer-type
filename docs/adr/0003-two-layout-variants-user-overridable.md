# Both layout variants ship, and the user can always override detection

"The Khmer keyboard" is not one layout. NiDA — the design published by Cambodia's National Information Communications Technology Development Authority — is what Windows ships as "Khmer (NIDA)" and Linux ships as `xkb kh(basic)`; those two agree on `base` and `shift` for all 48 keys. macOS ships something else under the name "Khmer", and it differs on 10 of those 48 keys, 22 once AltGr counts. The divergences are not obscure: Space swaps ZWSP and the plain space, `Slash`+Shift gives `?` on NiDA and `ឯ` on Apple's, and `Backslash` transposes `ឮ` and `ឭ`.

So we ship both tables, guess which one the user is on, and let them say we guessed wrong.

A single table was the tempting answer and it is wrong in both directions. Shipping NiDA only puts a lying keyboard in front of every macOS learner who used the input source their OS already offered — on the spacebar, the most-pressed key on the board. Shipping Apple's only breaks Windows and Linux, and teaches a layout that is not the national standard.

## Detection is inferred from keystrokes, not asked of the browser

`navigator.keyboard.getLayoutMap()` looks like the answer and is not. It is Chromium-only — no Safari, no Firefox — and it holds a negative standards position from at least one vendor, so it is unlikely to ever be baseline. The population it fails is exactly the population this decision exists for: macOS users, who are the ones on the divergent layout and disproportionately on Safari. MDN does not specify what it returns for non-Latin layouts either, so even where it exists we would be trusting unspecified behaviour.

We already have better data. The trainer's `keydown` handler sees `event.code` — the physical key — and `beforeinput` delivers the character that key actually produced. Pair those and the active layout identifies itself from real typing, in every browser, with no new API. The 10 divergent keys are the discriminators, and `Space` is one of them, so the answer usually arrives within the first few keystrokes of the first drill.

## Consequences

Detection is passive, so it is unavailable until the user has typed something, and the keyboard has to render *some* variant before it knows. It will therefore be wrong for the first few keystrokes of a session for the minority who need the non-default table. Do not fix that by blocking the UI on a detection prompt before the user has typed a word — pick a default, correct it silently when the evidence arrives, and make the override easy to find.

The override is authoritative and persists. Once a user has set it, detection must never quietly overrule them; a learner who has deliberately installed a NiDA layout on a Mac is precisely the person automatic detection will misread, and having their choice reverted mid-session is worse than never detecting at all.

Two tables mean two tables to maintain, and the temptation will be to "fix" a divergent entry in one to match the other. Every such entry is verified against a cited primary source; a mismatch between the tables is the point, not a bug. `src/data/khmerLayout.ts` is NiDA and stays NiDA.

Both tables inherit the ligature keys and the one-code-point keystroke rule from [ADR-0002](./0002-speed-counts-keystrokes.md), which is unaffected — the variants disagree about which key emits a sign, never about what a keystroke is.

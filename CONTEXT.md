# Khmer Type

A typing trainer that teaches the Khmer keyboard layout. Khmer text stacks and combines in ways Latin text does not, so this project needs precise language for "how much text is that" — three different counts are all defensible, and conflating them produces wrong measurements and broken rendering.

## The script

**Cluster**:
The indivisible visual unit — one or more code points that the browser shapes into a single glyph. `ស្វា` is one cluster.
_Avoid_: Character, grapheme, glyph

**Sign**:
The smallest teachable unit: a base consonant, a subscript consonant, a dependent vowel, or a diacritic. The unit skill is measured in. `ក` and `្ក` are different signs.
_Avoid_: Character, symbol

**COENG**:
The invisible sign that stacks the following consonant beneath the preceding one. Occupies a key and a keystroke but renders no glyph of its own.
_Avoid_: Subscript marker, stacker

**Base consonant**:
A consonant in its full, on-the-line form. `ក`
_Avoid_: Letter

**Subscript consonant**:
A consonant tucked beneath a base consonant, written as COENG followed by that consonant. `្ក`
_Avoid_: Stacked consonant, subconsonant, coeng form

**Dependent vowel**:
A vowel sign that attaches to a consonant and cannot stand alone. `ូ`
_Avoid_: Vowel mark, diacritic

**Diacritic**:
A mark modifying pronunciation or register, distinct from a dependent vowel. `៏`
_Avoid_: Accent, sign

## What you type

**Drill**:
Any typeable target presented to the user. The parent term — every practice target is a drill.
_Avoid_: Exercise, prompt, text

**Sentence**:
A drill that is a real Khmer sentence. A drill like `ក ខ គ ឃ ង` is not a sentence.
_Avoid_: Phrase, line

**Corpus**:
The full collection of drills the app can draw from.
_Avoid_: Dataset, sentence list, bank

**Lesson**:
An ordered group of drills that introduces a set of signs for the first time, with prerequisites and a pass threshold.
_Avoid_: Level, unit, module

## Measurement

**Keystroke**:
One key press producing one code point. The unit of speed. `ស្វា` is four keystrokes.
_Avoid_: Character, keypress, input

**Accuracy**:
The proportion of keystrokes that were correct when pressed. Corrections do not restore accuracy — a keystroke's correctness is fixed at the moment it happens.
_Avoid_: Correctness, score

**Hesitation**:
Elapsed time before a keystroke, tracked per sign. Surfaces signs the user gets right but slowly.
_Avoid_: Latency, delay, speed

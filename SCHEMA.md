# Lesson JSON Schema

This document defines the shape of every `lesson_NN.json` file in the `data/`
folder. Keep this consistent so the app code can render any lesson without
special-casing.

## Top-level structure

```json
{
  "lesson_number": <int>,
  "title": "<English title>",
  "title_ro": "<Romanian title>",
  "blocks": [ <block>, <block>, ... ],
  "exercises": [ <exercise>, <exercise>, ... ]
}
```

A lesson is a sequence of **content blocks** followed by **exercises**.
Each block has an `id` (e.g. `"l1-b3"`) and a `type` that determines how the
app renders it.

## Block types

### `intro`
Quick orientation at the start of a lesson.
```json
{ "id": "...", "type": "intro", "title": "...", "items": [{"ro":"...","en":"..."}] }
```

### `alphabet`
The Romanian alphabet (or any letter list).
```json
{ "id": "...", "type": "alphabet", "title": "...", "letters": ["A","Ă",...], "note": "..." }
```

### `pronunciation_rule`
Used for any pronunciation rule with examples. Two shapes are accepted:

**Shape A — letter-based rule** (e.g. î vs â):
```json
{
  "id": "...", "type": "pronunciation_rule", "title": "...",
  "rules": [
    { "letter": "î", "where": "...", "examples": [{"ro":"...","en":"..."}] }
  ],
  "exception": { "title": "...", "description": "...", "examples": [...] }
}
```

**Shape B — letter-group rule** (e.g. ce/ci/ge/gi):
```json
{
  "id": "...", "type": "pronunciation_rule", "title": "...",
  "groups": [
    { "group": "ce", "sound_note": "...", "examples": [{"ro":"...","en":"..."}] }
  ]
}
```

**Shape C — written-vs-spoken pairs** (e.g. 'ie' tip):
```json
{
  "id": "...", "type": "pronunciation_rule", "title": "...",
  "description": "...",
  "examples": [{ "written": "Eu", "pronounced": "Ieu" }]
}
```

### `vocab_set`
A list of words/phrases on a theme.
```json
{
  "id": "...", "type": "vocab_set", "title": "...",
  "category": "greetings | time | food | politeness | family | ...",
  "items": [{ "ro": "...", "en": "...", "note": "(optional)" }],
  "usage_examples": [{ "ro": "...", "en": "..." }],   // optional
  "note": "..."                                         // optional
}
```

### `qa_set`
Question-and-answer pairs (e.g. "How old are you?" + valid replies).
```json
{
  "id": "...", "type": "qa_set", "title": "...",
  "items": [{
    "question_ro": "...", "question_en": "...",
    "answers": [{ "ro": "...", "en": "..." }],
    "rules": ["..."]   // optional bullet list of grammar rules
  }]
}
```

### `phrase_highlight`
A small set of important phrases worth memorizing.
```json
{ "id": "...", "type": "phrase_highlight", "title": "...",
  "items": [{ "ro": "...", "en": "..." }] }
```

### `comparison`
Compare 2+ similar phrases/concepts side-by-side (e.g. ce faci? vs cum ești?).
```json
{
  "id": "...", "type": "comparison", "title": "...",
  "items": [{
    "phrase": "...", "meaning": "...", "focus": "...",
    "answers": [{ "ro": "...", "en": "..." }]
  }]
}
```

### `verb_conjugation`
A full conjugation table.
```json
{
  "id": "...", "type": "verb_conjugation", "title": "...",
  "infinitive_ro": "a fi", "infinitive_en": "to be",
  "tense": "present | past | future | ...",
  "forms": [
    { "pronoun": "Eu", "affirmative": "sunt", "negative": "nu sunt", "short": "nu-s" }
  ]
}
```

### `table`
A generic 2+ column table (e.g. pronouns).
```json
{
  "id": "...", "type": "table", "title": "...",
  "columns": ["Romanian", "English"],
  "rows": [["Eu","I"], ["Tu","You"]]
}
```

### `grammar_concept`
Multi-section grammar explanation (e.g. tu vs dumneavoastră, sentence types).
```json
{
  "id": "...", "type": "grammar_concept", "title": "...",
  "description": "...",
  "sections": [{
    "name": "Affirmative", "name_ro": "Afirmativ",
    "rule": "...", "structure": "...",
    "used_with": ["..."],
    "verb_form": "...",
    "examples": [{ "ro": "...", "en": "..." }],
    "verb_examples": ["..."]
  }],
  "general_rule": "...",
  "key_difference": "..."
}
```
Every field inside `sections` is optional — use whatever fits the concept.

### `dialogue`
A scripted conversation with translation.
```json
{
  "id": "...", "type": "dialogue", "title": "...", "title_ro": "...",
  "speakers": ["Ionuț", "Alina"],
  "lines": [{ "speaker": "Ionuț", "ro": "...", "en": "..." }]
}
```

## Exercises

Exercises live in a top-level `exercises` array. Each exercise has an `id`
and a `type`.

### `multiple_choice`
```json
{ "id": "...", "type": "multiple_choice", "prompt": "...",
  "choices": ["A","B","C"], "answer": "B", "explanation": "..." }
```

### `fill_blank`
```json
{ "id": "...", "type": "fill_blank", "prompt": "Complete: Eu _____ student.",
  "answer": "sunt", "alternative_answers": ["..."], "explanation": "..." }
```

### `translate_to_ro` / `translate_to_en`
```json
{ "id": "...", "type": "translate_to_ro",
  "prompt": "What's your name?",
  "answer": "Cum te cheamă?",
  "alternative_answers": ["Cum te numești?"] }
```

### `transform`
"Make this negative", "Convert to plural", etc.
```json
{ "id": "...", "type": "transform",
  "prompt": "Make negative: Eu sunt obosit.",
  "answer": "Eu nu sunt obosit.", "explanation": "..." }
```

### `match`
```json
{ "id": "...", "type": "match", "prompt": "Match phrase to meaning",
  "pairs": [{ "left": "Ce faci?", "right": "How are you?" }] }
```

## Conventions

- All Romanian text uses proper diacritics: ă, â, î, ș, ț (not s,/t,).
- IDs follow pattern `l<lesson_number>-b<block_number>` for blocks and
  `l<lesson_number>-ex<exercise_number>` for exercises.
- Optional fields can be omitted entirely; do not include `null`.
- When a teacher's lesson contains an image with content (a chart, vocab
  card, illustrated example), extract the content into the appropriate
  block type rather than referencing the image.

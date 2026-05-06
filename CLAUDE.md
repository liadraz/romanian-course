# Romanian Learning App

## What this app does
A personal, interactive web app for learning Romanian — built around weekly private lessons.
Lessons are authored as structured JSON files and rendered as rich interactive blocks. The app
supports reading, vocabulary review, audio pronunciation, stories/dialogue practice, and spaced
exercises with progress tracking — all with no framework, no build step, and no backend.

## Tech stack
- Language: Vanilla JavaScript (ES modules)
- Framework: None — hand-rolled routing and rendering
- Database: None — `localStorage` for progress state; JSON files for lesson data
- Hosting: GitHub Pages (static) — https://liadraz.github.io/romanian-project
- Audio: Web Speech API (`ro-RO`) — upgrade path to Google Cloud TTS Neural2 planned

## Project structure
```
romanian-project/
├── index.html          ← single-page shell; loads app.js
├── css/
│   └── styles.css      ← all styles; CSS variables for theming
├── js/
│   ├── app.js          ← hash-based routing, sidebar, lesson lifecycle
│   ├── render.js       ← tab renderers (home, vocabulary, learn, practice, stories)
│   ├── blocks.js       ← 11 block type renderers
│   ├── exercises.js    ← practice engine (flashcards, text input, multiple choice, match, auto-gen)
│   ├── audio.js        ← Web Speech API TTS, ro-RO voice detection + warning
│   ├── data.js         ← JSON loader (fetch with cache: no-store)
│   └── state.js        ← localStorage progress; dispatches romanian:progress events
└── data/
    ├── lessons.json    ← lesson manifest (id, title, file path)
    ├── lesson_01.json  ← Alphabet, Pronunciation & Greetings
    └── lesson_02.json  ← Pronouns, A fi, A avea, Daily Vocabulary
```

## Routing
Hash-based: `#/lesson/N/tab` where tab ∈ {`vocabulary`, `learn`, `practice`, `stories`}

| Route | View |
|---|---|
| `#/` or empty | Home page |
| `#/lesson/N/vocabulary` | Vocabulary tab (default when opening a lesson) |
| `#/lesson/N/learn` | Learn tab — all content blocks |
| `#/lesson/N/practice` | Practice tab — Flashcards / Exercises / Mix |
| `#/lesson/N/stories` | Stories tab — new words + dialogue + prose story |
| `#/all-exercises` | Cumulative shuffled practice from all opened lessons |

## Conventions
- No build step, no bundler — files must be valid ES modules runnable via `python -m http.server`
- Default tab when opening a lesson: `vocabulary` (not `learn`)
- All lesson links in sidebar and home cards point to `#/lesson/N/vocabulary`
- Lenient answer checking: trim + lowercase + strip trailing `[.,!?…]+`; diacritics ARE required
- Fuzzy answer checking: Levenshtein distance, tolerance = `floor(word.length / 5)` per word (min 0)
- Progress stored in `localStorage` key `romanian-app-state-v1` with shape:
  `{ openedLessons: [], attemptedExercises: [], correctExercises: [] }`
- Never change localStorage key names — breaks existing user progress
- Sidebar progress event: `window.dispatchEvent(new CustomEvent('romanian:progress'))`
- Never use `innerHTML` with user-supplied strings — always use `createElement` / `textContent`
- CSS classes follow BEM-ish naming: `block`, `block-header`, `vocab-tab-row`, etc.
- All new UI uses CSS variables from `:root` in `styles.css` — never hardcode colours

## Lesson JSON structure
Top-level keys per lesson file:

| Key | Purpose |
|---|---|
| `lesson_number` | Integer, matches manifest |
| `title` | English title |
| `title_ro` | Romanian title (optional) |
| `blocks[]` | Content blocks rendered in Learn tab — **do not change existing block schemas** |
| `exercises[]` | Hand-authored exercises for the Practice tab |
| `stories` | New top-level key — see Stories section below |
| `dialogue_practice` | Legacy key — kept for reference; use `stories` instead |

### `stories` key schema
```json
{
  "stories": {
    "title": "...",          // Romanian title of the story/dialogue
    "title_en": "...",       // English translation of title
    "speakers": ["A", "B"],  // Speaker names for bubble layout
    "new_words": [{ "ro": "...", "en": "...", "note": "..." }],  // 8–10 simple words
    "dialogue": [{ "speaker": "...", "ro": "...", "en": "..." }],
    "story": "...",          // Short Romanian paragraph
    "story_en": "..."        // English translation of the story
  }
}
```
Render order: New Words (vocab cards) → Dialogue (chat bubbles) → Story (prose).
Hide English toggle covers all three sections.

## Block types (lesson JSON → rendered UI)
| Type | Description |
|---|---|
| `intro` | Lesson overview bullet list |
| `alphabet` | Letter grid with special character highlighting |
| `pronunciation_rule` | Letter rules, sound groups, written/pronounced pairs |
| `vocab_set` | Vocabulary cards with usage examples |
| `qa_set` | Question + answer pairs |
| `phrase_highlight` | Key phrases |
| `comparison` | Side-by-side phrase comparison |
| `dialogue` | Chat-bubble style inline dialogue (in Learn tab) |
| `table` | Generic data table (e.g. pronouns) |
| `verb_conjugation` | Conjugation table: affirmative / negative / colloquial |
| `grammar_concept` | Multi-section grammar explanation (3 shape variants) |

## Exercise types
**Hand-authored** (in `exercises[]`):
`fill_blank` · `transform` · `translate_to_ro` · `translate_to_en` · `multiple_choice` · `match`

**Auto-generated** (runtime, from `vocab_set` blocks, not persisted to JSON):
- `translate_to_ro` — "Translate to Romanian: [en]"
- `translate_to_en` — "What does '[ro]' mean in English?"
- IDs: `l{N}-auto-{blockId}-ro-{i}` / `l{N}-auto-{blockId}-en-{i}`
- Auto exercises do NOT affect `isLessonComplete` — only hand-authored ones count

## Practice tab sub-modes
Three mode buttons at top: **Flashcards · Exercises · Mix**

| Mode | Content |
|---|---|
| Flashcards | Flip cards from all `vocab_set` items; click to reveal English |
| Exercises | Hand-authored + auto-generated exercises in sequence |
| Mix | All exercises shuffled together |

Session features:
- **Skip for now**: appends current exercise to end of queue; skipped counter shown in progress bar
- **Answer reveal**: after every submission (right or wrong), shows correct answer + translation
- **Fuzzy checking**: tolerates minor typos based on word length

## Vocabulary tab sub-tabs
Two pill-style sub-tabs: **Words · Sentences & Phrases**

- **Words**: `vocab_set` items whose Romanian string is 1–2 words
- **Sentences & Phrases**: 3+ word items, plus all `qa_set`, `phrase_highlight`, `comparison`, and `intro` items
- Row layout: Romanian · 🔊 · English — single line, no wrap, on all screen sizes

## Home page (`#/`)
- Hero: 🇷🇴 flag, "Limba Română" heading, subtitle, All Exercises + Flashcards buttons
- Grid of lesson cards: lesson number, title, progress bar (correct/total exercises), 4 shortcut links
- Sidebar stays visible; home button "🇷🇴 Limba Română" at top of sidebar navigates to `#/`

## UI components
- **Back to top button**: appears at the bottom of every view; scrolls smoothly to top
- **Hide English toggle**: available on Stories tab (covers new words, dialogue, story prose)
- **🔊 speak buttons**: on vocabulary rows, story new-word cards, dialogue bubbles
- **No-voice warning**: shown async if `ro-RO` TTS voice is not installed

## What's built
- [x] Phase 1: Lesson renderer — all 11 block types, Learn tab
- [x] Phase 2: Practice mode — per-lesson, one exercise at a time, retry/next, progress
- [x] Phase 3: All Exercises — shuffled mix from all lessons, Shuffle Again on complete
- [x] Phase 4: Sidebar progress — X/N counter, ✓ badge on completion
- [x] Phase 5: Dialogue tab (now Stories tab) — bubble layout, Hide English toggle
- [x] Phase 6: Vocabulary tab — Words / Sentences sub-tabs, 🔊 buttons, one-line rows
- [x] Phase 7: Audio — Web Speech API ro-RO, 🔊 buttons, no-voice warning banner
- [x] Phase 8: GitHub Pages — live at https://liadraz.github.io/romanian-project
- [x] Phase 9: Home page — hero, lesson card grid, shortcut buttons, progress bars
- [x] Phase 10: Stories tab — new words + dialogue + prose story per lesson
- [x] Phase 11: Practice upgrade — Flashcards, fuzzy checking, Skip, auto-generated exercises
- [x] Phase 12: Back to top button on every page

## Current phase
Open — ready for next features (see Roadmap below)

## Roadmap / future phases
- [ ] Google Cloud TTS Neural2 (`ro-RO-Neural2`) — consistent audio on all devices
- [ ] Lesson 3+ — add new lessons as teacher provides material
- [ ] Spaced repetition — flag weak words, resurface them in practice
- [ ] Textbook chapter integration
- [ ] Short story generator — uses only vocabulary covered in opened lessons

## Do not touch
- `lessons-source/` — teacher's original PDFs, gitignored, never commit
- Existing block renderer signatures in `blocks.js` — new block types must be additive
- `state.js` localStorage key names — changing breaks existing user progress
- `blocks[]` array in lesson JSONs — only add new top-level keys alongside it

## Key decisions
- **No framework**: keeps the app deployable as a static folder with zero tooling; easy to understand and maintain solo
- **JSON lesson format**: structured data (not markdown) allows reliable extraction for vocabulary tab, exercises, and future features
- **Fuzzy checking with diacritics required**: diacritics are the hard part of Romanian; we enforce them but tolerate minor typos in long words
- **Web Speech API first**: free, zero-config; upgrade to Neural2 later without touching UI code — `audio.js` is the only module that changes
- **Auto-generated exercises**: supplements hand-authored exercises to keep practice count high (40+) without authoring overhead
- **`stories` key alongside `dialogue_practice`**: keeps backward compat; `dialogue_practice` is legacy

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
│   ├── styles.css      ← all styles; CSS variables for theming
│   └── book.css        ← book reader styles (two-panel shell, step kinds, mobile)
├── js/
│   ├── app.js          ← hash-based routing, sidebar, lesson lifecycle
│   ├── render.js       ← tab renderers (home, vocabulary, learn, practice, stories)
│   ├── blocks.js       ← 11 block type renderers
│   ├── exercises.js    ← practice engine (flashcards, text input, multiple choice, match, auto-gen)
│   ├── audio.js        ← Web Speech API TTS, ro-RO voice detection + warning
│   ├── data.js         ← JSON loader (fetch with cache: no-store)
│   ├── state.js        ← localStorage progress; dispatches romanian:progress events
│   ├── book.js         ← book reader shell, renderBookShell(), book progress (localStorage key: bookProgress)
│   └── book-steps.js   ← step kind renderers: vocabulary, dialogue, grammar, verbs, exercise
└── data/
    ├── lessons.json    ← lesson manifest (id, title, file path)
    ├── lesson_01.json  ← Alphabet, Pronunciation & Greetings
    ├── lesson_02.json  ← Pronouns, A fi, A avea, Daily Vocabulary
    ├── book.json       ← book chapter manifest ({ chapters: [{n, title, title_en, file, step_count}] })
    └── book_01.json    ← Colloquial Romanian Chapter 1: Bună ziua (16 steps)
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
| `#/book/N/S` | Book reader — chapter N, step S (defaults to 1) |

## Conventions
- No build step, no bundler — files must be valid ES modules runnable via `python -m http.server`
- Default tab when opening a lesson: `vocabulary` (not `learn`)
- All lesson links in sidebar and home cards point to `#/lesson/N/vocabulary`
- Answer checking: trim + lowercase + normalize Romanian diacritics (î→i, ă/â→a, ș→s, ț→t) + strip all non-letter non-space characters; diacritics are **not** required
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
- "My Lessons" grid: lesson number, title, progress bar (correct/total exercises), 4 shortcut links
- "📖 Textbook" grid: one card per chapter with step progress bar and "Start chapter →" button
- Sidebar: "🇷🇴 Limba Română" home button at top; "📖 Textbook" section with chapter links below lessons

## UI components
- **Back to top button**: appears at the bottom of every view; scrolls smoothly to top
- **Hide English toggle**: available on Stories tab and book Dialogue steps
- **🔊 speak buttons**: on vocabulary rows, story new-word cards, dialogue bubbles, book grammar example tables, book verb conjugation rows
- **No-voice warning**: shown async if `ro-RO` TTS voice is not installed

## Book reader (`#/book/N/S`)
Two-panel layout — entirely separate from lesson tabs:

**Left panel (210px):** chapter title + scrollable step list. Each item shows step number (or ✓ if complete), title, and a color-coded kind pill. On mobile (≤700px) this collapses to an overlay opened via "☰ Contents".

**Right panel:** breadcrumb, thin green progress bar (completed steps / total), step content, bottom nav (`← Back` / X of Y / `Next →`). Next button is always enabled — exercise steps still mark complete via the session's onComplete callback but navigation is never blocked.

**Step kinds:**
| Kind | Badge color | Content |
|---|---|---|
| `vocabulary` | Coral | 2-col word card grid with 🔊 |
| `dialogue` | Green | Scene context + chat bubbles + Hide English + 🔊 per line + 🔊 full scene |
| `grammar` | Purple | Explanation + examples table (🔊 per row) + optional callout + optional extra examples |
| `verbs` | Purple | Intro + one conjugation table per verb (pronoun / Romanian 🔊 / English) |
| `exercise` | Amber | Inline session: one item at a time; types: `translate_to_ro`, `translate_to_en`, `fill_blank`, `transform`, `multiple_choice`, `open` |

**Exercise `open` type** — for personal-practice questions with no single correct answer:
```json
{ "type": "open", "prompt": "Cum vă numiți, vă rog?", "hint": "Answer with your own name" }
```
Renders the Romanian question, a hint, a free-form textarea, and "I answered" button. No checking occurs.

**Exercise step `note` field** — optional amber callout shown above the session:
```json
{ "kind": "exercise", "note": "These are also open practice questions...", "items": [...] }
```

**Book data format (`data/book_NN.json`):**
```json
{ "chapter": N, "title": "...", "title_en": "...", "steps": [ { "id": N, "kind": "...", "title": "...", ...kind-specific fields } ] }
```

**Progress:** stored in `localStorage` key `bookProgress` — `{ "1": { "completed_steps": [1, 3, 5] } }`. Never touch this key name. Steps complete when: Next is clicked (non-exercise steps), or the exercise session's onComplete fires (exercise steps). Navigation is never blocked — Next is always clickable.

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
- [x] Phase 13: Book reader — two-panel textbook reader, 5 step kinds, inline exercises, step progress
- [x] Phase 14: Book reader UX polish — audio on grammar/verb tables, Back/Next nav labels, free navigation, loose diacritic answer checking
- [x] Phase 15: Book Chapter 2 — "Bun venit în România" (16 steps); map image extracted from PDF; image field support in exercise steps

## Current phase
Open — ready for next features (see Roadmap below)

## Roadmap / future phases
- [ ] Google Cloud TTS Neural2 (`ro-RO-Neural2`) — consistent audio on all devices
- [ ] Lesson 3+ — add new lessons as teacher provides material
- [ ] Book chapters 3+ — add Colloquial Romanian chapters as needed
- [ ] Spaced repetition — flag weak words, resurface them in practice
- [ ] Short story generator — uses only vocabulary covered in opened lessons

## Source materials
- **Colloquial Romanian textbook PDF**: `G:\My Drive\Romanian Course\Colloquial_Romanian-Complete_course_for_Beginners.pdf` (344 pages)
- Chapter 1 content = PDF pages 18–28; Chapter 2 content = PDF pages 29–42
- Use PyMuPDF (`import fitz`) to extract images from the PDF — `pip install pymupdf` is available
- Lesson PDFs (teacher-provided): `G:\My Drive\Romanian Course\LESSON_1.pdf`, `LESSON_2.pdf`, etc.

## Do not touch
- `lessons-source/` — teacher's original PDFs, gitignored, never commit
- Existing block renderer signatures in `blocks.js` — new block types must be additive
- `state.js` localStorage key names — changing breaks existing user progress
- `blocks[]` array in lesson JSONs — only add new top-level keys alongside it
- `bookProgress` localStorage key name — changing breaks book step completion history

## Key decisions
- **No framework**: keeps the app deployable as a static folder with zero tooling; easy to understand and maintain solo
- **JSON lesson format**: structured data (not markdown) allows reliable extraction for vocabulary tab, exercises, and future features
- **Fuzzy checking with diacritics optional**: diacritics are normalized before comparison (î=i, ă/â=a, ș=s, ț=t) and symbols are stripped — only letters and spaces are compared; Levenshtein fuzzy matching tolerates minor typos in long words
- **Web Speech API first**: free, zero-config; upgrade to Neural2 later without touching UI code — `audio.js` is the only module that changes
- **Auto-generated exercises**: supplements hand-authored exercises to keep practice count high (40+) without authoring overhead
- **`stories` key alongside `dialogue_practice`**: keeps backward compat; `dialogue_practice` is legacy
- **Book reader as separate route/modules**: `book.js` + `book-steps.js` + `book.css` are fully isolated from lesson code — new book chapters only require a new `book_NN.json` file and a manifest entry in `book.json`
- **Verbs step uses new shape**: `book-steps.js` `renderVerbsStep()` handles `tables[]` directly rather than routing through `blocks.js` `renderVerbConjugation()` — the schemas differ

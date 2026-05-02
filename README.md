# 🇷🇴 Romanian Learning App

A personal, interactive web app for learning Romanian — built around weekly lessons from a private teacher and structured as a progressive study tool.

## ✨ Features

- **Learn tab** — every lesson rendered as rich interactive blocks: alphabet grid, pronunciation rules, vocabulary cards, verb conjugation tables, grammar concepts, dialogues, Q&A sets and more
- **Vocabulary tab** — auto-extracted word list from every lesson, with 🔊 audio pronunciation buttons (Web Speech API, `ro-RO`)
- **Practice tab** — one exercise at a time with lenient checking (diacritics required, punctuation/case ignored), immediate feedback, retry on wrong answers, and progress tracking in localStorage
- **Dialogue tab** — a short, original Romanian dialogue written for each lesson that exercises the concepts naturally, with a "New words" section and Hide English toggle
- **All Exercises** — shuffled mix of every exercise from all opened lessons
- **Progress tracking** — sidebar shows `X/N` per lesson and a ✓ when all exercises are answered correctly

## 🚀 Running locally

Requires a local HTTP server (ES modules can't run from `file://`):

```bash
cd romanian-project
python -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

## 🗂 Project structure

```
romanian-project/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js          ← routing, sidebar, lifecycle
│   ├── render.js       ← tab renderers (learn, vocabulary, practice, dialogue)
│   ├── blocks.js       ← individual block renderers (11 types)
│   ├── exercises.js    ← practice engine (text input, multiple choice, match)
│   ├── audio.js        ← Web Speech API TTS, ro-RO voice detection
│   ├── data.js         ← JSON loader with no-cache fetching
│   └── state.js        ← localStorage progress tracking
├── data/
│   ├── lessons.json    ← manifest
│   ├── lesson_01.json  ← Alphabet, Pronunciation & Greetings
│   └── lesson_02.json  ← Pronouns, A fi, A avea, Daily Vocabulary
└── lessons-source/     ← original PDFs from teacher (not committed)
```

## 🧱 Block types supported

| Type | Description |
|---|---|
| `intro` | Lesson overview items |
| `alphabet` | Letter grid with special character highlighting |
| `pronunciation_rule` | Letter rules, sound groups, written/pronounced pairs |
| `vocab_set` | Vocabulary cards with usage examples |
| `qa_set` | Question + answer pairs |
| `phrase_highlight` | Key phrases |
| `comparison` | Side-by-side phrase comparison |
| `dialogue` | Chat-bubble style dialogue |
| `table` | Generic data table (e.g. pronouns) |
| `verb_conjugation` | Conjugation table with affirmative / negative / colloquial |
| `grammar_concept` | Multi-section grammar explanation |

## 🎯 Exercise types supported

`fill_blank` · `transform` · `translate_to_ro` · `translate_to_en` · `multiple_choice` · `match`

## 🔊 Audio

Uses the **Web Speech API** with `lang: ro-RO` — free, no API key, works in Chrome and Edge on Windows/macOS/iOS. If no Romanian voice is installed, a banner shows platform-specific install instructions.

> Planned: upgrade to Google Cloud TTS Neural2 (`ro-RO-Neural2`) for consistent quality across all devices.

## 🗺 Roadmap

- [x] v1 — Full lesson renderer + practice mode
- [x] v1 — All-exercises mode
- [x] v1 — Audio (Web Speech API)
- [ ] v2 — Google Cloud TTS Neural2 for consistent audio
- [ ] v3 — Short story generator using only covered vocabulary
- [ ] v4 — Textbook chapter integration

## 🛠 Tech stack

Vanilla JS (ES modules) · No framework · No build step · localStorage for progress

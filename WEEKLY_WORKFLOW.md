# Weekly Workflow — Adding a new lesson

Each week your teacher sends a new lesson PDF. Here's how to add it to the
app with minimal friction.

## Steps

### 1. Save the PDF
Drop the new PDF into `lessons-source/`. Name it `LESSON_<N>.pdf` to
match the existing files (e.g. `LESSON_3.pdf`).

### 2. Ask Cowork's Claude to parse it
Open Cowork (your project folder is already loaded), and say something
like:

> Please parse `lessons-source/LESSON_3.pdf` into a new file
> `data/lesson_03.json` following the schema in SCHEMA.md. Match the
> style and granularity of the existing lesson_01.json and lesson_02.json
> — same block types, same id naming pattern, similar exercise depth.
> When you're done, run a quick sanity check: open the app and click
> through lesson 3, and tell me anything that looks off.

Claude will:
- Read the PDF
- Identify each topic block (alphabet rule, verb table, vocab list,
  dialogue, etc.)
- Map each block to one of the schema types
- Extract content into the correct fields
- Generate exercises if the lesson contains them, or write 8–12 new
  exercises matching the lesson content if it doesn't
- Save the JSON to `data/lesson_NN.json`

### 3. Review the JSON
The app will pick up the new lesson automatically (the lesson list in
the sidebar reads from `data/`). Click through it. If anything looks
wrong:

- **Translation seems off** → tell Claude the specific item and ask for
  a fix
- **A topic was split when it should be one block** (or merged) → ask
  Claude to restructure that section
- **Missing content** → point Claude back at the specific PDF page and
  ask it to add what's missing
- **Wrong block type** → ask Claude to convert it (e.g. "this should be
  a `comparison` block, not three separate `vocab_set`s")

### 4. (When you have audio in v2) Generate audio for the new lesson
Same drill — ask Claude to run the audio generation script for lesson N.
We'll define that workflow when we get to v2.

## Tips for clean parsing

- **Send the PDF as-is**; don't pre-summarize it. Claude reads the full
  PDF including the images.
- **Mention if your teacher introduced a brand-new topic type** (e.g. a
  pronunciation drill, a culture note format you haven't seen before).
  This may need a new block type — Claude can propose adding one to
  SCHEMA.md.
- **One lesson per JSON file**, even if your teacher splits a topic
  across two weeks. Don't try to merge.
- **Keep the source PDFs around.** They're the ground truth and help if
  you ever want to re-parse with a better schema later.

## When something feels too tedious

If after a few weeks the parse step feels repetitive, ask Claude to
write a small Python script in `tools/parse_lesson.py` that does as
much of the JSON skeleton-building as possible from the PDF, leaving
only the parts that genuinely need judgment. That's a perfectly normal
v1.5 improvement once you know what your teacher's lessons consistently
look like.

# Cowork Starter Prompt

Copy everything between the lines below into your first Cowork message,
along with attaching the entire `romanian-project` folder.

---

Hi Claude. I'm building a personal Romanian-learning web app and I need
your help building it iteratively in this folder.

**Background:**
I'm taking weekly Romanian lessons with a private teacher who gives me a
PDF presentation each week. I've already worked with another Claude
instance to:

1. Define a JSON schema for parsing the teacher's lessons (see SCHEMA.md)
2. Convert lessons 1 and 2 into JSON (see data/lesson_01.json,
   data/lesson_02.json)
3. Plan the app architecture (see README.md)

**What I need from you now:**

Please read SCHEMA.md and README.md first to understand the project, then
read both lesson JSON files to understand the content shape.

After that, build a v1 of the web app with these features:

1. **Lesson browser:** A sidebar or top-level menu listing all lessons in
   `data/`. Clicking a lesson opens it.
2. **Block rendering:** For each block type defined in SCHEMA.md, write a
   renderer that displays it cleanly. Verb conjugations as tables,
   dialogues as alternating speaker bubbles, vocab as cards, etc. The
   visual design should be clean and reading-friendly — not flashy. Use
   readable fonts at comfortable sizes. Romanian text and English
   translation should be visually distinguishable (e.g. RO bold or
   coloured, EN lighter).
3. **Toggle translations:** A button on dialogues and vocab sets to hide
   English so I can self-test.
4. **Exercise mode:** A separate "Practice" tab per lesson that runs
   through that lesson's exercises one at a time. Show the prompt,
   accept input (text field for fill-in / translate, buttons for
   multiple choice, drag or click to match). Mark right/wrong, show the
   explanation, and let me move to the next.
5. **Cumulative practice:** A "All exercises" view that pulls exercises
   from every lesson I've completed.
6. **Persistent progress:** Track which lessons I've opened and which
   exercises I've answered correctly. Use browser localStorage — I'm the
   only user, no need for a backend.

**Architecture preferences:**
- Plain HTML + CSS + vanilla JS, no build step, no framework. I want to
  open `index.html` in a browser and have it work.
- Separate files: `index.html`, `css/styles.css`, `js/app.js`,
  `js/render.js`. If you want to split renderers per block type, that's
  fine.
- Mobile-friendly layout — I'll often review on my phone. Use responsive
  CSS, larger tap targets on small screens.
- Use ES modules (`<script type="module">`) so we can split JS cleanly.
- Because of ES modules, opening `file://` won't work. Tell me the
  command to run a local dev server (e.g. `python3 -m http.server`).

**Important — please don't:**
- Don't add audio yet. That's v2 and we'll plan it separately.
- Don't add the textbook content yet. That's v4.
- Don't reach for a framework, Tailwind, or build tools. Vanilla only.
- Don't generate placeholder lessons — only build for the JSON files
  that actually exist in `data/`.

**Plan of attack I'd like you to follow:**
1. Read SCHEMA.md, README.md, and both lesson JSON files.
2. Sketch the app's information architecture in plain text and confirm
   with me before writing code (e.g. "lesson list on left, content on
   right, tabs for Learn / Practice").
3. Build the HTML shell + CSS + JS skeleton.
4. Add block renderers one type at a time, lesson 1 first, so I can see
   progress. Show me after each renderer batch and let me give feedback.
5. Once all block types render for both lessons, add the exercise mode.
6. Then add progress tracking.

Let's start with step 1: read the docs, then sketch the architecture and
ask me anything that's unclear before writing code.

---

(End of starter prompt.)

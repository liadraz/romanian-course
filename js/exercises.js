// Exercise mode — Practice tab per lesson + All Exercises screen.
//
// Exports:
//   renderPracticeForLesson(lesson, root)
//   renderAllExercises(allLessons, root)
//
// Supported types: fill_blank, transform, translate_to_ro, translate_to_en,
//                  multiple_choice, match
//
// Checking: trim + lowercase + strip trailing punctuation; diacritics required.
// Fuzzy: Levenshtein distance tolerance = floor(word.length / 5) per word.
// Wrong answer → show correct answer + explanation + Retry | Next →
// After last exercise → completion screen

import { markExerciseAttempted, markExerciseCorrect, state } from './state.js';
import { speak } from './audio.js';

// ---- DOM helper ----

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

// ---- Levenshtein distance ----

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  // dp[i][j] = edit distance between a[0..i-1] and b[0..j-1]
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ---- Answer checking ----

function normalizeDiacritics(str) {
  // Treat Romanian diacritics as equivalent to their base Latin letters so
  // typing "a" where "ă" or "â" is expected (and "i" for "î", "s" for "ș",
  // "t" for "ț") is not counted as wrong.
  return str
    .replace(/[îÎ]/g, 'i')
    .replace(/[ăĂâÂ]/g, 'a')
    .replace(/[șŞşȘ]/g, 's')
    .replace(/[țŢţȚ]/g, 't');
}

function normalize(str) {
  return normalizeDiacritics(String(str).trim().toLowerCase())
    .replace(/[^a-z\s]/g, '')   // strip symbols, punctuation, digits — keep only letters + spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function checkWordFuzzy(userWord, correctWord) {
  const tol = Math.floor(correctWord.length / 5); // min 0
  return levenshtein(userWord, correctWord) <= tol;
}

export function checkTextAnswer(userInput, exercise) {
  const user = normalize(userInput);
  const correct = normalize(exercise.answer);

  if (user === correct) return true;
  if ((exercise.alternative_answers || []).some((a) => normalize(a) === user)) return true;

  // Word-by-word fuzzy matching (same word count required)
  const uw = user.split(/\s+/);
  const cw = correct.split(/\s+/);
  if (uw.length === cw.length) {
    if (uw.every((w, i) => checkWordFuzzy(w, cw[i]))) return true;
  }

  return false;
}

export function checkMatchAnswer(result, exercise) {
  return (exercise.pairs || []).every((p) => result[p.left] === p.right);
}

// ---- Auto-exercise generation from vocab_set blocks ----

export function generateAutoExercises(lesson) {
  const exercises = [];
  for (const block of lesson.blocks || []) {
    if (block.type !== 'vocab_set') continue;
    let i = 0;
    for (const item of block.items || []) {
      const baseId = `l${lesson.lesson_number}-auto-${block.id}-`;
      exercises.push({
        id: `${baseId}ro-${i}`,
        type: 'translate_to_ro',
        prompt: `Translate to Romanian: "${item.en}"`,
        answer: item.ro,
        _translation: item.en,
        _isAuto: true,
      });
      exercises.push({
        id: `${baseId}en-${i}`,
        type: 'translate_to_en',
        prompt: `What does "${item.ro}" mean in English?`,
        answer: item.en,
        _translation: item.ro,
        _isAuto: true,
      });
      i++;
    }
  }
  return exercises;
}

// ---- Collect flashcard items from vocab_set blocks ----

function collectFlashcards(lesson) {
  const cards = [];
  for (const block of lesson.blocks || []) {
    if (block.type !== 'vocab_set') continue;
    for (const item of block.items || []) {
      cards.push({ ro: item.ro, en: item.en });
    }
  }
  return cards;
}

// ---- Fisher-Yates shuffle ----

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Input builders ----

function buildTextInput(exercise, onSubmit) {
  const wrap = el('div', 'ex-input-wrap');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ex-text-input';
  input.placeholder = 'Type your answer…';
  input.autocomplete = 'off';
  input.autocorrect = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  wrap.appendChild(input);

  const btn = el('button', 'ex-btn ex-btn-primary', 'Check');
  btn.type = 'button';
  wrap.appendChild(btn);

  const submit = () => {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    input.disabled = true;
    btn.disabled = true;
    onSubmit(val);
  };
  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  return { wrap, focus: () => input.focus() };
}

function buildMultipleChoice(exercise, onSubmit) {
  const wrap = el('div', 'ex-choices');
  for (const choice of exercise.choices || []) {
    const btn = el('button', 'ex-choice', choice);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.ex-choice').forEach((b) => (b.disabled = true));
      btn.classList.add('ex-choice-selected');
      onSubmit(choice);
    });
    wrap.appendChild(btn);
  }
  return { wrap, focus: () => {} };
}

function buildMatchExercise(exercise, onSubmit) {
  const pairs = exercise.pairs || [];
  const lefts = pairs.map((p) => p.left);
  const rights = shuffle(pairs.map((p) => p.right));

  const wrap = el('div', 'ex-match');
  const leftCol = el('div', 'ex-match-col');
  const rightCol = el('div', 'ex-match-col');
  wrap.appendChild(leftCol);
  wrap.appendChild(rightCol);

  let selectedLeft = null;
  const matched = new Map();

  const tryAutoSubmit = () => {
    if (matched.size < pairs.length) return;
    wrap.querySelectorAll('.ex-match-item').forEach((b) => (b.disabled = true));
    onSubmit(Object.fromEntries(matched));
  };

  for (const leftVal of lefts) {
    const btn = el('button', 'ex-match-item ex-match-left', leftVal);
    btn.type = 'button';
    btn.dataset.val = leftVal;
    btn.addEventListener('click', () => {
      if (btn.classList.contains('ex-match-done')) return;
      leftCol.querySelectorAll('.ex-match-left').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedLeft = leftVal;
    });
    leftCol.appendChild(btn);
  }

  for (const rightVal of rights) {
    const btn = el('button', 'ex-match-item ex-match-right', rightVal);
    btn.type = 'button';
    btn.dataset.val = rightVal;
    btn.addEventListener('click', () => {
      if (!selectedLeft || btn.classList.contains('ex-match-done')) return;
      const leftBtn = Array.from(leftCol.querySelectorAll('.ex-match-left'))
        .find((b) => b.dataset.val === selectedLeft);
      if (leftBtn) { leftBtn.classList.remove('selected'); leftBtn.classList.add('ex-match-done'); }
      btn.classList.add('ex-match-done');
      matched.set(selectedLeft, rightVal);
      selectedLeft = null;
      tryAutoSubmit();
    });
    rightCol.appendChild(btn);
  }

  return { wrap, focus: () => {} };
}

// ---- Human-readable type label ----

function humanType(type) {
  return ({
    fill_blank: 'Fill in the blank',
    transform: 'Transform',
    translate_to_ro: 'Translate → Romanian',
    translate_to_en: 'Translate → English',
    multiple_choice: 'Multiple choice',
    match: 'Match',
  }[type] || type);
}

// ---- Flashcard renderer ----

function renderFlashcards(cards, root) {
  if (!cards.length) {
    root.appendChild(el('p', 'placeholder', 'No vocabulary words found for flashcards.'));
    return;
  }

  let current = 0;

  function show() {
    root.innerHTML = '';

    // Counter
    const counter = el('div', 'flashcard-counter', `${current + 1} / ${cards.length}`);
    root.appendChild(counter);

    // Card
    const scene = el('div', 'flashcard-scene');
    scene.title = 'Click to flip';
    const inner = el('div', 'flashcard-inner');

    const front = el('div', 'flashcard-face flashcard-front');
    front.appendChild(el('div', 'flashcard-hint', 'Romanian'));
    front.appendChild(el('div', 'flashcard-ro', cards[current].ro));

    const back = el('div', 'flashcard-face flashcard-back');
    back.appendChild(el('div', 'flashcard-hint', 'English'));
    back.appendChild(el('div', 'flashcard-en', cards[current].en));

    inner.appendChild(front);
    inner.appendChild(back);
    scene.appendChild(inner);
    scene.addEventListener('click', () => scene.classList.toggle('flipped'));
    root.appendChild(scene);

    // Nav buttons
    const nav = el('div', 'flashcard-nav');

    const prevBtn = el('button', 'ex-btn ex-btn-secondary', '← Prev');
    prevBtn.type = 'button';
    prevBtn.disabled = current === 0;
    prevBtn.addEventListener('click', () => { current--; show(); });
    nav.appendChild(prevBtn);

    if (current < cards.length - 1) {
      const nextBtn = el('button', 'ex-btn ex-btn-primary', 'Next →');
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', () => { current++; show(); });
      nav.appendChild(nextBtn);
    } else {
      const doneBtn = el('button', 'ex-btn ex-btn-primary', 'Start over');
      doneBtn.type = 'button';
      doneBtn.addEventListener('click', () => { current = 0; show(); });
      nav.appendChild(doneBtn);
    }

    root.appendChild(nav);
  }

  show();
}

// ---- Shared session engine ----

function renderSession(exercises, root, onComplete) {
  // Work on a mutable copy so skip can append
  const queue = [...exercises];
  let current = 0;
  let skipped = 0;

  function renderExercise() {
    root.innerHTML = '';
    const ex = queue[current];
    const total = queue.length;

    // Progress bar
    const track = el('div', 'ex-progress');
    const bar = el('div', 'ex-progress-bar');
    bar.style.width = `${(current / total) * 100}%`;
    track.appendChild(bar);
    root.appendChild(track);
    const label = el('div', 'ex-progress-label',
      skipped > 0
        ? `${current} / ${total}  ·  ${skipped} skipped`
        : `${current} / ${total}`
    );
    root.appendChild(label);

    // Card
    const card = el('div', 'ex-card');
    root.appendChild(card);
    card.appendChild(el('div', 'ex-type-badge', humanType(ex.type)));
    card.appendChild(el('p', 'ex-prompt', ex.prompt));

    const inputArea = el('div', 'ex-input-area');
    card.appendChild(inputArea);

    const feedbackArea = el('div', 'ex-feedback');
    feedbackArea.hidden = true;
    card.appendChild(feedbackArea);

    // Skip button (shown before answer)
    const skipBtn = el('button', 'ex-btn ex-btn-ghost', 'Skip for now');
    skipBtn.type = 'button';
    skipBtn.addEventListener('click', () => {
      // Append current exercise to end of queue and advance
      queue.push(queue[current]);
      skipped++;
      current++;
      if (current >= queue.length - 1) {
        // All remaining are skips — just advance
      }
      renderExercise();
    });
    const skipRow = el('div', 'ex-skip-row');
    skipRow.appendChild(skipBtn);
    card.appendChild(skipRow);

    const onSubmit = (userAnswer) => {
      // Hide skip button once answered
      skipRow.remove();

      const correct = ex.type === 'match'
        ? checkMatchAnswer(userAnswer, ex)
        : checkTextAnswer(userAnswer, ex);

      // Only track progress for hand-authored exercises (not auto-generated)
      if (!ex._isAuto) {
        markExerciseAttempted(ex.id);
        if (correct) markExerciseCorrect(ex.id);
      }

      feedbackArea.hidden = false;
      feedbackArea.innerHTML = '';
      feedbackArea.className = `ex-feedback ${correct ? 'ex-correct' : 'ex-wrong'}`;

      if (correct) {
        feedbackArea.appendChild(el('div', 'ex-feedback-msg', '✓ Correct!'));
      } else {
        feedbackArea.appendChild(el('div', 'ex-feedback-msg', '✗ Not quite.'));
      }

      // Always show correct answer + translation
      if (ex.type === 'match') {
        const ansRow = el('div', 'ex-correct-answer');
        ansRow.appendChild(el('span', 'ex-ans-label', 'Correct pairs: '));
        const pairsStr = (ex.pairs || []).map((p) => `${p.left} → ${p.right}`).join('  ·  ');
        ansRow.appendChild(el('span', 'ex-ans-value', pairsStr));
        feedbackArea.appendChild(ansRow);
      } else {
        const ansRow = el('div', 'ex-correct-answer');
        ansRow.appendChild(el('span', 'ex-ans-label', 'Correct answer: '));
        ansRow.appendChild(el('span', 'ex-ans-value', ex.answer));
        feedbackArea.appendChild(ansRow);
        if (ex._translation) {
          const transRow = el('div', 'ex-correct-answer');
          transRow.appendChild(el('span', 'ex-ans-label', 'Translation: '));
          transRow.appendChild(el('span', 'ex-ans-value ex-ans-translation', ex._translation));
          feedbackArea.appendChild(transRow);
        }
      }

      if (ex.explanation) feedbackArea.appendChild(el('div', 'ex-explanation', ex.explanation));

      const btnRow = el('div', 'ex-btn-row');
      if (!correct) {
        const retryBtn = el('button', 'ex-btn ex-btn-secondary', 'Retry');
        retryBtn.type = 'button';
        retryBtn.addEventListener('click', renderExercise);
        btnRow.appendChild(retryBtn);
      }

      const isLast = current === queue.length - 1;
      const nextBtn = el('button', 'ex-btn ex-btn-primary', isLast ? 'Finish' : 'Next →');
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', () => {
        current++;
        if (current >= queue.length) {
          // Count correct only for hand-authored exercises
          const correctCount = exercises.filter(
            (e) => !e._isAuto && state.correctExercises.includes(e.id)
          ).length;
          const handTotal = exercises.filter((e) => !e._isAuto).length;
          onComplete(correctCount, handTotal || queue.length);
        } else {
          renderExercise();
        }
      });
      btnRow.appendChild(nextBtn);
      feedbackArea.appendChild(btnRow);
      feedbackArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    const inputObj =
      ex.type === 'multiple_choice' ? buildMultipleChoice(ex, onSubmit) :
      ex.type === 'match'           ? buildMatchExercise(ex, onSubmit) :
                                      buildTextInput(ex, onSubmit);

    inputArea.appendChild(inputObj.wrap);
    requestAnimationFrame(() => inputObj.focus());
  }

  renderExercise();
}

// ---- Completion screen ----

function renderCompletion(root, correctCount, total, onRestart, onBack) {
  root.innerHTML = '';
  const allCorrect = correctCount === total;
  const card = el('div', 'ex-complete-card');
  root.appendChild(card);
  card.appendChild(el('div', 'ex-complete-icon', allCorrect ? '🎉' : '✓'));
  card.appendChild(el('h3', 'ex-complete-title', allCorrect ? 'All correct!' : 'Practice complete'));
  card.appendChild(el('p', 'ex-complete-score', `${correctCount} / ${total} answered correctly`));
  if (!allCorrect && total > 0) {
    card.appendChild(el('p', 'ex-complete-hint', 'Keep practising — try again to get everything right!'));
  }
  const btnRow = el('div', 'ex-btn-row');
  const againBtn = el('button', 'ex-btn ex-btn-secondary', 'Start over');
  againBtn.type = 'button';
  againBtn.addEventListener('click', onRestart);
  btnRow.appendChild(againBtn);
  if (onBack) {
    const backBtn = el('button', 'ex-btn ex-btn-primary', '← Back to lesson');
    backBtn.type = 'button';
    backBtn.addEventListener('click', onBack);
    btnRow.appendChild(backBtn);
  }
  card.appendChild(btnRow);
}

// ---- Homework renderer ----

function renderHomework(homework, root) {
  const container = el('div', 'hw-container');

  // English toggle
  const toggleBtn = el('button', 'hw-toggle', '🇬🇧 Show English');
  toggleBtn.type = 'button';
  let enVisible = false;
  toggleBtn.addEventListener('click', () => {
    enVisible = !enVisible;
    container.classList.toggle('hw-show-en', enVisible);
    toggleBtn.textContent = enVisible ? '🇬🇧 Hide English' : '🇬🇧 Show English';
  });
  container.appendChild(toggleBtn);

  for (const item of homework) {
    const section = el('div', 'hw-section');

    // Section header
    if (item.title) {
      const hdr = el('div', 'hw-section-header');
      hdr.appendChild(el('span', 'hw-section-title', item.title));
      if (item.title_en) hdr.appendChild(el('span', 'hw-section-title-en hw-en', item.title_en));
      section.appendChild(hdr);
    }

    // Instruction
    if (item.instruction) {
      section.appendChild(el('p', 'hw-instruction', item.instruction));
    }
    if (item.instruction_en) {
      section.appendChild(el('p', 'hw-instruction-en hw-en', item.instruction_en));
    }

    if (item.type === 'pronunciation') renderHwPronunciation(item, section);
    else if (item.type === 'open') renderHwOpen(item, section);
    else if (item.type === 'match') renderHwMatch(item, section);
    else if (item.type === 'reading_mc') renderHwReadingMc(item, section);
    else if (item.type === 'multiple_choice') renderHwMultipleChoice(item, section);
    else if (item.type === 'reference') renderHwReference(item, section);

    container.appendChild(section);
  }

  root.appendChild(container);
}

function renderHwPronunciation(item, root) {
  for (const sec of item.sections) {
    const group = el('div', 'hw-pron-group');

    const labelRow = el('div', 'hw-pron-label-row');
    labelRow.appendChild(el('span', 'hw-pron-label', sec.label));
    if (sec.label_en) labelRow.appendChild(el('span', 'hw-pron-label-en hw-en', sec.label_en));
    group.appendChild(labelRow);

    const words = el('div', 'hw-pron-words');
    for (const w of sec.words) {
      const chip = el('span', 'hw-word');
      chip.appendChild(el('span', '', w.ro));
      if (w.en) chip.appendChild(el('span', 'hw-word-en hw-en', w.en));

      const speakBtn = document.createElement('button');
      speakBtn.className = 'speak-btn hw-speak';
      speakBtn.type = 'button';
      speakBtn.title = 'Pronounce';
      speakBtn.textContent = '🔊';
      speakBtn.addEventListener('click', () => speak(w.ro));
      chip.appendChild(speakBtn);

      words.appendChild(chip);
    }
    group.appendChild(words);
    root.appendChild(group);
  }
}

function renderHwOpen(item, root) {
  if (item.hint) {
    root.appendChild(el('p', 'hw-open-hint', item.hint));
  }
  if (item.hint_en) {
    root.appendChild(el('p', 'hw-open-hint-en hw-en', item.hint_en));
  }
}

function renderHwMatch(item, root) {
  const colA = item.pairs.map((p) => p.left);
  const colB = shuffle(item.pairs.map((p) => p.right));

  const cols = el('div', 'hw-match-cols');

  const colAEl = el('div', 'hw-match-col');
  const colBEl = el('div', 'hw-match-col');

  let selectedA = null;
  let selectedABtn = null;
  let matchedCount = 0;
  const total = item.pairs.length;

  const statusEl = el('p', 'hw-match-status', '');

  function tryMatch(bText, bBtn) {
    if (!selectedA) return;
    const correct = item.pairs.find((p) => p.left === selectedA && p.right === bText);
    if (correct) {
      selectedABtn.classList.add('matched');
      bBtn.classList.add('matched');
      selectedABtn.disabled = true;
      bBtn.disabled = true;
      matchedCount++;
      if (matchedCount === total) {
        statusEl.textContent = '✓ Toate perechile sunt corecte!';
        statusEl.className = 'hw-match-status hw-match-done';
      }
    } else {
      selectedABtn.classList.add('wrong');
      bBtn.classList.add('wrong');
      setTimeout(() => {
        selectedABtn.classList.remove('wrong', 'selected');
        bBtn.classList.remove('wrong');
      }, 600);
    }
    selectedA = null;
    selectedABtn = null;
  }

  for (const text of colA) {
    const btn = el('button', 'hw-match-btn', text);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (selectedABtn) selectedABtn.classList.remove('selected');
      selectedA = text;
      selectedABtn = btn;
      btn.classList.add('selected');
    });
    colAEl.appendChild(btn);
  }

  for (const text of colB) {
    const btn = el('button', 'hw-match-btn hw-match-btn-b', text);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      tryMatch(text, btn);
    });
    colBEl.appendChild(btn);
  }

  cols.appendChild(colAEl);
  cols.appendChild(colBEl);
  root.appendChild(cols);
  root.appendChild(statusEl);
}

function renderHwReadingMc(item, root) {
  // Dialogues
  for (const dlg of item.dialogues) {
    const dlgWrap = el('div', 'hw-dialogue');
    dlgWrap.appendChild(el('p', 'hw-dialogue-label', `Dialogul ${dlg.label}`));
    for (const line of dlg.lines) {
      const lineEl = el('div', 'hw-dialogue-line');
      lineEl.appendChild(el('span', 'hw-dialogue-speaker', line.speaker + ':'));
      lineEl.appendChild(el('span', 'hw-dialogue-text', ' ' + line.text));
      dlgWrap.appendChild(lineEl);
    }
    root.appendChild(dlgWrap);
  }

  // Questions
  const qWrap = el('div', 'hw-mc-questions');
  for (const q of item.questions) {
    const qEl = el('div', 'hw-mc-item');
    qEl.appendChild(el('p', 'hw-mc-prompt', q.prompt));
    const choicesEl = el('div', 'hw-mc-choices');
    for (const choice of q.choices) {
      const btn = el('button', 'hw-mc-btn', choice);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const correct = choice === q.answer;
        btn.classList.add(correct ? 'correct' : 'wrong');
        choicesEl.querySelectorAll('.hw-mc-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === q.answer) b.classList.add('correct');
        });
      });
      choicesEl.appendChild(btn);
    }
    qEl.appendChild(choicesEl);
    qWrap.appendChild(qEl);
  }
  root.appendChild(qWrap);
}

function renderHwMultipleChoice(item, root) {
  const grid = el('div', 'hw-mc-grid');
  for (const q of item.items) {
    const qEl = el('div', 'hw-mc-item');

    const hintRow = el('div', 'hw-mc-hint-row');
    hintRow.appendChild(el('span', 'hw-mc-emoji', q.hint));
    if (q.hint_en) hintRow.appendChild(el('span', 'hw-mc-hint-en hw-en', q.hint_en));
    qEl.appendChild(hintRow);

    const choicesEl = el('div', 'hw-mc-choices');
    for (const choice of q.choices) {
      const btn = el('button', 'hw-mc-btn', choice);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const correct = choice === q.answer;
        btn.classList.add(correct ? 'correct' : 'wrong');
        choicesEl.querySelectorAll('.hw-mc-btn').forEach((b) => {
          b.disabled = true;
          if (b.textContent === q.answer) b.classList.add('correct');
        });
      });
      choicesEl.appendChild(btn);
    }
    qEl.appendChild(choicesEl);
    grid.appendChild(qEl);
  }
  root.appendChild(grid);
}

function renderHwReference(item, root) {
  if (item.note) root.appendChild(el('p', 'hw-ref-note', item.note));
  if (item.note_en) root.appendChild(el('p', 'hw-ref-note hw-en', item.note_en));

  const table = document.createElement('table');
  table.className = 'hw-ref-table';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  for (let i = 0; i < item.columns.length; i++) {
    const th = document.createElement('th');
    th.appendChild(el('span', '', item.columns[i]));
    if (item.columns_en?.[i]) {
      th.appendChild(el('span', 'hw-en', ' / ' + item.columns_en[i]));
    }
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of item.rows) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  root.appendChild(table);
}

// ---- Public exports ----

export function renderPracticeForLesson(lesson, root) {
  const handExercises = lesson.exercises || [];
  const autoExercises = generateAutoExercises(lesson);
  const flashcards = collectFlashcards(lesson);
  const allExercises = [...handExercises, ...autoExercises];

  // Sub-mode buttons
  const modes = el('div', 'practice-modes');
  const modeNames = ['Flashcards', 'Exercises', 'Homework'];
  let activeMode = 'Exercises';

  const sessionRoot = el('div', 'practice-session');

  function setMode(name) {
    activeMode = name;
    modes.querySelectorAll('.practice-mode-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === name);
    });
    startSession();
  }

  for (const name of modeNames) {
    const btn = el('button', 'practice-mode-btn' + (name === activeMode ? ' active' : ''), name);
    btn.type = 'button';
    btn.dataset.mode = name;
    btn.addEventListener('click', () => setMode(name));
    modes.appendChild(btn);
  }

  root.appendChild(modes);
  root.appendChild(sessionRoot);

  function startSession() {
    sessionRoot.innerHTML = '';

    if (activeMode === 'Flashcards') {
      renderFlashcards(flashcards, sessionRoot);
      return;
    }

    if (activeMode === 'Homework') {
      if (!lesson.homework?.length) {
        sessionRoot.appendChild(el('p', 'placeholder', 'No homework for this lesson yet.'));
        return;
      }
      renderHomework(lesson.homework, sessionRoot);
      return;
    }

    const pool = [...handExercises, ...autoExercises];

    if (!pool.length) {
      sessionRoot.appendChild(el('p', 'placeholder', 'No exercises yet for this lesson.'));
      return;
    }

    renderSession(pool, sessionRoot, (correctCount, total) => {
      renderCompletion(
        sessionRoot, correctCount, total,
        startSession,
        () => { location.hash = location.hash.replace('/practice', '/learn'); }
      );
    });
  }

  startSession();
}


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
// Wrong answer → show correct answer + explanation + Retry | Next →
// After last exercise → completion screen

import { markExerciseAttempted, markExerciseCorrect, state } from './state.js';

// ---- DOM helper ----

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

// ---- Answer checking ----

function normalize(str) {
  return String(str).trim().toLowerCase().replace(/[.,!?…]+$/, '').trim();
}

function checkTextAnswer(userInput, exercise) {
  const user = normalize(userInput);
  if (user === normalize(exercise.answer)) return true;
  return (exercise.alternative_answers || []).some((a) => normalize(a) === user);
}

function checkMatchAnswer(result, exercise) {
  return (exercise.pairs || []).every((p) => result[p.left] === p.right);
}

// ---- Input builders ----
// Each returns { wrap: HTMLElement, focus: fn }

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
  const rights = [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5);

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

// ---- Shared session engine ----
// exercises: array of exercise objects to work through in order
// root: DOM element to render into
// onComplete(correctCount, total): called when user clicks Finish on the last exercise

function renderSession(exercises, root, onComplete) {
  let current = 0;

  function renderExercise() {
    root.innerHTML = '';
    const ex = exercises[current];
    const total = exercises.length;

    // Progress
    const track = el('div', 'ex-progress');
    const bar = el('div', 'ex-progress-bar');
    bar.style.width = `${(current / total) * 100}%`;
    track.appendChild(bar);
    root.appendChild(track);
    root.appendChild(el('div', 'ex-progress-label', `${current} / ${total}`));

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

    const onSubmit = (userAnswer) => {
      const correct = ex.type === 'match'
        ? checkMatchAnswer(userAnswer, ex)
        : checkTextAnswer(userAnswer, ex);

      markExerciseAttempted(ex.id);
      if (correct) markExerciseCorrect(ex.id);

      feedbackArea.hidden = false;
      feedbackArea.innerHTML = '';
      feedbackArea.className = `ex-feedback ${correct ? 'ex-correct' : 'ex-wrong'}`;

      if (correct) {
        feedbackArea.appendChild(el('div', 'ex-feedback-msg', '✓ Correct!'));
      } else {
        feedbackArea.appendChild(el('div', 'ex-feedback-msg', '✗ Not quite.'));
        const ansRow = el('div', 'ex-correct-answer');
        ansRow.appendChild(el('span', 'ex-ans-label', 'Correct answer: '));
        if (ex.type === 'match') {
          const pairsStr = (ex.pairs || []).map((p) => `${p.left} → ${p.right}`).join('  ·  ');
          ansRow.appendChild(el('span', 'ex-ans-value', pairsStr));
        } else {
          ansRow.appendChild(el('span', 'ex-ans-value', ex.answer));
        }
        feedbackArea.appendChild(ansRow);
        if (ex.explanation) feedbackArea.appendChild(el('div', 'ex-explanation', ex.explanation));
      }

      const btnRow = el('div', 'ex-btn-row');
      if (!correct) {
        const retryBtn = el('button', 'ex-btn ex-btn-secondary', 'Retry');
        retryBtn.type = 'button';
        retryBtn.addEventListener('click', renderExercise);
        btnRow.appendChild(retryBtn);
      }

      const isLast = current === exercises.length - 1;
      const nextBtn = el('button', 'ex-btn ex-btn-primary', isLast ? 'Finish' : 'Next →');
      nextBtn.type = 'button';
      nextBtn.addEventListener('click', () => {
        current++;
        if (current >= exercises.length) {
          const correctCount = exercises.filter((e) =>
            state.correctExercises.includes(e.id)
          ).length;
          onComplete(correctCount, exercises.length);
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

// ---- Public exports ----

export function renderPracticeForLesson(lesson, root) {
  const exercises = lesson.exercises || [];
  if (!exercises.length) {
    root.appendChild(el('p', 'placeholder', 'No exercises yet for this lesson.'));
    return;
  }

  const runSession = () => {
    renderSession(exercises, root, (correctCount, total) => {
      // Completion screen
      root.innerHTML = '';
      const allCorrect = correctCount === total;
      const card = el('div', 'ex-complete-card');
      root.appendChild(card);
      card.appendChild(el('div', 'ex-complete-icon', allCorrect ? '🎉' : '✓'));
      card.appendChild(el('h3', 'ex-complete-title', allCorrect ? 'All correct!' : 'Practice complete'));
      card.appendChild(el('p', 'ex-complete-score', `${correctCount} / ${total} answered correctly`));
      if (!allCorrect) {
        card.appendChild(el('p', 'ex-complete-hint', 'Keep practising — try again to get everything right!'));
      }
      const btnRow = el('div', 'ex-btn-row');
      const againBtn = el('button', 'ex-btn ex-btn-secondary', 'Start over');
      againBtn.type = 'button';
      againBtn.addEventListener('click', runSession);
      btnRow.appendChild(againBtn);
      const learnBtn = el('button', 'ex-btn ex-btn-primary', '← Back to lesson');
      learnBtn.type = 'button';
      learnBtn.addEventListener('click', () => {
        location.hash = location.hash.replace('/practice', '/learn');
      });
      btnRow.appendChild(learnBtn);
      card.appendChild(btnRow);
    });
  };

  runSession();
}

export function renderAllExercises(allLessons, root) {
  // Collect exercises from all available lessons
  const pool = [];
  for (const lesson of allLessons) {
    for (const ex of lesson.exercises || []) pool.push(ex);
  }

  if (!pool.length) {
    root.appendChild(el('p', 'placeholder', 'No exercises found.'));
    return;
  }

  // Fisher-Yates shuffle
  const exercises = [...pool];
  for (let i = exercises.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
  }

  const runSession = () => {
    renderSession(exercises, root, (correctCount, total) => {
      root.innerHTML = '';
      const allCorrect = correctCount === total;
      const card = el('div', 'ex-complete-card');
      root.appendChild(card);
      card.appendChild(el('div', 'ex-complete-icon', allCorrect ? '🎉' : '✓'));
      card.appendChild(el('h3', 'ex-complete-title', allCorrect ? 'All correct!' : 'Round complete'));
      card.appendChild(el('p', 'ex-complete-score', `${correctCount} / ${total} answered correctly`));
      if (!allCorrect) {
        card.appendChild(el('p', 'ex-complete-hint', 'Keep practising to get a perfect score!'));
      }
      const btnRow = el('div', 'ex-btn-row');
      const shuffleBtn = el('button', 'ex-btn ex-btn-primary', 'Shuffle again');
      shuffleBtn.type = 'button';
      shuffleBtn.addEventListener('click', () => renderAllExercises(allLessons, root));
      btnRow.appendChild(shuffleBtn);
      card.appendChild(btnRow);
    });
  };

  runSession();
}

// Step kind renderers for the book reader.
// Each renderer receives a step object and a root DOM element, appends content to root.

import { speak } from './audio.js';
import { checkTextAnswer } from './exercises.js';

// ---- DOM helper ----

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

function makeSpeakBtn(text) {
  const btn = document.createElement('button');
  btn.className = 'speak-btn';
  btn.title = 'Listen';
  btn.textContent = '🔊';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    speak(text);
  });
  return btn;
}

// ---- Vocabulary step ----

export function renderVocabStep(step, root) {
  const body = el('div', 'book-step-body');
  const badge = el('div', 'book-step-badge badge-coral', 'Vocabulary');
  body.appendChild(badge);

  if (step.intro) {
    body.appendChild(el('p', 'book-step-intro', step.intro));
  }

  const grid = el('div', 'book-vocab-grid');
  for (const item of step.items || []) {
    const card = el('div', 'book-vocab-card');
    const top = el('div', 'book-vocab-top');
    top.appendChild(el('span', 'book-vocab-ro', item.ro));
    top.appendChild(makeSpeakBtn(item.ro));
    card.appendChild(top);
    card.appendChild(el('div', 'book-vocab-en', item.en));
    grid.appendChild(card);
  }
  body.appendChild(grid);
  root.appendChild(body);
}

// ---- Dialogue step ----

export function renderDialogueStep(step, root) {
  const body = el('div', 'book-step-body');
  const badge = el('div', 'book-step-badge badge-green', 'Dialogue');
  body.appendChild(badge);

  // Scene context
  if (step.context) {
    body.appendChild(el('p', 'book-dialogue-context', step.context));
  }

  const lines = step.lines || [];

  // Full scene speak button
  const speakScene = el('button', 'book-speak-scene', '🔊 Hear full scene');
  speakScene.addEventListener('click', () => {
    speak(lines.map((l) => l.ro).join('. '));
  });
  body.appendChild(speakScene);

  // Hide English toggle
  const toggleBtn = el('button', 'book-toggle-en', 'Hide English');
  let englishHidden = false;
  toggleBtn.addEventListener('click', () => {
    englishHidden = !englishHidden;
    linesContainer.classList.toggle('en-hidden', englishHidden);
    toggleBtn.textContent = englishHidden ? 'Show English' : 'Hide English';
  });
  body.appendChild(toggleBtn);

  // Dialogue lines
  const linesContainer = el('div', 'book-dialogue-lines');
  const speakers = [...new Set(lines.map((l) => l.speaker))];

  for (const line of lines) {
    const speakerIdx = speakers.indexOf(line.speaker);
    const lineEl = el('div', `book-dialogue-line ${speakerIdx % 2 === 1 ? 'speaker-right' : 'speaker-left'}`);

    const label = el('div', 'book-speaker-label', line.speaker);
    const bubble = el('div', 'book-bubble');
    const top = el('div', 'book-bubble-top');
    top.appendChild(el('span', 'book-bubble-ro', line.ro));
    top.appendChild(makeSpeakBtn(line.ro));
    bubble.appendChild(top);
    bubble.appendChild(el('div', 'book-bubble-en', line.en));

    lineEl.appendChild(label);
    lineEl.appendChild(bubble);
    linesContainer.appendChild(lineEl);
  }

  body.appendChild(linesContainer);
  root.appendChild(body);
}

// ---- Grammar step ----

export function renderGrammarStep(step, root) {
  const body = el('div', 'book-step-body');
  const badge = el('div', 'book-step-badge badge-purple', 'Grammar');
  body.appendChild(badge);

  body.appendChild(el('h3', 'book-grammar-heading', step.title));
  body.appendChild(el('p', 'book-grammar-explanation', step.explanation));

  if (step.examples?.length) {
    body.appendChild(buildExamplesTable(step.examples));
  }

  if (step.callout) {
    const callout = el('div', 'book-callout', step.callout);
    body.appendChild(callout);
  }

  if (step.extra_examples?.length) {
    body.appendChild(el('div', 'book-extra-label', 'More examples'));
    body.appendChild(buildExamplesTable(step.extra_examples));
  }

  root.appendChild(body);
}

function buildExamplesTable(examples) {
  const table = el('table', 'book-examples-table');
  const tbody = document.createElement('tbody');
  for (const ex of examples) {
    const tr = document.createElement('tr');
    const tdRo = el('td', 'book-ex-ro', ex.ro);
    const tdEn = el('td', 'book-ex-en', ex.en);
    tr.appendChild(tdRo);
    tr.appendChild(tdEn);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

// ---- Verbs step ----

export function renderVerbsStep(step, root) {
  const body = el('div', 'book-step-body');
  const badge = el('div', 'book-step-badge badge-purple', 'Verbs');
  body.appendChild(badge);

  if (step.intro) {
    body.appendChild(el('p', 'book-verbs-intro', step.intro));
  }

  for (const table of step.tables || []) {
    const block = el('div', 'book-verb-block');

    const heading = el('div', 'book-verb-heading');
    heading.appendChild(el('span', 'book-verb-name', table.verb));
    heading.appendChild(el('span', 'book-verb-meaning', `— ${table.meaning}`));
    block.appendChild(heading);

    const tbl = el('table', 'book-verb-table');
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    for (const h of ['Pronoun', 'Romanian', 'English']) {
      htr.appendChild(el('th', '', h));
    }
    thead.appendChild(htr);
    tbl.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of table.rows || []) {
      const tr = document.createElement('tr');
      tr.appendChild(el('td', 'book-verb-pronoun', row.pronoun));
      tr.appendChild(el('td', 'book-verb-affirmative', row.affirmative));
      tr.appendChild(el('td', 'book-verb-english', row.english));
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    block.appendChild(tbl);
    body.appendChild(block);
  }

  root.appendChild(body);
}

// ---- Exercise step ----

export function renderExerciseStep(step, root, onComplete) {
  const body = el('div', 'book-step-body');
  const badge = el('div', 'book-step-badge badge-amber', 'Practice');
  body.appendChild(badge);

  const session = el('div', 'book-ex-session');
  body.appendChild(session);
  root.appendChild(body);

  const items = step.items || [];
  let currentIdx = 0;

  function renderCurrent() {
    session.innerHTML = '';

    if (currentIdx >= items.length) {
      renderComplete();
      return;
    }

    const item = items[currentIdx];

    // Progress
    const counter = el('div', 'book-ex-counter', `${currentIdx + 1} / ${items.length}`);
    session.appendChild(counter);

    const progressTrack = el('div', 'book-ex-mini-progress');
    const fill = el('div', 'book-ex-mini-fill');
    fill.style.width = `${(currentIdx / items.length) * 100}%`;
    progressTrack.appendChild(fill);
    session.appendChild(progressTrack);

    // Exercise card
    const card = el('div', 'book-ex-card');

    const typeLabelMap = {
      fill_blank: 'Fill in the blank',
      translate_to_ro: 'Translate to Romanian',
      translate_to_en: 'Translate to English',
      transform: 'Transform',
      multiple_choice: 'Choose the correct answer',
    };
    card.appendChild(el('div', 'book-ex-type', typeLabelMap[item.type] || item.type));
    card.appendChild(el('p', 'book-ex-prompt', item.prompt));

    session.appendChild(card);

    let submitted = false;

    function showFeedback(correct) {
      if (submitted) return;
      submitted = true;

      const feedback = el('div', `book-ex-feedback ${correct ? 'correct' : 'wrong'}`);
      feedback.appendChild(el('div', '', correct ? '✓ Correct!' : '✗ Not quite.'));
      feedback.appendChild(el('div', 'book-ex-correct-ans', `Answer: ${item.answer}`));
      if (item.translation && item.translation !== item.answer) {
        feedback.appendChild(el('div', '', item.translation));
      }

      const continueBtn = el('button', 'book-ex-continue', currentIdx + 1 < items.length ? 'Continue' : 'Finish');
      continueBtn.addEventListener('click', () => {
        currentIdx++;
        renderCurrent();
      });
      feedback.appendChild(continueBtn);
      card.appendChild(feedback);
    }

    if (item.type === 'multiple_choice') {
      // Render as clickable choice buttons
      const choicesEl = el('div', 'book-ex-choices');
      for (const choice of (item.choices || [])) {
        const btn = el('button', 'book-ex-choice', choice);
        btn.addEventListener('click', () => {
          if (submitted) return;
          // Disable all choice buttons
          for (const b of choicesEl.querySelectorAll('.book-ex-choice')) {
            b.disabled = true;
            if (b.textContent === item.answer) b.classList.add('choice-correct');
            else if (b === btn && b.textContent !== item.answer) b.classList.add('choice-wrong');
          }
          showFeedback(choice === item.answer);
        });
        choicesEl.appendChild(btn);
      }
      card.appendChild(choicesEl);
    } else {
      // Text input
      const input = el('input', 'book-ex-input');
      input.type = 'text';
      input.placeholder = 'Your answer…';
      input.autocomplete = 'off';
      input.autocorrect = 'off';
      input.autocapitalize = 'off';
      input.spellcheck = false;
      card.appendChild(input);

      const btnRow = el('div', 'book-ex-btn-row');
      const checkBtn = el('button', 'book-ex-check', 'Check');
      btnRow.appendChild(checkBtn);
      card.appendChild(btnRow);

      function submit() {
        if (submitted) return;
        input.disabled = true;
        checkBtn.disabled = true;
        showFeedback(checkTextAnswer(input.value, item));
      }

      checkBtn.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
      setTimeout(() => input.focus(), 50);
    }
  }

  function renderComplete() {
    session.innerHTML = '';
    const complete = el('div', 'book-ex-complete');
    complete.appendChild(el('div', 'book-ex-complete-icon', '✓'));
    complete.appendChild(el('div', 'book-ex-complete-text', 'Section complete!'));

    const continueBtn = el('button', 'book-ex-continue', 'Continue →');
    continueBtn.addEventListener('click', () => {
      onComplete(step.id);
    });
    complete.appendChild(continueBtn);
    session.appendChild(complete);
  }

  renderCurrent();
}

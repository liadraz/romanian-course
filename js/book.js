// Book reader: shell layout, progress tracking, step rendering.

import { loadBookChapterData } from './data.js';
import {
  renderVocabStep,
  renderDialogueStep,
  renderGrammarStep,
  renderVerbsStep,
  renderExerciseStep,
} from './book-steps.js';

const BOOK_PROGRESS_KEY = 'bookProgress';

// ---- Progress helpers ----

export function getBookProgress() {
  try {
    return JSON.parse(localStorage.getItem(BOOK_PROGRESS_KEY)) || {};
  } catch {
    return {};
  }
}

export function setStepComplete(chapterN, stepId) {
  const prog = getBookProgress();
  const key = String(chapterN);
  if (!prog[key]) prog[key] = { completed_steps: [] };
  if (!prog[key].completed_steps.includes(stepId)) {
    prog[key].completed_steps.push(stepId);
    try {
      localStorage.setItem(BOOK_PROGRESS_KEY, JSON.stringify(prog));
    } catch {}
    window.dispatchEvent(new CustomEvent('book:progress'));
  }
}

export function isStepComplete(chapterN, stepId) {
  const prog = getBookProgress();
  return (prog[String(chapterN)]?.completed_steps || []).includes(stepId);
}

// ---- DOM helper ----

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

// ---- Main shell renderer ----

export async function renderBookShell(chapterN, stepN, root) {
  let chapter;
  try {
    chapter = await loadBookChapterData(chapterN);
  } catch (e) {
    root.innerHTML = `<p class="error">Failed to load chapter ${chapterN}.</p>`;
    return;
  }

  const steps = chapter.steps || [];
  const clampedStep = Math.min(Math.max(stepN, 1), steps.length);
  const stepIndex = clampedStep - 1;
  const step = steps[stepIndex];

  if (!step) {
    root.innerHTML = `<p class="error">Step ${stepN} not found in chapter ${chapterN}.</p>`;
    return;
  }

  root.innerHTML = '';
  const shell = el('div', 'book-shell');

  // ---- Left panel ----
  const leftPanel = el('div', 'book-left-panel');
  const chapterTitle = el('div', 'book-chapter-title');
  chapterTitle.appendChild(el('div', 'book-chapter-ro', chapter.title));
  chapterTitle.appendChild(el('div', 'book-chapter-en', chapter.title_en));
  leftPanel.appendChild(chapterTitle);

  const stepNav = el('nav', 'book-step-nav');
  for (const s of steps) {
    const a = document.createElement('a');
    a.href = `#/book/${chapterN}/${s.id}`;
    a.className = 'book-step-item' + (s.id === clampedStep ? ' active' : '');

    const numEl = el('span', 'book-step-num');
    if (isStepComplete(chapterN, s.id)) {
      numEl.textContent = '✓';
      numEl.classList.add('completed');
    } else {
      numEl.textContent = String(s.id);
    }

    const info = el('div', 'book-step-info');
    info.appendChild(el('span', 'book-step-title', s.title));
    info.appendChild(el('span', `book-step-pill pill-${s.kind}`, kindLabel(s.kind)));

    a.appendChild(numEl);
    a.appendChild(info);

    // Close mobile overlay when a step link is clicked
    a.addEventListener('click', () => {
      shell.classList.remove('book-contents-open');
    });

    stepNav.appendChild(a);
  }
  leftPanel.appendChild(stepNav);
  shell.appendChild(leftPanel);

  // ---- Right panel ----
  const rightPanel = el('div', 'book-right-panel');

  // Mobile bar (hidden on desktop via CSS)
  const mobileBar = el('div', 'book-mobile-bar');
  const mobileLabel = el('div', 'book-mobile-step-label', `Step ${clampedStep} of ${steps.length}`);
  const contentsBtn = el('button', 'book-contents-btn', '☰ Contents');
  contentsBtn.addEventListener('click', () => {
    shell.classList.toggle('book-contents-open');
    // Scroll active step into view in left panel
    const activeItem = leftPanel.querySelector('.book-step-item.active');
    if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
  });
  mobileBar.appendChild(mobileLabel);
  mobileBar.appendChild(contentsBtn);
  rightPanel.appendChild(mobileBar);

  // Breadcrumb
  const breadcrumb = el(
    'div',
    'book-breadcrumb',
    `Textbook › Chapter ${chapterN} · ${chapter.title} › Step ${clampedStep} of ${steps.length}`
  );
  rightPanel.appendChild(breadcrumb);

  // Progress bar
  const completedCount = (getBookProgress()[String(chapterN)]?.completed_steps || []).length;
  const progressTrack = el('div', 'book-progress-track');
  const progressFill = el('div', 'book-progress-fill');
  progressFill.style.width = `${(completedCount / steps.length) * 100}%`;
  progressTrack.appendChild(progressFill);
  rightPanel.appendChild(progressTrack);

  // Step content
  const stepContent = el('div', 'book-step-content');
  renderStepContent(chapter, chapterN, step, steps, stepContent, rightPanel, shell);
  rightPanel.appendChild(stepContent);

  shell.appendChild(rightPanel);
  root.appendChild(shell);

  // Scroll active step into view in sidebar
  requestAnimationFrame(() => {
    const activeItem = leftPanel.querySelector('.book-step-item.active');
    if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
  });
}

function renderStepContent(chapter, chapterN, step, allSteps, stepContent, rightPanel, shell) {
  const stepIdx = allSteps.findIndex((s) => s.id === step.id);
  const prevStep = stepIdx > 0 ? allSteps[stepIdx - 1] : null;
  const nextStep = stepIdx < allSteps.length - 1 ? allSteps[stepIdx + 1] : null;

  // Build bottom nav first so nextBtn is available for the exercise onComplete closure
  const nav = el('nav', 'book-bottom-nav');

  const prevBtn = el('button', 'book-nav-btn');
  if (prevStep) {
    prevBtn.textContent = `← ${prevStep.title}`;
    prevBtn.addEventListener('click', () => {
      if (step.kind !== 'exercise') setStepComplete(chapterN, step.id);
      location.hash = `#/book/${chapterN}/${prevStep.id}`;
    });
  } else {
    prevBtn.style.visibility = 'hidden';
  }
  nav.appendChild(prevBtn);

  nav.appendChild(el('span', 'book-nav-counter', `${step.id} / ${allSteps.length}`));

  const nextBtn = el('button', 'book-nav-btn primary book-nav-next');
  const nextDest = nextStep ? `#/book/${chapterN}/${nextStep.id}` : `#/`;
  nextBtn.textContent = nextStep ? `${nextStep.title} →` : 'Finished!';

  if (step.kind === 'exercise') {
    // Disabled until exercise session completes
    nextBtn.disabled = true;
  } else {
    nextBtn.addEventListener('click', () => {
      setStepComplete(chapterN, step.id);
      location.hash = nextDest;
    });
  }
  nav.appendChild(nextBtn);

  // Render step body
  switch (step.kind) {
    case 'vocabulary':
      renderVocabStep(step, stepContent);
      break;
    case 'dialogue':
      renderDialogueStep(step, stepContent);
      break;
    case 'grammar':
      renderGrammarStep(step, stepContent);
      break;
    case 'verbs':
      renderVerbsStep(step, stepContent);
      break;
    case 'exercise':
      renderExerciseStep(step, stepContent, (stepId) => {
        setStepComplete(chapterN, stepId);
        // Update progress bar
        const completedCount = (getBookProgress()[String(chapterN)]?.completed_steps || []).length;
        const fill = rightPanel.querySelector('.book-progress-fill');
        if (fill) fill.style.width = `${(completedCount / allSteps.length) * 100}%`;
        // Enable and wire up next button
        nextBtn.disabled = false;
        nextBtn.addEventListener('click', () => {
          location.hash = nextDest;
        });
      });
      break;
    default:
      stepContent.appendChild(el('p', '', `Unknown step kind: ${step.kind}`));
  }

  rightPanel.appendChild(nav);
}

function kindLabel(kind) {
  const labels = {
    vocabulary: 'Vocabulary',
    dialogue: 'Dialogue',
    grammar: 'Grammar',
    verbs: 'Verbs',
    exercise: 'Practice',
  };
  return labels[kind] || kind;
}

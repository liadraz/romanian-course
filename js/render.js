// Top-level lesson renderer. Builds the lesson header + tabs and dispatches
// to the appropriate tab renderer: learn, practice, or dialogue.

import { renderBlock } from './blocks.js';
import { renderPracticeForLesson, renderAllExercises } from './exercises.js';
import { speak, getRoVoice, buildNoVoiceWarning } from './audio.js';

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

function makeSpeakBtn(text) {
  const btn = document.createElement('button');
  btn.className = 'speak-btn';
  btn.type = 'button';
  btn.title = 'Hear pronunciation';
  btn.textContent = '🔊';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.classList.add('speaking');
    const utt = speak(text);
    utt.onend = utt.onerror = () => btn.classList.remove('speaking');
  });
  return btn;
}

// Prepend a no-voice warning to root if ro-RO is not available.
// Runs async so page content renders first.
function checkAndWarnAudio(root) {
  getRoVoice().then((voice) => {
    if (!voice) root.insertBefore(buildNoVoiceWarning(), root.firstChild);
  });
}

export function renderLessonView(lesson, root, activeTab = 'learn') {
  root.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'lesson-header';

  const num = document.createElement('div');
  num.className = 'lesson-num';
  num.textContent = `Lesson ${lesson.lesson_number}`;
  header.appendChild(num);

  const titleEn = document.createElement('h2');
  titleEn.className = 'lesson-title-en';
  titleEn.textContent = lesson.title;
  header.appendChild(titleEn);

  if (lesson.title_ro) {
    const titleRo = document.createElement('div');
    titleRo.className = 'lesson-title-ro';
    titleRo.textContent = lesson.title_ro;
    header.appendChild(titleRo);
  }
  root.appendChild(header);

  const tabs = document.createElement('nav');
  tabs.className = 'lesson-tabs';
  for (const tab of ['learn', 'vocabulary', 'practice', 'dialogue']) {
    const a = document.createElement('a');
    a.href = `#/lesson/${lesson.lesson_number}/${tab}`;
    a.textContent = tab[0].toUpperCase() + tab.slice(1);
    if (tab === activeTab) a.classList.add('active');
    tabs.appendChild(a);
  }
  root.appendChild(tabs);

  const body = document.createElement('div');
  body.className = 'lesson-body';
  root.appendChild(body);

  if (activeTab === 'vocabulary') {
    renderVocabularyTab(lesson, body);
    return;
  }

  if (activeTab === 'practice') {
    renderPracticeForLesson(lesson, body);
    return;
  }

  if (activeTab === 'dialogue') {
    renderDialogueTab(lesson, body);
    return;
  }

  for (const block of lesson.blocks || []) {
    const elBlock = renderBlock(block);
    if (elBlock) body.appendChild(elBlock);
  }
}

function renderVocabularyTab(lesson, root) {
  checkAndWarnAudio(root);
  const groups = [];

  for (const block of lesson.blocks || []) {
    const items = [];

    if (block.type === 'vocab_set') {
      for (const item of block.items || [])
        items.push({ ro: item.ro, en: item.en, note: item.note });

    } else if (block.type === 'phrase_highlight') {
      for (const item of block.items || [])
        items.push({ ro: item.ro, en: item.en });

    } else if (block.type === 'comparison') {
      for (const item of block.items || [])
        items.push({ ro: item.phrase, en: item.meaning, note: item.focus });

    } else if (block.type === 'qa_set') {
      for (const item of block.items || [])
        items.push({ ro: item.question_ro, en: item.question_en });

    } else if (block.type === 'intro') {
      for (const item of block.items || [])
        items.push({ ro: item.ro, en: item.en });

    } else if (block.type === 'table') {
      for (const row of block.rows || [])
        if (row.length >= 2) items.push({ ro: row[0], en: row[1] });
    }

    if (items.length) groups.push({ title: block.title, items });
  }

  if (!groups.length) {
    root.appendChild(el('p', 'placeholder', 'No vocabulary found for this lesson.'));
    return;
  }

  for (const group of groups) {
    const section = el('div', 'vocab-tab-section');
    if (group.title) section.appendChild(el('h3', 'vocab-tab-heading', group.title));
    const list = el('div', 'vocab-tab-list');
    for (const item of group.items) {
      const row = el('div', 'vocab-tab-row');
      row.appendChild(makeSpeakBtn(item.ro));
      row.appendChild(el('span', 'vocab-tab-ro', item.ro));
      row.appendChild(el('span', 'vocab-tab-en', item.en));
      if (item.note) row.appendChild(el('span', 'vocab-tab-note', item.note));
      list.appendChild(row);
    }
    section.appendChild(list);
    root.appendChild(section);
  }
}

function renderDialogueTab(lesson, root) {
  checkAndWarnAudio(root);
  const dlg = lesson.dialogue_practice;
  if (!dlg) {
    root.appendChild(el('p', 'placeholder', 'No dialogue practice for this lesson yet.'));
    return;
  }

  // Context note
  if (dlg.context) {
    const ctx = el('div', 'dlg-context');
    ctx.appendChild(el('span', 'dlg-ctx-icon', '💬'));
    ctx.appendChild(el('span', null, dlg.context));
    root.appendChild(ctx);
  }

  // Dialogue card — reuses existing dialogue block CSS
  const card = el('div', 'block dialogue toggleable');

  const header = el('div', 'block-header');
  if (dlg.title) {
    header.appendChild(el('h3', 'block-title', dlg.title));
    if (dlg.title_en) header.appendChild(el('div', 'block-subtitle', dlg.title_en));
  }
  const toggleBtn = el('button', 'toggle-en-btn', 'Hide English');
  toggleBtn.type = 'button';
  toggleBtn.addEventListener('click', () => {
    const hidden = card.classList.toggle('en-hidden');
    toggleBtn.textContent = hidden ? 'Show English' : 'Hide English';
  });
  header.appendChild(toggleBtn);
  card.appendChild(header);

  const speakers = dlg.speakers || [];
  const speakerSlot = (name) => {
    const idx = speakers.indexOf(name);
    return idx < 0 ? 0 : idx % 2;
  };

  const lines = el('div', 'dialogue-lines');
  for (const line of dlg.lines || []) {
    const slot = speakerSlot(line.speaker);
    const wrap = el('div', `dialogue-line speaker-${slot}`);
    wrap.appendChild(el('div', 'speaker-name', line.speaker));
    const bubble = el('div', 'bubble');
    const bubbleTop = el('div', 'bubble-top');
    bubbleTop.appendChild(el('span', 'ro', line.ro));
    bubbleTop.appendChild(makeSpeakBtn(line.ro));
    bubble.appendChild(bubbleTop);
    bubble.appendChild(el('div', 'en', line.en));
    wrap.appendChild(bubble);
    lines.appendChild(wrap);
  }
  card.appendChild(lines);
  root.appendChild(card);

  // New words
  if (dlg.new_words?.length) {
    const section = el('div', 'dlg-new-words');
    section.appendChild(el('div', 'dlg-new-words-heading', 'New words in this dialogue'));
    const grid = el('div', 'vocab-grid');
    for (const word of dlg.new_words) {
      const wCard = el('div', 'vocab-card');
      wCard.appendChild(el('div', 'ro', word.ro));
      wCard.appendChild(el('div', 'en', word.en));
      if (word.note) wCard.appendChild(el('div', 'item-note', word.note));
      grid.appendChild(wCard);
    }
    section.appendChild(grid);
    root.appendChild(section);
  }
}

export function renderAllExercisesView(allLessons, root) {
  root.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'lesson-header';

  const num = document.createElement('div');
  num.className = 'lesson-num';
  num.textContent = 'Cumulative practice';
  header.appendChild(num);

  const title = document.createElement('h2');
  title.className = 'lesson-title-en';
  title.textContent = 'All exercises';
  header.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'lesson-title-ro';
  sub.textContent = 'Pulled from every lesson you have opened — shuffled every round.';
  header.appendChild(sub);

  root.appendChild(header);

  const body = document.createElement('div');
  body.className = 'lesson-body';
  body.style.marginTop = '24px';
  root.appendChild(body);

  renderAllExercises(allLessons, body);
}

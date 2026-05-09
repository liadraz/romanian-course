// Top-level lesson renderer. Builds the lesson header + tabs and dispatches
// to the appropriate tab renderer: learn, vocabulary, practice, stories.
// Also exports renderHomePage for the #/ route.

import { renderBlock } from './blocks.js';
import { renderPracticeForLesson } from './exercises.js';
import { speak, getRoVoice, buildNoVoiceWarning } from './audio.js';
import { state } from './state.js';
import { getBookProgress } from './book.js';

const TAB_LABELS = {
  vocabulary: 'Vocabulary',
  learn: 'Learn',
  practice: 'Practice',
  stories: 'Stories',
};

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

function makeBackToTopBtn() {
  const btn = el('button', 'back-to-top-btn', '↑');
  btn.type = 'button';
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  return btn;
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
function checkAndWarnAudio(root) {
  getRoVoice().then((voice) => {
    if (!voice) root.insertBefore(buildNoVoiceWarning(), root.firstChild);
  });
}

// ---- Home page ----

export function renderHomePage(lessons, manifest, root, bookManifestData) {
  root.innerHTML = '';

  // Hero
  const hero = el('div', 'home-hero');
  const flagDiv = el('div', 'home-flag');
  flagDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" class="ro-flag-svg"><rect width="1" height="2" fill="#002B7F"/><rect x="1" width="1" height="2" fill="#FCD116"/><rect x="2" width="1" height="2" fill="#CE1126"/></svg>';
  hero.appendChild(flagDiv);
  const heading = el('h1', 'home-heading', 'Limba Română');
  hero.appendChild(heading);
  hero.appendChild(el('p', 'home-subtitle', 'Learn Romanian — one lesson at a time'));

  root.appendChild(hero);

  if (!lessons.length) return;

  root.appendChild(el('div', 'home-lessons-heading', 'Private Lessons'));

  const grid = el('div', 'home-cards-grid');

  for (const lesson of lessons) {
    const card = el('div', 'home-lesson-card');
    card.appendChild(el('div', 'hlc-num', `Lesson ${lesson.lesson_number}`));
    card.appendChild(el('div', 'hlc-title', lesson.title));

    // Progress bar
    const total = lesson.exercises?.length || 0;
    const correct = total
      ? lesson.exercises.filter((ex) => state.correctExercises.includes(ex.id)).length
      : 0;
    const pct = total ? Math.round((correct / total) * 100) : 0;

    const barWrap = el('div', 'hlc-progress-bar');
    const fill = el('div', 'hlc-progress-fill');
    fill.style.width = `${pct}%`;
    barWrap.appendChild(fill);
    card.appendChild(barWrap);
    card.appendChild(el('div', 'hlc-progress-label', total ? `${correct} / ${total} exercises` : 'No exercises yet'));

    // Shortcut buttons
    const shortcuts = el('div', 'hlc-shortcuts');
    const n = lesson.lesson_number;
    for (const [tab, label] of [['vocabulary', 'Vocabulary'], ['learn', 'Learn'], ['practice', 'Practice'], ['stories', 'Stories']]) {
      const a = el('a', null, label);
      a.href = `#/lesson/${n}/${tab}`;
      shortcuts.appendChild(a);
    }
    card.appendChild(shortcuts);
    grid.appendChild(card);
  }

  root.appendChild(grid);

  // Textbook section
  if (bookManifestData?.chapters?.length) {
    root.appendChild(el('div', 'home-section-heading', '📖 Textbook'));
    const bookGrid = el('div', 'book-cards-grid');
    const bookProg = getBookProgress();

    for (const ch of bookManifestData.chapters) {
      const card = el('div', 'book-home-card');
      card.appendChild(el('div', 'book-home-card-num', `Chapter ${ch.n}`));
      card.appendChild(el('div', 'book-home-card-title', ch.title));
      card.appendChild(el('div', 'book-home-card-subtitle', ch.title_en));

      const completed = (bookProg[String(ch.n)]?.completed_steps || []).length;
      const total = ch.step_count;

      const progressTrack = el('div', 'book-home-progress-track');
      const progressFill = el('div', 'book-home-progress-fill');
      progressFill.style.width = `${total ? Math.round((completed / total) * 100) : 0}%`;
      progressTrack.appendChild(progressFill);
      card.appendChild(progressTrack);
      card.appendChild(el('div', 'book-home-progress-label', `${completed} / ${total} steps`));

      const startBtn = el('a', 'book-home-start', 'Start chapter →');
      startBtn.href = `#/book/${ch.n}/1`;
      card.appendChild(startBtn);

      bookGrid.appendChild(card);
    }
    root.appendChild(bookGrid);
  }

  root.appendChild(makeBackToTopBtn());
}

// ---- Lesson view ----

export function renderLessonView(lesson, root, activeTab = 'vocabulary') {
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
  for (const tab of ['vocabulary', 'learn', 'practice', 'stories']) {
    const a = document.createElement('a');
    a.href = `#/lesson/${lesson.lesson_number}/${tab}`;
    a.textContent = TAB_LABELS[tab];
    if (tab === activeTab) a.classList.add('active');
    tabs.appendChild(a);
  }
  root.appendChild(tabs);

  const body = document.createElement('div');
  body.className = 'lesson-body';
  root.appendChild(body);

  if (activeTab === 'vocabulary') {
    renderVocabularyTab(lesson, body);
  } else if (activeTab === 'practice') {
    renderPracticeForLesson(lesson, body);
  } else if (activeTab === 'stories') {
    renderStoriesTab(lesson, body);
  } else {
    // 'learn' tab — render blocks
    for (const block of lesson.blocks || []) {
      const elBlock = renderBlock(block);
      if (elBlock) body.appendChild(elBlock);
    }
  }

  body.appendChild(makeBackToTopBtn());
}

// ---- Vocabulary tab with Words / Sentences sub-tabs ----

function renderVocabularyTab(lesson, root) {
  checkAndWarnAudio(root);

  // Collect all items with their block context
  const words = [];      // vocab_set items with 1-2 word Romanian strings
  const sentences = [];  // everything else

  for (const block of lesson.blocks || []) {
    if (block.type === 'vocab_set') {
      for (const item of block.items || []) {
        const entry = { ro: item.ro, en: item.en, note: item.note, heading: block.title };
        const wordCount = item.ro.trim().split(/\s+/).length;
        if (wordCount <= 2) words.push(entry);
        else sentences.push(entry);
      }
    } else if (block.type === 'phrase_highlight') {
      for (const item of block.items || [])
        sentences.push({ ro: item.ro, en: item.en, heading: block.title });
    } else if (block.type === 'comparison') {
      for (const item of block.items || [])
        sentences.push({ ro: item.phrase, en: item.meaning, note: item.focus, heading: block.title });
    } else if (block.type === 'qa_set') {
      for (const item of block.items || [])
        sentences.push({ ro: item.question_ro, en: item.question_en, heading: block.title });
    } else if (block.type === 'intro') {
      for (const item of block.items || []) {
        const entry = { ro: item.ro, en: item.en, heading: block.title };
        const wordCount = item.ro.trim().split(/\s+/).length;
        if (wordCount <= 2) words.push(entry);
        else sentences.push(entry);
      }
    } else if (block.type === 'table') {
      for (const row of block.rows || [])
        if (row.length >= 2) {
          const entry = { ro: row[0], en: row[1], heading: block.title };
          const wordCount = String(row[0]).trim().split(/\s+/).length;
          if (wordCount <= 2) words.push(entry);
          else sentences.push(entry);
        }
    }
  }

  if (!words.length && !sentences.length) {
    root.appendChild(el('p', 'placeholder', 'No vocabulary found for this lesson.'));
    return;
  }

  // Sub-tab pills
  const pills = el('div', 'vocab-subtabs');
  const containers = [];

  ['Words', 'Sentences & Phrases'].forEach((label, i) => {
    const btn = el('button', 'vocab-subtab' + (i === 0 ? ' active' : ''), label);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      pills.querySelectorAll('.vocab-subtab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      containers.forEach((c, j) => (c.hidden = j !== i));
    });
    pills.appendChild(btn);

    const pane = el('div', 'vocab-subtab-pane');
    pane.hidden = i !== 0;
    containers.push(pane);
  });

  root.appendChild(pills);

  // Words pane
  buildVocabList(words.length ? words : [{ ro: '—', en: 'No single words in this lesson.' }], containers[0]);
  // Sentences pane
  buildVocabList(sentences.length ? sentences : [{ ro: '—', en: 'No phrases in this lesson.' }], containers[1]);

  containers.forEach((c) => root.appendChild(c));
}

function buildVocabList(items, container) {
  const list = el('div', 'vocab-tab-list');
  for (const item of items) {
    const row = el('div', 'vocab-tab-row');
    const speakBtn = makeSpeakBtn(item.ro);
    const roSpan = el('span', 'vocab-tab-ro', item.ro);
    const enSpan = el('span', 'vocab-tab-en', item.en);
    row.appendChild(speakBtn);
    row.appendChild(roSpan);
    row.appendChild(enSpan);
    if (item.note) row.appendChild(el('span', 'vocab-tab-note', item.note));
    list.appendChild(row);
  }
  container.appendChild(list);
}

// ---- Stories tab ----

function renderStoriesTab(lesson, root) {
  checkAndWarnAudio(root);
  const s = lesson.stories;
  if (!s) {
    root.appendChild(el('p', 'placeholder', 'No stories yet for this lesson.'));
    return;
  }

  // Wrapper that toggleable targets
  const wrapper = el('div', 'toggleable');

  // Toggle button (affects dialogue bubbles + story prose)
  const toggleBtn = el('button', 'toggle-en-btn', 'Hide English');
  toggleBtn.type = 'button';
  toggleBtn.addEventListener('click', () => {
    const hidden = wrapper.classList.toggle('en-hidden');
    toggleBtn.textContent = hidden ? 'Show English' : 'Hide English';
  });

  const toggleRow = el('div', 'stories-toggle-row');
  toggleRow.appendChild(toggleBtn);
  root.appendChild(toggleRow);
  root.appendChild(wrapper);

  // — New words —
  if (s.new_words?.length) {
    const section = el('div', 'story-new-words');
    section.appendChild(el('div', 'story-new-words-heading', 'New words in this story'));
    const grid = el('div', 'vocab-grid');
    for (const word of s.new_words) {
      const wCard = el('div', 'vocab-card');
      const top = el('div', 'bubble-top');
      top.appendChild(el('span', 'ro', word.ro));
      top.appendChild(makeSpeakBtn(word.ro));
      wCard.appendChild(top);
      wCard.appendChild(el('div', 'en', word.en));
      if (word.note) wCard.appendChild(el('div', 'item-note', word.note));
      grid.appendChild(wCard);
    }
    section.appendChild(grid);
    wrapper.appendChild(section);
  }

  // — Dialogue —
  if (s.dialogue?.length) {
    const card = el('div', 'block dialogue');
    const cardHeader = el('div', 'block-header');
    if (s.title) {
      cardHeader.appendChild(el('h3', 'block-title', s.title));
      if (s.title_en) cardHeader.appendChild(el('div', 'block-subtitle', s.title_en));
    }
    card.appendChild(cardHeader);

    const speakers = s.speakers || [...new Set(s.dialogue.map((l) => l.speaker))];
    const speakerSlot = (name) => {
      const idx = speakers.indexOf(name);
      return idx < 0 ? 0 : idx % 2;
    };

    const lines = el('div', 'dialogue-lines');
    for (const line of s.dialogue) {
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
    wrapper.appendChild(card);
  }

  // — Story prose —
  if (s.story) {
    const prose = el('div', 'story-prose');
    const roP = el('p', 'story-ro', s.story);
    prose.appendChild(roP);
    if (s.story_en) {
      const enP = el('p', 'story-en en', s.story_en);
      prose.appendChild(enP);
    }
    wrapper.appendChild(prose);
  }
}


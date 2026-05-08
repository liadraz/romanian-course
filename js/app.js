// App entry point: routing, sidebar, page lifecycle.

import { loadManifest, loadLesson, loadBookManifest } from './data.js';
import { renderLessonView, renderHomePage } from './render.js';
import { state, markLessonOpened, isLessonComplete } from './state.js';
import { renderBookShell, getBookProgress } from './book.js';

const lessonNavEl = document.getElementById('lesson-nav');
const contentEl = document.getElementById('content');
const sidebarEl = document.getElementById('sidebar');
const backdropEl = document.getElementById('sidebar-backdrop');
const menuToggleEl = document.getElementById('menu-toggle');

let manifest = null;
let bookManifest = null;
const lessonByNumber = new Map();

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

async function init() {
  try {
    manifest = await loadManifest();
  } catch (e) {
    showLoadError(e);
    return;
  }

  // Preload all lessons so the sidebar can show titles + completion checks.
  await Promise.all(
    manifest.map(async (entry) => {
      try {
        const lesson = await loadLesson(entry.file);
        lessonByNumber.set(entry.number, lesson);
      } catch (err) {
        console.warn(`Failed to preload ${entry.file}`, err);
      }
    })
  );

  try {
    bookManifest = await loadBookManifest();
  } catch {
    // Book not available yet — silently skip
  }

  renderSidebar();

  window.addEventListener('hashchange', route);
  window.addEventListener('romanian:progress', renderSidebar);
  window.addEventListener('book:progress', renderSidebar);
  menuToggleEl.addEventListener('click', toggleSidebar);
  backdropEl.addEventListener('click', closeSidebar);

  location.hash = '#/';
  await route();
}

function showLoadError(err) {
  contentEl.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'error';
  p.innerHTML =
    'Could not load lesson data. ES modules need a local server — open a terminal in the project folder and run:<br><br>' +
    '<code>python -m http.server 8000</code><br><br>' +
    'Then visit <code>http://localhost:8000</code>.';
  contentEl.appendChild(p);
  console.error(err);
}

function renderSidebar() {
  lessonNavEl.innerHTML = '';

  // Home button at top
  const homeLink = el('a', 'sidebar-home-link');
  homeLink.href = '#/';
  homeLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" class="ro-flag-svg ro-flag-sm"><rect width="1" height="2" fill="#002B7F"/><rect x="1" width="1" height="2" fill="#FCD116"/><rect x="2" width="1" height="2" fill="#CE1126"/></svg> Limba Română';
  lessonNavEl.appendChild(homeLink);

  const divider = document.createElement('hr');
  divider.className = 'sidebar-divider';
  lessonNavEl.appendChild(divider);

  for (const entry of manifest) {
    const a = document.createElement('a');
    a.href = `#/lesson/${entry.number}/vocabulary`;
    a.className = 'lesson-link';
    a.dataset.lesson = String(entry.number);

    const num = document.createElement('span');
    num.className = 'll-num';
    num.textContent = `Lesson ${entry.number}`;
    a.appendChild(num);

    const lesson = lessonByNumber.get(entry.number);
    if (lesson) {
      const title = document.createElement('span');
      title.className = 'll-title';
      title.textContent = lesson.title;
      a.appendChild(title);

      const total = lesson.exercises?.length || 0;
      if (total > 0) {
        if (isLessonComplete(lesson)) {
          const check = document.createElement('span');
          check.className = 'll-check';
          check.textContent = '✓';
          check.title = 'All exercises answered correctly';
          a.appendChild(check);
        } else {
          const correct = lesson.exercises.filter(
            (ex) => state.correctExercises.includes(ex.id)
          ).length;
          if (correct > 0) {
            const prog = document.createElement('span');
            prog.className = 'll-progress';
            prog.textContent = `${correct}/${total}`;
            prog.title = `${correct} of ${total} exercises answered correctly`;
            a.appendChild(prog);
          }
        }
      }
    }

    if (state.openedLessons.includes(entry.number)) a.classList.add('opened');
    lessonNavEl.appendChild(a);
  }

  // Textbook section
  if (bookManifest?.chapters?.length) {
    const divider2 = document.createElement('hr');
    divider2.className = 'sidebar-divider';
    lessonNavEl.appendChild(divider2);

    lessonNavEl.appendChild(el('div', 'sidebar-book-heading', '📖 Textbook'));

    const prog = getBookProgress();
    for (const ch of bookManifest.chapters) {
      const a = document.createElement('a');
      a.href = `#/book/${ch.n}/1`;
      a.className = 'lesson-link book-chapter-link';
      a.dataset.chapter = String(ch.n);

      const num = el('span', 'll-num', `Chapter ${ch.n}`);
      a.appendChild(num);

      const title = el('span', 'll-title', ch.title);
      a.appendChild(title);

      const completed = (prog[String(ch.n)]?.completed_steps || []).length;
      if (completed > 0) {
        const progress = el('span', 'll-progress', `${completed}/${ch.step_count}`);
        a.appendChild(progress);
      }

      lessonNavEl.appendChild(a);
    }
  }

  highlightActive();
}

function highlightActive() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/');
  const isHome = !hash || hash === '/' || parts[0] === '';
  const lessonNum = parts[0] === 'lesson' ? parts[1] : null;
  const chapterNum = parts[0] === 'book' ? parts[1] : null;

  // Highlight home link
  const homeLink = lessonNavEl.querySelector('.sidebar-home-link');
  if (homeLink) homeLink.classList.toggle('active', isHome);

  for (const a of lessonNavEl.querySelectorAll('.lesson-link:not(.book-chapter-link)')) {
    a.classList.toggle('active', a.dataset.lesson === lessonNum);
  }

  for (const a of lessonNavEl.querySelectorAll('.book-chapter-link')) {
    a.classList.toggle('active', a.dataset.chapter === chapterNum);
  }

}

async function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/');
  closeSidebar();
  document.body.classList.remove('book-active');

  // Home route
  if (!hash || hash === '/' || parts[0] === '') {
    const allLessons = [...lessonByNumber.values()];
    renderHomePage(allLessons, manifest, contentEl, bookManifest);
    document.title = 'Limba Română';
    highlightActive();
    window.scrollTo({ top: 0 });
    return;
  }

  if (parts[0] === 'lesson') {
    const num = parseInt(parts[1], 10);
    const validTabs = ['vocabulary', 'learn', 'practice', 'stories'];
    const tab = validTabs.includes(parts[2]) ? parts[2] : 'vocabulary';
    const entry = manifest.find((m) => m.number === num);
    if (!entry) {
      contentEl.innerHTML = `<p class="error">Lesson ${parts[1]} not found.</p>`;
      return;
    }

    let lesson = lessonByNumber.get(num);
    if (!lesson) {
      try {
        lesson = await loadLesson(entry.file);
        lessonByNumber.set(num, lesson);
      } catch (e) {
        contentEl.innerHTML = `<p class="error">Failed to load lesson ${num}.</p>`;
        return;
      }
    }

    markLessonOpened(num);
    renderSidebar();
    renderLessonView(lesson, contentEl, tab);
    document.title = `Lesson ${num} — ${lesson.title}`;
    window.scrollTo({ top: 0 });
  } else if (parts[0] === 'book') {
    document.body.classList.add('book-active');
    const chN = parseInt(parts[1], 10) || 1;
    const stN = parseInt(parts[2], 10) || 1;
    await renderBookShell(chN, stN, contentEl);
    const chTitle = bookManifest?.chapters?.find((c) => c.n === chN)?.title || '';
    document.title = `Chapter ${chN}${chTitle ? ' · ' + chTitle : ''} — Romanian Textbook`;
    highlightActive();
  } else {
    contentEl.innerHTML = '<p class="placeholder">Pick a lesson from the sidebar.</p>';
  }
}

function toggleSidebar() {
  const open = document.body.classList.toggle('sidebar-open');
  menuToggleEl.setAttribute('aria-expanded', String(open));
}

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
  menuToggleEl.setAttribute('aria-expanded', 'false');
}

init();

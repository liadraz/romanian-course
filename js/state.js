// Persistent progress in localStorage. Single user, no backend.

const KEY = 'romanian-app-state-v1';

const defaults = {
  openedLessons: [],
  attemptedExercises: [],
  correctExercises: []
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Ignore quota / private mode failures.
  }
}

export const state = load();

export function markLessonOpened(num) {
  if (!state.openedLessons.includes(num)) {
    state.openedLessons.push(num);
    save(state);
  }
}

export function markExerciseAttempted(id) {
  if (!state.attemptedExercises.includes(id)) {
    state.attemptedExercises.push(id);
    save(state);
  }
}

export function markExerciseCorrect(id) {
  if (!state.correctExercises.includes(id)) {
    state.correctExercises.push(id);
    save(state);
    window.dispatchEvent(new CustomEvent('romanian:progress'));
  }
}

export function isLessonComplete(lesson) {
  if (!lesson?.exercises?.length) return false;
  return lesson.exercises.every((ex) => state.correctExercises.includes(ex.id));
}

export function resetProgress() {
  state.openedLessons = [];
  state.attemptedExercises = [];
  state.correctExercises = [];
  save(state);
}

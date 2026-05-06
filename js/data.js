// Loads the lesson manifest and individual lesson JSON files.
// Caches results so we never refetch.

let manifestCache = null;
const lessonCache = new Map();

export async function loadManifest() {
  if (manifestCache) return manifestCache;
  const r = await fetch('data/lessons.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('Failed to load data/lessons.json');
  manifestCache = await r.json();
  return manifestCache;
}

export async function loadLesson(file) {
  if (lessonCache.has(file)) return lessonCache.get(file);
  const r = await fetch(`data/${file}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Failed to load data/${file}`);
  const lesson = await r.json();
  lessonCache.set(file, lesson);
  return lesson;
}

let bookManifestCache = null;
const bookChapterCache = new Map();

export async function loadBookManifest() {
  if (bookManifestCache) return bookManifestCache;
  const r = await fetch('data/book.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('Failed to load data/book.json');
  bookManifestCache = await r.json();
  return bookManifestCache;
}

export async function loadBookChapterData(n) {
  const key = String(n);
  if (bookChapterCache.has(key)) return bookChapterCache.get(key);
  const padded = String(n).padStart(2, '0');
  const r = await fetch(`data/book_${padded}.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Failed to load data/book_${padded}.json`);
  const chapter = await r.json();
  bookChapterCache.set(key, chapter);
  return chapter;
}

export async function loadAllLessons() {
  const manifest = await loadManifest();
  const lessons = await Promise.all(
    manifest.map(async (entry) => {
      try {
        const lesson = await loadLesson(entry.file);
        return { entry, lesson };
      } catch (e) {
        console.warn('Skipping lesson, failed to load:', entry, e);
        return { entry, lesson: null };
      }
    })
  );
  return lessons;
}

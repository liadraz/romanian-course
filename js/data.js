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

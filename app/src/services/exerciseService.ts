import bundledData from '../data/all_exercises.json';
import type { Exercise } from '../types/exercise';

const LIVE_DATA_URL = 'https://raw.githubusercontent.com/rthepen/workout-database/main/dist/all_exercises.json';
const STORAGE_KEY = 'workout_db_custom_edits_v2';

export async function fetchAllExercises(forceLive: boolean = false): Promise<{ exercises: Exercise[]; isLive: boolean }> {
  let baseExercises: Exercise[] = bundledData as unknown as Exercise[];
  let isLive = false;

  if (forceLive) {
    resetLocalEdits();
  }

  // Attempt to fetch fresh live data from GitHub (with cache busting)
  try {
    const res = await fetch(`${LIVE_DATA_URL}?t=${Date.now()}`, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length >= baseExercises.length) {
        baseExercises = data as Exercise[];
        isLive = true;
      }
    }
  } catch (err) {
    console.warn('Live fetch failed, using bundled database snapshot:', err);
  }

  // Check if we have local storage modified state (unless forceLive is true)
  if (!forceLive) {
    const cachedEdits = localStorage.getItem(STORAGE_KEY);
    if (cachedEdits) {
      try {
        const parsed = JSON.parse(cachedEdits);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge local edits into baseExercises by ID, preserving all new exercises
          const localMap = new Map<string, Exercise>(parsed.map((e: Exercise) => [e.id, e]));
          const merged = baseExercises.map(e => localMap.get(e.id) || e);

          // Also include any newly created custom exercises added locally
          parsed.forEach((e: Exercise) => {
            if (!merged.some(m => m.id === e.id)) {
              merged.unshift(e);
            }
          });

          return { exercises: merged, isLive: false };
        }
      } catch {
        // Fallback
      }
    }
  }

  return { exercises: baseExercises, isLive };
}

export function getModifiedExercises(current: Exercise[], base: Exercise[] = bundledData as unknown as Exercise[]): Exercise[] {
  const baseMap = new Map<string, Exercise>(base.map(e => [e.id, e]));
  return current.filter(curr => {
    const orig = baseMap.get(curr.id);
    if (!orig) return true; // new exercise
    return JSON.stringify(curr) !== JSON.stringify(orig);
  });
}

export function saveExercisesToLocal(exercises: Exercise[], baseExercises?: Exercise[]) {
  try {
    const base = baseExercises || (bundledData as unknown as Exercise[]);
    const modified = getModifiedExercises(exercises, base);
    if (modified.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(modified));
    }
  } catch (err) {
    console.warn('localStorage save warning (quota or permission):', err);
  }
}

export function resetLocalEdits() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to reset local edits:', err);
  }
}


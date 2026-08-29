import bundledData from '../data/all_exercises.json';
import type { Exercise } from '../types/exercise';

const LIVE_DATA_URL = 'https://raw.githubusercontent.com/rthepen/workout-database/main/dist/all_exercises.json';
const STORAGE_KEY = 'workout_db_custom_edits_v1';

export async function fetchAllExercises(forceLive: boolean = false): Promise<{ exercises: Exercise[]; isLive: boolean }> {
  // Check if we have local storage modified state first (unless forceLive is true)
  if (!forceLive) {
    const cachedEdits = localStorage.getItem(STORAGE_KEY);
    if (cachedEdits) {
      try {
        const parsed = JSON.parse(cachedEdits);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { exercises: parsed, isLive: false };
        }
      } catch {
        // Fallback
      }
    }
  }

  // Attempt to fetch fresh live data from GitHub with fallback to bundled snapshot
  try {
    const res = await fetch(`${LIVE_DATA_URL}?t=${Date.now()}`, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      return { exercises: data as Exercise[], isLive: true };
    }
  } catch (err) {
    console.warn('Live fetch failed, using bundled database snapshot:', err);
  }

  return { exercises: bundledData as unknown as Exercise[], isLive: false };
}

export function saveExercisesToLocal(exercises: Exercise[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
}

export function resetLocalEdits() {
  localStorage.removeItem(STORAGE_KEY);
}

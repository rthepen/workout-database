import type { Exercise } from '../types/exercise';

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateExercise(exercise: Partial<Exercise>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!exercise.id || !/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(exercise.id)) {
    issues.push({ field: 'id', message: 'ID must be snake_case (e.g. equipment_slug_name).' });
  }

  if (!exercise.exercise_name?.en?.trim()) {
    issues.push({ field: 'exercise_name.en', message: 'English name is required.' });
  }
  if (!exercise.exercise_name?.nl?.trim()) {
    issues.push({ field: 'exercise_name.nl', message: 'Dutch name is required.' });
  }

  if (!exercise.target_muscles?.primary || exercise.target_muscles.primary.length === 0) {
    issues.push({ field: 'target_muscles.primary', message: 'At least 1 primary target muscle is required.' });
  }

  if (!exercise.instructions?.en || exercise.instructions.en.length === 0) {
    issues.push({ field: 'instructions.en', message: 'At least 1 English instruction step is required.' });
  }
  if (!exercise.instructions?.nl || exercise.instructions.nl.length === 0) {
    issues.push({ field: 'instructions.nl', message: 'At least 1 Dutch instruction step is required.' });
  }

  if (exercise.media?.videos) {
    exercise.media.videos.forEach((v, idx) => {
      if (!/^[a-zA-Z0-9_-]{11}$/.test(v.youtube_id)) {
        issues.push({ field: `media.videos[${idx}].youtube_id`, message: `Video #${idx+1} YouTube ID must be 11 characters.` });
      }
      if (v.priority < 1) {
        issues.push({ field: `media.videos[${idx}].priority`, message: `Video #${idx+1} priority must be >= 1.` });
      }
    });
  }

  return issues;
}

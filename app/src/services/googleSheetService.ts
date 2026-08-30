import type { Exercise } from '../types/exercise';

export const DEFAULT_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxIFilU31NyoVkXw1Xhpn4SxCKe7g60FV1sUgtB2Poxj_iqUo8seM_4BSq-UlAZ1GJa/exec';
const SHEET_STORAGE_KEY = 'workout_db_google_sheet_url';
const FINGERPRINT_KEY = 'workout_db_user_fingerprint';

/**
 * Get or generate persistent User Fingerprint
 */
export function getUserFingerprint(): string {
  let fp = localStorage.getItem(FINGERPRINT_KEY);
  if (!fp) {
    const nav = typeof window !== 'undefined' ? window.navigator : null;
    const screen = typeof window !== 'undefined' ? window.screen : null;
    const str = `${nav?.userAgent || ''}_${nav?.language || ''}_${screen?.width || 0}x${screen?.height || 0}_${Math.random().toString(36).substring(2, 10)}`;
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16);
    const rand = Math.random().toString(36).substring(2, 6);
    fp = `usr_fp_${hex}${rand}`;
    localStorage.setItem(FINGERPRINT_KEY, fp);
  }
  return fp;
}

export function getSavedGoogleSheetWebhook(): string {
  return localStorage.getItem(SHEET_STORAGE_KEY) || DEFAULT_SHEET_WEBHOOK_URL;
}

export function saveGoogleSheetWebhook(url: string) {
  localStorage.setItem(SHEET_STORAGE_KEY, url);
}

/**
 * Send an exercise or batch of exercises to Google Sheets backup webhook asynchronously
 * Always includes user_fingerprint and timestamp.
 */
export async function sendExerciseBackupToGoogleSheet(
  data: Exercise | Exercise[],
  customWebhookUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = customWebhookUrl || getSavedGoogleSheetWebhook();
  if (!webhookUrl) {
    return { success: false, error: 'No Google Sheet webhook URL configured.' };
  }

  const fingerprint = getUserFingerprint();
  const exercisesList = Array.isArray(data) ? data : [data];

  // Wrap payload with metadata & user fingerprint while embedding user_fingerprint on each exercise
  const payloadData = {
    user_fingerprint: fingerprint,
    timestamp: new Date().toISOString(),
    count: exercisesList.length,
    exercises: exercisesList.map(ex => ({
      ...ex,
      _user_fingerprint: fingerprint,
    })),
  };

  try {
    const payload = JSON.stringify(payloadData);
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: payload,
    });
    return { success: true };
  } catch (err: any) {
    console.warn('Google Sheet backup fetch warning:', err);
    return { success: false, error: err?.toString() || 'Failed to send backup payload.' };
  }
}

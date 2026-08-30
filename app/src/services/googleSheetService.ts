import type { Exercise } from '../types/exercise';

export const DEFAULT_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxIFilU31NyoVkXw1Xhpn4SxCKe7g60FV1sUgtB2Poxj_iqUo8seM_4BSq-UlAZ1GJa/exec';
const SHEET_STORAGE_KEY = 'workout_db_google_sheet_url';

export function getSavedGoogleSheetWebhook(): string {
  return localStorage.getItem(SHEET_STORAGE_KEY) || DEFAULT_SHEET_WEBHOOK_URL;
}

export function saveGoogleSheetWebhook(url: string) {
  localStorage.setItem(SHEET_STORAGE_KEY, url);
}

/**
 * Send an exercise or batch of exercises to Google Sheets backup webhook asynchronously
 */
export async function sendExerciseBackupToGoogleSheet(
  data: Exercise | Exercise[],
  customWebhookUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = customWebhookUrl || getSavedGoogleSheetWebhook();
  if (!webhookUrl) {
    return { success: false, error: 'No Google Sheet webhook URL configured.' };
  }

  try {
    const payload = JSON.stringify(data);
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

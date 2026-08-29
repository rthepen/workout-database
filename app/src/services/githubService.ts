import type { Exercise } from '../types/exercise';

const GITHUB_TOKEN_KEY = 'workout_db_github_pat_v1';
const REPO_OWNER = 'rthepen';
const REPO_NAME = 'workout-database';

export function getSavedGitHubToken(): string {
  return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
}

export function saveGitHubToken(token: string): void {
  const clean = token.trim();
  if (clean) {
    localStorage.setItem(GITHUB_TOKEN_KEY, clean);
  } else {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
  }
}

export function removeGitHubToken(): void {
  localStorage.removeItem(GITHUB_TOKEN_KEY);
}

export interface PRResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  branchName?: string;
  error?: string;
}

export async function submitDirectPullRequest(
  exercises: Exercise[],
  modifiedExercise?: Exercise | null,
  customToken?: string
): Promise<PRResult> {
  const token = customToken || getSavedGitHubToken();
  if (!token) {
    return {
      success: false,
      error: 'No GitHub Personal Access Token configured. Please provide a PAT with repo scope.',
    };
  }

  const repo = `${REPO_OWNER}/${REPO_NAME}`;
  const timestamp = Date.now();
  const branchName = modifiedExercise 
    ? `audit-${modifiedExercise.id}-${timestamp}`
    : `audit-batch-${timestamp}`;

  try {
    // 1. Get default branch ('main') reference SHA
    const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/main`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!refRes.ok) {
      if (refRes.status === 401 || refRes.status === 403) {
        throw new Error('Invalid GitHub Token or insufficient permissions (requires "repo" scope).');
      }
      throw new Error(`Failed to read repository ref: ${refRes.statusText}`);
    }

    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    // 2. Create new branch from main
    const branchRes = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    });

    if (!branchRes.ok) {
      throw new Error(`Failed to create branch "${branchName}": ${branchRes.statusText}`);
    }

    // 3. Update the exercise file on the new branch
    // If single modified exercise, update data/${material}.json if possible, or dist/all_exercises.json
    let filePath = 'dist/all_exercises.json';
    let fileContent = JSON.stringify(exercises, null, 2);

    const materialId = modifiedExercise?.material?.id;
    if (materialId && modifiedExercise) {
      const dataFilePath = `data/${materialId}.json`;
      const dataFileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${dataFilePath}?ref=${branchName}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        },
      });

      if (dataFileRes.ok) {
        const dataFileData = await dataFileRes.json();
        const rawContent = decodeURIComponent(escape(atob(dataFileData.content.replace(/\n/g, ''))));
        try {
          const categoryExercises: Exercise[] = JSON.parse(rawContent);
          const updatedCategory = categoryExercises.map(e => e.id === modifiedExercise.id ? modifiedExercise : e);
          if (!updatedCategory.some(e => e.id === modifiedExercise.id)) {
            updatedCategory.push(modifiedExercise);
          }
          filePath = dataFilePath;
          fileContent = JSON.stringify(updatedCategory, null, 2);
        } catch {
          // fallback to all_exercises.json
        }
      }
    }

    // Get current SHA of target file on the new branch
    const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branchName}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!fileRes.ok) {
      throw new Error(`Failed to read file ${filePath} from repository.`);
    }

    const fileData = await fileRes.json();
    const contentBase64 = btoa(unescape(encodeURIComponent(fileContent)));

    const updateRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        message: `data(${modifiedExercise?.id || 'audit'}): update exercise verification & timestamps`,
        content: contentBase64,
        sha: fileData.sha,
        branch: branchName,
      }),
    });

    if (!updateRes.ok) {
      throw new Error(`Failed to commit file update to branch: ${updateRes.statusText}`);
    }

    // 4. Open Pull Request to 'main'
    const prTitle = modifiedExercise
      ? `data(exercise): update ${modifiedExercise.exercise_name?.en || modifiedExercise.id} (${modifiedExercise.id})`
      : `data(audit): batch exercise verification & timestamps`;

    const prBody = `### 🏋️ Automated Exercise Verification & Audit Contribution

**Target Repository:** \`${repo}\`
**Target File:** \`${filePath}\`
**Exercise ID:** \`${modifiedExercise?.id || 'Batch'}\`
**Exercise Name:** \`${modifiedExercise?.exercise_name?.en || 'Multiple'}\`
**Timestamp:** \`${new Date().toISOString()}\`

---
*Generated automatically via Workout Database Verification & Audit Web App (1-Click PR Flow).*`;

    const prRes = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify({
        title: prTitle,
        head: branchName,
        base: 'main',
        body: prBody,
      }),
    });

    if (!prRes.ok) {
      throw new Error(`Failed to create Pull Request: ${prRes.statusText}`);
    }

    const prResult = await prRes.json();
    return {
      success: true,
      prUrl: prResult.html_url,
      prNumber: prResult.number,
      branchName,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An error occurred during PR creation.',
    };
  }
}

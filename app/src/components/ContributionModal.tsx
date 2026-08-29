import React, { useState, useEffect } from 'react';
import { X, Copy, Check, GitPullRequest, AlertCircle, ExternalLink, Key } from 'lucide-react';
import type { Exercise } from '../types/exercise';
import { getSavedGitHubToken, saveGitHubToken, submitDirectPullRequest } from '../services/githubService';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  modifiedExercise?: Exercise | null;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  exercises,
  modifiedExercise,
}) => {
  const [copiedJSON, setCopiedJSON] = useState<boolean>(false);
  const [githubToken, setGithubToken] = useState<string>('');
  const [prStatus, setPrStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [prError, setPrError] = useState<string>('');
  const [prUrl, setPrUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setGithubToken(getSavedGitHubToken());
      setPrStatus('idle');
      setPrError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPayload = modifiedExercise 
    ? JSON.stringify(modifiedExercise, null, 2)
    : JSON.stringify(exercises, null, 2);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(currentPayload);
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  // Generate pre-filled zero-login GitHub Issue URL
  const generateIssueUrl = () => {
    const title = modifiedExercise
      ? `[Exercise Update]: ${modifiedExercise.id} (${modifiedExercise.exercise_name?.en})`
      : `[Database Audit]: Dataset Verification & Timestamps`;

    const body = `### 🏋️ Workout Database Contribution Payload

**Target Repository:** \`rthepen/workout-database\`
**Exercise ID:** \`${modifiedExercise?.id || 'Multiple'}\`
**Updated At:** \`${modifiedExercise?.meta?.updated_at || new Date().toISOString().split('T')[0]}\`

\`\`\`json
${currentPayload}
\`\`\`

---
*Generated via Workout Database Verification & Audit Web App*`;

    return `https://github.com/rthepen/workout-database/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  };

  // Direct GitHub PR Submission using githubService
  const handleDirectPR = async () => {
    if (!githubToken.trim()) {
      alert('Please enter a GitHub Personal Access Token with repo scope.');
      return;
    }

    saveGitHubToken(githubToken);
    setPrStatus('submitting');
    setPrError('');

    const res = await submitDirectPullRequest(exercises, modifiedExercise, githubToken);

    if (res.success && res.prUrl) {
      setPrUrl(res.prUrl);
      setPrStatus('success');
    } else {
      setPrError(res.error || 'Failed to create Pull Request.');
      setPrStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Contribution & Export Engine</h2>
              <p className="text-xs text-slate-400">Export verified JSON or submit directly to rthepen/workout-database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option 1: Direct GitHub PR Flow (Instant when token saved) */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              Method 1 • Direct Automated Pull Request (Saved in Browser)
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
              Instant 1-Click
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Provide a GitHub Personal Access Token (PAT) with <code className="text-sky-300 font-mono">repo</code> scope once. It is stored safely in your browser so you can submit PRs in 1 click without opening this menu.
          </p>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  saveGitHubToken(e.target.value);
                }}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 text-xs text-white rounded focus:outline-none focus:border-brand-500 font-mono"
              />
              <a
                href="https://github.com/settings/tokens/new?description=Workout+Database+Web+App&scopes=repo"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs rounded border border-slate-700 flex items-center gap-1 whitespace-nowrap transition"
                title="Create a new token on GitHub in 1 click"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Create Token on GitHub</span>
              </a>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleDirectPR}
                disabled={prStatus === 'submitting'}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded shadow transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>{prStatus === 'submitting' ? 'Creating Branch & PR...' : 'Submit Direct Pull Request'}</span>
              </button>

              {prStatus === 'success' && (
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Check className="w-3.5 h-3.5" /> View PR on GitHub
                </a>
              )}
            </div>

            {prStatus === 'error' && (
              <div className="flex items-center gap-1 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{prError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Option 2: Zero-Login GitHub Issue */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
              Method 2 • Zero-Login Issue Submission (Alternative)
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              No Token Required
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Open a pre-filled GitHub Issue on the official repository without needing any personal access token.
          </p>
          <a
            href={generateIssueUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Pre-filled GitHub Issue</span>
          </a>
        </div>

        {/* Option 3: Raw JSON Copy */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Method 3 • Copy Validated JSON Payload
            </span>
            <button
              onClick={handleCopyJSON}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
            >
              {copiedJSON ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedJSON ? 'Copied to Clipboard' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono text-slate-300 max-h-40 overflow-y-auto">
            {currentPayload}
          </pre>
        </div>
      </div>
    </div>
  );
};

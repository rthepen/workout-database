import React, { useState, useEffect } from 'react';
import { X, Key, Check, ExternalLink, Trash2, ShieldCheck } from 'lucide-react';
import { getSavedGitHubToken, saveGitHubToken, removeGitHubToken } from '../services/githubService';

interface GitHubSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenSaved?: () => void;
}

export const GitHubSettingsModal: React.FC<GitHubSettingsModalProps> = ({
  isOpen,
  onClose,
  onTokenSaved,
}) => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getSavedGitHubToken();
      setTokenInput(existing);
      setIsSaved(!!existing);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveGitHubToken(tokenInput);
    setIsSaved(!!tokenInput.trim());
    if (onTokenSaved) onTokenSaved();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleRemove = () => {
    removeGitHubToken();
    setTokenInput('');
    setIsSaved(false);
    if (onTokenSaved) onTokenSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">GitHub Token Settings</h2>
              <p className="text-[11px] text-slate-400">Save your token once for instant 1-click Pull Requests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Personal Access Token (PAT)
              </span>
              <a
                href="https://github.com/settings/tokens/new?description=Workout+Database+Web+App&scopes=repo"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
              >
                <span>Generate on GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-400 text-[11px]">
              Stored locally in your browser's <code className="font-mono text-slate-300">localStorage</code>. Never shared with any third party.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium block">Paste Token (ghp_...):</label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:outline-none focus:border-brand-500 font-mono shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {isSaved ? (
            <button
              onClick={handleRemove}
              className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Token</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!tokenInput.trim()}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-40 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Token</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

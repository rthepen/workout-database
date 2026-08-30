import React, { useState, useEffect } from 'react';
import { X, Key, Check, ExternalLink, Trash2, ShieldCheck, FileSpreadsheet, Send } from 'lucide-react';
import { getSavedGitHubToken, saveGitHubToken, removeGitHubToken } from '../services/githubService';
import { getSavedGoogleSheetWebhook, saveGoogleSheetWebhook, sendExerciseBackupToGoogleSheet } from '../services/googleSheetService';

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
  const [sheetWebhookInput, setSheetWebhookInput] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const existing = getSavedGitHubToken();
      setTokenInput(existing);
      setIsSaved(!!existing);
      setSheetWebhookInput(getSavedGoogleSheetWebhook());
      setTestStatus('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveGitHubToken(tokenInput);
    saveGoogleSheetWebhook(sheetWebhookInput);
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

  const handleTestWebhook = async () => {
    setTestStatus('sending...');
    const testSample = {
      id: "test_exercise_backup",
      exercise_name: { en: "Test Exercise Backup", nl: "Test Oefening Backup" },
      material: { id: "test", name: { en: "Test Material", nl: "Test Materiaal" } },
      category: { en: "Test Category", nl: "Test Categorie" },
      attributes: { difficulty: "intermediate", rating: 5 },
      media: { videos: [{ youtube_id: "dQw4w9WgXcQ", start_seconds: 0 }] },
      meta: { updated_at: new Date().toISOString() }
    };

    const res = await sendExerciseBackupToGoogleSheet(testSample as any, sheetWebhookInput);
    if (res.success) {
      setTestStatus('✅ Test row sent to Google Sheet!');
    } else {
      setTestStatus(`❌ ${res.error || 'Failed'}`);
    }
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
              <h2 className="font-bold text-sm text-white">Integration & Backup Settings</h2>
              <p className="text-[11px] text-slate-400">Configure GitHub Token & Google Sheet Backup Webhook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* GitHub Section */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                GitHub Personal Access Token (PAT)
              </span>
              <a
                href="https://github.com/settings/tokens/new?description=Workout+Database+Web+App&scopes=repo"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
              >
                <span>Generate</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl focus:outline-none focus:border-brand-500 font-mono shadow-inner"
            />
          </div>

          {/* Google Sheet Backup Webhook Section */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Google Sheet Backup Webhook
              </span>
              <a
                href="https://docs.google.com/spreadsheets/d/1EGBY7OwZZMAe3GBAwz0p_hSRX8zyCLn1mAxRvGBal8c/edit#gid=0"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <span>Open Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Every edit and approval is automatically backed up to your Google Sheet in real-time.
            </p>
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={sheetWebhookInput}
              onChange={(e) => setSheetWebhookInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-mono shadow-inner"
            />
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestWebhook}
                className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Send className="w-3 h-3" />
                <span>Test Backup Webhook</span>
              </button>
              {testStatus && <span className="text-[11px] font-medium text-emerald-400">{testStatus}</span>}
            </div>
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

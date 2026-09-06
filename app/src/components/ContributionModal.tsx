import React, { useState } from 'react';
import { X, Copy, Check, CheckCircle2, Trash2, FileSpreadsheet, ExternalLink, Send } from 'lucide-react';
import type { Exercise } from '../types/exercise';
import { resetLocalEdits } from '../services/exerciseService';
import { sendExerciseBackupToGoogleSheet } from '../services/googleSheetService';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  modifiedExercises: Exercise[];
  onResetEdits: () => void;
  onRefreshData: () => void;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  exercises,
  modifiedExercises,
  onResetEdits,
  onRefreshData,
}) => {
  const [copiedJSON, setCopiedJSON] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const currentPayload = JSON.stringify(modifiedExercises.length > 0 ? modifiedExercises : exercises, null, 2);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(currentPayload);
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  const handleBatchSubmitToSheet = async () => {
    setSubmitStatus('submitting');
    setErrorMessage('');

    const payload = modifiedExercises.length > 0 ? modifiedExercises : exercises;
    const res = await sendExerciseBackupToGoogleSheet(payload);

    if (res.success) {
      resetLocalEdits();
      setSubmitStatus('success');
      setTimeout(() => {
        onRefreshData();
      }, 1500);
    } else {
      setErrorMessage(res.error || 'Kon niet verzenden naar Google Sheet.');
      setSubmitStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0E131F] border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 ring-1 ring-white/20">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">Batch Naar Google Sheet Sturen</h2>
              <p className="text-xs text-slate-400">Verstuur al je lokale wijzigingen in één keer direct naar de centrale Google Sheet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {submitStatus === 'success' && (
          <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl space-y-2 text-emerald-200 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>
                ✅ {modifiedExercises.length || 1} oefening(en) succesvol verzonden naar de Google Sheet!
              </span>
            </div>
            <p className="text-xs text-emerald-300/80">
              De gegevens zijn live opgeslagen in de Google Sheet.
            </p>
            <div className="pt-1">
              <a
                href="https://docs.google.com/spreadsheets/d/1EGBY7OwZZMAe3GBAwz0p_hSRX8zyCLn1mAxRvGBal8c/edit#gid=0"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow transition"
              >
                <span>Open Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          {/* Section: Overview of Modified Exercises */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-white text-xs uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Openstaande Lokale Wijzigingen ({modifiedExercises.length})</span>
              </div>
              {modifiedExercises.length > 0 && (
                <button
                  onClick={onResetEdits}
                  className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800/60 font-semibold flex items-center gap-1 transition text-[11px]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Wis Wijzigingen</span>
                </button>
              )}
            </div>

            {modifiedExercises.length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <p className="font-semibold text-slate-300">Geen openstaande wijzigingen</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Alle oefeningen in je huidige weergave zijn gesynchroniseerd.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {modifiedExercises.map((ex, idx) => {
                  const videoCount = ex.media?.videos?.length || 0;
                  const firstVid = ex.media?.videos?.[0];
                  const hasTimestamp = firstVid?.start_seconds !== undefined && firstVid.start_seconds > 0;
                  const hasFrame = firstVid?.thumbnail_seconds !== undefined && firstVid.thumbnail_seconds > 0;

                  return (
                    <div
                      key={ex.id}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-slate-200"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs truncate">
                            {idx + 1}. {ex.exercise_name?.nl || ex.exercise_name?.en || ex.id}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 font-mono text-[10px] border border-brand-500/30">
                            {ex.material?.name?.nl || ex.material?.name?.en || ex.material?.id || 'materiaal'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {ex.id}</div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {videoCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-medium text-[10px]">
                            🎬 {videoCount} Video
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-medium text-[10px]">
                            Geen Video
                          </span>
                        )}

                        {hasTimestamp && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium text-[10px]">
                            ⏱️ {firstVid.start_seconds}s
                          </span>
                        )}

                        {hasFrame && (
                          <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium text-[10px]">
                            🖼️ {firstVid.thumbnail_seconds}s
                          </span>
                        )}

                        {ex.attributes?.rating && (
                          <span className="px-2 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-800 font-medium text-[10px]">
                            ⭐ {ex.attributes.rating}/5
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Batch Send Button */}
          <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-900 to-[#0A1A18] border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Google Sheet Live Sync</span>
              </span>
              <a
                href="https://docs.google.com/spreadsheets/d/1EGBY7OwZZMAe3GBAwz0p_hSRX8zyCLn1mAxRvGBal8c/edit#gid=0"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <span>Bekijk Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-slate-400 text-[11px]">
              Geen account of tokens nodig. Met één klik worden alle gewijzigde oefeningen direct doorgestuurd naar de Google Sheet back-up.
            </p>

            {errorMessage && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleBatchSubmitToSheet}
              disabled={submitStatus === 'submitting'}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-50"
            >
              {submitStatus === 'submitting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verzenden naar Google Sheet...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {modifiedExercises.length > 0
                      ? `📤 Verstuur alle ${modifiedExercises.length} gewijzigde oefeningen naar Google Sheet`
                      : `📤 Verstuur actieve oefening naar Google Sheet`}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Section: Manual Export Payload */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 text-xs">Handmatige JSON Export</span>
              <button
                onClick={handleCopyJSON}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
              >
                {copiedJSON ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJSON ? 'Gekopieerd!' : 'Kopieer JSON'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-xl text-[10px] text-slate-400 font-mono max-h-32 overflow-y-auto border border-slate-800/80">
              {currentPayload}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

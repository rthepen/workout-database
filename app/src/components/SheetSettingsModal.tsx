import React, { useState, useEffect } from 'react';
import { X, Check, ExternalLink, FileSpreadsheet, Send, ShieldCheck } from 'lucide-react';
import { getSavedGoogleSheetWebhook, saveGoogleSheetWebhook, sendExerciseBackupToGoogleSheet, DEFAULT_SHEET_WEBHOOK_URL } from '../services/googleSheetService';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [sheetWebhookInput, setSheetWebhookInput] = useState<string>(() => getSavedGoogleSheetWebhook());
  const [testStatus, setTestStatus] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTestStatus('');
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveGoogleSheetWebhook(sheetWebhookInput.trim() || DEFAULT_SHEET_WEBHOOK_URL);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleTestWebhook = async () => {
    setTestStatus('Verzenden...');
    const testSample = {
      id: "test_sheet_connection",
      exercise_name: { en: "Test Connection", nl: "Test Verbinding" },
      material: { id: "test", name: { en: "Test", nl: "Test" } },
      category: { en: "Test", nl: "Test" },
      attributes: { difficulty: "beginner" },
      media: { videos: [] },
      meta: { updated_at: new Date().toISOString() }
    };

    const res = await sendExerciseBackupToGoogleSheet(testSample as any, sheetWebhookInput);
    if (res.success) {
      setTestStatus('✅ Testregel succesvol verzonden naar Google Sheet!');
    } else {
      setTestStatus(`❌ ${res.error || 'Verzenden mislukt'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Google Sheet Verbinding</h2>
              <p className="text-[11px] text-slate-400">Alle bewerkingen en beoordelingen gaan direct naar deze Sheet</p>
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
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Live Google Sheet
              </span>
              <a
                href="https://docs.google.com/spreadsheets/d/1EGBY7OwZZMAe3GBAwz0p_hSRX8zyCLn1mAxRvGBal8c/edit#gid=0"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                <span>Open Google Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Elke goedkeuring en wijziging in de app wordt automatisch en direct opgeslagen in de centrale Google Sheet. Geen login of token vereist.
            </p>
            
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] text-slate-300 font-medium block">Google Apps Script Webhook URL:</label>
              <input
                type="text"
                placeholder={DEFAULT_SHEET_WEBHOOK_URL}
                value={sheetWebhookInput}
                onChange={(e) => setSheetWebhookInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-mono shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestWebhook}
                className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition"
              >
                <Send className="w-3 h-3" />
                <span>Test Webhook Verbinding</span>
              </button>
              {testStatus && <span className="text-[11px] font-medium text-emerald-400">{testStatus}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-[11px] text-slate-500">
            {isSaved && <span className="text-emerald-400 font-medium">Opgeslagen!</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
            >
              Sluiten
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Opslaan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

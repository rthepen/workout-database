import React, { useState } from 'react';
import { Database, CheckCircle2, Clock, Video, RefreshCw, FileSpreadsheet, Menu, X, Plus, Send, Zap, Layers, Smartphone } from 'lucide-react';
import type { Exercise } from '../types/exercise';

export type ViewMode = 'single' | 'rapid_audit' | 'tiktok_audit';

interface HeaderProps {
  exercises: Exercise[];
  modifiedCount: number;
  isLive: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
  onOpenBatchModal: () => void;
  onOpenSheetSettings: () => void;
  onOpenAddExerciseModal: () => void;
  onResetEdits: () => void;
  hasLocalEdits: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  exercises,
  modifiedCount,
  isLive,
  viewMode,
  onViewModeChange,
  onRefresh,
  onOpenBatchModal,
  onOpenSheetSettings,
  onOpenAddExerciseModal,
  onResetEdits,
  hasLocalEdits,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const total = exercises.length;
  const withVideos = exercises.filter(e => e.media.videos && e.media.videos.length > 0).length;
  const withTimestamps = exercises.filter(e => 
    e.media.videos && e.media.videos.some(v => v.start_seconds !== undefined && v.start_seconds > 0)
  ).length;

  const timestampPercent = total > 0 ? Math.round((withTimestamps / total) * 100) : 0;
  const videoCoveragePercent = total > 0 ? Math.round((withVideos / total) * 100) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur-md px-3 sm:px-6 py-2.5">
      {/* Mobile Ultra-Compact Header Row */}
      <div className="flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-700 flex items-center justify-center shadow-md shadow-brand-500/20 ring-1 ring-white/20">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
            <button
              onClick={() => onViewModeChange('single')}
              className={`px-2 py-1 rounded font-medium transition ${
                viewMode === 'single'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kaart
            </button>
            <button
              onClick={() => onViewModeChange('rapid_audit')}
              className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition ${
                viewMode === 'rapid_audit'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Audit</span>
            </button>
            <button
              onClick={() => onViewModeChange('tiktok_audit')}
              className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition ${
                viewMode === 'tiktok_audit'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              <Smartphone className="w-3 h-3 text-purple-400" />
              <span>TikTok</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenAddExerciseModal}
            className="px-2.5 py-1.5 rounded-lg bg-brand-600/90 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1 shadow"
            title="Nieuwe oefening toevoegen"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add</span>
          </button>

          <button
            onClick={onOpenSheetSettings}
            className="p-1.5 rounded-lg border text-xs flex items-center gap-1 transition bg-emerald-950/50 text-emerald-300 border-emerald-500/40"
            title="Google Sheet Verbinding & Instellingen"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-lg"
            aria-label="Menu in-/uitklappen"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in">
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-slate-400 text-[9px] uppercase font-semibold">Totaal</div>
              <span className="font-bold text-white text-sm">{total}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-sky-400 text-[9px] uppercase font-semibold">Video's</div>
              <span className="font-bold text-sky-400 text-sm">{withVideos}</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-amber-400 text-[9px] uppercase font-semibold">Timestamps</div>
              <span className="font-bold text-amber-400 text-sm">{withTimestamps}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => { onOpenAddExerciseModal(); setIsMobileMenuOpen(false); }}
              className="flex-1 py-2 text-xs text-white bg-gradient-to-r from-sky-600 to-indigo-600 rounded-lg font-bold flex items-center justify-center gap-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nieuwe Oefening</span>
            </button>

            {hasLocalEdits && (
              <button
                onClick={() => { onResetEdits(); setIsMobileMenuOpen(false); }}
                className="flex-1 py-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg font-semibold text-center"
              >
                Wis Wijzigingen
              </button>
            )}

            <button
              onClick={() => { onRefresh(); setIsMobileMenuOpen(false); }}
              className="flex-1 py-2 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg font-medium flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isLive ? "Sync Live" : "Herladen"}</span>
            </button>

            <button
              onClick={() => { onOpenBatchModal(); setIsMobileMenuOpen(false); }}
              className="flex-1 py-2 text-xs text-white font-bold flex items-center justify-center gap-1 shadow rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {modifiedCount > 0 ? `📤 Batch naar Sheet (${modifiedCount})` : '📤 Batch naar Sheet'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Layout (Full Horizontal Bar) */}
      <div className="hidden lg:flex items-center justify-between gap-4">
        {/* Brand & Repository Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">Workout Database</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Directe Google Sheet Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Audit & Beheer Workspace • Alle bewerkingen gaan direct naar de centrale Google Sheet
            </p>
          </div>
        </div>

        {/* View Switcher Pill */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => onViewModeChange('single')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === 'single'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Individuele kaart per workout"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Kaart Weergave</span>
          </button>
          <button
            onClick={() => onViewModeChange('rapid_audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === 'rapid_audit'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-amber-300'
            }`}
            title="Snelle auditlijst om massaal foute video's te verwijderen"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Snelle Video Audit</span>
          </button>
          <button
            onClick={() => onViewModeChange('tiktok_audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === 'tiktok_audit'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-purple-300'
            }`}
            title="Mobiele TikTok / Reels swipe-weergave met altijd zichtbare actieknoppen"
          >
            <Smartphone className="w-3.5 h-3.5 text-purple-400" />
            <span>📱 TikTok Feed</span>
          </button>
        </div>

        {/* Real-time stats & controls */}
        <div className="flex items-center gap-3 text-xs">
          {/* Total Count */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Totaal Oefeningen</div>
              <span className="font-bold text-white text-sm">{total}</span>
            </div>
          </div>

          {/* Video Coverage */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Video className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Video Demo's</div>
              <span className="font-bold text-sky-400 text-sm">{withVideos}</span>
              <span className="text-slate-500 ml-1">({videoCoveragePercent}%)</span>
            </div>
          </div>

          {/* Timestamps Validated */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Timestamps</div>
              <span className="font-bold text-amber-400 text-sm">{withTimestamps}</span>
              <span className="text-slate-500 ml-1">({timestampPercent}%)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={onOpenAddExerciseModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 rounded-lg shadow-md shadow-sky-600/20 border border-sky-400/30 transition transform active:scale-95"
              title="Nieuwe oefening toevoegen aan de database"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Oefening</span>
            </button>

            <button
              onClick={onOpenSheetSettings}
              title="Google Sheet Verbinding & Webhook instellingen"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Google Sheet</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {hasLocalEdits && (
              <button
                onClick={onResetEdits}
                title="Lokale sessie wijzigingen wissen"
                className="px-2.5 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 rounded-lg transition"
              >
                Wis Wijzigingen
              </button>
            )}

            <button
              onClick={onRefresh}
              title={isLive ? "Gegevens live geladen" : "Herlaad gegevens"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>{isLive ? "Sync Live" : "Herladen"}</span>
            </button>

            <button
              onClick={onOpenBatchModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-white font-semibold rounded-lg shadow-md transition transform active:scale-95 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/40 shadow-emerald-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {modifiedCount > 0 ? `📤 Batch naar Sheet (${modifiedCount})` : '📤 Batch naar Sheet'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

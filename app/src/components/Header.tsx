import React, { useState } from 'react';
import { Database, CheckCircle2, Clock, Video, GitPullRequest, RefreshCw, Key, Menu, X } from 'lucide-react';
import type { Exercise } from '../types/exercise';
import { getSavedGitHubToken } from '../services/githubService';

interface HeaderProps {
  exercises: Exercise[];
  isLive: boolean;
  onRefresh: () => void;
  onOpenPRModal: () => void;
  onOpenTokenSettings: () => void;
  onResetEdits: () => void;
  hasLocalEdits: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  exercises,
  isLive,
  onRefresh,
  onOpenPRModal,
  onOpenTokenSettings,
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
  const hasToken = !!getSavedGitHubToken();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur-md px-3 sm:px-6 py-2.5">
      {/* Mobile Ultra-Compact Header Row */}
      <div className="flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-emerald-700 flex items-center justify-center shadow-md shadow-brand-500/20 ring-1 ring-white/20">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-tight leading-none">Workout Database</h1>
            <span className="text-[10px] text-slate-400 font-mono">rthepen/workout-database</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenTokenSettings}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
              hasToken 
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40' 
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
            title={hasToken ? "GitHub Token Configured" : "Configure GitHub Token"}
          >
            <Key className="w-3.5 h-3.5" />
            {hasToken && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1 transition"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 text-rose-400" /> : <Menu className="w-4 h-4 text-brand-400" />}
            <span className="text-[11px]">Menu</span>
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-2.5 pt-2.5 border-t border-slate-800 space-y-3 text-xs animate-in fade-in duration-150">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-center">
              <div className="text-[9px] uppercase font-bold text-slate-400">Total</div>
              <div className="font-bold text-white text-xs">{total}</div>
            </div>
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-center">
              <div className="text-[9px] uppercase font-bold text-slate-400">Videos</div>
              <div className="font-bold text-sky-400 text-xs">{withVideos} ({videoCoveragePercent}%)</div>
            </div>
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-center">
              <div className="text-[9px] uppercase font-bold text-slate-400">Timestamps</div>
              <div className="font-bold text-amber-400 text-xs">{withTimestamps} ({timestampPercent}%)</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {hasLocalEdits && (
              <button
                onClick={() => { onResetEdits(); setIsMobileMenuOpen(false); }}
                className="flex-1 py-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg font-semibold text-center"
              >
                Reset Edits
              </button>
            )}

            <button
              onClick={() => { onRefresh(); setIsMobileMenuOpen(false); }}
              className="flex-1 py-2 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg font-medium flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isLive ? "Sync Live" : "Reload"}</span>
            </button>

            <button
              onClick={() => { onOpenPRModal(); setIsMobileMenuOpen(false); }}
              className="flex-1 py-2 text-xs text-white bg-gradient-to-r from-brand-600 to-emerald-600 rounded-lg font-bold flex items-center justify-center gap-1 shadow"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Export & PR</span>
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
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-brand-500/10 text-brand-400 border border-brand-500/30">
                Audit & Curation Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Curation, Video Verification & PR Pipeline for <a href="https://github.com/rthepen/workout-database" target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">rthepen/workout-database</a>
            </p>
          </div>
        </div>

        {/* Real-time stats & controls */}
        <div className="flex items-center gap-3 text-xs">
          {/* Total Count */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Total Verified</div>
              <span className="font-bold text-white text-sm">{total}</span>
              <span className="text-slate-500 ml-1">exercises</span>
            </div>
          </div>

          {/* Video Coverage */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Video className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Video Demos</div>
              <span className="font-bold text-sky-400 text-sm">{withVideos}</span>
              <span className="text-slate-500 ml-1">({videoCoveragePercent}%)</span>
            </div>
          </div>

          {/* Timestamps Validated */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Action Timestamps</div>
              <span className="font-bold text-amber-400 text-sm">{withTimestamps}</span>
              <span className="text-slate-500 ml-1">({timestampPercent}%)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={onOpenTokenSettings}
              title={hasToken ? "GitHub Token saved in browser" : "Configure GitHub Token for 1-click PRs"}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition ${
                hasToken
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{hasToken ? "Token Configured" : "Set GitHub Token"}</span>
              {hasToken && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>

            {hasLocalEdits && (
              <button
                onClick={onResetEdits}
                title="Reset local changes"
                className="px-2.5 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 rounded-lg transition"
              >
                Reset Edits
              </button>
            )}

            <button
              onClick={onRefresh}
              title={isLive ? "Data is loaded live from GitHub" : "Fetch latest data from GitHub"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>{isLive ? "Sync Live" : "Reload"}</span>
            </button>

            <button
              onClick={onOpenPRModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-white font-medium bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 rounded-lg shadow-md shadow-brand-600/20 border border-brand-400/30 transition transform active:scale-95"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Export & PR</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

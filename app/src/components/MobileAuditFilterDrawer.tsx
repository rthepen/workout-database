import React from 'react';
import { 
  X, 
  Filter, 
  ArrowUpDown, 
  RotateCcw, 
  ShieldAlert, 
  Video, 
  Clock, 
  ListOrdered,
  Layers,
  Dumbbell
} from 'lucide-react';
import { ANATOMICAL_MUSCLES } from '../types/exercise';
import type { AuditFilterType } from './AuditQueue';

export type SortOrderType = 'oldest_first' | 'newest_first' | 'name_asc' | 'fewest_videos' | 'difficulty';

interface MobileAuditFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  auditFilter: AuditFilterType;
  onAuditFilterChange: (f: AuditFilterType) => void;
  selectedMaterial: string;
  onMaterialChange: (m: string) => void;
  selectedMuscle: string;
  onMuscleChange: (m: string) => void;
  selectedDifficulty: string;
  onDifficultyChange: (d: string) => void;
  sortOrder: SortOrderType;
  onSortOrderChange: (s: SortOrderType) => void;
  materials: string[];
  totalFilteredCount: number;
  onResetFilters: () => void;
}

export const MobileAuditFilterDrawer: React.FC<MobileAuditFilterDrawerProps> = ({
  isOpen,
  onClose,
  auditFilter,
  onAuditFilterChange,
  selectedMaterial,
  onMaterialChange,
  selectedMuscle,
  onMuscleChange,
  selectedDifficulty,
  onDifficultyChange,
  sortOrder,
  onSortOrderChange,
  materials,
  totalFilteredCount,
  onResetFilters,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border-t border-slate-700 rounded-t-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col space-y-4">
        {/* Drawer Handle & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Audit & Filter Instellingen</h2>
              <p className="text-[11px] text-slate-400">Bepaal welke workouts in beeld komen en in welke volgorde</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* 1. Audit Focus Pills */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-brand-400" />
              <span>Audit Focus Categorie</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAuditFilterChange('all')}
                className={`p-2.5 rounded-xl border text-left font-medium transition ${
                  auditFilter === 'all'
                    ? 'bg-brand-950/60 border-brand-500 text-brand-300 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-bold">Alle Workouts</div>
                <div className="text-[10px] text-slate-400">Volledige database (630)</div>
              </button>

              <button
                onClick={() => onAuditFilterChange('needs_review')}
                className={`p-2.5 rounded-xl border text-left font-medium transition ${
                  auditFilter === 'needs_review'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" /> Needs Review
                </div>
                <div className="text-[10px] text-slate-400">Verouderd of onvolledig</div>
              </button>

              <button
                onClick={() => onAuditFilterChange('missing_video')}
                className={`p-2.5 rounded-xl border text-left font-medium transition ${
                  auditFilter === 'missing_video'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <Video className="w-3 h-3 text-rose-400" /> Zonder Video
                </div>
                <div className="text-[10px] text-slate-400">Nog 0 demonstraties</div>
              </button>

              <button
                onClick={() => onAuditFilterChange('missing_timestamp')}
                className={`p-2.5 rounded-xl border text-left font-medium transition ${
                  auditFilter === 'missing_timestamp'
                    ? 'bg-sky-950/60 border-sky-500 text-sky-300 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" /> Zonder Timestamp
                </div>
                <div className="text-[10px] text-slate-400">Starttijd ontbreekt (0s)</div>
              </button>
            </div>
          </div>

          {/* 2. Sorteervolgorde */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-brand-400" />
              <span>Volgorde van Workouts</span>
            </label>
            <select
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value as SortOrderType)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-500"
            >
              <option value="oldest_first">⏳ Oudste update eerst (Aanbevolen voor audit)</option>
              <option value="newest_first">✨ Recentst bijgewerkt eerst</option>
              <option value="name_asc">🔤 Alfabetisch op naam (A - Z)</option>
              <option value="fewest_videos">🎬 Minste video's eerst</option>
              <option value="difficulty">⚡ Op moeilijkheidsgraad (Beginner → Advanced)</option>
            </select>
          </div>

          {/* 3. Materiaal / Equipment */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-brand-400" />
              <span>Materiaal / Equipment ({materials.length})</span>
            </label>
            <select
              value={selectedMaterial}
              onChange={(e) => onMaterialChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="all">Alle materialen</option>
              {materials.map(m => (
                <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* 4. Doelspier & Moeilijkheidsgraad */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-400" />
                <span>Spiergroep</span>
              </label>
              <select
                value={selectedMuscle}
                onChange={(e) => onMuscleChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="all">Alle spieren</option>
                {ANATOMICAL_MUSCLES.map(m => (
                  <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-brand-400" />
                <span>Niveau</span>
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => onDifficultyChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-brand-500"
              >
                <option value="all">Alle niveaus</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onResetFilters}
            className="px-3 py-2 text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/30 transition text-center"
          >
            Bekijk {totalFilteredCount} Workouts
          </button>
        </div>
      </div>
    </div>
  );
};

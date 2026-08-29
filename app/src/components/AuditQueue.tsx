import React from 'react';
import { Search, Filter, AlertTriangle, Video, Clock, Dumbbell, ShieldAlert, ArrowUpDown } from 'lucide-react';
import { ANATOMICAL_MUSCLES } from '../types/exercise';
import type { Exercise } from '../types/exercise';

export type AuditFilterType = 'all' | 'needs_review' | 'missing_video' | 'missing_timestamp';

interface AuditQueueProps {
  exercises: Exercise[];
  selectedExercise: Exercise | null;
  onSelectExercise: (ex: Exercise) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  auditFilter: AuditFilterType;
  onAuditFilterChange: (f: AuditFilterType) => void;
  selectedMaterial: string;
  onMaterialChange: (m: string) => void;
  selectedMuscle: string;
  onMuscleChange: (m: string) => void;
  selectedDifficulty: string;
  onDifficultyChange: (d: string) => void;
  sortByOldest: boolean;
  onToggleSort: () => void;
}

export const AuditQueue: React.FC<AuditQueueProps> = ({
  exercises,
  selectedExercise,
  onSelectExercise,
  searchQuery,
  onSearchChange,
  auditFilter,
  onAuditFilterChange,
  selectedMaterial,
  onMaterialChange,
  selectedMuscle,
  onMuscleChange,
  selectedDifficulty,
  onDifficultyChange,
  sortByOldest,
  onToggleSort,
}) => {
  // Extract unique materials
  const materials = Array.from(new Set(exercises.map(e => e.material?.id || 'other'))).sort();

  // Filter & Sort Logic
  const filteredExercises = exercises.filter(ex => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ex.exercise_name?.en?.toLowerCase().includes(q) || ex.exercise_name?.nl?.toLowerCase().includes(q);
      const matchId = ex.id.toLowerCase().includes(q);
      const matchAliases = ex.aliases?.some(a => a.toLowerCase().includes(q));
      const matchMaterial = ex.material?.name?.en?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchAliases && !matchMaterial) return false;
    }

    // 2. Audit Filter
    if (auditFilter === 'missing_video') {
      if (ex.media?.videos && ex.media.videos.length > 0) return false;
    } else if (auditFilter === 'missing_timestamp') {
      const hasTimestamp = ex.media?.videos?.some(v => v.start_seconds !== undefined && v.start_seconds > 0);
      if (hasTimestamp || !ex.media?.videos || ex.media.videos.length === 0) return false;
    } else if (auditFilter === 'needs_review') {
      const isMissingVideos = !ex.media?.videos || ex.media.videos.length === 0;
      const isMissingTimestamps = ex.media?.videos?.some(v => v.start_seconds === undefined || v.start_seconds === 0);
      const isFewCues = !ex.form_cues?.en || ex.form_cues.en.length < 2;
      if (!isMissingVideos && !isMissingTimestamps && !isFewCues) return false;
    }

    // 3. Material Filter
    if (selectedMaterial && selectedMaterial !== 'all') {
      if (ex.material?.id !== selectedMaterial) return false;
    }

    // 4. Target Muscle Filter
    if (selectedMuscle && selectedMuscle !== 'all') {
      const matchPrimary = ex.target_muscles?.primary?.includes(selectedMuscle);
      const matchSecondary = ex.target_muscles?.secondary?.includes(selectedMuscle);
      if (!matchPrimary && !matchSecondary) return false;
    }

    // 5. Difficulty Filter
    if (selectedDifficulty && selectedDifficulty !== 'all') {
      if (ex.attributes?.difficulty !== selectedDifficulty) return false;
    }

    return true;
  });

  // Sort: Default Oldest Updated_At first (Control Mode Requirement)
  const sortedExercises = [...filteredExercises].sort((a, b) => {
    const dateA = a.meta?.updated_at || '1970-01-01';
    const dateB = b.meta?.updated_at || '1970-01-01';
    if (sortByOldest) {
      return dateA.localeCompare(dateB) || a.id.localeCompare(b.id);
    } else {
      return dateB.localeCompare(dateA) || a.id.localeCompare(b.id);
    }
  });

  return (
    <div className="flex flex-col h-full bg-[#0E131F] border-r border-slate-800 w-full lg:w-[380px] xl:w-[420px] flex-shrink-0">
      {/* Search and Top Controls */}
      <div className="p-3.5 border-b border-slate-800/80 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search exercises, muscles, aliases..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900/90 text-sm text-white placeholder-slate-500 border border-slate-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition"
          />
        </div>

        {/* Audit Filter Pills */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px]">
          <button
            onClick={() => onAuditFilterChange('all')}
            className={`py-1 rounded font-medium transition ${
              auditFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onAuditFilterChange('needs_review')}
            className={`py-1 rounded font-medium transition flex items-center justify-center gap-1 ${
              auditFilter === 'needs_review' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            Audit
          </button>
          <button
            onClick={() => onAuditFilterChange('missing_video')}
            className={`py-1 rounded font-medium transition flex items-center justify-center gap-1 ${
              auditFilter === 'missing_video' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3 h-3 text-rose-400" />
            No Video
          </button>
          <button
            onClick={() => onAuditFilterChange('missing_timestamp')}
            className={`py-1 rounded font-medium transition flex items-center justify-center gap-1 ${
              auditFilter === 'missing_timestamp' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3 h-3 text-sky-400" />
            No Time
          </button>
        </div>

        {/* Dropdown Filters (Material, Muscle, Difficulty, Sort) */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <select
            value={selectedMaterial}
            onChange={(e) => onMaterialChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="all">Equipment ({materials.length})</option>
            {materials.map(m => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <select
            value={selectedMuscle}
            onChange={(e) => onMuscleChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="all">Target Muscles</option>
            {ANATOMICAL_MUSCLES.map(m => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="all">Difficulty</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Sort Switcher Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>Showing <strong className="text-white font-semibold">{sortedExercises.length}</strong> exercises</span>
          <button
            onClick={onToggleSort}
            className="flex items-center gap-1 text-slate-300 hover:text-brand-400 transition"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>Sort: {sortByOldest ? "Oldest First" : "Newest First"}</span>
          </button>
        </div>
      </div>

      {/* Exercise Queue List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5">
        {sortedExercises.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <Filter className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm">No exercises matched the selected filters.</p>
          </div>
        ) : (
          sortedExercises.map(ex => {
            const isSelected = selectedExercise?.id === ex.id;
            const videoCount = ex.media?.videos?.length || 0;
            const hasStartTimestamp = ex.media?.videos?.some(v => v.start_seconds !== undefined && v.start_seconds > 0);

            return (
              <div
                key={ex.id}
                onClick={() => onSelectExercise(ex)}
                className={`group p-3 rounded-lg cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-brand-950/40 border-brand-500/50 shadow-md shadow-brand-500/10'
                    : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className={`font-semibold text-xs leading-snug tracking-tight transition ${
                      isSelected ? 'text-brand-300' : 'text-slate-100 group-hover:text-white'
                    }`}>
                      {ex.exercise_name?.en || ex.id}
                    </h3>
                    <div className="text-[11px] text-slate-400 italic">
                      {ex.exercise_name?.nl}
                    </div>
                  </div>

                  {/* Difficulty Tag */}
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                    ex.attributes?.difficulty === 'advanced'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : ex.attributes?.difficulty === 'intermediate'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {ex.attributes?.difficulty?.slice(0, 3)}
                  </span>
                </div>

                {/* Material & Target Muscle */}
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <Dumbbell className="w-3 h-3 text-slate-500" />
                    {ex.material?.name?.en || ex.material?.id}
                  </span>
                  <span>•</span>
                  <span className="truncate text-slate-400">
                    {ex.target_muscles?.primary?.map(m => m.replace(/_/g, ' ')).join(', ')}
                  </span>
                </div>

                {/* Audit Status Badges */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/40 text-[10px]">
                  <div className="flex items-center gap-2">
                    {/* Video Status */}
                    {videoCount === 0 ? (
                      <span className="flex items-center gap-1 text-rose-400">
                        <AlertTriangle className="w-2.5 h-2.5" /> No Video
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Video className="w-2.5 h-2.5 text-sky-400" /> {videoCount} {videoCount === 1 ? 'video' : 'videos'}
                      </span>
                    )}

                    {/* Timestamp Status */}
                    {hasStartTimestamp ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <Clock className="w-2.5 h-2.5" /> Timed
                      </span>
                    ) : videoCount > 0 ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Clock className="w-2.5 h-2.5" /> Untimed
                      </span>
                    ) : null}
                  </div>

                  <span className="text-slate-500 font-mono text-[10px]">
                    {ex.meta?.updated_at}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

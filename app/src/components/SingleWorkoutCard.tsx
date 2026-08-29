import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  Clock, 
  Layers, 
  Languages, 
  Info,
  Tv
} from 'lucide-react';
import type { Exercise, VideoMedia } from '../types/exercise';
import { VideoInspector } from './VideoInspector';
import { ExerciseEditor } from './ExerciseEditor';

interface SingleWorkoutCardProps {
  exercise: Exercise;
  currentIndex: number;
  totalExercises: number;
  onNext: () => void;
  onPrev: () => void;
  onApprove: (exercise: Exercise) => void;
  onSaveEdits: (updated: Exercise) => void;
  onOpenDiff: () => void;
  onOpenFilterDrawer: () => void;
  onUpdateVideos: (videos: VideoMedia[]) => void;
  allExercises: Exercise[];
}

export const SingleWorkoutCard: React.FC<SingleWorkoutCardProps> = ({
  exercise,
  currentIndex,
  totalExercises,
  onNext,
  onPrev,
  onApprove,
  onSaveEdits,
  onOpenDiff,
  onOpenFilterDrawer,
  onUpdateVideos,
  allExercises,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'video' | 'instructions'>('overview');

  const videoCount = exercise.media?.videos?.length || 0;
  const hasStartTimestamp = exercise.media?.videos?.some(v => v.start_seconds !== undefined && v.start_seconds > 0);

  const handleApproveAndNext = () => {
    onApprove(exercise);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-4 pb-20 sm:pb-6">
      {/* Top Mobile Pagination Bar & Audit Filter Trigger */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
        {/* Previous Button */}
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl flex items-center gap-1 text-xs font-semibold transition"
          title="Vorige workout"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Vorige</span>
        </button>

        {/* Counter Badge & Filter Menu button */}
        <div className="flex items-center gap-2">
          <div className="text-center">
            <div className="text-[11px] font-mono text-brand-400 font-bold">
              Workout {currentIndex + 1} / {totalExercises}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">{exercise.id}</div>
          </div>

          <button
            onClick={onOpenFilterDrawer}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-brand-400 border border-brand-500/30 rounded-xl flex items-center gap-1.5 text-xs font-bold transition ml-2 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter & Volgorde</span>
          </button>
        </div>

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={currentIndex === totalExercises - 1}
          className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl flex items-center gap-1 text-xs font-semibold transition"
          title="Volgende workout"
        >
          <span className="hidden sm:inline">Volgende</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mode View: Standard Review or Full Inline Editor */}
      {isEditing ? (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-brand-950/60 border border-brand-500/40 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-brand-300 font-semibold">
              <Edit3 className="w-4 h-4 text-brand-400" />
              <span>Je bewerkt nu deze workout</span>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg font-medium"
            >
              Sluit Editor
            </button>
          </div>

          <ExerciseEditor
            exercise={exercise}
            allExercises={allExercises}
            onSave={(updated) => {
              onSaveEdits(updated);
              setIsEditing(false);
            }}
            onOpenDiff={onOpenDiff}
          />
        </div>
      ) : (
        /* Standalone 1-by-1 Workout Card */
        <div className="bg-[#111827] border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col space-y-4">
          {/* Card Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/90 to-[#111827]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-brand-400 bg-brand-950/80 px-2 py-0.5 rounded border border-brand-800/80">
                    {exercise.material?.name?.en || exercise.material?.id}
                  </span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    exercise.attributes?.difficulty === 'advanced'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : exercise.attributes?.difficulty === 'intermediate'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {exercise.attributes?.difficulty}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {exercise.exercise_name?.en}
                </h1>
                <div className="text-sm text-slate-400 italic font-medium">
                  {exercise.exercise_name?.nl}
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2 text-xs">
                {videoCount === 0 ? (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                    Geen video
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold flex items-center gap-1">
                    <Tv className="w-3 h-3" /> {videoCount} video{videoCount > 1 ? "'s" : ''}
                  </span>
                )}

                {hasStartTimestamp ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Getimed
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Starttijd ontbreekt
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex border-b border-slate-800 text-xs font-semibold mt-4 space-x-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2 px-2 border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'overview'
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Overzicht & Spieren</span>
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`pb-2 px-2 border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'video'
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Video & Timestamp</span>
              </button>
              <button
                onClick={() => setActiveTab('instructions')}
                className={`pb-2 px-2 border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'instructions'
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>Instructies</span>
              </button>
            </div>
          </div>

          {/* Card Body by Selected Tab */}
          <div className="p-4 sm:p-5 pt-0 space-y-5">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Target Muscles */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-400" />
                    <span>Doelspieren</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.target_muscles?.primary?.map((m) => (
                      <span
                        key={m}
                        className="px-2.5 py-1 bg-brand-950 text-brand-300 rounded-lg border border-brand-700/60 text-xs font-semibold capitalize"
                      >
                        {m.replace(/_/g, ' ')} (Primair)
                      </span>
                    ))}
                    {exercise.target_muscles?.secondary?.map((m) => (
                      <span
                        key={m}
                        className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-xs capitalize"
                      >
                        {m.replace(/_/g, ' ')} (Secundair)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Mechanics</div>
                    <div className="font-semibold text-white capitalize mt-0.5">{exercise.attributes?.mechanics}</div>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Force Type</div>
                    <div className="font-semibold text-white capitalize mt-0.5">{exercise.attributes?.force_type}</div>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Tracking Mode</div>
                    <div className="font-semibold text-white capitalize mt-0.5">{exercise.attributes?.tracking_type?.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase font-bold">Bijgewerkt op</div>
                    <div className="font-mono text-brand-400 mt-0.5">{exercise.meta?.updated_at}</div>
                  </div>
                </div>

                {/* Aliases */}
                {exercise.aliases && exercise.aliases.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="text-xs font-bold text-slate-400">Zoeksynoniemen (Aliases):</div>
                    <div className="flex flex-wrap gap-1">
                      {exercise.aliases.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-900 text-slate-400 rounded text-[11px]">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'video' && (
              <div className="space-y-4">
                <VideoInspector
                  exercise={exercise}
                  onUpdateVideos={onUpdateVideos}
                />
              </div>
            )}

            {activeTab === 'instructions' && (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <h3 className="font-bold text-white text-sm">Instructies (Stappenplan)</h3>
                  <div className="space-y-2">
                    {exercise.instructions?.en?.map((stepEn, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                        <div className="text-[10px] font-mono text-brand-400 font-bold">Stap #{idx + 1}</div>
                        <div className="text-slate-100">{stepEn}</div>
                        {exercise.instructions?.nl?.[idx] && (
                          <div className="text-slate-400 italic text-[11px] pt-1 border-t border-slate-800/40">
                            {exercise.instructions.nl[idx]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {exercise.form_cues?.en && exercise.form_cues.en.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="font-bold text-white text-sm">Belangrijke Form Cues</h3>
                    <ul className="space-y-1.5">
                      {exercise.form_cues.en.map((cue, idx) => (
                        <li key={idx} className="p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-300">
                          {cue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Mobile/Desktop Action Bar (Goedkeuren / Wijzigen / Volgende) */}
          <div className="sticky bottom-0 z-20 p-4 bg-[#0E131F]/95 backdrop-blur-md border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              <Edit3 className="w-4 h-4 text-brand-400" />
              <span>Wijzigen / Aanpassen</span>
            </button>

            <button
              onClick={handleApproveAndNext}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-600 via-emerald-600 to-teal-600 hover:from-brand-500 hover:to-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span>Goedkeuren & Volgende →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

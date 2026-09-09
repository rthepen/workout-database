import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  Clock, 
  Info, 
  Tv, 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Check, 
  Star, 
  Tv as YoutubeIcon,
  Image as ImageIcon
} from 'lucide-react';
import type { Exercise, VideoMedia } from '../types/exercise';
import { VideoInspector } from './VideoInspector';
import { ExerciseEditor } from './ExerciseEditor';
import { openYouTubeSearchApp, buildYouTubeExerciseSearchQuery } from '../services/youtubeService';
import { sendExerciseBackupToGoogleSheet } from '../services/googleSheetService';

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
  const [copiedTitle, setCopiedTitle] = useState<boolean>(false);

  const videoCount = exercise.media?.videos?.length || 0;
  const hasStartTimestamp = exercise.media?.videos?.some(v => v.start_seconds !== undefined && v.start_seconds > 0);

  const handleCopyTitle = () => {
    const fullQuery = buildYouTubeExerciseSearchQuery(exercise);
    navigator.clipboard.writeText(fullQuery);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleSearchYouTube = () => {
    const fullQuery = buildYouTubeExerciseSearchQuery(exercise);
    openYouTubeSearchApp(fullQuery);
  };

  const handleSetRating = (rating: number) => {
    const updated: Exercise = {
      ...exercise,
      attributes: {
        ...exercise.attributes,
        rating,
      },
    };
    onSaveEdits(updated);
  };

  const handleApproveAndNext = () => {
    // Verstuur wijzigingen direct naar de centrale Google Sheet
    sendExerciseBackupToGoogleSheet(exercise);
    onApprove(exercise);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Navigation & Progress Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800/80 rounded-2xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFilterDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-400" />
            <span>Filter Queue</span>
          </button>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            Exercise {currentIndex + 1} of {totalExercises}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 rounded-xl border border-slate-700/80 transition"
            title="Previous Workout"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-white px-2 sm:hidden">
            {currentIndex + 1}/{totalExercises}
          </span>
          <button
            onClick={onNext}
            disabled={currentIndex >= totalExercises - 1}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 rounded-xl border border-slate-700/80 transition"
            title="Next Workout"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode View: Standard Review or Full Inline Editor */}
      {isEditing ? (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between bg-brand-950/60 border border-brand-500/40 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-brand-300 font-semibold">
              <Edit3 className="w-4 h-4 text-brand-400" />
              <span>Editing this exercise</span>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg font-medium"
            >
              Close Editor
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
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
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

                  {/* 5-Star Rating Assessment Component */}
                  <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-800 ml-auto sm:ml-2">
                    <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleSetRating(star)}
                        className="p-0.5 hover:scale-110 transition focus:outline-none"
                        title={`Set rating: ${star} star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            star <= (exercise.attributes?.rating || 0)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Workout Title & Copy / Search Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {exercise.exercise_name?.en}
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyTitle}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs flex items-center gap-1 transition shadow-sm"
                      title="Copy workout name to clipboard"
                    >
                      {copiedTitle ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold text-[11px]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] text-slate-300">Copy Name</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSearchYouTube}
                      className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg border border-rose-800/80 text-xs flex items-center gap-1.5 transition shadow-sm font-semibold"
                      title="Open YouTube Shorts search for this exercise"
                    >
                      <YoutubeIcon className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-[11px]">Search YouTube Shorts</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </button>
                  </div>
                </div>

                {exercise.exercise_name?.nl && (
                  <div className="text-sm text-slate-400 italic font-medium mt-0.5">
                    {exercise.exercise_name.nl}
                  </div>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-2 text-xs">
                {videoCount === 0 ? (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                    No video
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold flex items-center gap-1">
                    <Tv className="w-3 h-3" /> {videoCount} video{videoCount > 1 ? 's' : ''}
                  </span>
                )}

                {hasStartTimestamp ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Timestamped
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Missing start time
                  </span>
                )}
                
                {exercise.media?.videos?.[0]?.thumbnail_seconds !== undefined && exercise.media.videos[0].thumbnail_seconds > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold flex items-center gap-1">
                    🖼️ Frame: {exercise.media.videos[0].thumbnail_seconds}s
                  </span>
                )}

                {exercise.media?.images && exercise.media.images.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> {exercise.media.images.length} image{exercise.media.images.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Continuous Stacked Sections (No Tabs) */}
          <div className="p-4 sm:p-5 space-y-6">
            {/* 1. Video & Timestamps Section */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-rose-400" />
                <span>Video & Timestamps</span>
              </h2>
              <VideoInspector
                exercise={exercise}
                onUpdateVideos={onUpdateVideos}
              />
            </div>

            {/* Visual Guide / Exercise Photos Section */}
            {exercise.media?.images && exercise.media.images.length > 0 && (
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-2.5">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span>Demonstration Images ({exercise.media.images.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {exercise.media.images.map((img, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group aspect-video sm:aspect-square flex flex-col items-center justify-center p-2">
                      <img
                        src={img.url}
                        alt={`${exercise.exercise_name?.en || 'Exercise'} step ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 border border-slate-700">
                        {img.type || 'photo'} #{idx + 1}
                      </div>
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700"
                        title="Open full size image"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Instructions & Form Cues Section */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-2.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Instructions & Form Cues</span>
              </h2>

              <div className="space-y-2">
                <h3 className="font-bold text-white text-xs">Step-by-Step Instructions</h3>
                <div className="space-y-2">
                  {exercise.instructions?.en?.map((stepEn, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-[10px] font-mono text-brand-400 font-bold">Step #{idx + 1}</div>
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
                  <h3 className="font-bold text-white text-xs">Key Form Cues</h3>
                  <ul className="space-y-1.5">
                    {exercise.form_cues.en.map((cue, idx) => (
                      <li key={idx} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300">
                        {cue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 3. Overview & Anatomy Section */}
            <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-2.5">
                <Info className="w-4 h-4 text-sky-400" />
                <span>Overview & Anatomy</span>
              </h2>

              {/* Equipment & Muscle Groups */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-xs">Target Anatomical Muscles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">
                      Primary Muscles
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.target_muscles?.primary?.map(m => (
                        <span key={m} className="px-2 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800 font-mono">
                          {m.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block mb-1">
                      Secondary Muscles
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.target_muscles?.secondary?.map(m => (
                        <span key={m} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {m.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attributes breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Category</div>
                  <div className="text-white font-semibold mt-0.5">{exercise.category?.en}</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Mechanics</div>
                  <div className="text-white font-semibold mt-0.5">{exercise.attributes?.mechanics}</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Force Type</div>
                  <div className="text-white font-semibold mt-0.5">{exercise.attributes?.force_type}</div>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Tracking</div>
                  <div className="text-white font-semibold mt-0.5">{exercise.attributes?.tracking_type}</div>
                </div>
              </div>
            </div>

            {/* 4. Metadata & Schema Version Info Footer */}
            <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Schema Version:</span>
                <span className="px-2 py-0.5 bg-slate-900 text-slate-200 border border-slate-800 rounded font-bold">
                  {exercise.meta?.schema_version || '1.1.0'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Updated At:</span>
                <span className="px-2 py-0.5 bg-slate-900 text-emerald-400 border border-slate-800 rounded font-bold">
                  {exercise.meta?.updated_at || '1970-01-01'}
                </span>
              </div>
            </div>
          </div>

          {/* Fixed Floating Action Bar (Approve / Direct 1-Click PR / Edit) ALWAYS Floating at Screen Bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-[#0B0F17]/95 backdrop-blur-xl border-t border-slate-800 flex items-center justify-center shadow-[0_-12px_30px_rgba(0,0,0,0.9)]">
            <div className="max-w-4xl w-full flex items-center justify-between gap-2 sm:gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition transform active:scale-95 whitespace-nowrap"
              >
                <Edit3 className="w-4 h-4 text-brand-400" />
                <span>Edit</span>
              </button>

              {/* Primary Action Button: Approve & Submit to Google Sheet */}
              <button
                onClick={handleApproveAndNext}
                title="Goedkeuren en direct opslaan in Google Sheet"
                className="flex-1 px-5 sm:px-8 py-2.5 sm:py-3.5 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition transform active:scale-95 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 ring-1 ring-emerald-400/40 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
                <span>✔ Goedkeuren & Volgende →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

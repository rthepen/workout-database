import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Exercise, VideoMedia } from '../types/exercise';
import {
  Check,
  X,
  Search,
  Info,
  ChevronUp,
  ChevronDown,
  Link2,
  ClipboardPaste,
  Smartphone,
  Tv,
  Dumbbell,
  Save,
  Sparkles,
  Layers,
  Clock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SmartAuditVideoPlayer } from './SmartAuditVideoPlayer';
import confetti from 'canvas-confetti';

export type VideoFormatFilter = 'all' | 'normal' | 'short' | 'no_video';
export type AuditStatusFilter = 'all' | 'pending' | 'ok' | 'remove' | 'replaced';

export interface ReplacementData {
  rawInput: string;
  youtubeId: string;
  type: 'standard' | 'short';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | string;
  durationSeconds?: number;
  channel?: string;
  likes?: number;
  startSeconds?: number;
  isLoadingOEmbed?: boolean;
}

export type VideoStatusDecision = 'ok' | 'remove';

interface TikTokVideoAuditProps {
  exercises: Exercise[];
  decisions: Record<string, VideoStatusDecision>;
  onSetDecision: (exerciseId: string, decision: VideoStatusDecision) => void;
  replacements: Record<string, ReplacementData>;
  onReplacementInputChange: (exerciseId: string, value: string) => void;
  onClearReplacement: (exerciseId: string) => void;
  onUpdateReplacementMetadata: (exerciseId: string, updates: Partial<ReplacementData>) => void;
  onSaveBatch: (updatedExercises: Exercise[]) => Promise<void>;
  onSwitchToListView: () => void;
  materialsList: { id: string; name: { en: string; nl: string } }[];
}

export const TikTokVideoAudit: React.FC<TikTokVideoAuditProps> = ({
  exercises,
  decisions,
  onSetDecision,
  replacements,
  onReplacementInputChange,
  onClearReplacement,
  onUpdateReplacementMetadata,
  onSaveBatch,
  onSwitchToListView,
  materialsList,
}) => {
  // Local filter states
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [videoFormatFilter, setVideoFormatFilter] = useState<VideoFormatFilter>('all');
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [infoModalExercise, setInfoModalExercise] = useState<Exercise | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState<boolean>(true);

  // Active slide tracking
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Valid replacements map
  const replacementMap = useMemo(() => {
    return new Map(
      Object.entries(replacements).filter(([, rep]) => rep.youtubeId && rep.youtubeId.length === 11)
    );
  }, [replacements]);

  // Helper to determine video format
  const getExerciseVideoFormat = useCallback(
    (ex: Exercise): 'normal' | 'short' | 'no_video' => {
      const rep = replacements[ex.id];
      if (rep && rep.youtubeId && rep.youtubeId.length === 11) {
        return rep.type === 'short' || rep.aspectRatio === '9:16' ? 'short' : 'normal';
      }
      const primary = ex.media?.videos?.[0];
      if (!primary || !primary.youtube_id) {
        return 'no_video';
      }
      if (primary.type === 'short' || primary.aspect_ratio === '9:16') {
        return 'short';
      }
      return 'normal';
    },
    [replacements]
  );

  // Filtered exercises list
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      // 1. Video format filter
      const fmt = getExerciseVideoFormat(ex);
      if (videoFormatFilter === 'normal' && fmt !== 'normal') return false;
      if (videoFormatFilter === 'short' && fmt !== 'short') return false;
      if (videoFormatFilter === 'no_video' && fmt !== 'no_video') return false;

      // 2. Status filter
      if (statusFilter !== 'all') {
        const hasRep = replacementMap.has(ex.id);
        const dec = decisions[ex.id];
        if (statusFilter === 'replaced' && !hasRep) return false;
        if (statusFilter === 'ok' && (hasRep || dec !== 'ok')) return false;
        if (statusFilter === 'remove' && (hasRep || dec !== 'remove')) return false;
        if (statusFilter === 'pending' && (hasRep || dec === 'ok' || dec === 'remove')) return false;
      }

      // 3. Material filter
      if (selectedMaterial !== 'all') {
        if (ex.material?.id !== selectedMaterial) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameEn = ex.exercise_name?.en?.toLowerCase() || '';
        const nameNl = ex.exercise_name?.nl?.toLowerCase() || '';
        const cat = ((ex.category as any)?.nl || (ex.category as any)?.en || '').toLowerCase();
        const id = ex.id.toLowerCase();
        const matName = ex.material?.name?.nl?.toLowerCase() || ex.material?.name?.en?.toLowerCase() || '';

        if (!nameEn.includes(q) && !nameNl.includes(q) && !cat.includes(q) && !id.includes(q) && !matName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [exercises, videoFormatFilter, statusFilter, selectedMaterial, searchQuery, getExerciseVideoFormat, decisions, replacementMap]);

  // Reset activeIndex when filter changes
  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [videoFormatFilter, statusFilter, selectedMaterial, searchQuery]);

  // Scroll listener to update activeIndex on user scroll/swipe
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const scrollPos = container.scrollTop;
    const height = container.clientHeight;
    if (height <= 0) return;
    const newIdx = Math.round(scrollPos / height);
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < filteredExercises.length) {
      setActiveIndex(newIdx);
    }
  };

  // Jump to specific index
  const scrollToSlide = (idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const target = Math.max(0, Math.min(idx, filteredExercises.length - 1));
    const targetEl = slideRefs.current[target];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      container.scrollTo({
        top: target * container.clientHeight,
        behavior: 'smooth',
      });
    }
    setActiveIndex(target);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToSlide(activeIndex + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToSlide(activeIndex - 1);
      } else if (e.key === 'v' || e.key === 'y' || e.key === 'Enter') {
        // Quick approve
        const curr = filteredExercises[activeIndex];
        if (curr) onSetDecision(curr.id, 'ok');
      } else if (e.key === 'x' || e.key === 'n' || e.key === 'Delete') {
        // Quick reject
        const curr = filteredExercises[activeIndex];
        if (curr) onSetDecision(curr.id, 'remove');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, filteredExercises, onSetDecision]);

  // Counts
  const totalModifications = useMemo(() => {
    return Object.keys(decisions).length + replacementMap.size;
  }, [decisions, replacementMap]);

  // Batch Save handler
  const handleTriggerSave = async () => {
    if (totalModifications === 0) return;
    setIsSubmitting(true);
    try {
      const updatedExercises = exercises.map((ex) => {
        const hasDecision = decisions[ex.id];
        const rep = replacements[ex.id];

        // Replacement takes priority
        if (rep && rep.youtubeId && rep.youtubeId.length === 11) {
          const newVideo: VideoMedia = {
            youtube_id: rep.youtubeId,
            type: rep.type,
            priority: 1,
            language: 'en',
            aspect_ratio: rep.aspectRatio,
            start_seconds: rep.startSeconds || 0,
            duration_seconds: rep.durationSeconds,
            channel: rep.channel,
            likes: rep.likes,
          };
          return {
            ...ex,
            media: {
              ...ex.media,
              videos: [newVideo, ...(ex.media?.videos?.slice(1) || [])],
            },
          };
        }

        // Removal decision
        if (hasDecision === 'remove') {
          return {
            ...ex,
            media: {
              ...ex.media,
              videos: [],
            },
          };
        }

        // OK decision
        if (hasDecision === 'ok') {
          const primary = ex.media?.videos?.[0];
          if (primary) {
            return {
              ...ex,
              media: {
                ...ex.media,
                videos: [
                  {
                    ...primary,
                  },
                  ...(ex.media?.videos?.slice(1) || []),
                ],
              },
            };
          }
        }

        return ex;
      });

      await onSaveBatch(updatedExercises);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Batch save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to open YouTube search
  const openYouTubeSearch = (ex: Exercise) => {
    const name = ex.exercise_name?.en || ex.exercise_name?.nl || '';
    const mat = ex.material?.name?.en || ex.material?.name?.nl || '';
    const query = `${name} ${mat} workout exercise form short`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
    window.open(url, '_blank', 'noreferrer');
  };

  // Paste from clipboard helper
  const handlePasteFromClipboard = async (exerciseId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          onReplacementInputChange(exerciseId, text);
        }
      }
    } catch (err) {
      console.warn('Clipboard read permission denied or unavailable:', err);
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-4.8rem)] flex flex-col bg-black overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl">
      {/* 1. Top HUD Overlay: Controls, Switcher, Counter, and Quick Filters */}
      <div className="absolute top-0 inset-x-0 z-30 p-2.5 sm:p-3.5 bg-gradient-to-b from-black/95 via-black/80 to-transparent backdrop-blur-sm space-y-2 pointer-events-auto">
        <div className="flex items-center justify-between gap-2">
          {/* Left: View Switcher & Title */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToListView}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Terug naar overzicht met kaarten"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Kaarten Lijst</span>
              <span className="sm:hidden">Lijst</span>
            </button>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs font-bold">
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span>📱 TikTok Audit</span>
            </div>
          </div>

          {/* Center: Counter badge */}
          <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-white font-mono text-xs font-bold shadow-inner">
            {filteredExercises.length > 0 ? `${activeIndex + 1} / ${filteredExercises.length}` : '0 / 0'}
          </div>

          {/* Right: Save Batch Button & Autoplay Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAutoplayEnabled(!autoplayEnabled)}
              className={`p-1.5 rounded-xl text-xs font-bold flex items-center transition border ${
                autoplayEnabled
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-900/90 text-slate-400 border-slate-700'
              }`}
              title={autoplayEnabled ? 'Automatisch afspelen: AAN' : 'Automatisch afspelen: UIT'}
            >
              {autoplayEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            <button
              onClick={handleTriggerSave}
              disabled={totalModifications === 0 || isSubmitting}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition ${
                totalModifications > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
              title="Sla alle goedkeuringen en vervangingen op in de database en Google Sheet"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSubmitting ? 'Opslaan...' : totalModifications > 0 ? `Opslaan (${totalModifications})` : 'Opslaan'}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Format Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-xs">
          <button
            onClick={() => setVideoFormatFilter('all')}
            className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
              videoFormatFilter === 'all'
                ? 'bg-slate-700 text-white shadow'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>🌐 Alles ({exercises.length})</span>
          </button>
          <button
            onClick={() => setVideoFormatFilter('short')}
            className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
              videoFormatFilter === 'short'
                ? 'bg-purple-600 text-white shadow shadow-purple-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-purple-300 border border-slate-800'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Shorts (9:16)</span>
          </button>
          <button
            onClick={() => setVideoFormatFilter('normal')}
            className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
              videoFormatFilter === 'normal'
                ? 'bg-sky-600 text-white shadow shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-sky-300 border border-slate-800'
            }`}
          >
            <Tv className="w-3 h-3" />
            <span>Normaal (16:9)</span>
          </button>
          <button
            onClick={() => setVideoFormatFilter('no_video')}
            className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 ${
              videoFormatFilter === 'no_video'
                ? 'bg-amber-600 text-white shadow shadow-amber-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-amber-300 border border-slate-800'
            }`}
          >
            <span>🚫 Zonder Video</span>
          </button>

          {/* Apparatus Dropdown */}
          <div className="relative flex items-center flex-shrink-0">
            <Dumbbell className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className={`pl-6 pr-6 py-1 bg-slate-900 border text-xs rounded-xl focus:outline-none transition ${
                selectedMaterial !== 'all'
                  ? 'border-cyan-500/70 text-cyan-300 font-bold'
                  : 'border-slate-800 text-slate-400'
              }`}
            >
              <option value="all">Alle Apparaten</option>
              {materialsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name.nl || m.name.en}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Vertical Full-Viewport Scroll Snap Feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {filteredExercises.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
            <Tv className="w-12 h-12 text-slate-600" />
            <h3 className="text-base font-bold text-white">Geen oefeningen gevonden</h3>
            <p className="text-xs max-w-xs">
              Er zijn geen oefeningen die voldoen aan de geselecteerde filters.
            </p>
            <button
              onClick={() => {
                setVideoFormatFilter('all');
                setStatusFilter('all');
                setSelectedMaterial('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-500 transition shadow"
            >
              Reset alle filters
            </button>
          </div>
        ) : (
          filteredExercises.map((ex, idx) => {
            const isActive = idx === activeIndex;
            const rep = replacements[ex.id];
            const hasValidReplacement = !!(rep && rep.youtubeId && rep.youtubeId.length === 11);
            const primaryVideo = ex.media?.videos?.[0];
            const displayVideoId = hasValidReplacement ? rep.youtubeId : primaryVideo?.youtube_id;
            const displayStartSec = hasValidReplacement ? rep.startSeconds || 0 : primaryVideo?.start_seconds || 0;
            const isShort = hasValidReplacement
              ? rep.type === 'short' || rep.aspectRatio === '9:16'
              : primaryVideo?.type === 'short' || primaryVideo?.aspect_ratio === '9:16';

            const decision = decisions[ex.id];
            const isOk = decision === 'ok' && !hasValidReplacement;
            const isRemove = decision === 'remove' && !hasValidReplacement;

            return (
              <div
                key={ex.id}
                ref={(el) => {
                  slideRefs.current[idx] = el;
                }}
                className="h-full w-full relative flex items-center justify-center snap-start snap-always bg-black select-none overflow-hidden"
              >
                {/* Center Video Area */}
                <div className="w-full h-full flex items-center justify-center relative p-2 pt-20 pb-36 sm:pb-32">
                  {displayVideoId ? (
                    <div
                      className={`relative flex items-center justify-center transition-all ${
                        isShort ? 'w-auto h-full max-w-full aspect-[9/16]' : 'w-full max-w-2xl aspect-[16/9]'
                      }`}
                    >
                      <SmartAuditVideoPlayer
                        exerciseId={ex.id}
                        videoId={displayVideoId}
                        startSeconds={displayStartSec}
                        isShort={isShort}
                        hasValidReplacement={hasValidReplacement}
                        title={ex.exercise_name?.nl || ex.exercise_name?.en || ex.id}
                        autoplayEnabled={autoplayEnabled && isActive}
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-md h-72 rounded-3xl bg-slate-950/80 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <Tv className="w-12 h-12 text-slate-600" />
                      <div>
                        <h4 className="font-bold text-white text-sm">Geen video gekoppeld</h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Zoek een geschikte video op YouTube of plak direct een link in de balk hieronder.
                        </p>
                      </div>
                      <button
                        onClick={() => openYouTubeSearch(ex)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition"
                      >
                        <Search className="w-4 h-4" />
                        <span>Zoek op YouTube</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Right Floating Action Bar (ALWAYS VISIBLE IN TIKTOK STYLE) */}
                <div className="absolute right-3 sm:right-6 bottom-32 sm:bottom-28 z-30 flex flex-col items-center gap-3.5 pointer-events-auto">
                  {/* Approve Checkmark Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSetDecision(ex.id, 'ok')}
                      disabled={!displayVideoId}
                      className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all transform active:scale-90 shadow-2xl disabled:opacity-30 ${
                        isOk
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-400/50 shadow-emerald-500/60 scale-110'
                          : 'bg-slate-900/90 hover:bg-emerald-950/90 text-slate-300 hover:text-emerald-300 border-2 border-slate-700/80 backdrop-blur-md'
                      }`}
                      title="Video is goed (goedkeuren)"
                    >
                      <Check className="w-7 h-7 stroke-[3.5]" />
                    </button>
                    <span
                      className={`text-[10px] font-black tracking-wider uppercase drop-shadow-md ${
                        isOk ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {isOk ? '✓ Goed' : 'Goed'}
                    </span>
                  </div>

                  {/* Reject / Remove Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSetDecision(ex.id, 'remove')}
                      disabled={!displayVideoId}
                      className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all transform active:scale-90 shadow-2xl disabled:opacity-30 ${
                        isRemove
                          ? 'bg-rose-600 text-white ring-4 ring-rose-400/50 shadow-rose-500/60 scale-110'
                          : 'bg-slate-900/90 hover:bg-rose-950/90 text-slate-300 hover:text-rose-300 border-2 border-slate-700/80 backdrop-blur-md'
                      }`}
                      title="Video is fout (verwijderen / afkeuren)"
                    >
                      <X className="w-7 h-7 stroke-[3.5]" />
                    </button>
                    <span
                      className={`text-[10px] font-black tracking-wider uppercase drop-shadow-md ${
                        isRemove ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {isRemove ? '✕ Fout' : 'Afkeur'}
                    </span>
                  </div>

                  {/* YouTube Search Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openYouTubeSearch(ex)}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-red-600/90 hover:bg-red-500 text-white border border-red-400/40 shadow-xl shadow-red-600/30 backdrop-blur-md transition transform active:scale-90"
                      title="Zoek alternatieve video's op YouTube"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-300 drop-shadow-md">
                      Zoek YT
                    </span>
                  </div>

                  {/* Exercise Info (i) Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setInfoModalExercise(ex)}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-sky-600/90 hover:bg-sky-500 text-white border border-sky-400/40 shadow-xl shadow-sky-600/30 backdrop-blur-md transition transform active:scale-90"
                      title="Bekijk alle details en cues van deze oefening"
                    >
                      <Info className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    <span className="text-[10px] font-black tracking-wider uppercase text-sky-300 drop-shadow-md">
                      Info (i)
                    </span>
                  </div>

                  {/* Desktop / Rapid Jump Up/Down arrows */}
                  <div className="hidden sm:flex flex-col gap-1 pt-1">
                    <button
                      onClick={() => scrollToSlide(activeIndex - 1)}
                      disabled={activeIndex === 0}
                      className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center disabled:opacity-20 transition"
                      title="Vorige oefening (pijl omhoog of k)"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => scrollToSlide(activeIndex + 1)}
                      disabled={activeIndex === filteredExercises.length - 1}
                      className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center disabled:opacity-20 transition"
                      title="Volgende oefening (pijl omlaag of j)"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 4. Bottom Overlay: Title, Metadata, and ALWAYS-VISIBLE URL Paste Bar */}
                <div className="absolute bottom-0 inset-x-0 z-20 px-3 sm:px-6 pb-3 pt-6 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-[2px] space-y-2 pointer-events-auto">
                  {/* Exercise Title and Tags Row */}
                  <div className="flex items-start justify-between gap-3 pr-16 sm:pr-20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-white leading-tight drop-shadow">
                          {ex.exercise_name?.nl || ex.exercise_name?.en}
                        </h3>
                        {ex.exercise_name?.en && ex.exercise_name?.nl && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            ({ex.exercise_name.en})
                          </span>
                        )}
                      </div>

                      {/* Badges Row */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        {/* Equipment */}
                        {ex.material?.name && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700 font-semibold flex items-center gap-1">
                            <Dumbbell className="w-2.5 h-2.5 text-slate-400" />
                            <span>{ex.material.name.nl || ex.material.name.en}</span>
                          </span>
                        )}

                        {/* Format badge */}
                        {isShort ? (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-950/90 text-purple-300 border border-purple-500/50 font-bold flex items-center gap-1">
                            <Smartphone className="w-2.5 h-2.5" />
                            <span>Short (9:16)</span>
                          </span>
                        ) : displayVideoId ? (
                          <span className="px-2 py-0.5 rounded-lg bg-sky-950/90 text-sky-300 border border-sky-500/50 font-bold flex items-center gap-1">
                            <Tv className="w-2.5 h-2.5" />
                            <span>16:9</span>
                          </span>
                        ) : null}

                        {/* Channel or Duration */}
                        {(hasValidReplacement ? rep.channel : primaryVideo?.channel) && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-800 font-medium">
                            {hasValidReplacement ? rep.channel : primaryVideo?.channel}
                          </span>
                        )}

                        {(hasValidReplacement ? rep.durationSeconds : primaryVideo?.duration_seconds) && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 text-amber-300 border border-slate-800 font-mono font-medium flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {hasValidReplacement ? rep.durationSeconds : primaryVideo?.duration_seconds}s
                            </span>
                          </span>
                        )}

                        {/* Replacement badge */}
                        {hasValidReplacement && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold animate-pulse">
                            ✓ Vervanger Actief
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ALWAYS VISIBLE URL PASTE / REPLACEMENT BAR */}
                  <div className="relative pr-16 sm:pr-20">
                    <div
                      className={`flex items-center gap-1.5 bg-slate-950/95 border rounded-2xl p-1 shadow-2xl transition ${
                        hasValidReplacement
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'border-slate-700/90 focus-within:border-cyan-500'
                      }`}
                    >
                      <Link2 className="w-4 h-4 text-cyan-400 ml-2.5 flex-shrink-0" />
                      <input
                        type="text"
                        value={rep?.rawInput || ''}
                        onChange={(e) => onReplacementInputChange(ex.id, e.target.value)}
                        placeholder="🔗 Plak YouTube URL of ID om video direct te vervangen..."
                        className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none py-1.5 px-1"
                      />

                      {/* Direct Clipboard Paste Button */}
                      <button
                        type="button"
                        onClick={() => handlePasteFromClipboard(ex.id)}
                        className="px-2.5 py-1 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition flex-shrink-0 shadow active:scale-95"
                        title="Plak vanaf klembord"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Plak</span>
                      </button>

                      {rep?.rawInput && (
                        <button
                          type="button"
                          onClick={() => onClearReplacement(ex.id)}
                          className="p-1 text-slate-400 hover:text-white text-xs font-bold"
                          title="Wissen"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Quick Metadata Toggle (if replacement is valid) */}
                    {hasValidReplacement && (
                      <div className="mt-1 flex items-center justify-between text-[11px] px-2 text-emerald-300 font-medium">
                        <span className="flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Geldig ({rep.youtubeId})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="text-slate-400 text-[10px]">Type:</label>
                          <select
                            value={rep.type}
                            onChange={(e) => {
                              const newType = e.target.value as 'standard' | 'short';
                              onUpdateReplacementMetadata(ex.id, {
                                type: newType,
                                aspectRatio: newType === 'short' ? '9:16' : '16:9',
                              });
                            }}
                            className="bg-slate-900 border border-emerald-500/50 text-white rounded-lg px-2 py-0.5 text-[11px] focus:outline-none"
                          >
                            <option value="short">📱 Short (9:16)</option>
                            <option value="standard">📺 Normaal (16:9)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Oefening Informatie Bottom Sheet / Modal (Opened via (i) button) */}
      {infoModalExercise && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
          onClick={() => setInfoModalExercise(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0E131F] border border-slate-700/80 rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-900/50">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-400">
                  Oefening Informatie
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {infoModalExercise.exercise_name?.nl || infoModalExercise.exercise_name?.en}
                </h3>
                {infoModalExercise.exercise_name?.en && (
                  <p className="text-xs text-slate-400">{infoModalExercise.exercise_name.en}</p>
                )}
              </div>
              <button
                onClick={() => setInfoModalExercise(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Properties Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Materiaal</span>
                  <span className="font-bold text-white text-xs">
                    {infoModalExercise.material?.name?.nl || infoModalExercise.material?.name?.en || 'Geen'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Moeilijkheid</span>
                  <span className="font-bold text-amber-300 text-xs capitalize">
                    {infoModalExercise.attributes?.difficulty || 'Onbekend'}
                  </span>
                </div>
              </div>

              {/* Muscles */}
              {infoModalExercise.target_muscles && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Doelspieren:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {infoModalExercise.target_muscles.primary?.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 font-bold"
                      >
                        Primair: {m}
                      </span>
                    ))}
                    {infoModalExercise.target_muscles.secondary?.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
                      >
                        Secundair: {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Cues */}
              {((infoModalExercise.form_cues?.nl && infoModalExercise.form_cues.nl.length > 0) ||
                (infoModalExercise.form_cues?.en && infoModalExercise.form_cues.en.length > 0)) && (
                <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <span className="text-[10px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Aandachtspunten & Cues:</span>
                  </span>
                  <ul className="space-y-1.5 text-slate-300 leading-relaxed">
                    {(infoModalExercise.form_cues?.nl || infoModalExercise.form_cues?.en || []).map((cue, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions */}
              {((infoModalExercise.instructions?.nl && infoModalExercise.instructions.nl.length > 0) ||
                (infoModalExercise.instructions?.en && infoModalExercise.instructions.en.length > 0)) && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Stap-voor-stap Uitvoering:
                  </span>
                  <div className="space-y-2 text-slate-300 leading-relaxed">
                    {(infoModalExercise.instructions?.nl || infoModalExercise.instructions?.en || []).map(
                      (step, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-2">
                          <span className="font-mono font-bold text-sky-400 flex-shrink-0">{sIdx + 1}.</span>
                          <span>{step}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-slate-500">{infoModalExercise.id}</span>
              <button
                onClick={() => {
                  openYouTubeSearch(infoModalExercise);
                  setInfoModalExercise(null);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Zoek op YouTube</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Search, 
  Filter, 
  ExternalLink, 
  Send, 
  Play, 
  Tv, 
  RotateCcw, 
  CheckCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import type { Exercise } from '../types/exercise';
import confetti from 'canvas-confetti';

interface RapidVideoAuditProps {
  exercises: Exercise[];
  onSaveBatch: (updatedExercises: Exercise[]) => Promise<void>;
  onSelectExerciseToView: (exerciseId: string) => void;
  materialsList: { id: string; name: { en: string; nl: string } }[];
}

type VideoStatusDecision = 'ok' | 'remove';

export const RapidVideoAudit: React.FC<RapidVideoAuditProps> = ({
  exercises,
  onSaveBatch,
  onSelectExerciseToView,
  materialsList,
}) => {
  // Filters
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [videoFilter, setVideoFilter] = useState<'with_videos' | 'all' | 'no_videos'>('with_videos');
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});

  // Decisions map: exerciseId -> 'ok' | 'remove'
  const [decisions, setDecisions] = useState<Record<string, VideoStatusDecision>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Filtered Exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      // 1. Video presence filter
      const videoCount = ex.media?.videos?.length || 0;
      if (videoFilter === 'with_videos' && videoCount === 0) return false;
      if (videoFilter === 'no_videos' && videoCount > 0) return false;

      // 2. Material filter
      if (selectedMaterial !== 'all') {
        const matId = ex.material?.id;
        if (matId !== selectedMaterial) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameEn = ex.exercise_name?.en?.toLowerCase() || '';
        const nameNl = ex.exercise_name?.nl?.toLowerCase() || '';
        const cat = ((ex.category as any)?.nl || (ex.category as any)?.en || '').toLowerCase();
        const id = ex.id.toLowerCase();
        if (!nameEn.includes(q) && !nameNl.includes(q) && !cat.includes(q) && !id.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [exercises, selectedMaterial, searchQuery, videoFilter]);

  // Decision counts
  const removeList = useMemo(() => {
    return Object.entries(decisions)
      .filter(([, status]) => status === 'remove')
      .map(([id]) => id);
  }, [decisions]);

  const okCount = useMemo(() => {
    return Object.values(decisions).filter(s => s === 'ok').length;
  }, [decisions]);

  const handleSetDecision = (exerciseId: string, decision: VideoStatusDecision) => {
    setDecisions(prev => {
      // Toggle off if clicking the same decision again
      if (prev[exerciseId] === decision) {
        const next = { ...prev };
        delete next[exerciseId];
        return next;
      }
      return {
        ...prev,
        [exerciseId]: decision,
      };
    });
  };

  const handleMarkAllVisibleAsOk = () => {
    setDecisions(prev => {
      const next = { ...prev };
      filteredExercises.forEach(ex => {
        if (ex.media?.videos && ex.media.videos.length > 0) {
          next[ex.id] = 'ok';
        }
      });
      return next;
    });
  };

  const handleResetDecisions = () => {
    setDecisions({});
  };

  const toggleInstructions = (id: string) => {
    setExpandedInstructions(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSubmitAll = async () => {
    const toRemoveIds = new Set(removeList);
    const toOkIds = new Set(
      Object.entries(decisions)
        .filter(([, status]) => status === 'ok')
        .map(([id]) => id)
    );

    if (toRemoveIds.size === 0 && toOkIds.size === 0) {
      alert('Er zijn nog geen beoordelingen gemaakt.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      // Prepare updated exercises:
      // - If marked as remove: strip videos and update timestamp
      // - If marked as ok: update timestamp
      const updatedList: Exercise[] = [];

      exercises.forEach(ex => {
        if (toRemoveIds.has(ex.id)) {
          updatedList.push({
            ...ex,
            media: {
              ...ex.media,
              videos: [],
            },
            meta: {
              ...ex.meta,
              updated_at: now,
            },
          });
        } else if (toOkIds.has(ex.id)) {
          updatedList.push({
            ...ex,
            meta: {
              ...ex.meta,
              updated_at: now,
            },
          });
        }
      });

      await onSaveBatch(updatedList);

      // Reset decisions after success
      setDecisions({});
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.85 },
        });
      } catch {
        // Fallback
      }
    } catch (err: any) {
      alert(`Fout bij verzenden: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-32">
      {/* Top Banner & Filter Controls */}
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="p-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                ⚡
              </span>
              <span>Snelle Video Audit</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Blader compact door workouts. Beoordeel met <span className="text-emerald-400 font-bold">Ja</span> of <span className="text-rose-400 font-bold">Nee</span>. Foute video's worden met 1 klik verwijderd.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={handleMarkAllVisibleAsOk}
              title="Zet alle zichtbare video's op OK"
              className="flex-1 sm:flex-initial px-3 py-1.5 text-xs text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 rounded-xl font-bold flex items-center justify-center gap-1.5 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Alles OK</span>
            </button>
            {Object.keys(decisions).length > 0 && (
              <button
                onClick={handleResetDecisions}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Zoek workout op naam, ID of categorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-brand-500 placeholder-slate-500"
            />
          </div>

          {/* Equipment Dropdown */}
          <div className="sm:col-span-4">
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
            >
              <option value="all">Alle Apparatuur ({exercises.length})</option>
              {materialsList.map((m) => {
                const count = exercises.filter(e => e.material?.id === m.id).length;
                return (
                  <option key={m.id} value={m.id}>
                    {m.name.nl || m.name.en} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Video Filter Toggle */}
          <div className="sm:col-span-3 flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setVideoFilter('with_videos')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition ${
                videoFilter === 'with_videos'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Met video
            </button>
            <button
              onClick={() => setVideoFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition ${
                videoFilter === 'all'
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alles
            </button>
            <button
              onClick={() => setVideoFilter('no_videos')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-[11px] transition ${
                videoFilter === 'no_videos'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Zonder
            </button>
          </div>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>
            {filteredExercises.length} workout(s) getoond
          </span>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-semibold">
              ✔ {okCount} gemarkeerd als OK
            </span>
            <span className="text-rose-400 font-semibold">
              ❌ {removeList.length} gemarkeerd voor verwijdering
            </span>
          </div>
        </div>
      </div>

      {/* Workout Rows List */}
      <div className="space-y-3">
        {filteredExercises.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <Filter className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Geen workouts gevonden</h3>
            <p className="text-xs text-slate-500">Pas je filters of zoekopdracht aan.</p>
          </div>
        ) : (
          filteredExercises.map((ex, idx) => {
            const decision = decisions[ex.id];
            const isRemove = decision === 'remove';
            const isOk = decision === 'ok';

            const videos = ex.media?.videos || [];
            const hasVideo = videos.length > 0;
            const primaryVideo = videos[0];
            const youtubeId = primaryVideo?.youtube_id;
            const startSec = primaryVideo?.start_seconds || 0;

            const isExpanded = expandedInstructions[ex.id];
            const instructionsNl = ex.instructions?.nl || [];
            const instructionsEn = ex.instructions?.en || [];
            const instructions = instructionsNl.length > 0 ? instructionsNl : instructionsEn;

            const isPlayingThis = playingVideoId === ex.id;

            return (
              <div
                key={ex.id}
                className={`bg-[#101626] border rounded-2xl p-3 sm:p-4 transition shadow-md ${
                  isRemove
                    ? 'border-rose-500/70 bg-rose-950/20 ring-1 ring-rose-500/40'
                    : isOk
                    ? 'border-emerald-500/60 bg-emerald-950/15'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
                  {/* Left Column: Title, Equipment, & Instructions */}
                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-slate-500 font-bold">
                        #{idx + 1}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                        {ex.exercise_name?.nl || ex.exercise_name?.en || ex.id}
                      </h3>
                      {ex.exercise_name?.en && ex.exercise_name.en !== ex.exercise_name.nl && (
                        <span className="text-xs text-slate-400 italic">
                          ({ex.exercise_name.en})
                        </span>
                      )}

                      {/* Equipment / Material Badge */}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 font-medium">
                        {ex.material?.name?.nl || ex.material?.name?.en || ex.material?.id}
                      </span>

                      {/* Category Badge */}
                      {ex.category && (
                        <span className="px-2 py-0.5 rounded-lg bg-sky-950/80 border border-sky-800 text-[10px] text-sky-300 font-medium">
                          {typeof ex.category === 'string' ? ex.category : (ex.category.nl || ex.category.en)}
                        </span>
                      )}

                      {isRemove && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-600 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                          <Trash2 className="w-3 h-3" />
                          <span>Video Wordt Verwijderd</span>
                        </span>
                      )}
                    </div>

                    {/* Compact Instructions Toggle */}
                    {instructions.length > 0 && (
                      <div className="text-xs text-slate-300 bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                          <span>Instructies ({instructions.length} stappen):</span>
                          <button
                            onClick={() => toggleInstructions(ex.id)}
                            className="text-brand-400 hover:text-brand-300 flex items-center gap-0.5 font-medium"
                          >
                            <span>{isExpanded ? 'Inklappen' : 'Toon alles'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="space-y-1 text-slate-300 leading-relaxed">
                          {(isExpanded ? instructions : instructions.slice(0, 2)).map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-1.5">
                              <span className="text-slate-500 font-bold flex-shrink-0">{sIdx + 1}.</span>
                              <span className="line-clamp-2">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Center/Right Column: Compact Video Preview */}
                  <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-shrink-0 border-t lg:border-t-0 border-slate-800/80 pt-2 lg:pt-0">
                    {hasVideo && youtubeId ? (
                      <div className="flex items-center gap-2.5">
                        {isPlayingThis ? (
                          <div className="w-48 sm:w-56 h-28 sm:h-32 rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-black relative">
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&start=${startSec}&rel=0`}
                              title={ex.exercise_name?.en || ex.id}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                            <button
                              onClick={() => setPlayingVideoId(null)}
                              className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/80 text-white rounded text-[10px] font-bold z-10"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => setPlayingVideoId(ex.id)}
                            className="relative w-36 sm:w-44 h-20 sm:h-24 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer group shadow hover:border-brand-500/50 transition flex-shrink-0"
                          >
                            <img
                              src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                              alt="Thumbnail"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-80 group-hover:opacity-100"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition">
                              <div className="w-8 h-8 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                                <Play className="w-4 h-4 ml-0.5" />
                              </div>
                            </div>
                            {startSec > 0 && (
                              <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[10px] font-mono text-emerald-300 font-bold">
                                {startSec}s
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-1 text-[11px]">
                          <a
                            href={`https://www.youtube.com/watch?v=${youtubeId}&t=${startSec}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 flex items-center gap-1 font-medium transition"
                            title="Open in YouTube"
                          >
                            <ExternalLink className="w-3 h-3 text-rose-400" />
                            <span className="hidden sm:inline">YouTube</span>
                          </a>
                          <button
                            onClick={() => onSelectExerciseToView(ex.id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 flex items-center gap-1 font-medium transition"
                            title="Open in Card View"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-sky-400" />
                            <span className="hidden sm:inline">Details</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-36 h-20 rounded-xl bg-slate-950/80 border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-[11px] gap-1">
                        <Tv className="w-4 h-4 opacity-50" />
                        <span>Geen Video</span>
                      </div>
                    )}

                    {/* Far Right: Video OK? Yes / No Switch */}
                    <div className="flex flex-col items-center gap-1 pl-2 border-l border-slate-800/80">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                        Video OK?
                      </span>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 shadow-inner">
                        {/* YES / OK Button */}
                        <button
                          type="button"
                          onClick={() => handleSetDecision(ex.id, 'ok')}
                          disabled={!hasVideo}
                          title={hasVideo ? "Video is juist (behouden)" : "Geen video aanwezig"}
                          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition disabled:opacity-30 ${
                            isOk
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                              : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ja</span>
                        </button>

                        {/* NO / REMOVE Button */}
                        <button
                          type="button"
                          onClick={() => handleSetDecision(ex.id, 'remove')}
                          disabled={!hasVideo}
                          title={hasVideo ? "Video is FOUT: verwijder video uit database" : "Geen video aanwezig"}
                          className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition disabled:opacity-30 ${
                            isRemove
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-white/20'
                              : 'text-slate-400 hover:text-rose-300 hover:bg-rose-950/40'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Nee</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-[#0B0F17]/95 backdrop-blur-xl border-t border-slate-800 flex items-center justify-center shadow-[0_-12px_30px_rgba(0,0,0,0.9)]">
        <div className="max-w-5xl w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300">
                <strong className="text-white font-bold">{okCount}</strong> akkoord
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-rose-300">
                <strong className="text-rose-200 font-bold">{removeList.length}</strong> foute video('s) te verwijderen
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={handleSubmitAll}
              disabled={isSubmitting || (removeList.length === 0 && okCount === 0)}
              className={`flex-1 sm:flex-initial px-6 py-2.5 sm:py-3 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-40 whitespace-nowrap ${
                removeList.length > 0
                  ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-600/30'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Opslaan en verzenden naar Google Sheet...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {removeList.length > 0
                      ? `Verwijder ${removeList.length} Foute Video('s) & Stuur naar Sheet`
                      : `Verstuur ${okCount} Beoordelingen naar Google Sheet`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

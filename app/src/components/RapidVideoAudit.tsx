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
  SlidersHorizontal,
  Link2,
  Check,
  Sparkles,
  Smartphone,
  ThumbsUp,
  Clock,
  User,
  VolumeX,
  Volume2
} from 'lucide-react';
import type { Exercise, VideoMedia } from '../types/exercise';
import { parseYouTubeId, isYouTubeShort, fetchYouTubeOEmbed } from '../services/youtubeService';
import confetti from 'canvas-confetti';

interface RapidVideoAuditProps {
  exercises: Exercise[];
  onSaveBatch: (updatedExercises: Exercise[]) => Promise<void>;
  onSelectExerciseToView: (exerciseId: string) => void;
  materialsList: { id: string; name: { en: string; nl: string } }[];
}

type VideoStatusDecision = 'ok' | 'remove';

interface ReplacementData {
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

export const RapidVideoAudit: React.FC<RapidVideoAuditProps> = ({
  exercises,
  onSaveBatch,
  onSelectExerciseToView,
  materialsList,
}) => {
  // Filters & Global Settings
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [videoFilter, setVideoFilter] = useState<'with_videos' | 'all' | 'no_videos'>('with_videos');
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});
  const [autoplayEnabled, setAutoplayEnabled] = useState<boolean>(true);

  // Decisions map: exerciseId -> 'ok' | 'remove'
  const [decisions, setDecisions] = useState<Record<string, VideoStatusDecision>>({});

  // Replacements map: exerciseId -> ReplacementData
  const [replacements, setReplacements] = useState<Record<string, ReplacementData>>({});

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

  // Valid replacements list
  const validReplacements = useMemo(() => {
    return Object.entries(replacements).filter(([, rep]) => rep.youtubeId && rep.youtubeId.length === 11);
  }, [replacements]);

  const replacementMap = useMemo(() => {
    return new Map(validReplacements);
  }, [validReplacements]);

  // Decision counts
  const removeList = useMemo(() => {
    return Object.entries(decisions)
      .filter(([id, status]) => status === 'remove' && !replacementMap.has(id))
      .map(([id]) => id);
  }, [decisions, replacementMap]);

  const okCount = useMemo(() => {
    return Object.entries(decisions)
      .filter(([id, status]) => status === 'ok' && !replacementMap.has(id)).length;
  }, [decisions, replacementMap]);

  const handleSetDecision = (exerciseId: string, decision: VideoStatusDecision) => {
    setDecisions(prev => {
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
        if (ex.media?.videos && ex.media.videos.length > 0 && !replacementMap.has(ex.id)) {
          next[ex.id] = 'ok';
        }
      });
      return next;
    });
  };

  const handleResetDecisions = () => {
    setDecisions({});
    setReplacements({});
  };

  const toggleInstructions = (id: string) => {
    setExpandedInstructions(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Replacement input handlers
  const handleReplacementInputChange = (exerciseId: string, value: string) => {
    const parsedId = parseYouTubeId(value);
    const isShort = isYouTubeShort(value);

    if (!parsedId) {
      setReplacements(prev => ({
        ...prev,
        [exerciseId]: {
          rawInput: value,
          youtubeId: '',
          type: isShort ? 'short' : 'standard',
          aspectRatio: isShort ? '9:16' : '16:9',
        },
      }));
      return;
    }

    // Valid YouTube ID recognized!
    setReplacements(prev => ({
      ...prev,
      [exerciseId]: {
        rawInput: value,
        youtubeId: parsedId,
        type: isShort ? 'short' : 'standard',
        aspectRatio: isShort ? '9:16' : '16:9',
        isLoadingOEmbed: true,
      },
    }));

    // Auto-fetch oEmbed metadata (channel title, etc.)
    fetchYouTubeOEmbed(value).then(res => {
      if (!res) return;
      setReplacements(prev => {
        const curr = prev[exerciseId];
        if (!curr || curr.youtubeId !== parsedId) return prev;
        return {
          ...prev,
          [exerciseId]: {
            ...curr,
            channel: curr.channel || res.channelTitle || '',
            type: res.isShort ? 'short' : curr.type,
            aspectRatio: res.aspectRatio || curr.aspectRatio,
            isLoadingOEmbed: false,
          },
        };
      });
    }).catch(() => {
      setReplacements(prev => {
        const curr = prev[exerciseId];
        if (!curr) return prev;
        return { ...prev, [exerciseId]: { ...curr, isLoadingOEmbed: false } };
      });
    });
  };

  const handleUpdateReplacementMetadata = (exerciseId: string, updates: Partial<ReplacementData>) => {
    setReplacements(prev => {
      const curr = prev[exerciseId];
      if (!curr) return prev;
      return {
        ...prev,
        [exerciseId]: {
          ...curr,
          ...updates,
        },
      };
    });
  };

  const handleClearReplacement = (exerciseId: string) => {
    setReplacements(prev => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
  };

  // Bulk Submit to Google Sheet & State
  const handleSubmitAll = async () => {
    const replacementEntries = validReplacements;
    const toRemoveIds = new Set(removeList);
    const toOkIds = new Set(
      Object.entries(decisions)
        .filter(([id, status]) => status === 'ok' && !replacementMap.has(id))
        .map(([id]) => id)
    );

    if (replacementEntries.length === 0 && toRemoveIds.size === 0 && toOkIds.size === 0) {
      alert('Er zijn nog geen beoordelingen of video-vervangingen klaargezet.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const updatedList: Exercise[] = [];

      exercises.forEach(ex => {
        // 1. If replacement provided: REPLACE OLD VIDEO
        if (replacementMap.has(ex.id)) {
          const rep = replacementMap.get(ex.id)!;
          const newVideo: VideoMedia = {
            youtube_id: rep.youtubeId,
            type: rep.type,
            priority: 1,
            language: 'en',
            start_seconds: rep.startSeconds || 0,
            aspect_ratio: rep.aspectRatio,
            duration_seconds: rep.durationSeconds,
            channel: rep.channel,
            likes: rep.likes,
            rating: 5,
          };
          updatedList.push({
            ...ex,
            media: {
              ...ex.media,
              videos: [newVideo], // Replaces old video!
            },
            meta: {
              ...ex.meta,
              updated_at: now,
            },
          });
        }
        // 2. If marked as remove: REMOVE VIDEO FROM DATABASE
        else if (toRemoveIds.has(ex.id)) {
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
        }
        // 3. If marked as ok: CONFIRMED
        else if (toOkIds.has(ex.id)) {
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

      // Reset state on success
      setDecisions({});
      setReplacements({});
      try {
        confetti({
          particleCount: 60,
          spread: 80,
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
    <div className="max-w-5xl mx-auto space-y-4 pb-36">
      {/* Top Banner & Filter Controls */}
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span className="p-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                ⚡
              </span>
              <span>Snelle Video Audit & Vervanging</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Video's spelen automatisch af. Beoordeel met <span className="text-emerald-400 font-bold">Ja</span> of <span className="text-rose-400 font-bold">Nee</span>, of plak direct een <span className="text-cyan-400 font-bold">vervangende YouTube URL/ID</span> met metadata.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            {/* Autoplay Toggle Button */}
            <button
              onClick={() => setAutoplayEnabled(!autoplayEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                autoplayEnabled
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white'
              }`}
              title="Schakel automatisch afspelen van video's in of uit"
            >
              {autoplayEnabled ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Autoplay: AAN</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>Autoplay: UIT</span>
                </>
              )}
            </button>

            <button
              onClick={handleMarkAllVisibleAsOk}
              title="Zet alle zichtbare video's op OK"
              className="px-3 py-1.5 text-xs text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 rounded-xl font-bold flex items-center justify-center gap-1.5 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Alles OK</span>
            </button>

            {(Object.keys(decisions).length > 0 || validReplacements.length > 0) && (
              <button
                onClick={handleResetDecisions}
                title="Reset alle audit- en vervangkeuzes"
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Live Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op oefening, categorie of ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Equipment / Material Dropdown */}
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
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 gap-2">
          <span>
            {filteredExercises.length} workout(s) getoond
          </span>
          <div className="flex items-center gap-3">
            {validReplacements.length > 0 && (
              <span className="text-cyan-400 font-semibold">
                🔄 {validReplacements.length} te vervangen
              </span>
            )}
            <span className="text-emerald-400 font-semibold">
              ✔ {okCount} OK
            </span>
            <span className="text-rose-400 font-semibold">
              ❌ {removeList.length} te verwijderen
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
            const rep = replacements[ex.id];
            const hasValidReplacement = !!(rep && rep.youtubeId && rep.youtubeId.length === 11);

            const isRemove = decision === 'remove' && !hasValidReplacement;
            const isOk = decision === 'ok' && !hasValidReplacement;

            const videos = ex.media?.videos || [];
            const hasExistingVideo = videos.length > 0;
            const primaryVideo = videos[0];

            // Determine active video ID and timestamp to show
            const displayVideoId = hasValidReplacement ? rep.youtubeId : primaryVideo?.youtube_id;
            const displayStartSec = hasValidReplacement ? (rep.startSeconds || 0) : (primaryVideo?.start_seconds || 0);

            const isExpanded = expandedInstructions[ex.id];
            const instructionsNl = ex.instructions?.nl || [];
            const instructionsEn = ex.instructions?.en || [];
            const instructions = instructionsNl.length > 0 ? instructionsNl : instructionsEn;

            const shouldAutoplay = autoplayEnabled || playingVideoId === ex.id;

            return (
              <div
                key={ex.id}
                className={`bg-[#101626] border rounded-2xl p-3 sm:p-4 transition shadow-md ${
                  hasValidReplacement
                    ? 'border-cyan-500/70 bg-cyan-950/20 ring-1 ring-cyan-500/40'
                    : isRemove
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

                      {/* Replacement Status Badge */}
                      {hasValidReplacement && (
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Vervangt Oude Video</span>
                        </span>
                      )}

                      {/* Removal Status Badge */}
                      {isRemove && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-600 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                          <Trash2 className="w-3 h-3" />
                          <span>Video Wordt Verwijderd</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata Badges for existing video if present */}
                    {hasExistingVideo && !hasValidReplacement && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {primaryVideo.type === 'short' || primaryVideo.aspect_ratio === '9:16' ? '📱 Short (9:16)' : '📺 Standaard (16:9)'}
                        </span>
                        {primaryVideo.channel && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{primaryVideo.channel}</span>
                          </span>
                        )}
                        {primaryVideo.duration_seconds !== undefined && primaryVideo.duration_seconds > 0 && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{primaryVideo.duration_seconds}s</span>
                          </span>
                        )}
                        {primaryVideo.likes !== undefined && primaryVideo.likes > 0 && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <ThumbsUp className="w-3 h-3 text-sky-400" />
                            <span>{primaryVideo.likes.toLocaleString()} likes</span>
                          </span>
                        )}
                      </div>
                    )}

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

                  {/* Center/Right Column: Video Player with Autoplay */}
                  <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-shrink-0 border-t lg:border-t-0 border-slate-800/80 pt-2 lg:pt-0">
                    {displayVideoId ? (
                      <div className="flex items-center gap-2.5">
                        <div className={`relative rounded-xl overflow-hidden shadow-lg border bg-black flex-shrink-0 ${
                          hasValidReplacement ? 'border-cyan-500 ring-1 ring-cyan-500/50' : 'border-slate-800'
                        } ${
                          (hasValidReplacement ? rep.type === 'short' : primaryVideo?.type === 'short')
                            ? 'w-24 sm:w-28 h-40 sm:h-44'
                            : 'w-44 sm:w-52 h-26 sm:h-30'
                        }`}>
                          {shouldAutoplay ? (
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${displayVideoId}?autoplay=1&mute=1&loop=1&playlist=${displayVideoId}&start=${displayStartSec}&rel=0&playsinline=1`}
                              title={ex.exercise_name?.en || ex.id}
                              className="w-full h-full border-0"
                              loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <div 
                              onClick={() => setPlayingVideoId(ex.id)}
                              className="w-full h-full cursor-pointer relative group"
                            >
                              <img
                                src={`https://img.youtube.com/vi/${displayVideoId}/mqdefault.jpg`}
                                alt="Thumbnail"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-80 group-hover:opacity-100"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition">
                                <div className="w-8 h-8 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                                  <Play className="w-4 h-4 ml-0.5" />
                                </div>
                              </div>
                            </div>
                          )}

                          {displayStartSec > 0 && (
                            <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[9px] font-mono text-emerald-300 font-bold pointer-events-none">
                              {displayStartSec}s
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 text-[11px]">
                          <a
                            href={`https://www.youtube.com/watch?v=${displayVideoId}&t=${displayStartSec}`}
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
                      <div className="w-44 h-26 rounded-xl bg-slate-950/80 border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-[11px] gap-1">
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
                          disabled={!hasExistingVideo && !hasValidReplacement}
                          title="Video is juist (behouden)"
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
                          disabled={!hasExistingVideo && !hasValidReplacement}
                          title="Video is FOUT: verwijder video uit database"
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

                {/* Bottom Row: Replacement Video URL/ID Input & Metadata */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <input
                        type="text"
                        value={rep?.rawInput || ''}
                        onChange={(e) => handleReplacementInputChange(ex.id, e.target.value)}
                        placeholder="🔗 Plak alternatieve YouTube URL of ID (bijv. https://youtu.be/... of Short)..."
                        className={`w-full pl-8 pr-8 py-1.5 bg-slate-950/90 border rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none transition ${
                          hasValidReplacement
                            ? 'border-emerald-500 ring-1 ring-emerald-500/40 bg-emerald-950/20'
                            : 'border-slate-800 focus:border-cyan-500'
                        }`}
                      />
                      <Link2 className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                      {rep?.rawInput && (
                        <button
                          onClick={() => handleClearReplacement(ex.id)}
                          className="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs font-bold"
                          title="Wis alternatieve video"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Valid / Invalid Feedback Badge */}
                    {hasValidReplacement ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/90 border border-emerald-500 text-emerald-300 rounded-xl text-xs font-bold animate-in fade-in flex-shrink-0">
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        <span>Geldige Video ({rep.youtubeId})</span>
                      </div>
                    ) : rep?.rawInput?.trim() ? (
                      <div className="text-[11px] text-amber-400 font-medium px-2.5 py-1 bg-amber-950/50 rounded-xl border border-amber-500/30 flex-shrink-0">
                        Geen geldige 11-karakter YouTube ID
                      </div>
                    ) : null}
                  </div>

                  {/* Extended Video Metadata Editor (appears when valid replacement is supplied) */}
                  {hasValidReplacement && (
                    <div className="p-3 bg-slate-950/90 border border-emerald-500/40 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs animate-in fade-in">
                      {/* Video Type & Aspect Ratio */}
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
                          <Smartphone className="w-3 h-3 text-cyan-400" />
                          <span>Type / Verhouding</span>
                        </label>
                        <select
                          value={rep.type}
                          onChange={(e) => {
                            const newType = e.target.value as 'standard' | 'short';
                            handleUpdateReplacementMetadata(ex.id, {
                              type: newType,
                              aspectRatio: newType === 'short' ? '9:16' : '16:9',
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                        >
                          <option value="standard">📺 Standaard (16:9)</option>
                          <option value="short">📱 Short (9:16)</option>
                        </select>
                      </div>

                      {/* Afspeelduur */}
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Afspeelduur (sec)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={rep.durationSeconds || ''}
                          onChange={(e) => handleUpdateReplacementMetadata(ex.id, { durationSeconds: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="bijv. 45"
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Kanaal */}
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
                          <User className="w-3 h-3 text-sky-400" />
                          <span>Kanaal {rep.isLoadingOEmbed && <Loader2 className="w-2.5 h-2.5 inline animate-spin text-cyan-400" />}</span>
                        </label>
                        <input
                          type="text"
                          value={rep.channel || ''}
                          onChange={(e) => handleUpdateReplacementMetadata(ex.id, { channel: e.target.value })}
                          placeholder="bijv. Mind Pump"
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Likes */}
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
                          <ThumbsUp className="w-3 h-3 text-emerald-400" />
                          <span>Aantal Likes</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={rep.likes || ''}
                          onChange={(e) => handleUpdateReplacementMetadata(ex.id, { likes: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="bijv. 1200"
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Start Timestamp */}
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
                          <RotateCcw className="w-3 h-3 text-purple-400" />
                          <span>Start (sec)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={rep.startSeconds ?? 0}
                          onChange={(e) => handleUpdateReplacementMetadata(ex.id, { startSeconds: e.target.value ? parseInt(e.target.value) : 0 })}
                          placeholder="0"
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-[#0B0F17]/95 backdrop-blur-xl border-t border-slate-800 flex items-center justify-center shadow-[0_-12px_30px_rgba(0,0,0,0.9)]">
        <div className="max-w-5xl w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {validReplacements.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-300">
                  <strong className="text-cyan-200 font-bold">{validReplacements.length}</strong> video('s) te vervangen
                </span>
              </div>
            )}
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
              disabled={isSubmitting || (removeList.length === 0 && okCount === 0 && validReplacements.length === 0)}
              className={`flex-1 sm:flex-initial px-6 py-2.5 sm:py-3 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-40 whitespace-nowrap ${
                validReplacements.length > 0
                  ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/30'
                  : removeList.length > 0
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
                    {validReplacements.length > 0 && removeList.length > 0
                      ? `Vervang ${validReplacements.length} & Verwijder ${removeList.length} -> Naar Sheet`
                      : validReplacements.length > 0
                      ? `Vervang ${validReplacements.length} Video('s) & Stuur naar Sheet`
                      : removeList.length > 0
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

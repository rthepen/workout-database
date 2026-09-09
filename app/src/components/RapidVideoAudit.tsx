import React, { useState, useMemo, useCallback } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Search, 
  Filter, 
  ExternalLink, 
  Send, 
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
  Volume2,
  Dumbbell,
  Film,
  Star,
  ArrowUpDown,
  ClipboardPaste
} from 'lucide-react';
import type { Exercise, VideoMedia } from '../types/exercise';
import { parseYouTubeId, isYouTubeShort, fetchYouTubeOEmbed, openYouTubeSearchApp, buildYouTubeExerciseSearchQuery } from '../services/youtubeService';
import { SmartAuditVideoPlayer } from './SmartAuditVideoPlayer';
import confetti from 'canvas-confetti';

interface RapidVideoAuditProps {
  exercises: Exercise[];
  onSaveBatch: (updatedExercises: Exercise[]) => Promise<void>;
  onSelectExerciseToView: (exerciseId: string) => void;
  materialsList: { id: string; name: { en: string; nl: string } }[];
}

type VideoStatusDecision = 'ok' | 'remove';

export type VideoFormatFilter = 'all' | 'normal' | 'short' | 'no_video';
export type AuditStatusFilter = 'all' | 'pending' | 'ok' | 'remove' | 'replaced';
export type AuditSortOption = 'default' | 'name' | 'muscle_group' | 'material';

export const MUSCLE_NAME_DUTCH: Record<string, string> = {
  abductors: 'Abductoren (Buitenkant heup/dij)',
  adductors: 'Adductoren (Binnenkant dij)',
  anterior_deltoid: 'Voorkant schouder (Anterior Deltoid)',
  biceps_brachii: 'Biceps (Armbuigers)',
  brachialis: 'Brachialis (Bovenarm)',
  calves: 'Kuiten',
  cardiovascular_system: 'Cardio / Conditie',
  deltoids: 'Schouders (Deltoids)',
  erector_spinae: 'Onderrug (Erector Spinae)',
  forearms: 'Onderarmen',
  full_body: 'Heel Lichaam (Full Body)',
  gluteus_maximus: 'Grote Bilspier (Gluteus Maximus)',
  gluteus_medius: 'Middelste Bilspier (Gluteus Medius)',
  glutes: 'Billen (Glutes)',
  hamstrings: 'Hamstrings (Achterkant dij)',
  iliopsoas: 'Heupbuigers (Iliopsoas)',
  latissimus_dorsi: 'Brede Rugspier (Lats)',
  lateral_deltoid: 'Zijkant schouder (Lateral Deltoid)',
  obliques: 'Schuine Buikspieren (Obliques)',
  pectorals: 'Borstspieren (Pecs)',
  posterior_deltoid: 'Achterkant schouder (Rear Deltoid)',
  quadriceps: 'Bovenbenen (Quadriceps)',
  rectus_abdominis: 'Rechte Buikspieren (Core)',
  rhomboids: 'Ruitspier (Bovenrug)',
  rotator_cuff: 'Rotator Cuff (Schouders)',
  tibialis_anterior: 'Scheenbeenspier',
  transverse_abdominis: 'Diepe Buikspier',
  trapezius: 'Trapezius (Nek & Bovenrug)',
  triceps_brachii: 'Triceps (Armstrekkers)',
};

export const getPrimaryMuscleDisplay = (ex: Exercise): string => {
  const m = ex.target_muscles?.primary?.[0] || ex.target_muscles?.secondary?.[0] || '';
  if (!m) return 'Overig';
  return MUSCLE_NAME_DUTCH[m] || m.replace(/_/g, ' ');
};

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
  // Sorteren
  const [sortBy, setSortBy] = useState<AuditSortOption>('default');

  // Ratings map: exerciseId -> number (1..5)
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const handleSetRating = (exerciseId: string, star: number) => {
    setRatings(prev => {
      const current = prev[exerciseId] !== undefined
        ? prev[exerciseId]
        : (exercises.find(e => e.id === exerciseId)?.attributes?.rating || 0);
      const nextVal = current === star ? 0 : star;
      return {
        ...prev,
        [exerciseId]: nextVal,
      };
    });
  };

  // Filters & Global Settings
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [videoFormatFilter, setVideoFormatFilter] = useState<VideoFormatFilter>('all');
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>('all');
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});
  const [autoplayEnabled, setAutoplayEnabled] = useState<boolean>(true);

  // Decisions map: exerciseId -> 'ok' | 'remove'
  const [decisions, setDecisions] = useState<Record<string, VideoStatusDecision>>({});

  // Deletions map: exerciseId -> boolean (marked for database removal)
  const [deletions, setDeletions] = useState<Record<string, boolean>>({});

  // Replacements map: exerciseId -> ReplacementData
  const [replacements, setReplacements] = useState<Record<string, ReplacementData>>({});

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleToggleDeletion = (exerciseId: string) => {
    setDeletions(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  // Valid replacements list & map
  const validReplacements = useMemo(() => {
    return Object.entries(replacements).filter(([, rep]) => rep.youtubeId && rep.youtubeId.length === 11);
  }, [replacements]);

  const replacementMap = useMemo(() => {
    return new Map(validReplacements);
  }, [validReplacements]);

  // Base video format according to database dataset
  const getExerciseBaseVideoFormat = useCallback((ex: Exercise): 'normal' | 'short' | 'no_video' => {
    const primary = ex.media?.videos?.[0];
    if (!primary || !primary.youtube_id) {
      return 'no_video';
    }
    if (primary.type === 'short' || primary.aspect_ratio === '9:16') {
      return 'short';
    }
    return 'normal';
  }, []);

  // Materials sorted by exercise count
  const sortedMaterials = useMemo(() => {
    const countMap = new Map<string, number>();
    exercises.forEach(e => {
      const id = e.material?.id || 'unknown';
      countMap.set(id, (countMap.get(id) || 0) + 1);
    });

    return [...materialsList].sort((a, b) => {
      const countA = countMap.get(a.id) || 0;
      const countB = countMap.get(b.id) || 0;
      return countB - countA;
    });
  }, [exercises, materialsList]);

  // Live video format counts based on original exercise format
  const formatCounts = useMemo(() => {
    let normal = 0;
    let short = 0;
    let no_video = 0;

    exercises.forEach((ex) => {
      if (selectedMaterial !== 'all' && ex.material?.id !== selectedMaterial) return;
      const fmt = getExerciseBaseVideoFormat(ex);
      if (fmt === 'normal') normal++;
      else if (fmt === 'short') short++;
      else no_video++;
    });

    return {
      all: normal + short + no_video,
      normal,
      short,
      no_video,
    };
  }, [exercises, selectedMaterial, getExerciseBaseVideoFormat]);

  // Filtered Exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      // 1. Video format filter based on original database video format
      // (Pasting or replacing a video will NEVER kick the exercise off-screen or cause it to jump!)
      const baseFmt = getExerciseBaseVideoFormat(ex);
      if (videoFormatFilter === 'normal' && baseFmt !== 'normal') return false;
      if (videoFormatFilter === 'short' && baseFmt !== 'short') return false;
      if (videoFormatFilter === 'no_video' && baseFmt !== 'no_video') return false;

      // 2. Status filter
      if (statusFilter !== 'all') {
        const hasRep = replacementMap.has(ex.id);
        const dec = decisions[ex.id];
        // If an item is actively edited in this session, keep it stably in view!
        if (hasRep || dec) {
          // keep visible
        } else {
          if (statusFilter === 'replaced' && !hasRep) return false;
          if (statusFilter === 'ok' && (hasRep || dec !== 'ok')) return false;
          if (statusFilter === 'remove' && (hasRep || dec !== 'remove')) return false;
          if (statusFilter === 'pending' && (hasRep || dec === 'ok' || dec === 'remove')) return false;
        }
      }

      // 3. Material / Equipment filter
      if (selectedMaterial !== 'all') {
        const matId = ex.material?.id;
        if (matId !== selectedMaterial) return false;
      }

      // 4. Search query (matches exercise name, category, ID, and equipment name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameEn = ex.exercise_name?.en?.toLowerCase() || '';
        const nameNl = ex.exercise_name?.nl?.toLowerCase() || '';
        const cat = ((ex.category as any)?.nl || (ex.category as any)?.en || '').toLowerCase();
        const id = ex.id.toLowerCase();
        const matNameEn = ex.material?.name?.en?.toLowerCase() || '';
        const matNameNl = ex.material?.name?.nl?.toLowerCase() || '';
        const matId = ex.material?.id?.toLowerCase() || '';

        if (
          !nameEn.includes(q) && 
          !nameNl.includes(q) && 
          !cat.includes(q) && 
          !id.includes(q) &&
          !matNameEn.includes(q) &&
          !matNameNl.includes(q) &&
          !matId.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [exercises, selectedMaterial, searchQuery, videoFormatFilter, statusFilter, getExerciseBaseVideoFormat, decisions, replacementMap]);

  // Sorted and Filtered Exercises (geen verspringing tijdens rating/auditing)
  const displayedExercises = useMemo(() => {
    const list = [...filteredExercises];

    if (sortBy === 'name') {
      list.sort((a, b) => {
        const nameA = (a.exercise_name?.nl || a.exercise_name?.en || a.id).toLowerCase();
        const nameB = (b.exercise_name?.nl || b.exercise_name?.en || b.id).toLowerCase();
        return nameA.localeCompare(nameB, 'nl');
      });
    } else if (sortBy === 'muscle_group') {
      list.sort((a, b) => {
        const muscleA = getPrimaryMuscleDisplay(a).toLowerCase();
        const muscleB = getPrimaryMuscleDisplay(b).toLowerCase();
        const comp = muscleA.localeCompare(muscleB, 'nl');
        if (comp !== 0) return comp;
        const nameA = (a.exercise_name?.nl || a.exercise_name?.en || a.id).toLowerCase();
        const nameB = (b.exercise_name?.nl || b.exercise_name?.en || b.id).toLowerCase();
        return nameA.localeCompare(nameB, 'nl');
      });
    } else if (sortBy === 'material') {
      list.sort((a, b) => {
        const matA = (a.material?.name?.nl || a.material?.name?.en || a.material?.id || '').toLowerCase();
        const matB = (b.material?.name?.nl || b.material?.name?.en || b.material?.id || '').toLowerCase();
        const comp = matA.localeCompare(matB, 'nl');
        if (comp !== 0) return comp;
        const nameA = (a.exercise_name?.nl || a.exercise_name?.en || a.id).toLowerCase();
        const nameB = (b.exercise_name?.nl || b.exercise_name?.en || b.id).toLowerCase();
        return nameA.localeCompare(nameB, 'nl');
      });
    }

    return list;
  }, [filteredExercises, sortBy]);

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

  const ratedCount = useMemo(() => {
    return Object.keys(ratings).length;
  }, [ratings]);

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
    setRatings({});
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

    // Auto-mark decision as approved
    setDecisions(prev => ({
      ...prev,
      [exerciseId]: 'ok',
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

    const ratingChanges = Object.entries(ratings).filter(([id, star]) => {
      const origEx = exercises.find(e => e.id === id);
      return origEx && (origEx.attributes?.rating || 0) !== star;
    });
    const ratingChangeIds = new Set(ratingChanges.map(([id]) => id));

    if (replacementEntries.length === 0 && toRemoveIds.size === 0 && toOkIds.size === 0 && ratingChangeIds.size === 0) {
      alert('Er zijn nog geen beoordelingen, video-vervangingen of sterren klaargezet.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const updatedList: Exercise[] = [];

      exercises.forEach(ex => {
        const hasRep = replacementMap.has(ex.id);
        const isRemove = toRemoveIds.has(ex.id);
        const isOk = toOkIds.has(ex.id);
        const hasRatingChange = ratingChangeIds.has(ex.id);
        const isMarkedDelete = !!deletions[ex.id];

        if (isMarkedDelete) {
          // Send exercise marked as deleted
          updatedList.push({
            ...ex,
            _deleted: true,
            meta: {
              ...ex.meta,
              updated_at: now,
            },
          } as any);
        } else if (hasRep || isRemove || isOk || hasRatingChange) {
          const targetRating = ratings[ex.id] !== undefined ? ratings[ex.id] : ex.attributes?.rating;
          const updatedAttributes = targetRating !== undefined
            ? { ...ex.attributes, rating: targetRating }
            : ex.attributes;

          // 1. If replacement provided: REPLACE OLD VIDEO
          if (hasRep) {
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
              rating: targetRating || 5,
            };
            updatedList.push({
              ...ex,
              attributes: updatedAttributes,
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
          else if (isRemove) {
            updatedList.push({
              ...ex,
              attributes: updatedAttributes,
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
          // 3. If marked as ok or rating updated
          else {
            updatedList.push({
              ...ex,
              attributes: updatedAttributes,
              meta: {
                ...ex.meta,
                updated_at: now,
              },
            });
          }
        }
      });

      await onSaveBatch(updatedList);

      // Reset state on success
      setDecisions({});
      setReplacements({});
      setRatings({});
      setDeletions({});
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
              <span className="text-cyan-300 font-semibold">⚡ Slimme Videolader:</span> laadt video's alvast vooruit in de achtergrond en start pas met afspelen zodra ze in beeld scrollen.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            {/* Smart Preload & Autoplay Toggle Button */}
            <button
              onClick={() => setAutoplayEnabled(!autoplayEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                autoplayEnabled
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white'
              }`}
              title="Slimme Videolader: laadt vooruit en speelt alleen af wanneer in beeld"
            >
              {autoplayEnabled ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Slimme Lader: AAN</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>Slimme Lader: UIT</span>
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

            {(Object.keys(decisions).length > 0 || validReplacements.length > 0 || Object.values(deletions).some(Boolean)) && (
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

        {/* Filter Controls */}
        <div className="space-y-3">
          {/* Row 1: Search, Sort Dropdown, Equipment Dropdown, and Status Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Live Search */}
            <div className="sm:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek op oefening, apparaat, categorie..."
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-500 hover:text-white"
                  title="Wis zoekopdracht"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sorteer Dropdown */}
            <div className="sm:col-span-3 relative flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 absolute left-3 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as AuditSortOption)}
                className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl focus:outline-none focus:border-amber-500 transition font-medium"
                title="Sorteer volgorde van de audit"
              >
                <option value="default">📋 Sorteren: Standaard (Database)</option>
                <option value="name">🔤 Sorteren: Naam (A - Z)</option>
                <option value="muscle_group">💪 Sorteren: Spiergroepen (A - Z)</option>
                <option value="material">🏋️ Sorteren: Materiaal (A - Z)</option>
              </select>
            </div>

            {/* Equipment / Apparatus Dropdown */}
            <div className="sm:col-span-3 relative flex items-center">
              <Dumbbell className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className={`w-full pl-8 pr-7 py-2 bg-slate-950 border text-xs rounded-xl focus:outline-none focus:border-brand-500 transition ${
                  selectedMaterial !== 'all' ? 'border-brand-500/70 text-brand-300 font-semibold' : 'border-slate-800 text-slate-200'
                }`}
              >
                <option value="all">Alle Apparatuur ({exercises.length})</option>
                {sortedMaterials.map((m) => {
                  const count = exercises.filter(e => e.material?.id === m.id).length;
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name.nl || m.name.en} ({count})
                    </option>
                  );
                })}
              </select>
              {selectedMaterial !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedMaterial('all')}
                  className="absolute right-2 text-slate-400 hover:text-white text-xs"
                  title="Reset apparaat filter"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Audit Status Filter */}
            <div className="sm:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AuditStatusFilter)}
                className={`w-full px-2.5 py-2 bg-slate-950 border text-xs rounded-xl focus:outline-none focus:border-brand-500 transition ${
                  statusFilter !== 'all' ? 'border-amber-500/70 text-amber-300 font-semibold' : 'border-slate-800 text-slate-200'
                }`}
              >
                <option value="all">Alle ({exercises.length})</option>
                <option value="pending">⏳ Te doen</option>
                <option value="ok">✔ OK ({okCount})</option>
                <option value="remove">❌ Weg ({removeList.length})</option>
                <option value="replaced">🔄 Nieuw ({validReplacements.length})</option>
              </select>
            </div>
          </div>

          {/* Row 2: Video Format Segmented Control (Normal 16:9 vs Shorts 9:16 vs Zonder vs Alles) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-1.5 shadow-inner">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 px-2 sm:border-r sm:border-slate-800 flex items-center gap-1">
              <Film className="w-3 h-3 text-cyan-400 inline" />
              <span>Video Type:</span>
            </span>

            <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setVideoFormatFilter('all')}
                className={`flex-1 min-w-[90px] py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  videoFormatFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-md border border-slate-600'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <span>🌐 Alles</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/80 font-mono text-slate-300">
                  {formatCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVideoFormatFilter('normal')}
                className={`flex-1 min-w-[125px] py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  videoFormatFilter === 'normal'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 border border-sky-400/50'
                    : 'text-slate-400 hover:text-sky-300 hover:bg-sky-950/30'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Normaal (16:9)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-950 font-mono text-sky-200 border border-sky-500/40">
                  {formatCounts.normal}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVideoFormatFilter('short')}
                className={`flex-1 min-w-[110px] py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  videoFormatFilter === 'short'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/50'
                    : 'text-slate-400 hover:text-purple-300 hover:bg-purple-950/30'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Shorts (9:16)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950 font-mono text-purple-200 border border-purple-500/40">
                  {formatCounts.short}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVideoFormatFilter('no_video')}
                className={`flex-1 min-w-[110px] py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  videoFormatFilter === 'no_video'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 border border-amber-400/50'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-amber-950/30'
                }`}
              >
                <span>🚫 Zonder Video</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 font-mono text-amber-200 border border-amber-500/40">
                  {formatCounts.no_video}
                </span>
              </button>
            </div>
          </div>

          {/* Row 3: Quick Apparatus / Equipment Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar pt-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex-shrink-0 mr-1 flex items-center gap-1">
              <Dumbbell className="w-3 h-3 text-slate-400" />
              <span>Apparaat:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedMaterial('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 flex items-center gap-1 ${
                selectedMaterial === 'all'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span>Alle</span>
              <span className="text-[10px] opacity-75 font-mono">({exercises.length})</span>
            </button>

            {sortedMaterials.slice(0, 16).map((m) => {
              const count = exercises.filter(e => e.material?.id === m.id).length;
              const isSelected = selectedMaterial === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMaterial(isSelected ? 'all' : m.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex-shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>{m.name.nl || m.name.en}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-black/20 text-slate-950 font-bold' : 'text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Counter Info & Active Filter Tags */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 gap-2 border-t border-slate-850">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-300">
              {displayedExercises.length} van de {exercises.length} workout(s) getoond
            </span>

            {(selectedMaterial !== 'all' || videoFormatFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '' || sortBy !== 'default') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMaterial('all');
                  setVideoFormatFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                  setSortBy('default');
                }}
                className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 text-[10px] font-bold transition flex items-center gap-1"
                title="Herstel alle filters en sortering"
              >
                <span>Wis alle filters</span>
                <span>✕</span>
              </button>
            )}
          </div>

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
            {ratedCount > 0 && (
              <span className="text-amber-400 font-semibold">
                ⭐ {ratedCount} ster-rating(s)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Workout Rows List */}
      <div className="space-y-3">
        {displayedExercises.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <Filter className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Geen workouts gevonden</h3>
            <p className="text-xs text-slate-500">Pas je filters of zoekopdracht aan.</p>
          </div>
        ) : (
          displayedExercises.map((ex, idx) => {
            const decision = decisions[ex.id];
            const rep = replacements[ex.id];
            const hasValidReplacement = !!(rep && rep.youtubeId && rep.youtubeId.length === 11);

            const isRemove = decision === 'remove' && !hasValidReplacement;
            const isOk = decision === 'ok' && !hasValidReplacement;
            const isMarkedForDeletion = !!deletions[ex.id];

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

            const activeRating = ratings[ex.id] !== undefined ? ratings[ex.id] : (ex.attributes?.rating || 0);
            const ytSearchQuery = buildYouTubeExerciseSearchQuery(ex);

            return (
              <div
                key={ex.id}
                className={`bg-[#101626] border rounded-2xl p-3.5 sm:p-4 transition shadow-md ${
                  isMarkedForDeletion
                    ? 'border-rose-600 bg-rose-950/20 ring-2 ring-rose-500/50'
                    : hasValidReplacement
                    ? 'border-cyan-500/70 bg-cyan-950/20 ring-1 ring-cyan-500/40'
                    : isRemove
                    ? 'border-rose-500/70 bg-rose-950/20 ring-1 ring-rose-500/40'
                    : isOk
                    ? 'border-emerald-500/60 bg-emerald-950/15'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Deletion Warning Banner */}
                {isMarkedForDeletion && (
                  <div className="mb-3 bg-rose-950/90 border border-rose-500/60 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs text-rose-200 shadow-md">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-rose-500/20 text-rose-300">🗑️</span>
                      <span className="font-bold">Oefening gemarkeerd voor verwijdering uit database</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDeletion(ex.id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-600 transition shadow-sm flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Ongedaan maken</span>
                    </button>
                  </div>
                )}
                {/* Card Top Header: Title, Equipment, Category & 5-Star Rating */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
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
                    <button
                      type="button"
                      onClick={() => setSelectedMaterial(selectedMaterial === ex.material?.id ? 'all' : (ex.material?.id || 'all'))}
                      title={`Filter op apparaat: ${ex.material?.name?.nl || ex.material?.name?.en || ex.material?.id}`}
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-medium flex items-center gap-1 transition ${
                        selectedMaterial === ex.material?.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                      }`}
                    >
                      <Dumbbell className="w-2.5 h-2.5 text-slate-400" />
                      <span>{ex.material?.name?.nl || ex.material?.name?.en || ex.material?.id}</span>
                    </button>

                    {/* Category Badge */}
                    {ex.category && (
                      <span className="px-2 py-0.5 rounded-lg bg-sky-950/80 border border-sky-800 text-[10px] text-sky-300 font-medium">
                        {typeof ex.category === 'string' ? ex.category : (ex.category.nl || ex.category.en)}
                      </span>
                    )}

                    {/* Target Muscle Group Badge */}
                    {(ex.target_muscles?.primary?.[0] || ex.target_muscles?.secondary?.[0]) && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-[10px] text-emerald-300 font-medium flex items-center gap-1">
                        <span>💪</span>
                        <span>{getPrimaryMuscleDisplay(ex)}</span>
                      </span>
                    )}

                    {/* Replacement Status Badge */}
                    {hasValidReplacement && (
                      <span className="px-2 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>{hasExistingVideo ? 'Vervangt Oude Video' : 'Nieuwe Video Toegevoegd'}</span>
                      </span>
                    )}

                    {/* Removal Status Badge */}
                    {isRemove && (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-600 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                        <Trash2 className="w-3 h-3" />
                        <span>Video Wordt Verwijderd</span>
                      </span>
                    )}

                    {/* Confirmed OK Badge */}
                    {isOk && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Video OK</span>
                      </span>
                    )}
                  </div>

                  {/* 5-Star Rating Component */}
                  <div className="flex items-center gap-1 bg-slate-950/90 px-2.5 py-1 rounded-xl border border-slate-800 shadow-inner self-stretch sm:self-auto justify-between sm:justify-start">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Sterren:</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleSetRating(ex.id, star)}
                          className="p-1 hover:scale-125 transition focus:outline-none touch-manipulation"
                          title={`Geef ${star} ster${star > 1 ? 'ren' : ''}`}
                        >
                          <Star
                            className={`w-4 h-4 sm:w-3.5 sm:h-3.5 transition ${
                              star <= activeRating
                                ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_3px_rgba(251,191,36,0.6)]'
                                : 'text-slate-600 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {activeRating > 0 && (
                      <span className="text-[10px] font-mono font-bold text-amber-400 ml-1">
                        {activeRating}/5
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Main: Details & Video with Mobile-Friendly Controls */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 pt-2.5">
                  {/* Left Column: Metadata & Instructions */}
                  <div className="flex-1 min-w-0 space-y-2 w-full">
                    {/* Metadata Badges for active video */}
                    {displayVideoId && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span className={`px-1.5 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                          (hasValidReplacement ? rep.type === 'short' : primaryVideo?.type === 'short' || primaryVideo?.aspect_ratio === '9:16')
                            ? 'bg-purple-950/80 border-purple-500/40 text-purple-300'
                            : 'bg-sky-950/80 border-sky-500/40 text-sky-300'
                        }`}>
                          {(hasValidReplacement ? rep.type === 'short' : primaryVideo?.type === 'short' || primaryVideo?.aspect_ratio === '9:16') ? (
                            <>
                              <Smartphone className="w-2.5 h-2.5 text-purple-400" />
                              <span>Short (9:16)</span>
                            </>
                          ) : (
                            <>
                              <Tv className="w-2.5 h-2.5 text-sky-400" />
                              <span>Normaal (16:9)</span>
                            </>
                          )}
                        </span>

                        {(hasValidReplacement ? rep.channel : primaryVideo?.channel) && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{hasValidReplacement ? rep.channel : primaryVideo?.channel}</span>
                          </span>
                        )}

                        {((hasValidReplacement ? rep.durationSeconds : primaryVideo?.duration_seconds) !== undefined &&
                          ((hasValidReplacement ? rep.durationSeconds : primaryVideo?.duration_seconds) || 0) > 0) && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{(hasValidReplacement ? rep.durationSeconds : primaryVideo?.duration_seconds)}s</span>
                          </span>
                        )}

                        {(!hasValidReplacement && primaryVideo?.likes !== undefined && primaryVideo.likes > 0) && (
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

                  {/* Right Column: Video Player + Action Buttons (Zoek op YouTube) + Video OK? Switch */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-shrink-0 border-t lg:border-t-0 border-slate-800/80 pt-2.5 lg:pt-0">
                    <div className="flex items-center gap-2.5 justify-start">
                      {displayVideoId ? (
                        <SmartAuditVideoPlayer
                          exerciseId={ex.id}
                          videoId={displayVideoId}
                          startSeconds={displayStartSec}
                          isShort={
                            hasValidReplacement
                              ? rep.type === 'short' || rep.aspectRatio === '9:16'
                              : primaryVideo?.type === 'short' || primaryVideo?.aspect_ratio === '9:16'
                          }
                          hasValidReplacement={hasValidReplacement}
                          title={ex.exercise_name?.nl || ex.exercise_name?.en || ex.id}
                          autoplayEnabled={autoplayEnabled}
                        />
                      ) : ex.media?.images && ex.media.images.length > 0 ? (
                        <div className="w-28 sm:w-36 h-24 sm:h-28 rounded-xl bg-slate-950 border border-purple-500/30 overflow-hidden flex flex-col items-center justify-center text-slate-400 text-[11px] gap-1 flex-shrink-0 relative group">
                          <img
                            src={ex.media.images[0].url}
                            alt={ex.exercise_name?.en || ex.id}
                            className="w-full h-full object-contain p-1"
                            loading="lazy"
                          />
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-purple-950/90 text-purple-300 font-mono text-[9px] border border-purple-800/80">
                            {ex.media.images.length} img
                          </div>
                        </div>
                      ) : (
                        <div className="w-28 sm:w-36 h-24 sm:h-28 rounded-xl bg-slate-950/80 border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-[11px] gap-1 flex-shrink-0">
                          <Tv className="w-5 h-5 opacity-40" />
                          <span>Geen Video</span>
                        </div>
                      )}

                      {/* Action Buttons Column: Zoek op YouTube, YouTube Link, Details */}
                      <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
                        {/* Dedicated "Zoek op YouTube" button */}
                        <button
                          type="button"
                          onClick={() => openYouTubeSearchApp(ytSearchQuery)}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 transition transform active:scale-95 whitespace-nowrap min-h-[36px]"
                          title={`Zoek '${ex.exercise_name?.en || ex.exercise_name?.nl}' direct in de YouTube app`}
                        >
                          <Film className="w-3.5 h-3.5 text-white" />
                          <span>Zoek op YouTube</span>
                        </button>

                        {displayVideoId && (
                          <a
                            href={`https://www.youtube.com/watch?v=${displayVideoId}&t=${displayStartSec}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 font-medium text-xs transition min-h-[30px]"
                            title="Open huidige video in YouTube"
                          >
                            <ExternalLink className="w-3 h-3 text-rose-400" />
                            <span>Huidige Video</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectExerciseToView(ex.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 font-medium text-xs transition min-h-[30px]"
                          title="Open alle oefeningdetails"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-sky-400" />
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleDeletion(ex.id)}
                          className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 font-medium text-xs transition min-h-[30px] ${
                            isMarkedForDeletion
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500 hover:bg-amber-900 font-bold'
                              : 'bg-rose-950/40 hover:bg-rose-900 text-rose-300 hover:text-white border-rose-800/60'
                          }`}
                          title={isMarkedForDeletion ? "Verwijdering ongedaan maken" : "Markeer om deze workout te verwijderen uit de database"}
                        >
                          {isMarkedForDeletion ? (
                            <>
                              <RotateCcw className="w-3 h-3 text-amber-400" />
                              <span>Herstellen</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              <span>Verwijder</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Far Right: Video OK? Yes / No Switch */}
                    <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2 p-2 sm:p-0 bg-slate-950/60 sm:bg-transparent rounded-xl border sm:border-0 border-slate-800/80 sm:pl-3 sm:border-l sm:border-slate-800/80">
                      <span className="text-[11px] sm:text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                        Video OK?
                      </span>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 shadow-inner">
                        {/* YES / OK Button */}
                        <button
                          type="button"
                          onClick={() => handleSetDecision(ex.id, 'ok')}
                          disabled={!hasExistingVideo && !hasValidReplacement}
                          title="Video is juist (behouden)"
                          className={`min-h-[42px] sm:min-h-[34px] px-4 sm:px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition disabled:opacity-30 ${
                            isOk
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                              : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          <span>Ja</span>
                        </button>

                        {/* NO / REMOVE Button */}
                        <button
                          type="button"
                          onClick={() => handleSetDecision(ex.id, 'remove')}
                          disabled={!hasExistingVideo && !hasValidReplacement}
                          title="Video is FOUT: verwijder video uit database"
                          className={`min-h-[42px] sm:min-h-[34px] px-4 sm:px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition disabled:opacity-30 ${
                            isRemove
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-white/20'
                              : 'text-slate-400 hover:text-rose-300 hover:bg-rose-950/40'
                          }`}
                        >
                          <XCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          <span>Nee</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Replacement Video URL/ID Input & Metadata */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="relative flex-1 w-full flex items-center gap-1.5">
                      <div className="relative flex-1">
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

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text && text.trim()) {
                              handleReplacementInputChange(ex.id, text.trim());
                            }
                          } catch {
                            alert('Kon niet automatisch van klembord lezen. Geef browser-toestemming of plak met Ctrl+V / Cmd+V.');
                          }
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 hover:border-cyan-500/50 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm flex-shrink-0"
                        title="Plak rechtstreeks vanaf klembord"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Plak</span>
                      </button>
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
            {ratedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-amber-300">
                  <strong className="text-amber-200 font-bold">{ratedCount}</strong> ster-rating(s)
                </span>
              </div>
            )}
            {Object.values(deletions).filter(Boolean).length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-400/50" />
                <span className="text-rose-300">
                  <strong className="text-rose-100 font-bold">{Object.values(deletions).filter(Boolean).length}</strong> workout(s) te verwijderen
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={handleSubmitAll}
              disabled={isSubmitting || (removeList.length === 0 && okCount === 0 && validReplacements.length === 0 && ratedCount === 0 && Object.values(deletions).filter(Boolean).length === 0)}
              className={`flex-1 sm:flex-initial px-6 py-2.5 sm:py-3 text-white font-black text-xs sm:text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-40 whitespace-nowrap min-h-[44px] ${
                Object.values(deletions).filter(Boolean).length > 0
                  ? 'bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 hover:from-rose-600 hover:to-red-500 shadow-rose-600/40 ring-1 ring-rose-400/40'
                  : validReplacements.length > 0
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
                    {Object.values(deletions).filter(Boolean).length > 0
                      ? `Verstuur naar Sheet (${Object.values(deletions).filter(Boolean).length} Verwijderen${validReplacements.length > 0 ? `, ${validReplacements.length} Vervangen` : ''})`
                      : validReplacements.length > 0 && removeList.length > 0
                      ? `Vervang ${validReplacements.length} & Verwijder ${removeList.length} -> Naar Sheet`
                      : validReplacements.length > 0
                      ? `Vervang ${validReplacements.length} Video('s) & Stuur naar Sheet`
                      : removeList.length > 0
                      ? `Verwijder ${removeList.length} Foute Video('s) & Stuur naar Sheet`
                      : okCount > 0
                      ? `Verstuur ${okCount} Beoordelingen naar Google Sheet`
                      : `Verstuur ${ratedCount} Beoordeling(en) naar Google Sheet`}
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

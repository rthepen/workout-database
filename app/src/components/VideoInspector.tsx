import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Tv, 
  Image as ImageIcon, 
  Copy, 
  Film,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Flame,
  Star
} from 'lucide-react';
import type { Exercise, VideoMedia } from '../types/exercise';
import { searchYouTubeTutorials, parseYouTubeId } from '../services/youtubeService';
import type { YouTubeSuggestion } from '../services/youtubeService';

interface VideoInspectorProps {
  exercise: Exercise;
  onUpdateVideos: (videos: VideoMedia[]) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const VideoInspector: React.FC<VideoInspectorProps> = ({
  exercise,
  onUpdateVideos,
}) => {
  const videos = exercise.media?.videos || [];
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [newVideoInput, setNewVideoInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<YouTubeSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  
  // State for embedded preview of suggestions
  const [embeddedPreviewId, setEmbeddedPreviewId] = useState<string | null>(null);
  const [copiedThumbUrl, setCopiedThumbUrl] = useState<boolean>(false);

  const activeVideo = videos[selectedVideoIndex] || videos[0];
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  // High-res YouTube thumbnail URL
  const activeThumbnailUrl = activeVideo?.youtube_id 
    ? `https://img.youtube.com/vi/${activeVideo.youtube_id}/maxresdefault.jpg`
    : null;

  // Initialize or load YouTube IFrame API script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Instantiate or update player when active video changes (with instant autoplay)
  useEffect(() => {
    if (!activeVideo?.youtube_id) return;

    const createPlayer = () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }

      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player('yt-player-target', {
          videoId: activeVideo.youtube_id,
          playerVars: {
            autoplay: 1,
            mute: 1, // Browser policy requires muted for automatic playback
            playsinline: 1,
            controls: 1,
            rel: 0,
            start: activeVideo.start_seconds || 0,
          },
          events: {
            onReady: (event: any) => {
              setDuration(event.target.getDuration() || 0);
              try {
                event.target.playVideo();
                setIsPlaying(true);
                setIsMuted(true);
              } catch {
                // Autoplay fallback
              }
            },
            onStateChange: (event: any) => {
              setIsPlaying(event.data === window.YT?.PlayerState?.PLAYING);
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeVideo?.youtube_id]);

  // Polling playback time
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          setCurrentTime(Math.round(time));
        }
      }
    }, 300);

    return () => clearInterval(intervalRef.current);
  }, []);

  // Fetch YouTube discovery suggestions tailored to exercise and material
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSuggestions(true);
    searchYouTubeTutorials(exercise.exercise_name?.en || '', exercise.material?.id || exercise.material?.name?.en || '')
      .then(res => {
        if (isMounted) {
          setSuggestions(res);
          setIsLoadingSuggestions(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingSuggestions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [exercise.id, exercise.exercise_name?.en, exercise.material?.id]);

  // Capture current playback time as start_seconds
  const handleCaptureTimestamp = (explicitSeconds?: number) => {
    if (!activeVideo) return;
    let timeToSet = explicitSeconds !== undefined ? explicitSeconds : currentTime;
    if (explicitSeconds === undefined && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      timeToSet = Math.round(playerRef.current.getCurrentTime());
    }

    const updated = [...videos];
    updated[selectedVideoIndex] = {
      ...activeVideo,
      start_seconds: Math.max(0, timeToSet),
    };
    onUpdateVideos(updated);
  };

  const handleAdjustTimestamp = (delta: number) => {
    if (!activeVideo) return;
    const currentStart = activeVideo.start_seconds || 0;
    const newStart = Math.max(0, currentStart + delta);
    handleCaptureTimestamp(newStart);
  };

  // Capture current playback time as best frame thumbnail_seconds
  const handleCaptureThumbnailTimestamp = (explicitSeconds?: number) => {
    if (!activeVideo) return;
    let timeToSet = explicitSeconds !== undefined ? explicitSeconds : currentTime;
    if (explicitSeconds === undefined && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      timeToSet = Math.round(playerRef.current.getCurrentTime());
    }

    const updated = [...videos];
    updated[selectedVideoIndex] = {
      ...activeVideo,
      thumbnail_seconds: Math.max(0, timeToSet),
    };
    onUpdateVideos(updated);
  };

  const handleAdjustThumbnailTimestamp = (delta: number) => {
    if (!activeVideo) return;
    const currentThumb = activeVideo.thumbnail_seconds || 0;
    const newThumb = Math.max(0, currentThumb + delta);
    handleCaptureThumbnailTimestamp(newThumb);
  };

  // Set star rating for video demonstration quality (1..5 stars)
  const handleSetVideoRating = (videoIndex: number, rating: number) => {
    const updated = [...videos];
    if (updated[videoIndex]) {
      updated[videoIndex] = {
        ...updated[videoIndex],
        rating,
      };
      onUpdateVideos(updated);
    }
  };

  // Set star rating for thumbnail frame quality (1..5 stars)
  const handleSetThumbnailRating = (videoIndex: number, rating: number) => {
    const updated = [...videos];
    if (updated[videoIndex]) {
      updated[videoIndex] = {
        ...updated[videoIndex],
        thumbnail_rating: rating,
      };
      onUpdateVideos(updated);
    }
  };

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleToggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleSeek = (seconds: number) => {
    if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') return;
    const target = Math.max(0, Math.min(duration || 9999, currentTime + seconds));
    playerRef.current.seekTo(target, true);
  };

  const handleAddVideo = (idToAdd?: string, type?: 'standard' | 'short', startSeconds: number = 0) => {
    const rawId = idToAdd || newVideoInput;
    const parsedId = parseYouTubeId(rawId);
    if (!parsedId) {
      alert('Please provide a valid 11-character YouTube video ID or URL.');
      return;
    }

    // If already exists, select it and update start time if specified
    const existingIndex = videos.findIndex(v => v.youtube_id === parsedId);
    if (existingIndex !== -1) {
      if (startSeconds > 0) {
        const updated = [...videos];
        updated[existingIndex] = { ...updated[existingIndex], start_seconds: startSeconds };
        onUpdateVideos(updated);
      }
      setSelectedVideoIndex(existingIndex);
      return;
    }

    const newEntry: VideoMedia = {
      youtube_id: parsedId,
      type: type || 'standard',
      priority: videos.length + 1,
      language: 'en',
      start_seconds: startSeconds,
    };

    const updated = [...videos, newEntry];
    onUpdateVideos(updated);
    setSelectedVideoIndex(updated.length - 1);
    setNewVideoInput('');
  };

  const handleRemoveVideo = (index: number) => {
    const updated = videos.filter((_, idx) => idx !== index).map((v, idx) => ({
      ...v,
      priority: idx + 1,
    }));
    onUpdateVideos(updated);
    if (selectedVideoIndex >= updated.length) {
      setSelectedVideoIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === videos.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...videos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Normalize priorities
    const normalized = updated.map((v, idx) => ({ ...v, priority: idx + 1 }));
    onUpdateVideos(normalized);
    setSelectedVideoIndex(targetIndex);
  };

  const handleCopyThumbnailUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedThumbUrl(true);
    setTimeout(() => setCopiedThumbUrl(false), 2000);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeSuggestion = suggestions.find(s => s.id === activeVideo?.youtube_id);
  const hasStartTimestamp = activeVideo?.start_seconds !== undefined && activeVideo.start_seconds > 0;

  return (
    <div className="space-y-6">
      {/* 1. Main Active Video Inspector & Autoplay Embedded Player */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Video Inspector & Autoplay Player
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
              <Flame className="w-3 h-3" /> Autoplay Active
            </span>
          </div>

          {activeVideo && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Video ID:</span>
              <code className="px-2 py-0.5 rounded bg-slate-900 text-brand-400 border border-slate-700 font-mono font-bold">
                {activeVideo.youtube_id}
              </code>
              <a
                href={`https://www.youtube.com/watch?v=${activeVideo.youtube_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition"
                title="Open on YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Video Title Header Banner */}
        {activeVideo && (
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Video Title & Channel</div>
            <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
              <span>{activeSuggestion?.title || `${exercise.exercise_name?.en} Demonstration Video`}</span>
              {activeSuggestion?.channelTitle && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                  by {activeSuggestion.channelTitle}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Embedded Video Player Display */}
        {activeVideo ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner">
              <div id="yt-player-target" className="w-full h-full" />
            </div>

            {/* Playback Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <button
                  onClick={handleTogglePlay}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                {/* Mute/Unmute */}
                <button
                  onClick={handleToggleMute}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                  title={isMuted ? "Unmute Audio" : "Mute Audio"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                {/* Seek Rewind/Forward */}
                <button
                  onClick={() => handleSeek(-5)}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1 transition"
                  title="Rewind 5 seconds"
                >
                  <Rewind className="w-3 h-3" />
                  <span>-5s</span>
                </button>
                <button
                  onClick={() => handleSeek(5)}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1 transition"
                  title="Forward 5 seconds"
                >
                  <span>+5s</span>
                  <FastForward className="w-3 h-3" />
                </button>
              </div>

              {/* Current Playback Counter */}
              <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">Current Position:</span>
                <span className="text-brand-400 font-bold text-sm">{formatSeconds(currentTime)}</span>
                <span className="text-slate-500"> / {formatSeconds(duration)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-dashed border-slate-800 space-y-2">
            <Tv className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">No demonstration video configured for this exercise.</p>
            <p className="text-xs text-slate-500">Add a video below or choose from the suggested tutorials.</p>
          </div>
        )}
      </div>

      {/* 2. DEDICATED ACTION & THUMBNAIL FRAME TIMESTAMP INSPECTOR */}
      {activeVideo && (
        <div className="bg-gradient-to-br from-slate-900 via-[#111827] to-slate-900 border-2 border-brand-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-black tracking-wide text-white flex items-center gap-2">
                  <span>Action & Thumbnail Frame Timestamp Inspector</span>
                  {hasStartTimestamp ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-mono font-bold">
                      Timestamps Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-mono font-bold">
                      Set Timestamps
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Capture action start moment (skipping intro) and best visual frame timestamp for app thumbnails.
                </p>
              </div>
            </div>

            {/* Action Buttons: Add/Update Action Start & Thumbnail Frame Timestamps */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleCaptureTimestamp()}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition transform active:scale-95 whitespace-nowrap"
                title="Set action start time"
              >
                <Clock className="w-3.5 h-3.5 fill-current" />
                <span>⚡ Action Start ({currentTime}s)</span>
              </button>

              <button
                onClick={() => handleCaptureThumbnailTimestamp()}
                className="px-3.5 py-2 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition transform active:scale-95 whitespace-nowrap"
                title="Set best frame timestamp for app thumbnail"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>🖼️ Best Frame ({currentTime}s)</span>
              </button>
            </div>
          </div>

          {/* Timeline Visualizer & Start/Thumbnail Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            {/* Badges & Fine-Tune Controls */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Action Start</div>
                  <div className="text-xl font-black font-mono text-amber-400 flex items-center justify-between">
                    <span>{formatSeconds(activeVideo.start_seconds || 0)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAdjustTimestamp(-1)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded font-mono font-bold"
                        title="-1s"
                      >
                        -1s
                      </button>
                      <button
                        onClick={() => handleAdjustTimestamp(1)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded font-mono font-bold"
                        title="+1s"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-sky-400">App Thumbnail Frame</div>
                  <div className="text-xl font-black font-mono text-sky-400 flex items-center justify-between">
                    <span>{formatSeconds(activeVideo.thumbnail_seconds || 0)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAdjustThumbnailTimestamp(-1)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded font-mono font-bold"
                        title="-1s"
                      >
                        -1s
                      </button>
                      <button
                        onClick={() => handleAdjustThumbnailTimestamp(1)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] rounded font-mono font-bold"
                        title="+1s"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  onClick={() => {
                    if (playerRef.current && activeVideo.start_seconds !== undefined) {
                      playerRef.current.seekTo(activeVideo.start_seconds, true);
                      playerRef.current.playVideo();
                    }
                  }}
                  className="px-2.5 py-1 bg-brand-950 text-brand-300 border border-brand-700/60 rounded-lg text-[11px] font-semibold flex items-center gap-1 hover:bg-brand-900 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Replay Action Start</span>
                </button>

                <button
                  onClick={() => {
                    if (playerRef.current && activeVideo.thumbnail_seconds !== undefined) {
                      playerRef.current.seekTo(activeVideo.thumbnail_seconds, true);
                      playerRef.current.pauseVideo();
                    }
                  }}
                  className="px-2.5 py-1 bg-sky-950 text-sky-300 border border-sky-700/60 rounded-lg text-[11px] font-semibold flex items-center gap-1 hover:bg-sky-900 transition"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Seek Frame</span>
                </button>
              </div>
            </div>

            {/* Independent Ratings for Video & Thumbnail Frame */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-rose-400" /> Video Quality Rating:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleSetVideoRating(selectedVideoIndex, star)}
                      className="p-0.5 hover:scale-110 transition"
                      title={`Rate video ${star} stars`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          star <= (activeVideo.rating || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Thumbnail Frame Quality:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleSetThumbnailRating(selectedVideoIndex, star)}
                      className="p-0.5 hover:scale-110 transition"
                      title={`Rate thumbnail ${star} stars`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          star <= (activeVideo.thumbnail_rating || 0)
                            ? 'text-sky-400 fill-sky-400'
                            : 'text-slate-600 hover:text-sky-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DEDICATED THUMBNAIL DISPLAY PANEL (Separately Visualized) */}
      {activeVideo && activeThumbnailUrl && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Exercise Video Thumbnail
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              HD Resolution (1280x720 / HQ)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* High-Res Thumbnail Image */}
            <div className="md:col-span-2 relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 group shadow-md">
              <img
                src={activeThumbnailUrl}
                alt={`${exercise.exercise_name?.en} thumbnail`}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${activeVideo.youtube_id}/hqdefault.jpg`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-2.5 left-3 text-xs font-medium text-white drop-shadow">
                {exercise.exercise_name?.en} — Thumbnail Preview
              </div>
            </div>

            {/* Thumbnail Details & Actions */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400">Target Video ID</div>
                <div className="font-mono text-brand-400 font-bold">{activeVideo.youtube_id}</div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Start timestamp: <strong className="text-amber-400">{activeVideo.start_seconds || 0}s</strong>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleCopyThumbnailUrl(activeThumbnailUrl)}
                  className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition"
                >
                  {copiedThumbUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">URL Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Thumbnail URL</span>
                    </>
                  )}
                </button>

                <a
                  href={activeThumbnailUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open Full-Res Image</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MEDIA LIST & PRIORITY QUEUE */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Configured Videos & Timestamps ({videos.length})
          </h3>
        </div>

        <div className="space-y-2">
          {videos.map((vid, idx) => {
            const isSelected = idx === selectedVideoIndex;
            return (
              <div
                key={vid.youtube_id}
                className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border transition ${
                  isSelected
                    ? 'bg-slate-800/90 border-brand-500/60 ring-1 ring-brand-500/40 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  onClick={() => setSelectedVideoIndex(idx)}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-[200px]"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-bold">
                    {vid.priority}
                  </span>
                  <img 
                    src={`https://img.youtube.com/vi/${vid.youtube_id}/default.jpg`} 
                    alt="thumbnail" 
                    className="w-14 h-10 object-cover rounded-lg bg-slate-950 border border-slate-800 flex-shrink-0"
                  />
                  <div>
                    <div className="text-xs font-medium text-white flex items-center gap-2">
                      <span className="font-mono font-bold">{vid.youtube_id}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${
                        vid.type === 'short' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {vid.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        [{vid.language}]
                      </span>
                    </div>
                    <div className="text-[11px] flex items-center gap-2 mt-0.5">
                      <span className="text-amber-400 font-semibold flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                        <Clock className="w-3 h-3" /> Start: {vid.start_seconds ?? 0}s
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-brand-400 font-bold bg-brand-950 px-1.5 py-0.5 rounded border border-brand-800">
                          Active In Player
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Priority and delete controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMovePriority(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg disabled:opacity-30"
                    title="Move Priority Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMovePriority(idx, 'down')}
                    disabled={idx === videos.length - 1}
                    className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg disabled:opacity-30"
                    title="Move Priority Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveVideo(idx)}
                    className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition ml-1"
                    title="Remove Video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add custom video input */}
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            placeholder="Paste YouTube Video URL or 11-char ID..."
            value={newVideoInput}
            onChange={(e) => setNewVideoInput(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-slate-900 text-xs text-white placeholder-slate-500 border border-slate-700 rounded-xl focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={() => handleAddVideo()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-brand-400 hover:text-brand-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* 5. SUGGESTED TUTORIAL VIDEOS (AUTHENTIC, VERIFIED YOUTUBE DEMOS) */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Verified Tutorial Video Suggestions ({exercise.material?.name?.en || exercise.material?.id})
            </h3>
          </div>
          
          {/* Quick YouTube Search Action */}
          <div className="flex items-center gap-2">
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent((exercise.material?.name?.en ? exercise.material.name.en + ' ' : '') + exercise.exercise_name?.en + ' short exercise tutorial')}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Search &ldquo;{exercise.exercise_name?.en}&rdquo; Shorts on YouTube</span>
            </a>
          </div>
        </div>

        {/* Quick Channel Search Shortcuts */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">Quick channel search:</span>
          {[
            { name: 'ATHLEAN-X', query: `ATHLEAN-X ${exercise.exercise_name?.en} form` },
            { name: 'Squat University', query: `Squat University ${exercise.exercise_name?.en}` },
            { name: 'Mind Pump', query: `Mind Pump ${exercise.exercise_name?.en}` },
            { name: 'Buff Dudes', query: `Buff Dudes ${exercise.exercise_name?.en}` },
            { name: 'Renaissance Periodization', query: `Renaissance Periodization ${exercise.exercise_name?.en}` }
          ].map(ch => (
            <a
              key={ch.name}
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ch.query)}`}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 transition"
            >
              {ch.name} ↗
            </a>
          ))}
        </div>

        {isLoadingSuggestions ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading verified tutorials...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suggestions.map((item) => {
              const isAlreadyAdded = videos.some(v => v.youtube_id === item.id);
              const isPreviewOpen = embeddedPreviewId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col justify-between gap-3 hover:border-slate-700 transition shadow-sm"
                >
                  {/* Embedded Iframe Player Preview if toggled */}
                  {isPreviewOpen ? (
                    <div className="space-y-2">
                      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-md">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&rel=0&playsinline=1`}
                          title={item.title}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] font-semibold text-brand-400">Playing Embedded Preview</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAddVideo(item.id, item.type, 0)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add & Inspect in Main Player</span>
                          </button>
                          <button
                            onClick={() => setEmbeddedPreviewId(null)}
                            className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Thumbnail & Metadata */
                    <div className="flex gap-3">
                      <div 
                        className="relative w-28 h-18 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 cursor-pointer group"
                        onClick={() => setEmbeddedPreviewId(item.id)}
                        title="Click to play embedded preview"
                      >
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition">
                          <Play className="w-5 h-5 text-white fill-current" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 
                          className="text-xs font-semibold text-slate-100 line-clamp-2 cursor-pointer hover:text-brand-400 transition"
                          title={item.title}
                          onClick={() => setEmbeddedPreviewId(item.id)}
                        >
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{item.channelTitle}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                            item.type === 'short' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-[10px] text-slate-500">{item.duration}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions: Embedded Preview Toggle, Add with Timestamp, External */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEmbeddedPreviewId(isPreviewOpen ? null : item.id)}
                        className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                          isPreviewOpen 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-brand-300'
                        }`}
                      >
                        <Film className="w-3 h-3" />
                        <span>{isPreviewOpen ? 'Hide Player' : 'Play Embedded'}</span>
                      </button>

                      <a
                        href={`https://www.youtube.com/watch?v=${item.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 p-1"
                        title="Open on YouTube"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <button
                      onClick={() => handleAddVideo(item.id, item.type, 0)}
                      disabled={isAlreadyAdded}
                      className={`px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition ${
                        isAlreadyAdded
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-brand-600 hover:bg-brand-500 text-white shadow-sm active:scale-95'
                      }`}
                    >
                      {isAlreadyAdded ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>In Media List</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Add Exercise Video</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

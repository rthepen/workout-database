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
  Tv
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
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [newVideoInput, setNewVideoInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<YouTubeSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);

  const activeVideo = videos[selectedVideoIndex] || videos[0];
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  // Initialize or load YouTube IFrame API script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Instantiate or update player when active video changes
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
            playsinline: 1,
            controls: 1,
            rel: 0,
            start: activeVideo.start_seconds || 0,
          },
          events: {
            onReady: (event: any) => {
              setDuration(event.target.getDuration() || 0);
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
    }, 400);

    return () => clearInterval(intervalRef.current);
  }, []);

  // Fetch YouTube discovery suggestions
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSuggestions(true);
    searchYouTubeTutorials(exercise.exercise_name?.en || '', exercise.material?.name?.en || '')
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
  }, [exercise.id, exercise.exercise_name?.en]);

  // Capture current playback time as start_seconds
  const handleCaptureTimestamp = () => {
    if (!activeVideo) return;
    let timeToSet = currentTime;
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      timeToSet = Math.round(playerRef.current.getCurrentTime());
    }

    const updated = [...videos];
    updated[selectedVideoIndex] = {
      ...activeVideo,
      start_seconds: timeToSet,
    };
    onUpdateVideos(updated);
  };

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (seconds: number) => {
    if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') return;
    const target = Math.max(0, Math.min(duration || 9999, currentTime + seconds));
    playerRef.current.seekTo(target, true);
  };

  const handleAddVideo = (idToAdd?: string, type?: 'standard' | 'short') => {
    const rawId = idToAdd || newVideoInput;
    const parsedId = parseYouTubeId(rawId);
    if (!parsedId) {
      alert('Please provide a valid 11-character YouTube video ID or URL.');
      return;
    }

    // Check if already exists
    if (videos.some(v => v.youtube_id === parsedId)) {
      alert('This video is already in the list.');
      return;
    }

    const newEntry: VideoMedia = {
      youtube_id: parsedId,
      type: type || 'standard',
      priority: videos.length + 1,
      language: 'en',
      start_seconds: 0,
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

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Video Player Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Active Video Inspector & Timestamp Engine
            </h2>
          </div>

          {activeVideo && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Current Video ID:</span>
              <code className="px-2 py-0.5 rounded bg-slate-900 text-brand-400 border border-slate-700 font-mono">
                {activeVideo.youtube_id}
              </code>
              <a
                href={`https://www.youtube.com/watch?v=${activeVideo.youtube_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition"
                title="Open in YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Video Player Display */}
        {activeVideo ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 shadow-inner">
              <div id="yt-player-target" className="w-full h-full" />
            </div>

            {/* Playback Controls & Timestamp Capture */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
              {/* Play / Seek buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlay}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm transition"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  onClick={() => handleSeek(-5)}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-md transition"
                  title="Rewind 5s"
                >
                  -5s
                </button>
                <button
                  onClick={() => handleSeek(5)}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-md transition"
                  title="Forward 5s"
                >
                  +5s
                </button>

                <button
                  onClick={() => {
                    if (playerRef.current && activeVideo.start_seconds !== undefined) {
                      playerRef.current.seekTo(activeVideo.start_seconds, true);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs rounded-md flex items-center gap-1 transition"
                  title="Jump to defined action start time"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Start ({activeVideo.start_seconds || 0}s)</span>
                </button>
              </div>

              {/* Time display & Capture Action Button */}
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
                  <span className="text-brand-400 font-bold">{formatSeconds(currentTime)}</span>
                  <span className="text-slate-500"> / {formatSeconds(duration)}</span>
                </div>

                <button
                  onClick={handleCaptureTimestamp}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-md shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition transform active:scale-95"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-950 fill-current" />
                  <span>Set Action Start Time ({currentTime}s)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-900/50 rounded-lg border border-dashed border-slate-800 space-y-2">
            <Tv className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">No demonstration videos configured for this exercise.</p>
            <p className="text-xs text-slate-500">Add a video below or choose from the suggested tutorials.</p>
          </div>
        )}

        {/* Existing Video Media Array / Priority Order */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Media Priority & Fallbacks ({videos.length})
            </h3>
          </div>

          <div className="space-y-2">
            {videos.map((vid, idx) => {
              const isSelected = idx === selectedVideoIndex;
              return (
                <div
                  key={vid.youtube_id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg border transition ${
                    isSelected
                      ? 'bg-slate-800/90 border-brand-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    onClick={() => setSelectedVideoIndex(idx)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-[200px]"
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-bold">
                      {vid.priority}
                    </span>
                    <div>
                      <div className="text-xs font-medium text-white flex items-center gap-2">
                        <span>{vid.youtube_id}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${
                          vid.type === 'short' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {vid.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          [{vid.language}]
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Action start: <strong>{vid.start_seconds ?? 0}s</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Priority and delete controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMovePriority(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded disabled:opacity-30"
                      title="Move Priority Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMovePriority(idx, 'down')}
                      disabled={idx === videos.length - 1}
                      className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded disabled:opacity-30"
                      title="Move Priority Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveVideo(idx)}
                      className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition ml-1"
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
              className="flex-1 px-3 py-1.5 bg-slate-900 text-xs text-white placeholder-slate-500 border border-slate-700 rounded-md focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={() => handleAddVideo()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 hover:text-brand-300 text-xs font-semibold rounded-md border border-slate-700 flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automated YouTube Discovery Engine */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Suggested Tutorial Videos
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            Query: &ldquo;{exercise.exercise_name?.en} {exercise.material?.name?.en} tutorial&rdquo;
          </span>
        </div>

        {isLoadingSuggestions ? (
          <div className="p-4 text-center text-xs text-slate-400">Searching tutorials...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.map((item) => {
              const isAlreadyAdded = videos.some(v => v.youtube_id === item.id);

              return (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between gap-2 hover:border-slate-700 transition"
                >
                  <div className="flex gap-3">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-20 h-14 object-cover rounded bg-slate-950 border border-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-slate-100 truncate" title={item.title}>
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-slate-400">{item.channelTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] px-1 py-0.2 rounded font-mono uppercase ${
                          item.type === 'short' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.duration}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <a
                      href={`https://www.youtube.com/watch?v=${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Preview
                    </a>

                    <button
                      onClick={() => handleAddVideo(item.id, item.type)}
                      disabled={isAlreadyAdded}
                      className={`px-2.5 py-1 text-xs rounded font-medium flex items-center gap-1 transition ${
                        isAlreadyAdded
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-brand-600 hover:bg-brand-500 text-white shadow-sm'
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
                          <span>Add to Exercise</span>
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

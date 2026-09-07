import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Sparkles } from 'lucide-react';

interface SmartAuditVideoPlayerProps {
  exerciseId: string;
  videoId: string;
  startSeconds?: number;
  isShort?: boolean;
  hasValidReplacement?: boolean;
  title: string;
  autoplayEnabled: boolean;
}

export const SmartAuditVideoPlayer: React.FC<SmartAuditVideoPlayerProps> = ({
  videoId,
  startSeconds = 0,
  isShort = false,
  hasValidReplacement = false,
  title,
  autoplayEnabled,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // States
  const [isPreloaded, setIsPreloaded] = useState<boolean>(hasValidReplacement || false);
  const [isInView, setIsInView] = useState<boolean>(hasValidReplacement || false);
  const [isManuallyPlaying, setIsManuallyPlaying] = useState<boolean>(hasValidReplacement || false);
  const [iframeReady, setIframeReady] = useState<boolean>(false);

  useEffect(() => {
    if (hasValidReplacement) {
      setIsPreloaded(true);
      setIsInView(true);
      setIsManuallyPlaying(true);
    }
  }, [hasValidReplacement, videoId]);

  // IntersectionObserver setup
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsPreloaded(true);
      setIsInView(true);
      return;
    }

    // 1. Preload Observer: rootMargin 700px (loads upcoming video frames ahead of scrolling)
    const preloadObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsPreloaded(true);
        } else {
          // If scrolled very far away, unload iframe to preserve memory & bandwidth
          setIsPreloaded(false);
          setIframeReady(false);
        }
      },
      {
        root: null, // observes viewport / clipping container
        rootMargin: '700px 0px 700px 0px',
        threshold: 0,
      }
    );

    // 2. Playback Observer: threshold 0.15 (triggers ONLY when actually visible on screen)
    const playbackObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.15,
      }
    );

    preloadObserver.observe(el);
    playbackObserver.observe(el);

    return () => {
      preloadObserver.disconnect();
      playbackObserver.disconnect();
    };
  }, []);

  // PostMessage control: Start playing on enter, pause on leave
  useEffect(() => {
    if (!iframeRef.current || !iframeReady) return;

    const shouldPlay = (isInView || isManuallyPlaying) && (autoplayEnabled || isManuallyPlaying);

    try {
      if (shouldPlay) {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      } else {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      }
    } catch {
      // Ignore cross-origin error if any
    }
  }, [isInView, isManuallyPlaying, autoplayEnabled, iframeReady]);

  // When iframe loads, trigger playback if currently in view
  const handleIframeLoad = () => {
    setIframeReady(true);
    if ((isInView || isManuallyPlaying) && (autoplayEnabled || isManuallyPlaying)) {
      setTimeout(() => {
        try {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*'
          );
        } catch {
          // Fallback
        }
      }, 150);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shouldAutoplayInitial = (isInView || isManuallyPlaying || hasValidReplacement) && (autoplayEnabled || isManuallyPlaying || hasValidReplacement);

  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(
    origin
  )}&mute=1&loop=1&playlist=${videoId}&start=${startSeconds}&rel=0&playsinline=1&autoplay=${
    shouldAutoplayInitial ? 1 : 0
  }`;

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden shadow-lg border bg-black flex-shrink-0 transition-all duration-300 ${
        hasValidReplacement ? 'border-cyan-500 ring-1 ring-cyan-500/50' : 'border-slate-800'
      } ${
        isShort
          ? 'w-24 sm:w-28 h-40 sm:h-44'
          : 'w-44 sm:w-52 h-26 sm:h-30'
      }`}
    >
      {/* If within preload zone or manually playing, render iframe */}
      {isPreloaded || isManuallyPlaying ? (
        <div className="w-full h-full relative">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            className="w-full h-full border-0 relative z-10"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="origin-when-cross-origin"
            allowFullScreen
            onLoad={handleIframeLoad}
          />

          {/* Fallback skeleton thumbnail while iframe buffers */}
          {!iframeReady && (
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center z-0">
              <img
                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                alt="Thumbnail"
                className="w-full h-full object-cover opacity-60 filter blur-[1px]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Far away off-screen: render ultra-lightweight thumbnail (zero iframes) */
        <div
          onClick={() => setIsManuallyPlaying(true)}
          className="w-full h-full cursor-pointer relative group bg-slate-950"
          title="Klik om direct af te spelen"
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
            alt="Thumbnail"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-80 group-hover:opacity-100"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/15 transition">
            <div className="w-8 h-8 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
              <Play className="w-4 h-4 ml-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Start Timestamp Tag */}
      {startSeconds > 0 && (
        <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/85 text-[9px] font-mono text-emerald-300 font-bold pointer-events-none z-20 border border-emerald-500/30 shadow-sm">
          {startSeconds}s
        </div>
      )}

      {/* Smart Preload Status Tag */}
      {isPreloaded && !isInView && (
        <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-cyan-950/90 text-[8px] font-mono text-cyan-300 font-bold pointer-events-none z-20 border border-cyan-500/40 opacity-80 flex items-center gap-0.5">
          <Sparkles className="w-2 h-2 text-cyan-400" />
          <span>Geladen</span>
        </div>
      )}
    </div>
  );
};

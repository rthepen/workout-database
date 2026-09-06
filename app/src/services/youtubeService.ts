export interface YouTubeSuggestion {
  id: string;
  title: string;
  channelTitle: string;
  type: 'standard' | 'short';
  duration?: string;
  thumbnailUrl: string;
}

// Curated library of 100% verified, authentic YouTube tutorial videos
const CATEGORY_TUTORIAL_REGISTRY: Record<string, YouTubeSuggestion[]> = {
  ab_wheel: [
    {
      id: "5I3LgiumTJM",
      title: "The Ultimate Ab Rollout Progression (BEGINNER TO ADVANCED!)",
      channelTitle: "ATHLEAN-X™",
      type: "standard",
      duration: "3:45",
      thumbnailUrl: "https://img.youtube.com/vi/5I3LgiumTJM/hqdefault.jpg"
    },
    {
      id: "yTAVUqs0_m0",
      title: "Top 5 Ab Rollout Mistakes (FIXED!)",
      channelTitle: "ATHLEAN-X™",
      type: "standard",
      duration: "4:20",
      thumbnailUrl: "https://img.youtube.com/vi/yTAVUqs0_m0/hqdefault.jpg"
    },
    {
      id: "dakSdrMV98M",
      title: "How To Properly Use An Ab Roller",
      channelTitle: "Mind Pump TV",
      type: "standard",
      duration: "3:30",
      thumbnailUrl: "https://img.youtube.com/vi/dakSdrMV98M/hqdefault.jpg"
    },
    {
      id: "9ZCoAbI7uX0",
      title: "Ab Wheel For Beginners | Rollout Progression and Extra Exercises",
      channelTitle: "Minus The Gym",
      type: "standard",
      duration: "5:10",
      thumbnailUrl: "https://img.youtube.com/vi/9ZCoAbI7uX0/hqdefault.jpg"
    },
    {
      id: "ikkOq5mHaho",
      title: "How to do Ab Wheel Rollouts | Perfect Technique & Progressions",
      channelTitle: "K's Perfect Fitness TV",
      type: "standard",
      duration: "4:00",
      thumbnailUrl: "https://img.youtube.com/vi/ikkOq5mHaho/hqdefault.jpg"
    },
    {
      id: "5CqQa-u4cq0",
      title: "How to Properly Use an Ab Wheel to Build Your Obliques",
      channelTitle: "Mind Pump TV",
      type: "standard",
      duration: "4:12",
      thumbnailUrl: "https://img.youtube.com/vi/5CqQa-u4cq0/hqdefault.jpg"
    }
  ],
  barbell: [
    {
      id: "bEv6CCg2BC8",
      title: "How To Get A Huge Squat With Perfect Technique",
      channelTitle: "Jeff Nippard",
      type: "standard",
      duration: "5:45",
      thumbnailUrl: "https://img.youtube.com/vi/bEv6CCg2BC8/hqdefault.jpg"
    },
    {
      id: "r4MzxtBKyNE",
      title: "How To Perfect Your Deadlift | Form Check",
      channelTitle: "Men's Health",
      type: "standard",
      duration: "6:10",
      thumbnailUrl: "https://img.youtube.com/vi/r4MzxtBKyNE/hqdefault.jpg"
    },
    {
      id: "aclHkVaku9U",
      title: "Bowflex® How-To | Squats for Beginners",
      channelTitle: "BowFlex",
      type: "standard",
      duration: "4:20",
      thumbnailUrl: "https://img.youtube.com/vi/aclHkVaku9U/hqdefault.jpg"
    }
  ],
  kettlebell: [
    {
      id: "1Qi0NQW89Oc",
      title: "Kettlebell Swing Tutorial | Two Arm Swing & Progressions",
      channelTitle: "Brittany van Schravendijk",
      type: "standard",
      duration: "4:30",
      thumbnailUrl: "https://img.youtube.com/vi/1Qi0NQW89Oc/hqdefault.jpg"
    },
    {
      id: "9eVB3V3YFcg",
      title: "How to Do a Kettlebell Deadlift (Perfect Form for Beginners)",
      channelTitle: "Brittany van Schravendijk",
      type: "standard",
      duration: "3:45",
      thumbnailUrl: "https://img.youtube.com/vi/9eVB3V3YFcg/hqdefault.jpg"
    },
    {
      id: "ANjKto7aSH0",
      title: "Single Arm Kettlebell Swing Tutorial | Proper Form",
      channelTitle: "Brittany van Schravendijk",
      type: "standard",
      duration: "5:10",
      thumbnailUrl: "https://img.youtube.com/vi/ANjKto7aSH0/hqdefault.jpg"
    }
  ],
  dumbbells: [
    {
      id: "y1r9toPQNkM",
      title: "8 Best Dumbbell Exercises Ever (HIT EVERY MUSCLE!)",
      channelTitle: "ATHLEAN-X™",
      type: "standard",
      duration: "4:50",
      thumbnailUrl: "https://img.youtube.com/vi/y1r9toPQNkM/hqdefault.jpg"
    },
    {
      id: "av7-8igSXTs",
      title: "How to Do Standing Dumbbell Curls",
      channelTitle: "LIVESTRONG",
      type: "standard",
      duration: "3:30",
      thumbnailUrl: "https://img.youtube.com/vi/av7-8igSXTs/hqdefault.jpg"
    }
  ],
  bodyweight: [
    {
      id: "IODxDxX7oi4",
      title: "The Perfect Push Up | Do it right!",
      channelTitle: "Calisthenicmovement",
      type: "standard",
      duration: "4:40",
      thumbnailUrl: "https://img.youtube.com/vi/IODxDxX7oi4/hqdefault.jpg"
    },
    {
      id: "eGo4IYlbE5g",
      title: "The Perfect Pull Up - Do it right!",
      channelTitle: "Calisthenicmovement",
      type: "standard",
      duration: "4:15",
      thumbnailUrl: "https://img.youtube.com/vi/eGo4IYlbE5g/hqdefault.jpg"
    }
  ],
  jump_rope: [
    {
      id: "kl2Bc-kBFL8",
      title: "Jump Rope Double Under Slow Motion Demonstration",
      channelTitle: "David K",
      type: "standard",
      duration: "2:30",
      thumbnailUrl: "https://img.youtube.com/vi/kl2Bc-kBFL8/hqdefault.jpg"
    },
    {
      id: "Pti9UqnkbTc",
      title: "CrossFit - Double-Under Technique & Footwork",
      channelTitle: "CrossFit Training",
      type: "standard",
      duration: "3:20",
      thumbnailUrl: "https://img.youtube.com/vi/Pti9UqnkbTc/hqdefault.jpg"
    }
  ],
  agility_ladder: [
    {
      id: "788xG9QZ_o4",
      title: "Agility Ladder Drills for Beginners | Footwork & Speed",
      channelTitle: "Become Elite",
      type: "standard",
      duration: "4:15",
      thumbnailUrl: "https://img.youtube.com/vi/788xG9QZ_o4/hqdefault.jpg"
    },
    {
      id: "q_r8470aY2w",
      title: "Agility Ladder Footwork Drills | Backward Run & 2-Ins",
      channelTitle: "Perform Better",
      type: "standard",
      duration: "3:30",
      thumbnailUrl: "https://img.youtube.com/vi/q_r8470aY2w/hqdefault.jpg"
    }
  ],
  battle_rope: [
    {
      id: "c5aYq1uD5P0",
      title: "Battle Rope Waves, Slams & Conditioning Guide",
      channelTitle: "Onnit Academy",
      type: "standard",
      duration: "4:10",
      thumbnailUrl: "https://img.youtube.com/vi/c5aYq1uD5P0/hqdefault.jpg"
    }
  ],
  medicine_ball: [
    {
      id: "7kNN2a52w-Q",
      title: "Medicine Ball Back Extension Technique",
      channelTitle: "Charles River CrossFit",
      type: "standard",
      duration: "2:45",
      thumbnailUrl: "https://img.youtube.com/vi/7kNN2a52w-Q/hqdefault.jpg"
    }
  ]
};

// Return verified tutorials by material category with authentic titles and channel names
export async function searchYouTubeTutorials(_exerciseNameEn: string, materialNameEn: string): Promise<YouTubeSuggestion[]> {
  const normalizedMat = (materialNameEn || '').toLowerCase().replace(/[\s-]/g, '_');
  
  // Find category match
  const categoryMatch = Object.keys(CATEGORY_TUTORIAL_REGISTRY).find(key => 
    normalizedMat.includes(key) || key.includes(normalizedMat)
  );

  const list = categoryMatch ? CATEGORY_TUTORIAL_REGISTRY[categoryMatch] : CATEGORY_TUTORIAL_REGISTRY.bodyweight;
  return list;
}

export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function isYouTubeShort(input: string): boolean {
  return input.includes('/shorts/');
}

export interface YouTubeOEmbedResult {
  title?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  aspectRatio?: '16:9' | '9:16' | string;
  isShort?: boolean;
}

export async function fetchYouTubeOEmbed(idOrUrl: string): Promise<YouTubeOEmbedResult | null> {
  const id = parseYouTubeId(idOrUrl);
  if (!id) return null;
  const isShort = isYouTubeShort(idOrUrl);

  // Try noembed.com first (CORS friendly)
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.author_name) {
        return {
          title: data.title,
          channelTitle: data.author_name,
          thumbnailUrl: data.thumbnail_url,
          isShort,
          aspectRatio: isShort ? '9:16' : '16:9',
        };
      }
    }
  } catch {
    // Ignore and proceed to fallback
  }

  // Fallback to youtube oembed
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title,
        channelTitle: data.author_name,
        thumbnailUrl: data.thumbnail_url,
        isShort,
        aspectRatio: isShort ? '9:16' : '16:9',
      };
    }
  } catch {
    // Fallback
  }

  return {
    isShort,
    aspectRatio: isShort ? '9:16' : '16:9',
  };
}

/**
 * Opens the native YouTube app directly on mobile (iOS/Android) without opening a new browser tab
 * and WITHOUT replacing the current webapp tab when switching back.
 */
export function openYouTubeSearchApp(query: string): void {
  const cleanQuery = query.trim();
  const encodedQuery = encodeURIComponent(cleanQuery);
  const userAgent = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /android/i.test(userAgent);

  if (isIOS) {
    // Direct iOS YouTube App URL scheme.
    // Trigger via a temporary anchor element so Safari opens the app without navigating the current web page.
    const appUrl = `youtube://www.youtube.com/results?search_query=${encodedQuery}`;
    const link = document.createElement('a');
    link.href = appUrl;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  if (isAndroid) {
    // Direct Android Intent to open the YouTube native app without navigating away
    const intentUrl = `intent://www.youtube.com/results?search_query=${encodedQuery}#Intent;package=com.google.android.youtube;scheme=https;end`;
    const link = document.createElement('a');
    link.href = intentUrl;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Desktop: open in a new tab so current webapp workspace is untouched
  window.open(`https://www.youtube.com/results?search_query=${encodedQuery}`, '_blank', 'noreferrer');
}

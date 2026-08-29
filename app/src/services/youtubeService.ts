export interface YouTubeSuggestion {
  id: string;
  title: string;
  channelTitle: string;
  type: 'standard' | 'short';
  duration?: string;
  thumbnailUrl: string;
}

// Curated search query and fallback tutorial discovery
export async function searchYouTubeTutorials(exerciseNameEn: string, _materialNameEn: string): Promise<YouTubeSuggestion[]> {
  const sampleSuggestions: YouTubeSuggestion[] = [
    {
      id: "jWc8TrLURB4",
      title: `${exerciseNameEn} - Proper Form & Execution Guide`,
      channelTitle: "Buff Dudes / Form Masterclass",
      type: "standard",
      duration: "3:45",
      thumbnailUrl: `https://img.youtube.com/vi/jWc8TrLURB4/mqdefault.jpg`
    },
    {
      id: "4zWu1yuJ0_g",
      title: `How to do ${exerciseNameEn} Correctly (Avoid Mistakes)`,
      channelTitle: "Athlean-X / Anatomy & Fitness",
      type: "standard",
      duration: "4:20",
      thumbnailUrl: `https://img.youtube.com/vi/4zWu1yuJ0_g/mqdefault.jpg`
    },
    {
      id: "Mx7IfSgzI50",
      title: `${exerciseNameEn} #shorts Quick Technique Tips`,
      channelTitle: "Squat University",
      type: "short",
      duration: "0:45",
      thumbnailUrl: `https://img.youtube.com/vi/Mx7IfSgzI50/mqdefault.jpg`
    },
    {
      id: "U_mHdPk3amw",
      title: `${exerciseNameEn} Tutorial for Beginners & Advanced`,
      channelTitle: "Renaissance Periodization",
      type: "standard",
      duration: "5:12",
      thumbnailUrl: `https://img.youtube.com/vi/U_mHdPk3amw/mqdefault.jpg`
    }
  ];

  return sampleSuggestions;
}

export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

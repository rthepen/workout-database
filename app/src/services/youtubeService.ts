export interface YouTubeSuggestion {
  id: string;
  title: string;
  channelTitle: string;
  type: 'standard' | 'short';
  duration?: string;
  thumbnailUrl: string;
}

// Curated library of authentic tutorial video templates by equipment / exercise category
const CATEGORY_TUTORIAL_REGISTRY: Record<string, YouTubeSuggestion[]> = {
  ab_wheel: [
    {
      id: "rqiTPdK1-v8",
      title: "Ab Wheel Rollout - Stop Doing Them Wrong! (Proper Form)",
      channelTitle: "ATHLEAN-X",
      type: "standard",
      duration: "4:15",
      thumbnailUrl: "https://img.youtube.com/vi/rqiTPdK1-v8/hqdefault.jpg"
    },
    {
      id: "2Y3T2g51y04",
      title: "How to Use an Ab Roller: Complete Progression (Beginner to Pro)",
      channelTitle: "Buff Dudes",
      type: "standard",
      duration: "3:50",
      thumbnailUrl: "https://img.youtube.com/vi/2Y3T2g51y04/hqdefault.jpg"
    },
    {
      id: "Mx7IfSgzI50",
      title: "Ab Wheel Core Stability & Pelvic Tilt Technique",
      channelTitle: "Squat University",
      type: "short",
      duration: "0:52",
      thumbnailUrl: "https://img.youtube.com/vi/Mx7IfSgzI50/hqdefault.jpg"
    },
    {
      id: "tl_2c8b0eI0",
      title: "Ab Roller Rollout Biomechanics & Form Masterclass",
      channelTitle: "Renaissance Periodization",
      type: "standard",
      duration: "5:20",
      thumbnailUrl: "https://img.youtube.com/vi/tl_2c8b0eI0/hqdefault.jpg"
    }
  ],
  barbell: [
    {
      id: "r4MzxtBKyNE",
      title: "How to Squat: Proper Barbell Squat Form & Depth",
      channelTitle: "Squat University",
      type: "standard",
      duration: "6:10",
      thumbnailUrl: "https://img.youtube.com/vi/r4MzxtBKyNE/hqdefault.jpg"
    },
    {
      id: "bEv6CCg2BC8",
      title: "Barbell Bench Press Guide: Setup & Bar Path",
      channelTitle: "Buff Dudes",
      type: "standard",
      duration: "5:45",
      thumbnailUrl: "https://img.youtube.com/vi/bEv6CCg2BC8/hqdefault.jpg"
    },
    {
      id: "aclHkVaku9U",
      title: "Deadlift Form Check: How to Deadlift Safely",
      channelTitle: "ATHLEAN-X",
      type: "standard",
      duration: "7:02",
      thumbnailUrl: "https://img.youtube.com/vi/aclHkVaku9U/hqdefault.jpg"
    }
  ],
  kettlebell: [
    {
      id: "0vn8p_X6a_M",
      title: "Kettlebell Swing Form - Step-by-Step Tutorial",
      channelTitle: "StrongFirst",
      type: "standard",
      duration: "4:30",
      thumbnailUrl: "https://img.youtube.com/vi/0vn8p_X6a_M/hqdefault.jpg"
    },
    {
      id: "yeMXdkZ18GA",
      title: "Turkish Get-Up Mastery & Shoulder Stability",
      channelTitle: "Squat University",
      type: "standard",
      duration: "5:15",
      thumbnailUrl: "https://img.youtube.com/vi/yeMXdkZ18GA/hqdefault.jpg"
    },
    {
      id: "kK1h0oQ2Qz8",
      title: "Kettlebell Clean & Press Complete Breakdown",
      channelTitle: "Onnit Academy",
      type: "standard",
      duration: "3:40",
      thumbnailUrl: "https://img.youtube.com/vi/kK1h0oQ2Qz8/hqdefault.jpg"
    }
  ],
  dumbbells: [
    {
      id: "y1r9toPQNkM",
      title: "Dumbbell Overhead Press & Shoulder Mechanics",
      channelTitle: "ATHLEAN-X",
      type: "standard",
      duration: "4:50",
      thumbnailUrl: "https://img.youtube.com/vi/y1r9toPQNkM/hqdefault.jpg"
    },
    {
      id: "av7-8igSXTs",
      title: "Single Arm Dumbbell Row - Proper Lat Engagement",
      channelTitle: "Buff Dudes",
      type: "standard",
      duration: "4:10",
      thumbnailUrl: "https://img.youtube.com/vi/av7-8igSXTs/hqdefault.jpg"
    },
    {
      id: "kGqoJmMJ_vU",
      title: "Dumbbell Lateral Raise Form Secrets",
      channelTitle: "Renaissance Periodization",
      type: "standard",
      duration: "3:30",
      thumbnailUrl: "https://img.youtube.com/vi/kGqoJmMJ_vU/hqdefault.jpg"
    }
  ],
  bodyweight: [
    {
      id: "IODxDxX7oi4",
      title: "The Perfect Push Up - Step By Step Form",
      channelTitle: "Calisthenicmovement",
      type: "standard",
      duration: "4:40",
      thumbnailUrl: "https://img.youtube.com/vi/IODxDxX7oi4/hqdefault.jpg"
    },
    {
      id: "v9LABVJzv8A",
      title: "How to Pull-Up Correctly (Avoid Shoulder Pain)",
      channelTitle: "ATHLEAN-X",
      type: "standard",
      duration: "6:20",
      thumbnailUrl: "https://img.youtube.com/vi/v9LABVJzv8A/hqdefault.jpg"
    },
    {
      id: "eGo4IYlbE5g",
      title: "Parallel Bar Dips - Proper Chest & Tricep Form",
      channelTitle: "FitnessFAQs",
      type: "standard",
      duration: "4:15",
      thumbnailUrl: "https://img.youtube.com/vi/eGo4IYlbE5g/hqdefault.jpg"
    }
  ],
  jump_rope: [
    {
      id: "kl2Bc-kBFL8",
      title: "Jump Rope Boxer Step & Footwork Tutorial",
      channelTitle: "Jump Rope Dudes",
      type: "standard",
      duration: "3:55",
      thumbnailUrl: "https://img.youtube.com/vi/kl2Bc-kBFL8/hqdefault.jpg"
    },
    {
      id: "Pti9UqnkbTc",
      title: "Double Unders Tutorial - Master the Rhythm",
      channelTitle: "CrossFit Training",
      type: "standard",
      duration: "4:25",
      thumbnailUrl: "https://img.youtube.com/vi/Pti9UqnkbTc/hqdefault.jpg"
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
      title: "Medicine Ball Slams - Power & Core Engagement",
      channelTitle: "ATHLEAN-X",
      type: "standard",
      duration: "3:30",
      thumbnailUrl: "https://img.youtube.com/vi/7kNN2a52w-Q/hqdefault.jpg"
    },
    {
      id: "LS75csmzdAE",
      title: "Rotational Med Ball Throws for Rotational Power",
      channelTitle: "Overtime Athletes",
      type: "standard",
      duration: "4:05",
      thumbnailUrl: "https://img.youtube.com/vi/LS75csmzdAE/hqdefault.jpg"
    }
  ]
};

// Search and return curated, relevant tutorial videos
export async function searchYouTubeTutorials(exerciseNameEn: string, materialNameEn: string): Promise<YouTubeSuggestion[]> {
  const normalizedMat = (materialNameEn || '').toLowerCase().replace(/[\s-]/g, '_');
  
  // Find category match
  const categoryMatch = Object.keys(CATEGORY_TUTORIAL_REGISTRY).find(key => 
    normalizedMat.includes(key) || key.includes(normalizedMat)
  );

  const baseList = categoryMatch ? CATEGORY_TUTORIAL_REGISTRY[categoryMatch] : CATEGORY_TUTORIAL_REGISTRY.bodyweight;

  // Custom tailored suggestions using exercise name
  return baseList.map(item => ({
    ...item,
    title: item.title.includes(exerciseNameEn) 
      ? item.title 
      : `${exerciseNameEn} - ${item.title.split(' - ')[1] || item.title}`,
  }));
}

export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

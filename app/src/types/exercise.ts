export interface LocalizedString {
  en: string;
  nl: string;
}

export interface Material {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
}

export interface TargetMuscles {
  primary: string[];
  secondary: string[];
}

export interface Attributes {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  mechanics: 'compound' | 'isolation' | 'isometric';
  force_type: 'push' | 'pull' | 'isometric' | 'dynamic';
  tracking_type: 'reps_only' | 'reps_and_weight' | 'time_only' | 'distance';
  rating?: number;
}

export interface LocalizedArray {
  en: string[];
  nl: string[];
}

export interface Relations {
  progressions: string[];
  regressions: string[];
}

export interface VideoMedia {
  youtube_id: string;
  type: 'standard' | 'short';
  priority: number;
  start_seconds?: number;
  thumbnail_seconds?: number;
  language: 'en' | 'nl' | 'none';
  rating?: number; // Video rating (1..5 stars)
  thumbnail_rating?: number; // Thumbnail rating (1..5 stars)
  custom_thumbnail_url?: string;
}

export interface ImageMedia {
  url: string;
  type?: 'thumbnail' | 'diagram' | 'photo';
  rating?: number;
}

export interface Media {
  videos: VideoMedia[];
  images?: ImageMedia[];
}

export interface Meta {
  schema_version: '1.1.0';
  updated_at: string;
}

export interface Exercise {
  id: string;
  exercise_name: LocalizedString;
  aliases: string[];
  material: Material;
  category: LocalizedString;
  target_muscles: TargetMuscles;
  attributes: Attributes;
  instructions: LocalizedArray;
  form_cues: LocalizedArray;
  relations: Relations;
  media: Media;
  meta: Meta;
}

export const ANATOMICAL_MUSCLES = [
  "abductors",
  "adductors",
  "anterior_deltoid",
  "biceps_brachii",
  "brachialis",
  "calves",
  "cardiovascular_system",
  "deltoids",
  "erector_spinae",
  "forearms",
  "full_body",
  "gluteus_maximus",
  "gluteus_medius",
  "glutes",
  "hamstrings",
  "iliopsoas",
  "latissimus_dorsi",
  "lateral_deltoid",
  "obliques",
  "pectorals",
  "posterior_deltoid",
  "quadriceps",
  "rectus_abdominis",
  "rhomboids",
  "rotator_cuff",
  "tibialis_anterior",
  "transverse_abdominis",
  "trapezius",
  "triceps_brachii"
] as const;

export type AnatomicalMuscle = typeof ANATOMICAL_MUSCLES[number];

# 🏋️‍♂️ Open-Source Workout Database

[![Database Validation & Distribution Pipeline](https://github.com/rthepen/workout-database/actions/workflows/database-pipeline.yml/badge.svg)](https://github.com/rthepen/workout-database/actions/workflows/database-pipeline.yml)
[![Schema Version](https://img.shields.io/badge/schema-1.1.0-blue.svg)](schema/exercise.schema.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Exercises Count](https://img.shields.io/badge/exercises-630-green.svg)](dist/all_exercises.json)

An open-source, multi-language, strictly typed workout and exercise database designed for developers building fitness applications, training platforms, wearables, and coaching systems.

---

## 🌟 Key Features

- **Standardized Schema (Draft-07)**: Strict JSON schema enforcing consistent naming, taxonomy, anatomical muscle definitions, biomechanical attributes, and relations.
- **Multilingual Support**: High-quality English (`en`) and Dutch (`nl`) localized names, categories, descriptions, step-by-step instructions, and coaching form cues.
- **Multi-Video Fallback Engine**: Every exercise supports structured video links with fallback priority (`priority: 1`, `priority: 2`), duration start offsets, and format tagging (`standard` vs `short`).
- **Anatomical & Biomechanical Indexing**: Categorized by primary/secondary standardized anatomical muscles, difficulty level, mechanics (`compound`, `isolation`, `isometric`), force types (`push`, `pull`, `isometric`, `dynamic`), and tracking modes (`reps_only`, `reps_and_weight`, `time_only`, `distance`).
- **Automated CI/CD**: Pull request validation and automatic compilation of global distribution files upon merges to `main`.
- **Interactive Verification & Curation Web App**: Embedded curation workspace with YouTube IFrame timestamp capture, auto tutorial discovery, schema validation, and zero-login GitHub Issue & PR export.

---

## 🛠️ Contributor & Verification Web App

The repository includes a dedicated modern web workspace in `/app` for verifying workout entries, capturing action timestamps, and curating YouTube video tutorials.

```bash
# Launch the Curation App locally
cd app
npm install
npm run dev
```

**Key Features:**
- **Verification Audit Queue:** Priority sorting (oldest entries first) with filters for *Needs Review*, *Missing Video*, and *Missing Timestamps*.
- **YouTube Inspector & 1-Click Timestamp Capture:** Real-time YouTube player with precise start-second capture.
- **Tutorial Discovery:** Automated YouTube exercise demonstration suggestions.
- **Schema-Compliant Editor:** 29 anatomical muscles picker, multilingual instruction & form cues editor, and graph relations linker.
- **Zero-Login Export & Direct PR:** Submit single-exercise contributions via pre-filled GitHub issues or automated direct Pull Requests.

---

## 🚀 CDN / Direct Access Endpoints

You can directly fetch the live compiled database without hosting your own backend:

| Resource | Direct Raw CDN URL |
| :--- | :--- |
| **All Exercises (Full Dataset)** | `https://raw.githubusercontent.com/rthepen/workout-database/main/dist/all_exercises.json` |
| **Index & Statistics** | `https://raw.githubusercontent.com/rthepen/workout-database/main/dist/index.json` |
| **JSON Schema** | `https://raw.githubusercontent.com/rthepen/workout-database/main/schema/exercise.schema.json` |
| **Individual Equipment Datasets** | `https://raw.githubusercontent.com/rthepen/workout-database/main/data/{equipment_slug}.json` |

### Available Equipment Slugs (`data/{equipment_slug}.json`)

`ab_wheel`, `agility_ladder`, `barbell`, `battle_rope`, `bodyweight`, `bosu_ball`, `cardio_equipment`, `cones`, `core_sliders`, `deadball`, `dumbbells`, `jump_rope`, `kettlebell`, `medicine_ball`, `monkey_bars`, `parallettes`, `partner`, `plyo_box`, `resistance_band`, `sandbag`, `spinning_bike`, `sprint_track`, `standing_punching_bag`, `tractor_tire`, `trx_suspension`.

---

## 💻 Developer Integration Quickstarts

### 1. JavaScript / TypeScript

```typescript
interface VideoMedia {
  youtube_id: string;
  type: 'standard' | 'short';
  priority: number;
  start_seconds?: number;
  language: 'en' | 'nl' | 'none';
}

interface Exercise {
  id: string;
  exercise_name: { en: string; nl: string };
  category: { en: string; nl: string };
  target_muscles: { primary: string[]; secondary: string[] };
  attributes: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    mechanics: 'compound' | 'isolation' | 'isometric';
    force_type: 'push' | 'pull' | 'isometric' | 'dynamic';
    tracking_type: 'reps_only' | 'reps_and_weight' | 'time_only' | 'distance';
  };
  instructions: { en: string[]; nl: string[] };
  form_cues: { en: string[]; nl: string[] };
  media: { videos: VideoMedia[] };
}

// Fetch and filter exercises with video fallback resolution
async function getChestExercises(lang: 'en' | 'nl' = 'en'): Promise<void> {
  const url = 'https://raw.githubusercontent.com/rthepen/workout-database/main/dist/all_exercises.json';
  const response = await fetch(url);
  const exercises: Exercise[] = await response.json();

  // Filter for chest exercises
  const chestExercises = exercises.filter(ex => 
    ex.target_muscles.primary.includes('pectorals')
  );

  console.log(`Found ${chestExercises.length} chest exercises:`);

  chestExercises.forEach(ex => {
    // Resolve primary video by priority
    const primaryVideo = ex.media.videos.sort((a, b) => a.priority - b.priority)[0];
    const videoUrl = primaryVideo 
      ? `https://www.youtube.com/watch?v=${primaryVideo.youtube_id}` 
      : 'No video demo available';

    console.log(`- [${ex.id}] ${ex.exercise_name[lang]} (${ex.attributes.difficulty})`);
    console.log(`  Demo: ${videoUrl}`);
    console.log(`  First Step: ${ex.instructions[lang][0]}`);
  });
}

getChestExercises();
```

---

### 2. Python

```python
from typing import List, Optional
import requests

ENDPOINT = "https://raw.githubusercontent.com/rthepen/workout-database/main/dist/all_exercises.json"

def fetch_exercises_by_muscle(target_muscle: str, language: str = "en") -> List[dict]:
    """Fetch exercises targeting a specific primary muscle with fallback video resolution."""
    response = requests.get(ENDPOINT)
    response.raise_for_status()
    all_exercises = response.json()

    matched = []
    for ex in all_exercises:
        if target_muscle in ex["target_muscles"]["primary"]:
            # Sort videos by priority (1 = highest)
            sorted_videos = sorted(ex["media"]["videos"], key=lambda v: v.get("priority", 99))
            primary_video = sorted_videos[0] if sorted_videos else None

            matched.append({
                "id": ex["id"],
                "name": ex["exercise_name"].get(language, ex["exercise_name"]["en"]),
                "difficulty": ex["attributes"]["difficulty"],
                "equipment": ex["material"]["name"].get(language),
                "primary_video_id": primary_video["youtube_id"] if primary_video else None,
                "instructions": ex["instructions"].get(language, [])
            })

    return matched

if __name__ == "__main__":
    quad_exercises = fetch_exercises_by_muscle("quadriceps")
    print(f"Loaded {len(quad_exercises)} quadriceps exercises:")
    for item in quad_exercises[:5]:
        print(f"• {item['name']} ({item['difficulty']}) - Equipment: {item['equipment']}")
        if item['primary_video_id']:
            print(f"  Watch: https://youtu.be/{item['primary_video_id']}")
```

---

### 3. Dart / Flutter

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class Exercise {
  final String id;
  final String name;
  final String difficulty;
  final List<String> primaryMuscles;
  final String? primaryVideoId;

  Exercise({
    required this.id,
    required this.name,
    required this.difficulty,
    required this.primaryMuscles,
    this.primaryVideoId,
  });

  factory Exercise.fromJson(Map<String, dynamic> json, {String lang = 'en'}) {
    final videos = (json['media']['videos'] as List<dynamic>?) ?? [];
    videos.sort((a, b) => (a['priority'] as int).compareTo(b['priority'] as int));

    return Exercise(
      id: json['id'] as String,
      name: json['exercise_name'][lang] ?? json['exercise_name']['en'],
      difficulty: json['attributes']['difficulty'] as String,
      primaryMuscles: List<String>.from(json['target_muscles']['primary']),
      primaryVideoId: videos.isNotEmpty ? videos.first['youtube_id'] as String : null,
    );
  }
}

Future<List<Exercise>> fetchExercises({String lang = 'en'}) async {
  final uri = Uri.parse(
    'https://raw.githubusercontent.com/rthepen/workout-database/main/dist/all_exercises.json',
  );
  final response = await http.get(uri);

  if (response.statusCode == 200) {
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((item) => Exercise.fromJson(item, lang: lang)).toList();
  } else {
    throw Exception('Failed to load workout database');
  }
}
```

---

## 📐 Data Schema Specification

Every exercise conforms to `schema/exercise.schema.json`:

```json
{
  "id": "barbell_bench_press",
  "exercise_name": {
    "en": "Bench Press",
    "nl": "Bench Press"
  },
  "aliases": [
    "Barbell Flat Bench",
    "Flat Bench Press",
    "Bankdrukken"
  ],
  "material": {
    "id": "barbell",
    "name": {
      "en": "Barbell",
      "nl": "Halterstang"
    },
    "description": {
      "en": "Standard or Olympic weight bar with loadable weight plates for compound strength",
      "nl": "Lange halterstang met gewichtsschijven voor samengestelde krachttraining"
    }
  },
  "category": {
    "en": "Chest & Upper Body",
    "nl": "Borst / Bovenlichaam"
  },
  "target_muscles": {
    "primary": [
      "pectorals",
      "anterior_deltoid"
    ],
    "secondary": [
      "triceps_brachii",
      "rectus_abdominis"
    ]
  },
  "attributes": {
    "difficulty": "intermediate",
    "mechanics": "compound",
    "force_type": "push",
    "tracking_type": "reps_and_weight"
  },
  "instructions": {
    "en": [
      "Lie flat on the bench with your feet firmly planted on the ground.",
      "Grip the barbell slightly wider than shoulder-width and unrack the bar.",
      "Lower the barbell under control down to the midpoint of your chest.",
      "Press forcefully upward until your arms reach full extension."
    ],
    "nl": [
      "Ga op de bank liggen.",
      "Pak de stang iets breder dan schouderbreedte.",
      "Laat de stang gecontroleerd zakken tot het midden van je borst.",
      "Duw krachtig uit tot je armen gestrekt zijn."
    ]
  },
  "form_cues": {
    "en": [
      "Retract your shoulder blades and maintain a stable, braced upper back.",
      "Control the eccentric lowering phase without flaring elbows excessively."
    ],
    "nl": [
      "Trek je schouderbladen naar elkaar toe en houd een stabiele bovenrug.",
      "Controleer het laten zakken en voorkom dat je ellebogen te ver naar buiten wijzen."
    ]
  },
  "relations": {
    "progressions": [],
    "regressions": []
  },
  "media": {
    "videos": [
      {
        "youtube_id": "gBZkSn-zsD0",
        "type": "standard",
        "priority": 1,
        "language": "en"
      }
    ]
  },
  "meta": {
    "schema_version": "1.1.0",
    "updated_at": "2026-08-29"
  }
}
```

---

## 🫀 Standardized Anatomical Muscles

The `target_muscles.primary` and `target_muscles.secondary` arrays strictly use the following anatomical string enums:

- `abductors`
- `adductors`
- `anterior_deltoid`
- `biceps_brachii`
- `brachialis`
- `calves`
- `cardiovascular_system`
- `deltoids`
- `erector_spinae`
- `forearms`
- `full_body`
- `gluteus_maximus`
- `gluteus_medius`
- `glutes`
- `hamstrings`
- `iliopsoas`
- `latissimus_dorsi`
- `lateral_deltoid`
- `obliques`
- `pectorals`
- `posterior_deltoid`
- `quadriceps`
- `rectus_abdominis`
- `rhomboids`
- `rotator_cuff`
- `tibialis_anterior`
- `transverse_abdominis`
- `trapezius`
- `triceps_brachii`

---

## 🛠 Local Development & Validation

To test and build the database locally:

```bash
# 1. Clone repository
git clone https://github.com/rthepen/workout-database.git
cd workout-database

# 2. Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install jsonschema

# 3. Validate and compile distribution files
python scripts/build_database.py
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for naming conventions, translation standards, and Pull Request guidelines.

---

## 📄 License

This repository is distributed under the open-source [MIT License](LICENSE).

# Contributing to the Open-Source Workout Database

Thank you for your interest in contributing to the **Open-Source Workout Database**! This project aims to provide developers worldwide with an accurate, strictly typed, and localized exercise knowledge base.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Workflow & Pull Requests](#workflow--pull-requests)
3. [Adding or Modifying Exercises](#adding-or-modifying-exercises)
4. [Naming Conventions & Schema Rules](#naming-conventions--schema-rules)
5. [Translation Standards](#translation-standards)
6. [Media & Video Fallback Guidelines](#media--video-fallback-guidelines)
7. [Local Validation](#local-validation)

---

## 🌟 Workflow & Pull Requests

1. **Fork the Repository**: Fork the repository to your own GitHub account.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/add-new-kettlebell-exercises
   ```
3. **Make Your Changes**: Add or edit files inside `data/<equipment_slug>.json`.
4. **Validate Locally**:
   ```bash
   python scripts/build_database.py
   ```
   Ensure the script passes with exit code `0` and compiles distribution files.
5. **Commit with Conventional Commits**:
   ```bash
   git commit -m "feat(data): add kettlebell bottoms-up clean and press"
   ```
6. **Open a Pull Request**: Submit your PR targeting the `main` branch. GitHub Actions CI will automatically run the schema validation suite.

---

## 🏗 Naming Conventions & Schema Rules

All exercises must strictly validate against `schema/exercise.schema.json`:

### 1. Exercise ID (`id`)
- **Format**: `[equipment_slug]_[exercise_slug]` in lower snake_case.
- **Example**: `barbell_incline_bench_press`, `dumbbells_lateral_raise`.
- **Must be globally unique** across all dataset files.

### 2. Materials (`material`)
- `material.id`: Snake_case string matching the equipment dataset filename (e.g., `kettlebell`, `plyo_box`).
- Provide localized names (`en`, `nl`) and concise descriptions.

### 3. Anatomical Muscle Targets (`target_muscles`)
- You must only use standardized anatomical strings from the schema enum:
  - `quadriceps`, `hamstrings`, `gluteus_maximus`, `gluteus_medius`, `glutes`, `calves`, `tibialis_anterior`, `adductors`, `abductors`, `iliopsoas`.
  - `pectorals`, `deltoids`, `anterior_deltoid`, `lateral_deltoid`, `posterior_deltoid`, `rotator_cuff`.
  - `latissimus_dorsi`, `trapezius`, `rhomboids`, `erector_spinae`.
  - `rectus_abdominis`, `obliques`, `transverse_abdominis`.
  - `biceps_brachii`, `triceps_brachii`, `brachialis`, `forearms`.
  - `cardiovascular_system`, `full_body`.

### 4. Attributes (`attributes`)
- `difficulty`: `"beginner"` | `"intermediate"` | `"advanced"`
- `mechanics`: `"compound"` | `"isolation"` | `"isometric"`
- `force_type`: `"push"` | `"pull"` | `"isometric"` | `"dynamic"`
- `tracking_type`: `"reps_only"` | `"reps_and_weight"` | `"time_only"` | `"distance"`

---

## 🌍 Translation Standards

Every exercise requires dual localization:
- **`en` (English)**: Standard international fitness terminology. Instructions must be split into step-by-step array items (`string[]`).
- **`nl` (Dutch)**: Accurate Dutch fitness terminology.

### Example:
```json
"instructions": {
  "en": [
    "Position your feet shoulder-width apart and grip the kettlebell by the horns.",
    "Hinge at the hips, keeping the spine neutral, and drive up explosively to standing.",
    "Lock out the hips and squeeze your glutes at the top."
  ],
  "nl": [
    "Plaats je voeten op schouderbreedte en pak de kettlebell vast bij de hendel.",
    "Buig vanuit je heupen met een rechte rug en kom explosief omhoog tot stand.",
    "Strek je heupen volledig en span je billen aan aan de top."
  ]
}
```

---

## 🎥 Media & Video Fallback Guidelines

The `media.videos` array allows client applications to seamlessly switch to fallback videos if a primary video is blocked or removed:

```json
"media": {
  "videos": [
    {
      "youtube_id": "lyEu6FlYRAU",
      "type": "standard",
      "priority": 1,
      "language": "en"
    },
    {
      "youtube_id": "I7q_EPywprs",
      "type": "short",
      "priority": 2,
      "language": "en"
    }
  ]
}
```

- `youtube_id`: Exact 11-character YouTube video ID (e.g. `gBZkSn-zsD0`).
- `priority`: Unique integer per video in the array (1 = primary, 2 = first fallback, etc.).
- `type`: `"standard"` (horizontal video) or `"short"` (vertical 9:16 video).

---

## 🧪 Local Validation

Before pushing any changes, always run the validation script locally:

```bash
python scripts/build_database.py
```

If validation fails, the script will output detailed error paths pointing directly to the invalid JSON property.

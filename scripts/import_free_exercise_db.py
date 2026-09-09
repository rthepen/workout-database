#!/usr/bin/env python3
"""
Import and normalize exercises from workoutdatabase oud/free-exercise-db.json into data/*.json.
Converts image relative paths to public raw GitHub CDN URLs.
Normalizes anatomical muscle names and schema enums.
"""

import os
import json
import jsonschema

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
INPUT_FILE = os.path.join(BASE_DIR, "workoutdatabase oud", "free-exercise-db.json")
SCHEMA_FILE = os.path.join(BASE_DIR, "schema", "exercise.schema.json")

MUSCLE_MAP = {
    "abdominals": "rectus_abdominis",
    "shoulders": "deltoids",
    "chest": "pectorals",
    "lats": "latissimus_dorsi",
    "biceps": "biceps_brachii",
    "triceps": "triceps_brachii",
    "middle_back": "rhomboids",
    "lower_back": "erector_spinae",
    "traps": "trapezius",
    "hip_flexors": "iliopsoas",
    "core": "rectus_abdominis",
}

def run_import():
    with open(SCHEMA_FILE, "r", encoding="utf-8") as sf:
        schema = json.load(sf)
    validator = jsonschema.Draft7Validator(schema)
    allowed_muscles = set(schema["definitions"]["AnatomicalMuscle"]["enum"])

    with open(INPUT_FILE, "r", encoding="utf-8") as inf:
        incoming = json.load(inf)

    by_file = {}

    for ex in incoming:
        c = json.loads(json.dumps(ex))

        # ID & Material standardizations
        if c["id"] == "battling_ropes_waves":
            c["id"] = "battle_rope_waves"
            c["material"] = {
                "id": "battle_rope",
                "name": {"en": "Battle Ropes", "nl": "Battle Rope"},
                "description": {
                    "en": "Heavy dynamic training ropes for metabolic conditioning and explosive upper body endurance",
                    "nl": "Zware trainingstouwen voor conditietraining en explosief uithoudingsvermogen"
                }
            }
        elif c["id"] == "bodyweight_chin_up":
            c["id"] = "monkey_bars_chin_up"
            c["material"]["id"] = "monkey_bars"
        elif c["id"] == "bodyweight_hanging_leg_raise":
            c["id"] = "monkey_bars_hanging_leg_raise"
            c["material"]["id"] = "monkey_bars"

        # Image paths -> Raw GitHub URLs
        raw_images = c.get("media", {}).get("images", [])
        new_images = []
        for img in raw_images:
            if isinstance(img, str):
                clean_path = img.lstrip("/")
                url = f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{clean_path}"
                new_images.append({"url": url, "type": "photo"})
            elif isinstance(img, dict) and "url" in img:
                new_images.append(img)
        c["media"]["images"] = new_images

        # Target muscles mapping
        primary = []
        for m in c.get("target_muscles", {}).get("primary", []):
            mapped = MUSCLE_MAP.get(m, m)
            if mapped in allowed_muscles and mapped not in primary:
                primary.append(mapped)
        if not primary:
            primary = ["full_body"]
        c["target_muscles"]["primary"] = primary

        secondary = []
        for m in c.get("target_muscles", {}).get("secondary", []):
            mapped = MUSCLE_MAP.get(m, m)
            if mapped in allowed_muscles and mapped not in secondary and mapped not in primary:
                secondary.append(mapped)
        c["target_muscles"]["secondary"] = secondary

        # Attribute enums
        diff = c.get("attributes", {}).get("difficulty", "intermediate")
        if diff == "expert":
            c["attributes"]["difficulty"] = "advanced"

        if c.get("attributes", {}).get("force_type") == "static":
            c["attributes"]["force_type"] = "isometric"

        # Meta & Aliases
        orig_id = c.get("meta", {}).pop("original_id", None)
        c.get("meta", {}).pop("original_category", None)
        if orig_id and orig_id not in c.get("aliases", []):
            c["aliases"].append(orig_id)

        c["meta"] = {
            "schema_version": "1.1.0",
            "updated_at": "2026-09-09"
        }

        # Validate
        errors = list(validator.iter_errors(c))
        if errors:
            raise ValueError(f"Validation error in {c['id']}: {[e.message for e in errors]}")

        target_material = c["material"]["id"]
        filename = f"{target_material}.json"
        if filename not in by_file:
            by_file[filename] = []
        by_file[filename].append(c)

    # Now write to data/*.json
    total_added = 0
    total_updated = 0

    for filename, new_exercises in by_file.items():
        file_path = os.path.join(DATA_DIR, filename)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
        else:
            existing = []

        existing_map = {x["id"]: idx for idx, x in enumerate(existing)}
        for ex_item in new_exercises:
            ex_id = ex_item["id"]
            if ex_id in existing_map:
                existing[existing_map[ex_id]] = ex_item
                total_updated += 1
            else:
                existing.append(ex_item)
                total_added += 1

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
            f.write("\n")

        print(f"✓ Saved {len(existing)} exercises to data/{filename} ({len(new_exercises)} from free-exercise-db)")

    print(f"\n🎉 Finished import: {total_added} added, {total_updated} updated.")

if __name__ == "__main__":
    run_import()

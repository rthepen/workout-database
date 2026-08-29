#!/usr/bin/env python3
"""
Open-Source Workout Database Build & Validation Pipeline.

Features:
1. Validates every exercise file in data/ against schema/exercise.schema.json.
2. Asserts unique exercise IDs across all datasets.
3. Validates referential integrity for progressions and regressions.
4. Asserts unique priority integers per exercise video fallback array.
5. Compiles all records into dist/all_exercises.json.
6. Generates dist/index.json containing repository metadata and indexing metrics.
"""

import os
import sys
import json
import glob
from datetime import datetime, timezone
import jsonschema

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema", "exercise.schema.json")
DIST_DIR = os.path.join(BASE_DIR, "dist")

def build_database(validate_only=False):
    print("==================================================")
    print("      Open-Source Workout Database Build Pipeline ")
    print("==================================================")

    # 1. Load and check Schema
    if not os.path.exists(SCHEMA_PATH):
        print(f"Error: Schema not found at {SCHEMA_PATH}")
        sys.exit(1)

    with open(SCHEMA_PATH, "r", encoding="utf-8") as sp:
        schema = json.load(sp)

    try:
        jsonschema.Draft7Validator.check_schema(schema)
        print("✓ JSON Schema (Draft-07) is valid.")
    except Exception as e:
        print(f"Error: Schema itself is invalid Draft-07: {e}")
        sys.exit(1)

    validator = jsonschema.Draft7Validator(schema)

    # 2. Discover Data Files
    data_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.json")))
    if not data_files:
        print(f"Error: No data files found in {DATA_DIR}")
        sys.exit(1)

    print(f"✓ Found {len(data_files)} equipment dataset files in data/.\n")

    all_exercises = []
    seen_ids = set()
    errors = []

    available_materials = {}
    available_muscles = set()
    categories_set = set()

    # 3. Validate Each File & Record
    for file_path in data_files:
        filename = os.path.basename(file_path)
        try:
            with open(file_path, "r", encoding="utf-8") as fp:
                records = json.load(fp)
        except Exception as e:
            errors.append(f"[{filename}] Failed to parse JSON: {e}")
            continue

        if not isinstance(records, list):
            errors.append(f"[{filename}] Root must be an array of exercise objects.")
            continue

        file_exercise_count = len(records)
        print(f"Validating {filename} ({file_exercise_count} exercises)...")

        for idx, exercise in enumerate(records):
            ex_id = exercise.get("id", f"<index_{idx}>")

            # Schema Validation
            schema_errors = list(validator.iter_errors(exercise))
            if schema_errors:
                for err in schema_errors:
                    errors.append(f"[{filename} -> {ex_id}] Schema error at path '{'/'.join([str(p) for p in err.path])}': {err.message}")

            # Unique ID Check across entire repository
            if ex_id in seen_ids:
                errors.append(f"[{filename}] Duplicate exercise ID found: '{ex_id}'")
            else:
                seen_ids.add(ex_id)

            # Unique priority check in video array
            videos = exercise.get("media", {}).get("videos", [])
            priorities = [v.get("priority") for v in videos if isinstance(v, dict)]
            if len(priorities) != len(set(priorities)):
                errors.append(f"[{filename} -> {ex_id}] Duplicate video priority values found: {priorities}")

            # Collect metadata metrics
            mat = exercise.get("material", {})
            if isinstance(mat, dict) and "id" in mat:
                available_materials[mat["id"]] = {
                    "name": mat.get("name", {}),
                    "description": mat.get("description", {})
                }

            muscles = exercise.get("target_muscles", {})
            if isinstance(muscles, dict):
                for m in muscles.get("primary", []):
                    available_muscles.add(m)
                for m in muscles.get("secondary", []):
                    available_muscles.add(m)

            cat = exercise.get("category", {})
            if isinstance(cat, dict) and "en" in cat:
                categories_set.add(cat["en"])

            all_exercises.append(exercise)

    # 4. Check Referential Integrity (Relations: Progressions and Regressions)
    print("\nVerifying graph relation referential integrity...")
    for exercise in all_exercises:
        ex_id = exercise.get("id")
        relations = exercise.get("relations", {})
        progressions = relations.get("progressions", [])
        regressions = relations.get("regressions", [])

        for prog_id in progressions:
            if prog_id not in seen_ids:
                errors.append(f"[{ex_id}] Referenced progression ID '{prog_id}' does not exist in dataset.")

        for reg_id in regressions:
            if reg_id not in seen_ids:
                errors.append(f"[{ex_id}] Referenced regression ID '{reg_id}' does not exist in dataset.")

    # 5. Report Errors
    if errors:
        print("\n❌ Validation Failed! Errors encountered:")
        for err in errors:
            print(f"  • {err}")
        sys.exit(1)

    print("✓ All exercises passed strict schema and referential validation.")
    print(f"✓ Total verified exercises: {len(all_exercises)}")

    if validate_only:
        print("\nValidation completed successfully (--validate-only).")
        return

    # 6. Build Distribution Artifacts
    os.makedirs(DIST_DIR, exist_ok=True)
    all_exercises_path = os.path.join(DIST_DIR, "all_exercises.json")
    index_path = os.path.join(DIST_DIR, "index.json")

    # Sort exercises deterministically by ID
    all_exercises.sort(key=lambda x: x["id"])

    with open(all_exercises_path, "w", encoding="utf-8") as fp:
        json.dump(all_exercises, fp, indent=2, ensure_ascii=False)
        fp.write("\n")

    index_data = {
        "repository": "rthepen/workout-database",
        "schema_version": "1.1.0",
        "last_updated_utc": datetime.now(timezone.utc).isoformat(),
        "total_exercises": len(all_exercises),
        "total_equipment_types": len(available_materials),
        "available_materials": available_materials,
        "available_muscles": sorted(list(available_muscles)),
        "available_categories": sorted(list(categories_set)),
        "distribution_files": {
            "all_exercises": "https://raw.githubusercontent.com/rthepen/workout-database/main/dist/all_exercises.json",
            "index": "https://raw.githubusercontent.com/rthepen/workout-database/main/dist/index.json"
        }
    }

    with open(index_path, "w", encoding="utf-8") as fp:
        json.dump(index_data, fp, indent=2, ensure_ascii=False)
        fp.write("\n")

    print(f"\n✓ Generated {all_exercises_path} ({len(all_exercises)} exercises).")
    print(f"✓ Generated {index_path} (Repository index & metadata).")
    print("\n==================================================")
    print("      Build Pipeline Completed Successfully!      ")
    print("==================================================")

if __name__ == "__main__":
    validate_flag = "--validate-only" in sys.argv
    build_database(validate_only=validate_flag)

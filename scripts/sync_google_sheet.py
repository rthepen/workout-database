#!/usr/bin/env python3
"""
Sync Google Sheet Backup/Reviews into Git Repository (data/*.json, dist/, app/src/data/).
"""

import os
import sys
import csv
import json
import glob
from build_database import build_database

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
DIST_DIR = os.path.join(BASE_DIR, "dist")
APP_DATA_PATH = os.path.join(BASE_DIR, "app", "src", "data", "all_exercises.json")
CSV_PATH = "/tmp/sheet.csv"

def sync_from_sheet():
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file not found at {CSV_PATH}")
        sys.exit(1)

    with open(CSV_PATH, mode="r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)

    print(f"Loaded {len(rows)} rows from Google Sheet CSV.")

    # Group rows by exercise ID to find the latest valid exercise object
    sheet_latest_by_id = {}
    for idx, row in enumerate(rows):
        user_fp_or_json = row[10] if len(row) > 10 else ""
        extra_col = row[11] if len(row) > 11 else ""

        full_json_str = None
        for candidate in [extra_col, user_fp_or_json]:
            if candidate.strip().startswith("{") and candidate.strip().endswith("}"):
                full_json_str = candidate.strip()
                break

        exercise_obj = None
        if full_json_str:
            try:
                data = json.loads(full_json_str)
                if "exercises" in data:
                    exercise_obj = data["exercises"][0]
                elif "id" in data:
                    exercise_obj = data
            except Exception:
                pass

        actual_id = (exercise_obj.get("id") if exercise_obj else (row[1] if len(row) > 1 else "")) or ""
        if not actual_id or actual_id.startswith("test"):
            continue

        sheet_latest_by_id[actual_id] = exercise_obj

    print(f"Found {len(sheet_latest_by_id)} unique real exercises in Google Sheet.")

    # Clean internal temporary keys
    cleaned_sheet_by_id = {}
    for ex_id, raw_obj in sheet_latest_by_id.items():
        if not raw_obj:
            continue
        c = json.loads(json.dumps(raw_obj))
        c.pop("_user_fingerprint", None)
        c.pop("_to_be_reviewed", None)
        if "meta" not in c:
            c["meta"] = {}
        if "schema_version" not in c["meta"]:
            c["meta"]["schema_version"] = "1.1.0"
        cleaned_sheet_by_id[ex_id] = c

    # Read and update data/*.json files
    data_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.json")))
    total_updated_exercises = 0
    updated_files_count = 0
    updated_details = []

    for file_path in data_files:
        filename = os.path.basename(file_path)
        with open(file_path, "r", encoding="utf-8") as fp:
            records = json.load(fp)

        file_changed = False
        new_records = []
        for ex in records:
            ex_id = ex.get("id")
            if ex_id in cleaned_sheet_by_id:
                sheet_version = cleaned_sheet_by_id[ex_id]
                # Compare content
                def get_clean_compare(o):
                    x = json.loads(json.dumps(o))
                    return x

                if get_clean_compare(ex) != get_clean_compare(sheet_version):
                    # Check if only meta changed or content changed
                    def content_only(o):
                        x = json.loads(json.dumps(o))
                        x.pop("meta", None)
                        return x

                    is_content_diff = content_only(ex) != content_only(sheet_version)
                    file_changed = True
                    total_updated_exercises += 1
                    updated_details.append({
                        "id": ex_id,
                        "file": filename,
                        "is_content_diff": is_content_diff,
                        "old_vids": [v.get("youtube_id") for v in ex.get("media", {}).get("videos", [])],
                        "new_vids": [v.get("youtube_id") for v in sheet_version.get("media", {}).get("videos", [])],
                        "old_rating": ex.get("attributes", {}).get("rating"),
                        "new_rating": sheet_version.get("attributes", {}).get("rating")
                    })
                    new_records.append(sheet_version)
                else:
                    new_records.append(ex)
            else:
                new_records.append(ex)

        if file_changed:
            updated_files_count += 1
            with open(file_path, "w", encoding="utf-8") as fp:
                json.dump(new_records, fp, indent=2, ensure_ascii=False)
                fp.write("\n")
            print(f"✓ Updated {filename}")

    print(f"\nTotal exercises updated in data/*.json: {total_updated_exercises} across {updated_files_count} files.")
    content_updates = [u for u in updated_details if u["is_content_diff"]]
    meta_updates = [u for u in updated_details if not u["is_content_diff"]]
    print(f" - Content updates (videos/ratings/attributes): {len(content_updates)}")
    print(f" - Timestamp/approval-only updates: {len(meta_updates)}")

    # Rebuild distribution database
    print("\nRunning build pipeline to validate and generate distribution files...")
    build_database(validate_only=False)

    # Sync to app/src/data/all_exercises.json
    dist_all_path = os.path.join(DIST_DIR, "all_exercises.json")
    with open(dist_all_path, "r", encoding="utf-8") as f_dist:
        dist_content = f_dist.read()
    with open(APP_DATA_PATH, "w", encoding="utf-8") as f_app:
        f_app.write(dist_content)
    print(f"✓ Synchronized {APP_DATA_PATH} with latest build ({dist_all_path}).")

if __name__ == "__main__":
    sync_from_sheet()

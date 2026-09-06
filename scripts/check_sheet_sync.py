#!/usr/bin/env python3
"""
Google Sheet vs Codebase Sync & Comparison Tool
-----------------------------------------------
Haalt live gegevens op uit de Google Sheet (of lokaal bestand) en vergelijkt
deze cel-voor-cel met de huidige lokale database (data/*.json).

Gebruik:
    python scripts/check_sheet_sync.py             # Alleen vergelijken en samenvatting tonen
    python scripts/check_sheet_sync.py --apply     # Vergelijken én wijzigingen direct doorvoeren
    python scripts/check_sheet_sync.py --file pad  # Lokale export (CSV of JSON) vergelijken
"""

import os
import sys
import json
import glob
import argparse
import urllib.request
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
DIST_DIR = os.path.join(BASE_DIR, "dist")
APP_DATA_PATH = os.path.join(BASE_DIR, "app", "src", "data", "all_exercises.json")
DEFAULT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz9vMJVgR4F2Uyb_uP9ZtvBxWPXqZt-0ILqKgvAHo1wKW8OzPbdjj4IKK0pN4VLvlJ4/exec"

# ANSI Terminal Kleuren
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

def log_info(msg):
    print(f"{CYAN}ℹ{RESET} {msg}")

def log_success(msg):
    print(f"{GREEN}✓{RESET} {msg}")

def log_warn(msg):
    print(f"{YELLOW}⚠{RESET} {msg}")

def log_error(msg):
    print(f"{RED}✖{RESET} {msg}")

def fetch_sheet_rows(webhook_url=DEFAULT_WEBHOOK_URL, input_file=None):
    if input_file:
        log_info(f"Gegevens laden uit lokaal bestand: {input_file}")
        with open(input_file, "r", encoding="utf-8", errors="replace") as f:
            content = f.read().strip()
            if content.startswith("{") or content.startswith("["):
                data = json.loads(content)
                if isinstance(data, dict) and "rows" in data:
                    return data["rows"]
                elif isinstance(data, list):
                    return data
            else:
                # CSV fallback
                import csv
                reader = csv.reader(content.splitlines())
                header = next(reader, [])
                rows = []
                for r in reader:
                    rows.append({
                        "timestamp": r[0] if len(r) > 0 else "",
                        "id": r[1] if len(r) > 1 else "",
                        "name": r[2] if len(r) > 2 else "",
                        "material": r[3] if len(r) > 3 else "",
                        "category": r[4] if len(r) > 4 else "",
                        "difficulty": r[5] if len(r) > 5 else "",
                        "video_count": r[6] if len(r) > 6 else "",
                        "video_id": r[7] if len(r) > 7 else "",
                        "start_seconds": r[8] if len(r) > 8 else "",
                        "rating": r[9] if len(r) > 9 else "",
                        "user_fingerprint": r[10] if len(r) > 10 else "",
                        "raw_payload": r[12] if len(r) > 12 else (r[11] if len(r) > 11 else (r[10] if len(r) > 10 else ""))
                    })
                return rows

    log_info(f"Live verbinding maken met Google Sheet via Webhook URL...")
    # Fetch CSV format to guarantee full 13-column access including raw_payload in column 12
    csv_url = webhook_url if "format=csv" in webhook_url else (webhook_url + ("&" if "?" in webhook_url else "?") + "format=csv")
    req = urllib.request.Request(csv_url, headers={"User-Agent": "WorkoutDB-Sync-Tool/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            import csv
            content = response.read().decode("utf-8")
            reader = csv.reader(content.splitlines())
            header = next(reader, [])
            rows = []
            for r in reader:
                rows.append({
                    "timestamp": r[0] if len(r) > 0 else "",
                    "id": r[1] if len(r) > 1 else "",
                    "name": r[2] if len(r) > 2 else "",
                    "material": r[3] if len(r) > 3 else "",
                    "category": r[4] if len(r) > 4 else "",
                    "difficulty": r[5] if len(r) > 5 else "",
                    "video_count": r[6] if len(r) > 6 else "",
                    "video_id": r[7] if len(r) > 7 else "",
                    "start_seconds": r[8] if len(r) > 8 else "",
                    "rating": r[9] if len(r) > 9 else "",
                    "user_fingerprint": r[10] if len(r) > 10 else "",
                    "raw_payload": r[12] if len(r) > 12 else (r[11] if len(r) > 11 else (r[10] if len(r) > 10 else ""))
                })
            log_success(f"{len(rows)} rijen succesvol opgehaald uit de Google Sheet.")
            return rows
    except Exception as e:
        log_error(f"Kon Google Sheet niet bereiken via webhook: {e}")
        log_info("Tip: Controleer je internetverbinding of gebruik --file <pad/naar/export.csv>")
        sys.exit(1)

def parse_sheet_exercises(rows):
    latest_by_id = {}
    for r in rows:
        raw_payload = r.get("raw_payload") or r.get("user_fingerprint") or ""
        exercise_obj = None

        if isinstance(raw_payload, str) and raw_payload.strip().startswith("{"):
            try:
                payload_data = json.loads(raw_payload.strip())
                # If batch payload containing multiple exercises, unpack all of them!
                if "exercises" in payload_data and isinstance(payload_data["exercises"], list):
                    for ex_item in payload_data["exercises"]:
                        ex_id = ex_item.get("id")
                        if ex_id and not ex_id.startswith("test"):
                            latest_by_id[ex_id] = {
                                "exercise": ex_item,
                                "timestamp": r.get("timestamp") or payload_data.get("timestamp") or "",
                                "raw_row": r
                            }
                    continue
                elif "id" in payload_data:
                    exercise_obj = payload_data
            except Exception:
                pass

        ex_id = (exercise_obj.get("id") if exercise_obj else r.get("id")) or ""
        if not ex_id or ex_id.startswith("test"):
            continue

        latest_by_id[ex_id] = {
            "exercise": exercise_obj,
            "timestamp": r.get("timestamp") or "",
            "raw_row": r
        }

    # Clean up internal metadata fields
    cleaned_by_id = {}
    for ex_id, item in latest_by_id.items():
        obj = item["exercise"]
        if not obj:
            continue
        c = json.loads(json.dumps(obj))
        c.pop("_user_fingerprint", None)
        c.pop("_to_be_reviewed", None)
        if "meta" not in c:
            c["meta"] = {}
        if "schema_version" not in c["meta"]:
            c["meta"]["schema_version"] = "1.1.0"
        cleaned_by_id[ex_id] = {
            "exercise": c,
            "timestamp": item["timestamp"]
        }

    return cleaned_by_id

def load_local_exercises():
    data_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.json")))
    exercises_by_id = {}
    file_map = {}

    for file_path in data_files:
        filename = os.path.basename(file_path)
        with open(file_path, "r", encoding="utf-8") as fp:
            records = json.load(fp)
            for rec in records:
                ex_id = rec.get("id")
                if ex_id:
                    exercises_by_id[ex_id] = rec
                    file_map[ex_id] = file_path

    return exercises_by_id, file_map

def compare_sheet_with_codebase(sheet_data, local_data):
    content_diffs = []
    meta_diffs = []
    identical = []
    new_in_sheet = []

    for ex_id, sheet_item in sheet_data.items():
        sheet_ex = sheet_item["exercise"]
        sheet_ts = sheet_item["timestamp"]

        if ex_id not in local_data:
            new_in_sheet.append((ex_id, sheet_ex, sheet_ts))
            continue

        local_ex = local_data[ex_id]

        def clean_compare(o):
            c = json.loads(json.dumps(o))
            c.pop("meta", None)
            return c

        local_clean = clean_compare(local_ex)
        sheet_clean = clean_compare(sheet_ex)

        if local_clean != sheet_clean:
            changes = {}
            for k in set(local_clean.keys()) | set(sheet_clean.keys()):
                if local_clean.get(k) != sheet_clean.get(k):
                    changes[k] = {
                        "local": local_clean.get(k),
                        "sheet": sheet_clean.get(k)
                    }
            content_diffs.append({
                "id": ex_id,
                "name": local_ex.get("exercise_name", {}).get("nl") or local_ex.get("exercise_name", {}).get("en") or ex_id,
                "material": local_ex.get("material", {}).get("id") or "onbekend",
                "timestamp": sheet_ts,
                "changes": changes,
                "sheet_exercise": sheet_ex
            })
        else:
            # Check meta updated_at
            local_up = local_ex.get("meta", {}).get("updated_at")
            sheet_up = sheet_ex.get("meta", {}).get("updated_at")
            if local_up != sheet_up:
                meta_diffs.append({
                    "id": ex_id,
                    "name": local_ex.get("exercise_name", {}).get("nl") or local_ex.get("exercise_name", {}).get("en") or ex_id,
                    "material": local_ex.get("material", {}).get("id") or "onbekend",
                    "local_up": local_up,
                    "sheet_up": sheet_up,
                    "sheet_exercise": sheet_ex
                })
            else:
                identical.append(ex_id)

    return {
        "content_diffs": content_diffs,
        "meta_diffs": meta_diffs,
        "identical": identical,
        "new_in_sheet": new_in_sheet
    }

def print_summary_report(results, total_local_count):
    content_diffs = results["content_diffs"]
    meta_diffs = results["meta_diffs"]
    identical = results["identical"]
    new_in_sheet = results["new_in_sheet"]
    total_in_sheet = len(content_diffs) + len(meta_diffs) + len(identical) + len(new_in_sheet)

    print("\n" + "=" * 68)
    print(f"{BOLD}📊 VERGELIJKINGSRAPPORT: GOOGLE SHEET vs LOKALE CODEBASE{RESET}")
    print("=" * 68)
    print(f" • Totaal oefeningen in codebase (GitHub/lokaal): {BOLD}{total_local_count}{RESET}")
    print(f" • Unieke oefeningen in Google Sheet:            {BOLD}{total_in_sheet}{RESET}")
    print(f" • Exact identiek:                               {GREEN}{len(identical)}{RESET}")
    print(f" • Alleen beoordeeld (timestamp nieuwer):        {CYAN}{len(meta_diffs)}{RESET}")
    print(f" • Inhoudelijke wijzigingen (Video/Rating/etc.): {YELLOW}{len(content_diffs)}{RESET}")
    if new_in_sheet:
        print(f" • Nieuwe oefeningen (staan nog niet lokaal):   {RED}{len(new_in_sheet)}{RESET}")
    print("-" * 68)

    if not content_diffs and not meta_diffs and not new_in_sheet:
        print(f"\n{GREEN}{BOLD}🎉 De lokale codebase is 100% in sync met de Google Sheet! Geen verschillen.{RESET}\n")
        return

    if content_diffs:
        print(f"\n{BOLD}{YELLOW}📝 Inhoudelijke Verschillen ({len(content_diffs)} oefeningen):{RESET}")
        for idx, diff in enumerate(content_diffs, 1):
            print(f"\n  {BOLD}{idx}. {diff['name']}{RESET} ({DIM}{diff['id']}{RESET}) [{CYAN}{diff['material']}{RESET}]")
            if diff['timestamp']:
                print(f"     {DIM}Sheet Timestamp: {diff['timestamp']}{RESET}")
            for field, vals in diff["changes"].items():
                if field == "media":
                    old_v = [v.get("youtube_id") for v in vals["local"].get("videos", [])] if vals["local"] else []
                    new_v = [v.get("youtube_id") for v in vals["sheet"].get("videos", [])] if vals["sheet"] else []
                    print(f"     • {BOLD}Videos:{RESET}  Lokaal={old_v}  ➔  {GREEN}Sheet={new_v}{RESET}")
                elif field == "attributes":
                    old_r = vals["local"].get("rating") if vals["local"] else None
                    new_r = vals["sheet"].get("rating") if vals["sheet"] else None
                    if old_r != new_r:
                        print(f"     • {BOLD}Rating:{RESET}  Lokaal={old_r}  ➔  {GREEN}Sheet={new_r}{RESET}")
                    else:
                        print(f"     • {BOLD}Attributes:{RESET} gewijzigd")
                else:
                    print(f"     • {BOLD}{field}:{RESET} Lokaal={vals['local']} ➔ {GREEN}Sheet={vals['sheet']}{RESET}")

    if meta_diffs:
        print(f"\n{BOLD}{CYAN}⏱️ Goedgekeurd in Sheet zonder datawijziging ({len(meta_diffs)} oefeningen):{RESET}")
        preview = meta_diffs[:5]
        for m in preview:
            print(f"  • {m['name']} ({m['id']}): {DIM}{m['local_up']} ➔ {m['sheet_up']}{RESET}")
        if len(meta_diffs) > 5:
            print(f"  {DIM}... en nog {len(meta_diffs) - 5} goedgekeurde oefeningen.{RESET}")

    print("\n" + "=" * 68)

def apply_sync(results, file_map):
    to_update = {}
    for d in results["content_diffs"]:
        to_update[d["id"]] = d["sheet_exercise"]
    for m in results["meta_diffs"]:
        to_update[m["id"]] = m["sheet_exercise"]

    if not to_update:
        log_info("Geen wijzigingen om door te voeren.")
        return

    log_info(f"Bezig met doorvoeren van {len(to_update)} bijgewerkte oefeningen...")

    # Group updates by file
    updates_by_file = {}
    for ex_id, ex_obj in to_update.items():
        file_path = file_map.get(ex_id)
        if not file_path:
            log_warn(f"Geen bestand gevonden voor oefening '{ex_id}'.")
            continue
        if file_path not in updates_by_file:
            updates_by_file[file_path] = {}
        updates_by_file[file_path][ex_id] = ex_obj

    for file_path, exercises_dict in updates_by_file.items():
        with open(file_path, "r", encoding="utf-8") as fp:
            records = json.load(fp)
        new_records = []
        for r in records:
            r_id = r.get("id")
            if r_id in exercises_dict:
                new_records.append(exercises_dict[r_id])
            else:
                new_records.append(r)
        with open(file_path, "w", encoding="utf-8") as fp:
            json.dump(new_records, fp, indent=2, ensure_ascii=False)
            fp.write("\n")
        log_success(f"Bijgewerkt: {os.path.basename(file_path)} ({len(exercises_dict)} oefeningen)")

    # Run build database script
    log_info("Build pipeline draaien (validatie & compilatie dist/)...")
    try:
        from build_database import build_database
        build_database(validate_only=False)
    except Exception as e:
        log_warn(f"Build pipeline import waarschuwing ({e}), fallback naar subprocess:")
        os.system(f"python3 {os.path.join(BASE_DIR, 'scripts', 'build_database.py')}")

    # Synchronize app/src/data/all_exercises.json
    dist_all = os.path.join(DIST_DIR, "all_exercises.json")
    if os.path.exists(dist_all):
        with open(dist_all, "r", encoding="utf-8") as f_in:
            data = f_in.read()
        with open(APP_DATA_PATH, "w", encoding="utf-8") as f_out:
            f_out.write(data)
        log_success("Web-app database (app/src/data/all_exercises.json) gesynchroniseerd.")

    print(f"\n{GREEN}{BOLD}🎉 Alle wijzigingen uit de Google Sheet zijn succesvol toegepast!{RESET}\n")

def main():
    parser = argparse.ArgumentParser(
        description="Google Sheet vs Codebase Sync & Comparison Tool",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Voer de wijzigingen uit de Google Sheet direct door in data/*.json en herbouw de database"
    )
    parser.add_argument(
        "--file",
        type=str,
        default=None,
        help="Pad naar een lokaal CSV- of JSON-exportbestand in plaats van ophalen via webhook"
    )
    parser.add_argument(
        "--url",
        type=str,
        default=DEFAULT_WEBHOOK_URL,
        help="Aangepaste Google Apps Script Webhook URL"
    )

    args = parser.parse_args()

    rows = fetch_sheet_rows(webhook_url=args.url, input_file=args.file)
    sheet_data = parse_sheet_exercises(rows)
    local_data, file_map = load_local_exercises()

    results = compare_sheet_with_codebase(sheet_data, local_data)
    print_summary_report(results, len(local_data))

    if args.apply:
        apply_sync(results, file_map)
    else:
        diff_count = len(results["content_diffs"]) + len(results["meta_diffs"])
        if diff_count > 0:
            print(f"{YELLOW}Tip:{RESET} Voer uit met {BOLD}--apply{RESET} om deze wijzigingen direct door te voeren:")
            print(f"     {CYAN}python scripts/check_sheet_sync.py --apply{RESET}\n")

if __name__ == "__main__":
    main()

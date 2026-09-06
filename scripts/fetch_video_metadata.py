#!/usr/bin/env python3
"""
YouTube Video Metadata Enrichment Tool
---------------------------------------
Fetches rich metadata for all YouTube videos across data/*.json:
- Aspect Ratio (9:16 for Shorts vs 16:9 for Standard)
- Video Type ('short' vs 'standard')
- Runtime duration in seconds
- Channel / Creator name
- Like count

Saves metadata into data/*.json, updates cache, and rebuilds distribution files.
"""

import os
import sys
import json
import glob
import time
import shutil
import argparse
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
DIST_DIR = os.path.join(BASE_DIR, "dist")
APP_DATA_PATH = os.path.join(BASE_DIR, "app", "src", "data", "all_exercises.json")
CACHE_FILE = os.path.join(BASE_DIR, "scripts", "video_metadata_cache.json")

# Try locating yt-dlp binary
YT_DLP_BIN = shutil.which("yt-dlp") or "/opt/homebrew/bin/yt-dlp"

def log_info(msg):
    print(f"\033[96mℹ\033[0m {msg}")

def log_success(msg):
    print(f"\033[92m✓\033[0m {msg}")

def log_warn(msg):
    print(f"\033[93m⚠\033[0m {msg}")

def log_error(msg):
    print(f"\033[91m✖\033[0m {msg}")

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as fp:
                return json.load(fp)
        except Exception:
            return {}
    return {}

def save_cache(cache):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as fp:
            json.dump(cache, fp, indent=2, ensure_ascii=False)
    except Exception as e:
        log_warn(f"Kon cache niet opslaan: {e}")

def fetch_single_video_metadata(youtube_id):
    """Fetch metadata for a single YouTube ID using yt-dlp."""
    url = f"https://www.youtube.com/watch?v={youtube_id}"
    
    # Use yt-dlp formatted print
    cmd = [
        YT_DLP_BIN,
        "--skip-download",
        "--ignore-errors",
        "--no-warnings",
        "--no-playlist",
        "--socket-timeout", "10",
        "--print", "%(id)s\t%(duration)s\t%(width)s\t%(height)s\t%(channel)s\t%(like_count)s\t%(title)s",
        url
    ]
    
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        output = proc.stdout.strip()
        if not output:
            return None

        parts = output.split("\t")
        if len(parts) < 4:
            return None

        yid = parts[0]
        dur_str = parts[1] if len(parts) > 1 else "NA"
        w_str = parts[2] if len(parts) > 2 else "NA"
        h_str = parts[3] if len(parts) > 3 else "NA"
        channel = parts[4] if len(parts) > 4 and parts[4] != "NA" else None
        like_str = parts[5] if len(parts) > 5 else "NA"
        title = parts[6] if len(parts) > 6 and parts[6] != "NA" else None

        duration = int(float(dur_str)) if dur_str not in ("NA", "None", "") else None
        width = int(float(w_str)) if w_str not in ("NA", "None", "") else None
        height = int(float(h_str)) if h_str not in ("NA", "None", "") else None
        likes = int(float(like_str)) if like_str not in ("NA", "None", "") else None

        # Determine aspect ratio and short status
        is_short = False
        aspect_ratio = "16:9"

        if width and height:
            if height > width:
                is_short = True
                aspect_ratio = "9:16"
            elif width == height:
                aspect_ratio = "1:1"
                if duration and duration <= 60:
                    is_short = True
            elif abs((width / height) - (4 / 3)) < 0.1:
                aspect_ratio = "4:3"
            else:
                aspect_ratio = "16:9"
        elif duration and duration <= 60:
            # Fallback if dimensions missing but short duration
            # Check if shorts URL resolves
            is_short = True
            aspect_ratio = "9:16"

        return {
            "youtube_id": yid,
            "type": "short" if is_short else "standard",
            "aspect_ratio": aspect_ratio,
            "duration_seconds": duration,
            "channel": channel.strip() if channel else None,
            "likes": likes,
            "title": title.strip() if title else None,
            "fetched_at": int(time.time())
        }
    except Exception as e:
        return None

def fetch_oembed_fallback(youtube_id):
    """Fallback using oEmbed API if yt-dlp fails."""
    import urllib.request
    try:
        url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={youtube_id}&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "WorkoutDB-Metadata/1.0"})
        with urllib.request.urlopen(req, timeout=8) as res:
            data = json.loads(res.read().decode("utf-8"))
            w = data.get("width", 16)
            h = data.get("height", 9)
            is_short = h > w
            return {
                "youtube_id": youtube_id,
                "type": "short" if is_short else "standard",
                "aspect_ratio": "9:16" if is_short else "16:9",
                "duration_seconds": None,
                "channel": data.get("author_name"),
                "likes": None,
                "title": data.get("title"),
                "fetched_at": int(time.time())
            }
    except Exception:
        return None

def process_all_videos(limit=None, force=False, concurrency=6):
    data_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.json")))
    all_videos_set = set()
    video_to_exercises = {}

    for f in data_files:
        with open(f, "r", encoding="utf-8") as fp:
            records = json.load(fp)
            for rec in records:
                vids = rec.get("media", {}).get("videos", [])
                for v in vids:
                    yid = v.get("youtube_id")
                    if yid and len(yid) == 11:
                        all_videos_set.add(yid)
                        if yid not in video_to_exercises:
                            video_to_exercises[yid] = []
                        video_to_exercises[yid].append((rec.get("id"), f))

    all_videos = sorted(list(all_videos_set))
    if limit:
        all_videos = all_videos[:limit]

    log_info(f"Totaal {len(all_videos)} unieke video IDs gevonden in database.")
    cache = load_cache()
    log_info(f"{len(cache)} video's reeds in lokale cache.")

    to_fetch = [vid for vid in all_videos if force or vid not in cache]
    log_info(f"Nog op te halen metadata via yt-dlp: {len(to_fetch)} video's.")

    completed_count = 0
    shorts_found = 0
    standards_found = 0

    if to_fetch:
        print(f"Bezig met ophalen met {concurrency} parallelle threads...\n")
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            future_to_id = {executor.submit(fetch_single_video_metadata, vid): vid for vid in to_fetch}
            for future in as_completed(future_to_id):
                vid = future_to_id[future]
                completed_count += 1
                try:
                    result = future.result()
                    if not result:
                        # Fallback to oembed
                        result = fetch_oembed_fallback(vid)
                    
                    if result:
                        cache[vid] = result
                        if result["type"] == "short":
                            shorts_found += 1
                            tag = "\033[95m📱 SHORT\033[0m"
                        else:
                            standards_found += 1
                            tag = "\033[94m📺 STANDAARD\033[0m"
                        
                        dur = f"{result.get('duration_seconds')}s" if result.get('duration_seconds') else "N/A"
                        ch = result.get('channel') or "Onbekend"
                        print(f"[{completed_count}/{len(to_fetch)}] {vid} ➔ {tag} ({result['aspect_ratio']}, {dur}) door '{ch}'")
                    else:
                        print(f"[{completed_count}/{len(to_fetch)}] {vid} ➔ \033[91mGeen metadata beschikbaar\033[0m")
                except Exception as e:
                    print(f"[{completed_count}/{len(to_fetch)}] {vid} ➔ \033[91mFout: {e}\033[0m")

                # Save cache periodically every 15 items
                if completed_count % 15 == 0:
                    save_cache(cache)

        save_cache(cache)
        log_success("Alle video metadata is succesvol opgehaald en opgeslagen in cache.")

    # Apply cached metadata into data/*.json
    log_info("Bezig met verwerken van metadata in data/*.json...")
    updated_files = 0
    total_videos_updated = 0
    stats = {"short": 0, "standard": 0, "with_channel": 0, "with_duration": 0, "with_likes": 0}

    for f in data_files:
        with open(f, "r", encoding="utf-8") as fp:
            records = json.load(fp)
        
        file_modified = False
        for rec in records:
            vids = rec.get("media", {}).get("videos", [])
            for v in vids:
                yid = v.get("youtube_id")
                if yid and yid in cache:
                    meta = cache[yid]
                    v["type"] = meta.get("type", v.get("type", "standard"))
                    v["aspect_ratio"] = meta.get("aspect_ratio", "16:9")
                    
                    if meta.get("duration_seconds") is not None:
                        v["duration_seconds"] = meta["duration_seconds"]
                        stats["with_duration"] += 1
                    
                    if meta.get("channel"):
                        v["channel"] = meta["channel"]
                        stats["with_channel"] += 1

                    if meta.get("likes") is not None and meta["likes"] > 0:
                        v["likes"] = meta["likes"]
                        stats["with_likes"] += 1

                    if v["type"] == "short":
                        stats["short"] += 1
                    else:
                        stats["standard"] += 1

                    total_videos_updated += 1
                    file_modified = True

        if file_modified:
            with open(f, "w", encoding="utf-8") as fp:
                json.dump(records, fp, indent=2, ensure_ascii=False)
                fp.write("\n")
            updated_files += 1

    log_success(f"{total_videos_updated} video records bijgewerkt in {updated_files} bestanden.")
    print("\n" + "=" * 60)
    print("📊 METADATA RESULTATEN OVERZICHT")
    print("=" * 60)
    print(f" • 📱 YouTube Shorts (9:16):       {stats['short']}")
    print(f" • 📺 Normale Video's (16:9):     {stats['standard']}")
    print(f" • ⏱️ Met speelduur (seconden):   {stats['with_duration']}")
    print(f" • 👤 Met kanaal / creator:       {stats['with_channel']}")
    print(f" • 👍 Met aantal likes:           {stats['with_likes']}")
    print("=" * 60 + "\n")

    # Rebuild database
    log_info("Database hercompileren (scripts/build_database.py)...")
    try:
        from build_database import build_database
        build_database(validate_only=False)
    except Exception:
        os.system(f'python3 "{os.path.join(BASE_DIR, "scripts", "build_database.py")}"')

    # Update app data
    dist_all = os.path.join(DIST_DIR, "all_exercises.json")
    if os.path.exists(dist_all):
        with open(dist_all, "r", encoding="utf-8") as f_in:
            data = f_in.read()
        with open(APP_DATA_PATH, "w", encoding="utf-8") as f_out:
            f_out.write(data)
        log_success("Webapp database (app/src/data/all_exercises.json) bijgewerkt!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch YouTube metadata for workout database")
    parser.add_argument("--limit", type=int, default=None, help="Limiteer aantal op te halen video's")
    parser.add_argument("--force", action="store_true", help="Overschrijf bestaande cache")
    parser.add_argument("--workers", type=int, default=8, help="Aantal gelijktijdige workers")
    args = parser.parse_args()

    process_all_videos(limit=args.limit, force=args.force, concurrency=args.workers)

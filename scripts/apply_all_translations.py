import os
import json
import glob
import re

cache_file = "/Users/m/.gemini/antigravity-ide/brain/f1eec433-4dc1-44aa-9af3-993771074f33/scratch/translations_cache.json"
with open(cache_file, "r", encoding="utf-8") as fp:
    cache = json.load(fp)

data_dir = "/Users/m/Documents/workout database/data"
files = sorted(glob.glob(os.path.join(data_dir, "*.json")))

total_updated = 0

for f in files:
    with open(f, "r", encoding="utf-8") as fp:
        exercises = json.load(fp)

    for ex in exercises:
        nl_instructions = ex.get("instructions", {}).get("nl", [])
        en_instructions = []
        for nl_sent in nl_instructions:
            s_clean = nl_sent.strip()
            if s_clean in cache:
                en_instructions.append(cache[s_clean])
            else:
                # Fallback if minor punctuation diff
                matched = False
                for k, v in cache.items():
                    if k.strip().lower() == s_clean.lower():
                        en_instructions.append(v)
                        matched = True
                        break
                if not matched:
                    en_instructions.append(s_clean)

        ex["instructions"]["en"] = en_instructions
        total_updated += 1

    with open(f, "w", encoding="utf-8") as fp:
        json.dump(exercises, fp, indent=2, ensure_ascii=False)
        fp.write("\n")

print(f"Successfully updated all {total_updated} exercises across {len(files)} files!")

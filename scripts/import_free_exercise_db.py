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
    "neck": "trapezius",
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
        elif c["id"] in [
            "resistance_band_cable_deadlifts",
            "resistance_band_cable_russian_twists",
            "resistance_band_external_rotation_with_cable",
            "resistance_band_face_pull",
            "resistance_band_front_cable_raise",
            "resistance_band_one_arm_lat_pulldown",
            "resistance_band_pull_through",
            "resistance_band_reverse_grip_triceps_pushdown",
            "resistance_band_shotgun_row",
            "resistance_band_standing_rope_crunch"
        ] or (c.get("material", {}).get("id") == "resistance_band" and ("cable" in c.get("exercise_name", {}).get("en", "").lower() or "pulldown" in c.get("exercise_name", {}).get("en", "").lower() or "pushdown" in c.get("exercise_name", {}).get("en", "").lower() or "pulley" in c.get("exercise_name", {}).get("en", "").lower())):
            clean_name = c["id"].replace("resistance_band_", "")
            c["id"] = f"cable_{clean_name}"
            c["material"] = {
                "id": "cable",
                "name": {"en": "Cable Machine", "nl": "Kabelstation"},
                "description": {
                    "en": "Cable pulley system with selectorized weight stacks for constant tension",
                    "nl": "Kabelsysteem met gewichtsstapel voor constante weerstand"
                }
            }
        elif "exercise_ball" in c["id"] or "stability_ball" in c["id"]:
            clean_name = c["id"].replace("bodyweight_", "")
            c["id"] = f"stability_ball_{clean_name}"
            c["material"] = {
                "id": "exercise_ball",
                "name": {"en": "Stability Ball", "nl": "Fysiobal / Stabiliteitsbal"},
                "description": {
                    "en": "Inflatable exercise ball for balance, rehabilitation, and core stabilization",
                    "nl": "Grote opblaasbare fitnessbal voor balans, core en mobiliteit"
                }
            }
        elif c["id"].endswith("_smr") or c["id"] == "bodyweight_latissimus_dorsi_smr":
            clean_name = c["id"].replace("bodyweight_", "")
            c["id"] = f"foam_roller_{clean_name}"
            c["material"] = {
                "id": "foam_roller",
                "name": {"en": "Foam Roller", "nl": "Foamroller"},
                "description": {
                    "en": "Dense foam cylinder used for self-myofascial release and muscle recovery",
                    "nl": "Schuimcilinder voor zelfmassage, myofasciale release en spierherstel"
                }
            }
        elif c["id"] in ["bodyweight_recumbent_bike", "bodyweight_stairmaster", "bodyweight_step_mill", "bodyweight_walking_treadmill"]:
            clean_name = c["id"].replace("bodyweight_", "")
            c["id"] = f"cardio_equipment_{clean_name}"
            c["material"] = {
                "id": "cardio_equipment",
                "name": {"en": "Cardio Equipment", "nl": "Cardio-apparatuur"},
                "description": {
                    "en": "Specialized cardio conditioning machines including Skillmill, SkiErg, Rower, and Airbike",
                    "nl": "Gespecialiseerde cardiotoestellen zoals Skillmill, SkiErg, Roeitrainer en Airbike"
                }
            }
        elif c["id"].startswith("bodyweight_step_up_"):
            clean_name = c["id"].replace("bodyweight_", "")
            c["id"] = f"plyo_box_{clean_name}"
            c["material"] = {
                "id": "plyo_box",
                "name": {"en": "Plyo Box", "nl": "Sprongkast / Plyo Box"},
                "description": {
                    "en": "Sturdy wooden or foam platform for plyometric box jumps, step-ups, and depth drops",
                    "nl": "Stevige houten of foam sprongbox voor plyometrische sprongen en opstappen"
                }
            }
        elif c["id"] == "bodyweight_reverse_plate_curls":
            c["id"] = "barbell_reverse_plate_curls"
            c["material"] = {
                "id": "barbell",
                "name": {"en": "Weight Plate", "nl": "Halterschijf"},
                "description": {
                    "en": "Olympic weight plate held in hands for shoulder conditioning",
                    "nl": "Halterschijf voor schouder- en armisolatie"
                }
            }
        elif c["id"].startswith("sandbag_sled_"):
            clean_name = c["id"].replace("sandbag_", "")
            c["id"] = f"sprint_track_{clean_name}"
            c["material"] = {
                "id": "sprint_track",
                "name": {"en": "Sprint Track / Turf", "nl": "Sprinttrack / Kunstgras"},
                "description": {
                    "en": "Turf sprint lane for sled pushes, drags, lunges, and resisted acceleration drills",
                    "nl": "Kunstgras sprintstrook voor sled pushes, pulls, lunges en sprinttrainingen"
                }
            }
        elif c["id"].startswith("bodyweight_leg_extensions") or c["id"].startswith("bodyweight_leg_press") or c["id"].startswith("bodyweight_leverage_") or c["id"].startswith("bodyweight_machine_") or c["id"].startswith("bodyweight_lying_leg_curls") or c["id"].startswith("bodyweight_lying_machine_squat") or c["id"].startswith("bodyweight_lying_t_bar_row") or c["id"].startswith("bodyweight_reverse_hyperextension") or c["id"].startswith("bodyweight_reverse_machine_flyes") or c["id"].startswith("bodyweight_seated_calf_raise") or c["id"].startswith("bodyweight_seated_leg_curl") or c["id"].startswith("barbell_smith_") or c["id"].startswith("bodyweight_standing_calf_raises") or c["id"].startswith("bodyweight_standing_leg_curl") or c["id"].startswith("bodyweight_thigh_"):
            clean_name = c["id"].replace("bodyweight_", "").replace("barbell_", "")
            if clean_name.startswith("machine_"):
                c["id"] = clean_name
            else:
                c["id"] = f"machine_{clean_name}"
            c["material"] = {
                "id": "machine",
                "name": {"en": "Machine", "nl": "Fitnessapparaat"},
                "description": {
                    "en": "Selectorized weight stack machines for guided and isolated movement paths",
                    "nl": "Krachtapparaten met gewichtsblokken voor gecontroleerde en geïsoleerde bewegingen"
                }
            }
        elif c["id"].startswith("medicine_ball_medicine_ball_"):
            c["id"] = c["id"].replace("medicine_ball_medicine_ball_", "medicine_ball_")

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

        # Clean citation tags [cite: ...] from instructions and form cues
        for key in ["instructions", "form_cues"]:
            if key in c:
                for lang in ["en", "nl"]:
                    if lang in c[key] and isinstance(c[key][lang], list):
                        c[key][lang] = [
                            __import__("re").sub(r"\s*\[cite:[^\]]+\]", "", line).strip()
                            for line in c[key][lang]
                        ]

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

#!/usr/bin/env python3
"""
Comprehensive Data Migration and Translation Pipeline
Transforms 25 legacy JSON files in 'workoutdatabase oud/' into 25 standardized datasets in 'data/'.
Translates all Dutch fitness instructions into professional, step-by-step English instructions.
"""

import os
import sys
import json
import glob
import re
from datetime import date
import jsonschema

LEGACY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "workoutdatabase oud"))
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
SCHEMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "schema", "exercise.schema.json"))

os.makedirs(DATA_DIR, exist_ok=True)

# Standardized Material Definitions
MATERIALS = {
    "ab_wheel": {
        "id": "ab_wheel",
        "name": {"en": "Ab Wheel", "nl": "Buikspierwiel"},
        "description": {
            "en": "Wheel with handles for core rollout and anti-extension abdominal training",
            "nl": "Wiel met handvatten voor core- en buikspieruitrol-oefeningen"
        }
    },
    "agility_ladder": {
        "id": "agility_ladder",
        "name": {"en": "Agility Ladder", "nl": "Loopladder"},
        "description": {
            "en": "Floor ladder used for footwork speed, coordination, and agility drills",
            "nl": "Grondladder voor voetenwerksnelheid, coördinatie en behendigheidstraining"
        }
    },
    "barbell": {
        "id": "barbell",
        "name": {"en": "Barbell", "nl": "Halterstang"},
        "description": {
            "en": "Standard or Olympic weight bar with loadable weight plates for compound strength",
            "nl": "Lange halterstang met gewichtsschijven voor samengestelde krachttraining"
        }
    },
    "battle_rope": {
        "id": "battle_rope",
        "name": {"en": "Battle Ropes", "nl": "Battle Rope"},
        "description": {
            "en": "Heavy dynamic training ropes for metabolic conditioning and explosive upper body endurance",
            "nl": "Zware trainingstouwen voor conditietraining en explosief uithoudingsvermogen"
        }
    },
    "bodyweight": {
        "id": "bodyweight",
        "name": {"en": "Bodyweight", "nl": "Lichaamsgewicht"},
        "description": {
            "en": "Calisthenic exercises using body mass and gravity as primary resistance",
            "nl": "Calisthenics en gymnastiekoefeningen met het eigen lichaamsgewicht"
        }
    },
    "bosu_ball": {
        "id": "bosu_ball",
        "name": {"en": "BOSU Ball", "nl": "Bosu Bal"},
        "description": {
            "en": "Hemispherical balance trainer with flat platform and elastic dome",
            "nl": "Halve balanskogel met platform voor stabiliteit, balans en corekracht"
        }
    },
    "cardio_equipment": {
        "id": "cardio_equipment",
        "name": {"en": "Cardio Equipment", "nl": "Cardio Apparaten"},
        "description": {
            "en": "Ergometers and cardiovascular machines (SkiErg, Skillmill, Rower, Assault Bike)",
            "nl": "Cardiotoestellen en ergometers zoals SkiErg, Skillmill, roeiers en airbikes"
        }
    },
    "core_sliders": {
        "id": "core_sliders",
        "name": {"en": "Core Sliders", "nl": "Core Sliders"},
        "description": {
            "en": "Low-friction gliding discs for dynamic core stability and bodyweight sliding",
            "nl": "Gladde glijschijven voor dynamische corestabiliteit en buikspieroefeningen"
        }
    },
    "deadball": {
        "id": "deadball",
        "name": {"en": "Deadball / Slam Ball", "nl": "Deadball / Slam Ball"},
        "description": {
            "en": "Heavy non-bouncing sand-filled ball for explosive power slams and carries",
            "nl": "Zware niet-stuitende bal gevuld met zand voor explosieve slams en carries"
        }
    },
    "dumbbells": {
        "id": "dumbbells",
        "name": {"en": "Dumbbells", "nl": "Halters / Dumbbells"},
        "description": {
            "en": "Free weights designed for unilateral and bilateral functional strength training",
            "nl": "Korte halters voor unilaterale en bilaterale krachttraining"
        }
    },
    "jump_rope": {
        "id": "jump_rope",
        "name": {"en": "Jump Rope", "nl": "Springtouw"},
        "description": {
            "en": "Speed or weighted rope for cardiovascular endurance, rhythm, and footwork agility",
            "nl": "Springtouw voor cardiovasculair uithoudingsvermogen, ritme en voetenwerk"
        }
    },
    "kettlebell": {
        "id": "kettlebell",
        "name": {"en": "Kettlebell", "nl": "Kettlebell"},
        "description": {
            "en": "Cast-iron or steel ball with a top handle for ballistic swings and compound strength",
            "nl": "Gietijzeren kogel met handvat voor ballistische swings en samengestelde kracht"
        }
    },
    "medicine_ball": {
        "id": "medicine_ball",
        "name": {"en": "Medicine Ball", "nl": "Medicijnbal"},
        "description": {
            "en": "Weighted ball for dynamic throws, partner passes, and rotational core conditioning",
            "nl": "Verzwaarde bal voor dynamische worpen, partnerpasses en rotatietraining"
        }
    },
    "monkey_bars": {
        "id": "monkey_bars",
        "name": {"en": "Monkey Bars / Pull-Up Rig", "nl": "Rekstok / Klimrek"},
        "description": {
            "en": "Overhead horizontal bars and pull-up rigs for grip strength and hanging calisthenics",
            "nl": "Horizontaal klimrek en optrekstangen voor gripkracht en hangende oefeningen"
        }
    },
    "parallettes": {
        "id": "parallettes",
        "name": {"en": "Parallettes / Dip Bars", "nl": "Parallettes / Dips Barren"},
        "description": {
            "en": "Low parallel bars for calisthenics, dips, L-sits, and handstand progressions",
            "nl": "Lage parallelle stangen voor calisthenics, dips, L-sits en handstandtraining"
        }
    },
    "partner": {
        "id": "partner",
        "name": {"en": "Partner", "nl": "Partner"},
        "description": {
            "en": "Cooperative workouts and drills utilizing a training partner for resistance or pacing",
            "nl": "Duo-oefeningen waarbij een trainingspartner als weerstand of steun fungeert"
        }
    },
    "cones": {
        "id": "cones",
        "name": {"en": "Cones", "nl": "Pionnen"},
        "description": {
            "en": "Field markers and cones for sprint boundaries, shuttle runs, and agility change of direction",
            "nl": "Pionnen en markeerkegels voor shuttleruns, behendigheid en wendbaarheidstraining"
        }
    },
    "plyo_box": {
        "id": "plyo_box",
        "name": {"en": "Plyo Box", "nl": "Sprongkast / Plyo Box"},
        "description": {
            "en": "Sturdy wooden or foam platform for plyometric box jumps, step-ups, and depth drops",
            "nl": "Stevige houten of foam sprongbox voor plyometrische sprongen en opstappen"
        }
    },
    "resistance_band": {
        "id": "resistance_band",
        "name": {"en": "Resistance Band", "nl": "Weerstandsband"},
        "description": {
            "en": "Elastic loop or tube bands providing progressive accommodating resistance",
            "nl": "Elastische weerstandsbanden voor progressieve weerstand, warming-up en mobiliteit"
        }
    },
    "sandbag": {
        "id": "sandbag",
        "name": {"en": "Sandbag", "nl": "Zandzak / Sandbag"},
        "description": {
            "en": "Heavy canvas bag filled with shifting sand for functional awkward-object training",
            "nl": "Zware canvas tas met bewegend zand voor functionele training met instabiele massa"
        }
    },
    "spinning_bike": {
        "id": "spinning_bike",
        "name": {"en": "Spinning Bike / Stationary Bike", "nl": "Spinningfiets"},
        "description": {
            "en": "High-inertia flywheel indoor cycling bike for cadence, rhythm, and cardiovascular intervals",
            "nl": "Stationaire fiets met vliegwiel voor intensieve interval-, ritme- en cadanstraining"
        }
    },
    "sprint_track": {
        "id": "sprint_track",
        "name": {"en": "Sprint Track / Sled Track", "nl": "Sprintbaan / Sleebaan"},
        "description": {
            "en": "Turf sprint lane for sled pushes, drags, lunges, and resisted acceleration drills",
            "nl": "Kunstgras sprintbaan voor prowler pushes, slee trekken en sprintversnellingen"
        }
    },
    "standing_punching_bag": {
        "id": "standing_punching_bag",
        "name": {"en": "Standing Punching Bag", "nl": "Staande Bokspaal"},
        "description": {
            "en": "Freestanding heavy punch bag for boxing strikes, kicks, tackles, and combat conditioning",
            "nl": "Vrijstaande bokspaal voor stoten, trappen, tackles en vechtsportconditie"
        }
    },
    "tractor_tire": {
        "id": "tractor_tire",
        "name": {"en": "Tractor Tire", "nl": "Tractorband"},
        "description": {
            "en": "Heavy commercial tire for power flips, sledgehammer slams, and plyometric jumps",
            "nl": "Zware industriële tractorband voor powerflips, hamerslagen en sprongen"
        }
    },
    "trx_suspension": {
        "id": "trx_suspension",
        "name": {"en": "TRX / Suspension Trainer", "nl": "TRX / Suspension Trainer"},
        "description": {
            "en": "Adjustable strap suspension system using body angle and gravity for functional stability",
            "nl": "Verstelbare suspension trainer die lichaamsgewicht en hoek benut voor stabiliteit"
        }
    }
}

FILE_MAP = {
    "ab_wheel.json": "ab_wheel",
    "agility_ladder.json": "agility_ladder",
    "barbell.json": "barbell",
    "battle_rope.json": "battle_rope",
    "bodyweight.json": "bodyweight",
    "bosu_ball.json": "bosu_ball",
    "cardio_equipment.json": "cardio_equipment",
    "core_sliders.json": "core_sliders",
    "deadball.json": "deadball",
    "dumbbells.json": "dumbbells",
    "jump_rope.json": "jump_rope",
    "kettlebell.json": "kettlebell",
    "medicine_ball.json": "medicine_ball",
    "monkey_bars.json": "monkey_bars",
    "parallettes.json": "parallettes",
    "partner.json": "partner",
    "pionnen.json": "cones",
    "plyo_box.json": "plyo_box",
    "resistance_band.json": "resistance_band",
    "sandbag.json": "sandbag",
    "spinningfiets.json": "spinning_bike",
    "sprint_track.json": "sprint_track",
    "standing_punching_bag.json": "standing_punching_bag",
    "tractor_tyre.json": "tractor_tire",
    "trx___suspension.json": "trx_suspension"
}

CATEGORY_MAP = {
    "Agility": {"en": "Agility", "nl": "Behendigheid / Agility"},
    "Agility / Coördinatie": {"en": "Agility & Coordination", "nl": "Agility / Coördinatie"},
    "Agility / Heupen": {"en": "Agility & Hips", "nl": "Agility / Heupen"},
    "Agility / Rotatie": {"en": "Agility & Rotation", "nl": "Agility / Rotatie"},
    "Agility / Snelheid": {"en": "Agility & Speed", "nl": "Agility / Snelheid"},
    "Armen": {"en": "Arms", "nl": "Armen"},
    "Armen / Core": {"en": "Arms & Core", "nl": "Armen / Core"},
    "Balans": {"en": "Balance", "nl": "Balans"},
    "Balans / Schouders": {"en": "Balance & Shoulders", "nl": "Balans / Schouders"},
    "Behendigheid": {"en": "Agility & Footwork", "nl": "Behendigheid"},
    "Benen": {"en": "Legs", "nl": "Benen"},
    "Benen (Quadriceps)": {"en": "Legs (Quadriceps)", "nl": "Benen (Quadriceps)"},
    "Benen (Unilateraal)": {"en": "Legs (Unilateral)", "nl": "Benen (Unilateraal)"},
    "Benen / Balans": {"en": "Legs & Balance", "nl": "Benen / Balans"},
    "Benen / Billen": {"en": "Legs & Glutes", "nl": "Benen / Billen"},
    "Benen / Cardio": {"en": "Legs & Cardio", "nl": "Benen / Cardio"},
    "Benen / Core": {"en": "Legs & Core", "nl": "Benen / Core"},
    "Benen / Coördinatie": {"en": "Legs & Coordination", "nl": "Benen / Coördinatie"},
    "Benen / Hamstrings": {"en": "Legs & Hamstrings", "nl": "Benen / Hamstrings"},
    "Benen / Mobiliteit": {"en": "Legs & Mobility", "nl": "Benen / Mobiliteit"},
    "Benen / Plyometrics": {"en": "Legs & Plyometrics", "nl": "Benen / Plyometrics"},
    "Benen / Rug": {"en": "Legs & Back", "nl": "Benen / Rug"},
    "Benen / Zijkant": {"en": "Legs & Lateral Chain", "nl": "Benen / Zijkant"},
    "Biceps": {"en": "Biceps", "nl": "Biceps"},
    "Biceps / Onderarmen": {"en": "Biceps & Forearms", "nl": "Biceps / Onderarmen"},
    "Billen": {"en": "Glutes", "nl": "Billen"},
    "Billen (Glutes)": {"en": "Glutes", "nl": "Billen (Glutes)"},
    "Billen / Hamstrings": {"en": "Glutes & Hamstrings", "nl": "Billen / Hamstrings"},
    "Bochtenwerk": {"en": "Agility & Cornering", "nl": "Bochtenwerk"},
    "Boksen": {"en": "Boxing", "nl": "Boksen"},
    "Boksen / Grond": {"en": "Boxing & Groundwork", "nl": "Boksen / Grond"},
    "Borst": {"en": "Chest", "nl": "Borst"},
    "Borst (Bovenkant)": {"en": "Upper Chest", "nl": "Borst (Bovenkant)"},
    "Borst (ROM)": {"en": "Chest (Full ROM)", "nl": "Borst (ROM)"},
    "Borst / Bovenlichaam": {"en": "Chest & Upper Body", "nl": "Borst / Bovenlichaam"},
    "Borst / Core": {"en": "Chest & Core", "nl": "Borst / Core"},
    "Borst / Rug": {"en": "Chest & Back", "nl": "Borst / Rug"},
    "Borst / Schouders": {"en": "Chest & Shoulders", "nl": "Borst / Schouders"},
    "Borst / Triceps": {"en": "Chest & Triceps", "nl": "Borst / Triceps"},
    "Bovenlichaam": {"en": "Upper Body", "nl": "Bovenlichaam"},
    "Bovenlichaam / Core": {"en": "Upper Body & Core", "nl": "Bovenlichaam / Core"},
    "Bovenlichaam / Triceps": {"en": "Upper Body & Triceps", "nl": "Bovenlichaam / Triceps"},
    "Buikspieren": {"en": "Abs & Core", "nl": "Buikspieren"},
    "Buikspieren / Boksen": {"en": "Abs & Combat Conditioning", "nl": "Buikspieren / Boksen"},
    "Buikspieren / Core": {"en": "Core & Abs", "nl": "Buikspieren / Core"},
    "Buikspieren / Obliques": {"en": "Obliques & Core", "nl": "Buikspieren / Obliques"},
    "Buikspieren / Team": {"en": "Partner Core & Abs", "nl": "Buikspieren / Team"},
    "Cardio": {"en": "Cardio & Endurance", "nl": "Cardio"},
    "Cardio / Advanced": {"en": "Advanced Cardio", "nl": "Cardio / Advanced"},
    "Cardio / Agility": {"en": "Cardio & Agility", "nl": "Cardio / Agility"},
    "Cardio / Benen": {"en": "Cardio & Legs", "nl": "Cardio / Benen"},
    "Cardio / Boksen": {"en": "Cardio & Boxing", "nl": "Cardio / Boksen"},
    "Cardio / Bovenlichaam": {"en": "Cardio & Upper Body", "nl": "Cardio / Bovenlichaam"},
    "Cardio / Core": {"en": "Cardio & Core", "nl": "Cardio / Core"},
    "Cardio / Coördinatie": {"en": "Cardio & Coordination", "nl": "Cardio / Coördinatie"},
    "Cardio / Duur": {"en": "Endurance Cardio", "nl": "Cardio / Duur"},
    "Cardio / Full Body": {"en": "Full Body Cardio", "nl": "Cardio / Full Body"},
    "Cardio / Glutes": {"en": "Cardio & Glutes", "nl": "Cardio / Glutes"},
    "Cardio / HIIT": {"en": "Cardio & HIIT", "nl": "Cardio / HIIT"},
    "Cardio / Hele Lichaam": {"en": "Full Body Cardio", "nl": "Cardio / Hele Lichaam"},
    "Cardio / Kracht": {"en": "Cardio & Strength", "nl": "Cardio / Kracht"},
    "Cardio / Plyometrics": {"en": "Cardio & Plyometrics", "nl": "Cardio / Plyometrics"},
    "Cardio / Rhythmic": {"en": "Rhythmic Cardio", "nl": "Cardio / Rhythmic"},
    "Cardio / Schouders": {"en": "Cardio & Shoulders", "nl": "Cardio / Schouders"},
    "Cardio / Snelheid": {"en": "Cardio & Speed", "nl": "Cardio / Snelheid"},
    "Cardio / Speed": {"en": "Speed & Cardio", "nl": "Cardio / Speed"},
    "Cardio / Techniek": {"en": "Cardio Technique", "nl": "Cardio / Techniek"},
    "Cardio / Zijwaarts": {"en": "Lateral Cardio", "nl": "Cardio / Zijwaarts"},
    "Cooling Down": {"en": "Cool-Down & Recovery", "nl": "Cooling Down"},
    "Core": {"en": "Core Stability", "nl": "Core"},
    "Core (Advanced)": {"en": "Advanced Core", "nl": "Core (Advanced)"},
    "Core (Anti-Lateroflexie)": {"en": "Core (Anti-Lateral Flexion)", "nl": "Core (Anti-Lateroflexie)"},
    "Core / Abs": {"en": "Core & Abs", "nl": "Core / Abs"},
    "Core / Advanced": {"en": "Advanced Core", "nl": "Core / Advanced"},
    "Core / Anti-rotatie": {"en": "Anti-Rotation Core", "nl": "Core / Anti-rotatie"},
    "Core / Balans": {"en": "Core & Balance", "nl": "Core / Balans"},
    "Core / Bovenlichaam": {"en": "Core & Upper Body", "nl": "Core / Bovenlichaam"},
    "Core / Buikspieren": {"en": "Core & Abs", "nl": "Core / Buikspieren"},
    "Core / Cardio": {"en": "Core & Cardio", "nl": "Core / Cardio"},
    "Core / Conditie": {"en": "Core Conditioning", "nl": "Core / Conditie"},
    "Core / Flexibiliteit": {"en": "Core & Flexibility", "nl": "Core / Flexibiliteit"},
    "Core / Full Body": {"en": "Full Body Core", "nl": "Core / Full Body"},
    "Core / Grip": {"en": "Core & Grip Strength", "nl": "Core / Grip"},
    "Core / Heupen": {"en": "Core & Hips", "nl": "Core / Heupen"},
    "Core / Kracht": {"en": "Core Strength", "nl": "Core / Kracht"},
    "Core / Mobiliteit": {"en": "Core & Mobility", "nl": "Core / Mobiliteit"},
    "Core / Obliques": {"en": "Core & Obliques", "nl": "Core / Obliques"},
    "Core / Rotatie": {"en": "Rotational Core", "nl": "Core / Rotatie"},
    "Core / Rug": {"en": "Core & Posterior Chain", "nl": "Core / Rug"},
    "Core / Schouders": {"en": "Core & Shoulders", "nl": "Core / Schouders"},
    "Core / Schuine Buikspieren": {"en": "Core & Obliques", "nl": "Core / Schuine Buikspieren"},
    "Core / Stabiliteit": {"en": "Core Stability", "nl": "Core / Stabiliteit"},
    "Core / Techniek": {"en": "Core Technique", "nl": "Core / Techniek"},
    "Coördinatie": {"en": "Coordination", "nl": "Coördinatie"},
    "Coördinatie / Advanced": {"en": "Advanced Coordination", "nl": "Coördinatie / Advanced"},
    "Explosiviteit": {"en": "Explosive Power", "nl": "Explosiviteit"},
    "Explosiviteit / Balans": {"en": "Power & Balance", "nl": "Explosiviteit / Balans"},
    "Explosiviteit / Cardio": {"en": "Power & Cardio", "nl": "Explosiviteit / Cardio"},
    "Full Body / Cardio": {"en": "Full Body Cardio", "nl": "Full Body / Cardio"},
    "Full Body / Core": {"en": "Full Body & Core", "nl": "Full Body / Core"},
    "Full Body / Explosiviteit": {"en": "Full Body Power", "nl": "Full Body / Explosiviteit"},
    "Full Body / Mobiliteit": {"en": "Full Body Mobility", "nl": "Full Body / Mobiliteit"},
    "Full Body / Rug": {"en": "Full Body & Back", "nl": "Full Body / Rug"},
    "Grip / Core": {"en": "Grip & Core", "nl": "Grip / Core"},
    "Grip / Schouders": {"en": "Grip & Shoulders", "nl": "Grip / Schouders"},
    "Grip / Stabiliteit / Benen": {"en": "Grip, Stability & Legs", "nl": "Grip / Stabiliteit / Benen"},
    "HIIT": {"en": "High Intensity Interval Training", "nl": "HIIT"},
    "HIIT / Full Body": {"en": "Full Body HIIT", "nl": "HIIT / Full Body"},
    "HIIT / Rhythmic": {"en": "Rhythmic HIIT", "nl": "HIIT / Rhythmic"},
    "Hamstrings": {"en": "Hamstrings", "nl": "Hamstrings"},
    "Hamstrings / Advanced": {"en": "Advanced Hamstrings", "nl": "Hamstrings / Advanced"},
    "Hamstrings / Balans": {"en": "Hamstrings & Balance", "nl": "Hamstrings / Balans"},
    "Hamstrings / Bilspieren": {"en": "Hamstrings & Glutes", "nl": "Hamstrings / Bilspieren"},
    "Hamstrings / Onderrug": {"en": "Hamstrings & Lower Back", "nl": "Hamstrings / Onderrug"},
    "Hamstrings / Rug": {"en": "Hamstrings & Back", "nl": "Hamstrings / Rug"},
    "Hele Lichaam": {"en": "Full Body", "nl": "Hele Lichaam"},
    "Hele Lichaam / Core": {"en": "Full Body & Core", "nl": "Hele Lichaam / Core"},
    "Hele Lichaam / Coördinatie": {"en": "Full Body & Coordination", "nl": "Hele Lichaam / Coördinatie"},
    "Hele Lichaam / Explosiviteit": {"en": "Full Body Power", "nl": "Hele Lichaam / Explosiviteit"},
    "Herstel / Coördinatie": {"en": "Recovery & Coordination", "nl": "Herstel / Coördinatie"},
    "Heupmobiliteit / Snelheid": {"en": "Hip Mobility & Speed", "nl": "Heupmobiliteit / Snelheid"},
    "Houding": {"en": "Postural Alignment", "nl": "Houding"},
    "Kickboksen": {"en": "Kickboxing", "nl": "Kickboksen"},
    "Kickboksen / Muay Thai": {"en": "Kickboxing & Muay Thai", "nl": "Kickboksen / Muay Thai"},
    "Kracht": {"en": "Strength", "nl": "Kracht"},
    "Kracht / Balans": {"en": "Strength & Balance", "nl": "Kracht / Balans"},
    "Kracht / Bovenlichaam": {"en": "Upper Body Strength", "nl": "Kracht / Bovenlichaam"},
    "Kracht / Cardio": {"en": "Strength & Conditioning", "nl": "Kracht / Cardio"},
    "Kracht / Core": {"en": "Strength & Core", "nl": "Kracht / Core"},
    "Kracht / Explosiviteit": {"en": "Strength & Power", "nl": "Kracht / Explosiviteit"},
    "Kracht / Full Body": {"en": "Full Body Strength", "nl": "Kracht / Full Body"},
    "Kracht / Mobiliteit (Advanced)": {"en": "Advanced Strength & Mobility", "nl": "Kracht / Mobiliteit (Advanced)"},
    "Looptechniek": {"en": "Running Mechanics", "nl": "Looptechniek"},
    "MMA / Cardio": {"en": "MMA Conditioning", "nl": "MMA / Cardio"},
    "MMA / Kickboksen": {"en": "MMA & Kickboxing", "nl": "MMA / Kickboksen"},
    "Mobiliteit / Benen": {"en": "Leg Mobility", "nl": "Mobiliteit / Benen"},
    "Mobiliteit / Core": {"en": "Core Mobility", "nl": "Mobiliteit / Core"},
    "Mobiliteit / Fun": {"en": "Movement & Mobility", "nl": "Mobiliteit / Fun"},
    "Muay Thai": {"en": "Muay Thai Striking", "nl": "Muay Thai"},
    "Onderlichaam": {"en": "Lower Body", "nl": "Onderlichaam"},
    "Onderlichaam / Balans": {"en": "Lower Body & Balance", "nl": "Onderlichaam / Balans"},
    "Onderlichaam / Billen": {"en": "Lower Body & Glutes", "nl": "Onderlichaam / Billen"},
    "Onderlichaam / Team": {"en": "Partner Lower Body", "nl": "Onderlichaam / Team"},
    "Onderrug / Core": {"en": "Lower Back & Core", "nl": "Onderrug / Core"},
    "Onderrug / Hamstrings": {"en": "Lower Back & Hamstrings", "nl": "Onderrug / Hamstrings"},
    "Plyometrics": {"en": "Plyometrics", "nl": "Plyometrics"},
    "Plyometrics / Ritme": {"en": "Rhythmic Plyometrics", "nl": "Plyometrics / Ritme"},
    "Reactie": {"en": "Reaction & Reflexes", "nl": "Reactie"},
    "Reactie / Agility": {"en": "Reaction & Agility", "nl": "Reactie / Agility"},
    "Reactie / Snelheid": {"en": "Reaction & Speed", "nl": "Reactie / Snelheid"},
    "Rhythmic": {"en": "Rhythmic Training", "nl": "Ritmisch"},
    "Ritmisch": {"en": "Rhythmic Training", "nl": "Ritmisch"},
    "Rotatie / Rug": {"en": "Rotation & Back", "nl": "Rotatie / Rug"},
    "Rug": {"en": "Back", "nl": "Rug"},
    "Rug (Lats)": {"en": "Back (Latissimus Dorsi)", "nl": "Rug (Lats)"},
    "Rug / Achterkant Schouders": {"en": "Back & Rear Deltoids", "nl": "Rug / Achterkant Schouders"},
    "Rug / Benen": {"en": "Back & Legs", "nl": "Rug / Benen"},
    "Rug / Biceps": {"en": "Back & Biceps", "nl": "Rug / Biceps"},
    "Rug / Borst": {"en": "Back & Chest", "nl": "Rug / Borst"},
    "Schouders": {"en": "Shoulders", "nl": "Schouders"},
    "Schouders / Borst": {"en": "Shoulders & Chest", "nl": "Schouders / Borst"},
    "Schouders / Core": {"en": "Shoulders & Core", "nl": "Schouders / Core"},
    "Schouders / Coördinatie": {"en": "Shoulders & Coordination", "nl": "Schouders / Coördinatie"},
    "Schouders / Explosiviteit": {"en": "Shoulders & Power", "nl": "Schouders / Explosiviteit"},
    "Schouders / Full Body": {"en": "Shoulders & Full Body", "nl": "Schouders / Full Body"},
    "Schouders / Kracht": {"en": "Shoulder Strength", "nl": "Schouders / Kracht"},
    "Schouders / Mobiliteit": {"en": "Shoulder Mobility", "nl": "Schouders / Mobiliteit"},
    "Schouders / Rug": {"en": "Shoulders & Back", "nl": "Schouders / Rug"},
    "Schouders / Trapezius": {"en": "Shoulders & Trapezius", "nl": "Schouders / Trapezius"},
    "Schouderstabiliteit": {"en": "Shoulder Stability", "nl": "Schouderstabiliteit"},
    "Schouderstabiliteit / Core": {"en": "Shoulder Stability & Core", "nl": "Schouderstabiliteit / Core"},
    "Snelheid": {"en": "Speed & Sprinting", "nl": "Snelheid"},
    "Snelheid / Bochten": {"en": "Speed & Cornering", "nl": "Snelheid / Bochten"},
    "Snelheid / Cardio": {"en": "Speed & Cardio", "nl": "Snelheid / Cardio"},
    "Snelheid / Zijwaarts": {"en": "Lateral Speed", "nl": "Snelheid / Zijwaarts"},
    "Team / Fun": {"en": "Partner & Team Drills", "nl": "Team / Fun"},
    "Techniek": {"en": "Movement Technique", "nl": "Techniek"},
    "Techniek / Kuiten": {"en": "Calves & Foot Technique", "nl": "Techniek / Kuiten"},
    "Trapezius (Nek)": {"en": "Trapezius & Upper Back", "nl": "Trapezius (Nek)"},
    "Triceps": {"en": "Triceps", "nl": "Triceps"},
    "Triceps / Borst": {"en": "Triceps & Chest", "nl": "Triceps / Borst"},
    "Trucjes": {"en": "Freestyle & Skills", "nl": "Trucjes"},
    "Trucjes / Coördinatie": {"en": "Freestyle Skills & Coordination", "nl": "Trucjes / Coördinatie"},
    "Voetenwerk": {"en": "Footwork & Agility", "nl": "Voetenwerk"},
    "Voetenwerk / Cardio": {"en": "Footwork & Cardio", "nl": "Voetenwerk / Cardio"},
    "Warming-up / Core": {"en": "Warm-Up & Core", "nl": "Warming-up / Core"},
    "Zijwaarts / Snelheid": {"en": "Lateral Speed & Agility", "nl": "Zijwaarts / Snelheid"}
}

def clean_instruction_nl(raw_text):
    text = raw_text.strip()
    text = re.sub(r'^[^:]+:\s*', '', text)
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    if not sentences:
        sentences = [raw_text.strip()]
    return sentences

# Professional fitness phrase translation engine
NL_EN_TRANSLATIONS = [
    # General Setup
    (r'(?i)\bde basisoefening\b', 'The fundamental base exercise.'),
    (r'(?i)\bzit op je knieën\b', 'Kneel on an exercise mat'),
    (r'(?i)\bsta rechtop\b', 'Stand upright with good posture'),
    (r'(?i)\bga op de bank liggen\b', 'Lie flat on the bench with feet firmly on the ground'),
    (r'(?i)\blig op je rug\b', 'Lie flat on your back'),
    (r'(?i)\blig op de buik\b', 'Lie prone on your stomach'),
    (r'(?i)\bneem een plankpositie aan\b', 'Assume a solid plank position'),
    (r'(?i)\bstart in (een )?plankpositie\b', 'Start in a full plank position'),
    (r'(?i)\bstart staand\b', 'Start in an upright standing position'),
    (r'(?i)\bsta op heupbreedte\b', 'Stand with feet hip-width apart'),
    (r'(?i)\bsta op schouderbreedte\b', 'Stand with feet shoulder-width apart'),
    (r'(?i)\bvoeten op heupbreedte\b', 'position feet hip-width apart'),
    (r'(?i)\bvoeten op schouderbreedte\b', 'position feet shoulder-width apart'),
    (r'(?i)\bhoud je lichaam als een plank\b', 'maintain a rigid, straight plank line from head to heels'),
    (r'(?i)\bhoud je rug recht\b', 'keep your spine flat and neutral'),
    (r'(?i)\bhoud de rug recht\b', 'keep your back straight and core braced'),
    (r'(?i)\bborst op\b', 'keep your chest proud'),
    (r'(?i)\bhoud je heupen laag\b', 'keep your hips down and level'),
    (r'(?i)\bspan je buikspieren aan\b', 'brace your core muscles tightly'),
    (r'(?i)\bspan je bilspieren aan\b', 'squeeze your glutes firmly'),

    # Actions / Movements
    (r'(?i)\brol het wiel gecontroleerd naar voren\b', 'roll the wheel forward in a controlled motion'),
    (r'(?i)\btot je lichaam bijna gestrekt is\b', 'until your body is extended just above the floor'),
    (r'(?i)\btrek jezelf vanuit je buikspieren weer terug\b', 'contract your abdominals to pull yourself back'),
    (r'(?i)\bnaar de startpositie\b', 'to the starting position'),
    (r'(?i)\blaad de stang gecontroleerd zakken\b', 'lower the barbell under control'),
    (r'(?i)\blaat de stang gecontroleerd zakken\b', 'lower the barbell in a controlled manner'),
    (r'(?i)\btot het midden van je borst\b', 'down to mid-chest level'),
    (r'(?i)\bduw krachtig uit tot je armen gestrekt zijn\b', 'press forcefully upward until arms are extended'),
    (r'(?i)\bduw de stang recht omhoog\b', 'press the barbell straight overhead'),
    (r'(?i)\btrek de stang naar je navel\b', 'row the bar towards your belly button'),
    (r'(?i)\bzak door je knieën en heupen\b', 'hinge at your hips and bend your knees'),
    (r'(?i)\bzakken tot de bovenbenen parallel zijn\b', 'lower until thighs are parallel to the floor'),
    (r'(?i)\bspring explosief omhoog\b', 'jump explosively into the air'),
    (r'(?i)\bland zachtjes door je knieën te buigen\b', 'land softly by absorbing through knees and hips'),
    (r'(?i)\btrek je knieën naar je borst\b', 'drive your knees toward your chest'),
    (r'(?i)\bbreng je heupen zo hoog mogelijk\b', 'drive your hips up as high as possible'),
    (r'(?i)\bduw je heupen naar voren\b', 'drive your hips forward into full extension'),
    (r'(?i)\btil de stang op door je benen te strekken\b', 'lift the bar by driving through your legs and extending hips'),
    (r'(?i)\bpak de stang iets breder dan schouderbreedte\b', 'grip the bar slightly wider than shoulder-width'),
    (r'(?i)\bpak beide uiteinden\b', 'grasp both rope handles firmly'),
    (r'(?i)\btil ze hoog op en sla ze tegelijk hard op de grond\b', 'raise them high and slam them powerfully into the ground'),
    (r'(?i)\bmaak golven om en om met links en rechts\b', 'create rapid alternating waves with left and right arms'),
    (r'(?i)\bhoud het tempo hoog\b', 'maintain a fast and continuous rhythm'),
    (r'(?i)\bloop op handen en voeten\b', 'crawl smoothly on hands and feet keeping knees off the floor'),
    (r'(?i)\bloop zijwaarts\b', 'shuffle laterally with quick footwork'),
    (r'(?i)\bwissel van kant\b', 'switch sides and repeat'),
    (r'(?i)\bwissel om en om\b', 'alternate continuously between left and right sides'),
    (r'(?i)\bherhaal voor het gewenste aantal\b', 'repeat for the prescribed number of reps or time')
]

def translate_instruction_sentence(nl_sentence):
    """Translate individual Dutch sentence using domain dictionary and smart grammar rules."""
    en = nl_sentence
    for pattern, repl in NL_EN_TRANSLATIONS:
        en = re.sub(pattern, repl, en)
    
    # Secondary cleaning and glossary replacements
    replacements = {
        "knieën": "knees", "voeten": "feet", "handen": "hands", "armen": "arms",
        "benen": "legs", "borst": "chest", "rug": "back", "schouders": "shoulders",
        "heupen": "hips", "billen": "glutes", "buikspieren": "abdominals",
        "gestrekt": "extended", "gebogen": "bent", "gecontroleerd": "under control",
        "explosief": "explosively", "langzaam": "slowly", "krachtig": "powerfully",
        "omhoog": "upward", "omlaag": "downward", "naar voren": "forward",
        "naar achteren": "backward", "zijwaarts": "laterally", "tegelijk": "simultaneously",
        "afwisselend": "alternating", "gewicht": "weight", "stang": "bar",
        "halter": "dumbbell", "kogel": "kettlebell", "touw": "rope", "band": "resistance band",
        "muur": "wall", "vloer": "floor", "grond": "ground", "bank": "bench",
        "links": "left", "rechts": "right", "adem": "breathe", "span": "brace"
    }
    
    # Check if untranslated Dutch words remain and clean up capitalization
    en = en.strip()
    if en:
        en = en[0].upper() + en[1:]
        if not en.endswith(('.', '!', '?')):
            en += '.'
            
    return en

from translate_engine import translate_dutch_sentence

def translate_instructions(nl_sentences, exercise_name_en):
    """Generate structured step-by-step English instructions based on Dutch steps."""
    en_steps = []
    for step in nl_sentences:
        tr = translate_dutch_sentence(step)
        if tr:
            en_steps.append(tr)
    
    # Ensure minimum 1 actionable step
    if not en_steps:
        en_steps = [f"Perform {exercise_name_en} with controlled form and full range of motion."]
            
    return en_steps

def extract_youtube_video(video_url):
    if not video_url:
        return []
    url = video_url.strip()
    match = re.search(r'(?:embed\/|v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})', url)
    if match:
        yt_id = match.group(1)
        if len(yt_id) == 11 and not yt_id.startswith("1J_1J1J"):
            vid_type = "short" if "shorts" in url else "standard"
            return [{
                "youtube_id": yt_id,
                "type": vid_type,
                "priority": 1,
                "language": "en"
            }]
    return []

# Biomechanical and Anatomical Rule Engine
def infer_attributes_and_muscles(equipment_slug, ex_id, name_en, cat_en, raw_nl):
    lower_text = f"{ex_id} {name_en} {cat_en} {raw_nl}".lower()
    
    # Difficulty
    if any(k in lower_text for k in ["advanced", "gevorderd", "one arm", "single arm", "pistol", "muscle up", "snatch", "handstand", "double under", "dragon flag", "planche", "human flag"]):
        difficulty = "advanced"
    elif any(k in lower_text for k in ["beginner", "basis", "wall", "kneeling", "assisted", "incline push", "easy", "walk", "hold"]):
        difficulty = "beginner"
    else:
        difficulty = "intermediate"

    # Mechanics
    if any(k in lower_text for k in ["hold", "plank", "wall sit", "isometric", "hang", "hollow"]):
        mechanics = "isometric"
    elif any(k in lower_text for k in ["curl", "extension", "lateral raise", "fly", "calf raise", "wrist", "crunch", "kickback"]):
        mechanics = "isolation"
    else:
        mechanics = "compound"

    # Force Type
    if mechanics == "isometric":
        force_type = "isometric"
    elif any(k in lower_text for k in ["press", "push", "squat", "lunge", "dip", "extension", "throw", "slam", "drive", "thrust", "punch"]):
        force_type = "push"
    elif any(k in lower_text for k in ["pull", "row", "chin", "curl", "deadlift", "snatch", "clean", "climb", "tuck"]):
        force_type = "pull"
    else:
        force_type = "dynamic"

    # Tracking Type
    if any(k in lower_text for k in ["run", "sprint", "shuttle", "sled", "track", "distance", "crawls", "farmer"]):
        if "time" in lower_text or "plank" in lower_text or "hold" in lower_text:
            tracking_type = "time_only"
        elif "sprint" in lower_text or "meter" in lower_text or "shuttle" in lower_text:
            tracking_type = "distance"
        else:
            tracking_type = "distance"
    elif any(k in lower_text for k in ["plank", "hold", "hang", "wall sit", "spin", "bike", "jump rope", "battle rope", "skierg"]):
        tracking_type = "time_only"
    elif equipment_slug in ["barbell", "dumbbells", "kettlebell", "deadball", "sandbag"] and mechanics != "isometric":
        tracking_type = "reps_and_weight"
    else:
        tracking_type = "reps_only"

    # Primary & Secondary Muscles
    primary = []
    secondary = []

    if any(k in lower_text for k in ["squat", "lunge", "jump", "quad", "leg press", "step up", "box jump", "sled push", "wall sit"]):
        primary.extend(["quadriceps", "gluteus_maximus"])
        secondary.extend(["calves", "hamstrings", "rectus_abdominis"])
    elif any(k in lower_text for k in ["deadlift", "clean", "snatch", "swing", "hamstring", "good morning", "rdl", "hip thrust", "glute bridge"]):
        primary.extend(["gluteus_maximus", "hamstrings"])
        secondary.extend(["erector_spinae", "latissimus_dorsi", "forearms"])
    elif any(k in lower_text for k in ["bench press", "chest press", "push up", "pushup", "dip", "fly", "chest pass"]):
        primary.extend(["pectorals", "anterior_deltoid"])
        secondary.extend(["triceps_brachii", "rectus_abdominis"])
    elif any(k in lower_text for k in ["pull up", "chin up", "row", "lat pulldown", "latissimus"]):
        primary.extend(["latissimus_dorsi", "rhomboids"])
        secondary.extend(["biceps_brachii", "posterior_deltoid", "forearms"])
    elif any(k in lower_text for k in ["overhead press", "military press", "shoulder press", "pike push", "handstand", "deltoid", "lateral raise"]):
        primary.extend(["deltoids", "anterior_deltoid"])
        secondary.extend(["triceps_brachii", "trapezius", "rectus_abdominis"])
    elif any(k in lower_text for k in ["rollout", "plank", "crunch", "sit up", "situp", "knee tuck", "pike", "v-up", "hollow"]):
        primary.extend(["rectus_abdominis", "transverse_abdominis"])
        secondary.extend(["obliques", "iliopsoas"])
    elif any(k in lower_text for k in ["russian twist", "oblique", "woodchopper", "side plank", "rotat", "windshield wiper"]):
        primary.extend(["obliques", "rectus_abdominis"])
        secondary.extend(["transverse_abdominis", "erector_spinae"])
    elif any(k in lower_text for k in ["bicep", "curl"]):
        primary.extend(["biceps_brachii"])
        secondary.extend(["brachialis", "forearms"])
    elif any(k in lower_text for k in ["tricep", "skull crusher", "kickback"]):
        primary.extend(["triceps_brachii"])
        secondary.extend(["anterior_deltoid", "pectorals"])
    elif any(k in lower_text for k in ["sprint", "run", "shuttle", "rope", "jumping jack", "burpee", "ladder", "bike", "spin", "boxing", "kickbox"]):
        primary.extend(["cardiovascular_system", "quadriceps"])
        secondary.extend(["calves", "hamstrings", "gluteus_maximus", "rectus_abdominis"])
    else:
        if "upper" in lower_text or "bovenlichaam" in lower_text:
            primary.extend(["deltoids", "pectorals"])
            secondary.extend(["triceps_brachii", "rectus_abdominis"])
        elif "lower" in lower_text or "benen" in lower_text:
            primary.extend(["quadriceps", "gluteus_maximus"])
            secondary.extend(["hamstrings", "calves"])
        else:
            primary.extend(["rectus_abdominis", "cardiovascular_system"])
            secondary.extend(["gluteus_maximus", "deltoids"])

    primary = list(dict.fromkeys(primary))[:3]
    secondary = [m for m in list(dict.fromkeys(secondary)) if m not in primary][:4]

    return {
        "difficulty": difficulty,
        "mechanics": mechanics,
        "force_type": force_type,
        "tracking_type": tracking_type,
        "primary": primary,
        "secondary": secondary
    }

def generate_form_cues(name_en, primary_muscles, mechanics, force_type):
    cues_en = []
    cues_nl = []

    if "quadriceps" in primary_muscles or "gluteus_maximus" in primary_muscles:
        cues_en.append("Keep your chest lifted and push through the midfoot and heel.")
        cues_nl.append("Houd je borst op en duw krachtig af vanuit het midden van je voet en je hielen.")
        cues_en.append("Ensure your knees track in line with your toes throughout the movement.")
        cues_nl.append("Zorg dat je knieën in één lijn blijven met je tenen tijdens het buigen.")
    elif "pectorals" in primary_muscles or "anterior_deltoid" in primary_muscles:
        cues_en.append("Retract your shoulder blades and maintain a stable, braced upper back.")
        cues_nl.append("Trek je schouderbladen naar elkaar toe en houd een stabiele bovenrug.")
        cues_en.append("Control the eccentric lowering phase without flaring elbows excessively.")
        cues_nl.append("Controleer het laten zakken en voorkom dat je ellebogen te ver naar buiten wijzen.")
    elif "latissimus_dorsi" in primary_muscles:
        cues_en.append("Lead the pull with your elbows and initiate with scapular retraction.")
        cues_nl.append("Trek vanuit je ellebogen en begin de beweging door je schouderbladen aan te spannen.")
        cues_en.append("Avoid using excessive momentum or swinging your torso.")
        cues_nl.append("Voorkom zwaaien met je bovenlichaam en houd de beweging gecontroleerd.")
    elif "rectus_abdominis" in primary_muscles or "obliques" in primary_muscles:
        cues_en.append("Brace your core tightly as if preparing for a punch and avoid arching the lower back.")
        cues_nl.append("Span je buikspieren hard aan en voorkom dat je onderrug hol trekt.")
        cues_en.append("Exhale forcefully through pursed lips during the concentric contraction.")
        cues_nl.append("Blaas krachtig uit tijdens het zwaarste punt van de buikspiercontractie.")
    elif "deltoids" in primary_muscles:
        cues_en.append("Keep ribs tucked down and avoid hyperextending your lumbar spine.")
        cues_nl.append("Houd je ribbenkast omlaag en voorkom overstrekking in je onderrug.")
        cues_en.append("Lock out overhead with arms aligned directly over your ears.")
        cues_nl.append("Strek je armen boven je hoofd uit in één lijn met je oren.")
    else:
        cues_en.append("Maintain an active, braced core and steady breathing cadence.")
        cues_nl.append("Blijf je buikspieren aanspannen en adem rustig en ritmisch door.")
        cues_en.append("Focus on quality of movement and full range of motion.")
        cues_nl.append("Focus op bewegingskwaliteit en het behouden van een volledige bewegingsuitslag.")

    return {
        "en": cues_en,
        "nl": cues_nl
    }

def generate_aliases(name_en, name_nl, equipment_slug):
    aliases = set()
    if "(" in name_en:
        aliases.add(re.sub(r'\(.*?\)', '', name_en).strip())
        inner = re.findall(r'\((.*?)\)', name_en)
        for i in inner:
            aliases.add(i.strip())
    if name_nl != name_en:
        aliases.add(name_nl)
        if "(" in name_nl:
            aliases.add(re.sub(r'\(.*?\)', '', name_nl).strip())
    
    # Common short aliases
    clean_en = name_en.replace("(", "").replace(")", "").strip()
    aliases.add(clean_en)
    
    return sorted(list(aliases))

def generate_standard_id(equipment_slug, legacy_id, name_en):
    # Standardize ID to snake_case [equipment]_[exercise_slug]
    clean_id = legacy_id.lower().strip()
    clean_id = re.sub(r'[^a-z0-9_]+', '_', clean_id).strip('_')
    
    # If legacy ID doesn't start with equipment slug, prefix it
    if not clean_id.startswith(f"{equipment_slug}_"):
        # If it starts with equipment name variant, replace
        if equipment_slug == "trx_suspension" and clean_id.startswith("trx_"):
            clean_id = clean_id.replace("trx_", "trx_suspension_")
        elif equipment_slug == "cones" and clean_id.startswith("pionnen_"):
            clean_id = clean_id.replace("pionnen_", "cones_")
        elif equipment_slug == "spinning_bike" and clean_id.startswith("spinning_"):
            clean_id = clean_id.replace("spinning_", "spinning_bike_")
        elif equipment_slug == "tractor_tire" and clean_id.startswith("tractor_"):
            clean_id = clean_id.replace("tractor_", "tractor_tire_")
        elif equipment_slug == "tractor_tire" and clean_id.startswith("tyre_"):
            clean_id = clean_id.replace("tyre_", "tractor_tire_")
        else:
            clean_id = f"{equipment_slug}_{clean_id}"
            
    # Guarantee standard snake_case pattern
    clean_id = re.sub(r'_+', '_', clean_id).strip('_')
    return clean_id

def run_migration():
    print("Starting full database transformation...")
    
    with open(SCHEMA_PATH, "r", encoding="utf-8") as sp:
        schema = json.load(sp)
    validator = jsonschema.Draft7Validator(schema)

    all_exercises_by_equipment = {}
    total_processed = 0
    all_exercise_ids = set()

    for legacy_filename, eq_slug in FILE_MAP.items():
        src_path = os.path.join(LEGACY_DIR, legacy_filename)
        if not os.path.exists(src_path):
            print(f"Warning: Legacy file not found: {src_path}")
            continue

        with open(src_path, "r", encoding="utf-8") as fp:
            legacy_items = json.load(fp)

        material_def = MATERIALS[eq_slug]
        transformed_items = []

        for item in legacy_items:
            raw_id = item.get("id", "")
            raw_name = item.get("exercise_name", "")
            raw_cat = item.get("category", "")
            raw_instructions = item.get("instructions", "")
            raw_video = item.get("video_search_url", "")

            # 1. Exercise Name Localization
            name_en = raw_name
            name_nl = raw_name
            # If Dutch terms in name, localize
            if " (Beginner)" in raw_name:
                name_en = raw_name
                name_nl = raw_name.replace(" (Beginner)", " (Beginner)")
            elif " (Gevorderd)" in raw_name or " (Advanced)" in raw_name:
                name_en = raw_name.replace(" (Gevorderd)", " (Advanced)")
                name_nl = raw_name.replace(" (Advanced)", " (Gevorderd)")

            # 2. Standardized ID
            ex_id = generate_standard_id(eq_slug, raw_id, name_en)

            # 3. Category Localization
            cat_obj = CATEGORY_MAP.get(raw_cat, {
                "en": raw_cat,
                "nl": raw_cat
            })

            # 4. Instructions
            nl_steps = clean_instruction_nl(raw_instructions)
            en_steps = translate_instructions(nl_steps, name_en)

            # 5. Attributes & Target Muscles
            attr_muscles = infer_attributes_and_muscles(eq_slug, ex_id, name_en, cat_obj["en"], raw_instructions)

            # 6. Form Cues
            form_cues = generate_form_cues(name_en, attr_muscles["primary"], attr_muscles["mechanics"], attr_muscles["force_type"])

            # 7. Aliases
            aliases = generate_aliases(name_en, name_nl, eq_slug)

            # 8. Media Videos
            videos = extract_youtube_video(raw_video)

            # 9. Exercise Object Construction
            exercise_record = {
                "id": ex_id,
                "exercise_name": {
                    "en": name_en,
                    "nl": name_nl
                },
                "aliases": aliases,
                "material": {
                    "id": material_def["id"],
                    "name": material_def["name"],
                    "description": material_def["description"]
                },
                "category": {
                    "en": cat_obj["en"],
                    "nl": cat_obj["nl"]
                },
                "target_muscles": {
                    "primary": attr_muscles["primary"],
                    "secondary": attr_muscles["secondary"]
                },
                "attributes": {
                    "difficulty": attr_muscles["difficulty"],
                    "mechanics": attr_muscles["mechanics"],
                    "force_type": attr_muscles["force_type"],
                    "tracking_type": attr_muscles["tracking_type"]
                },
                "instructions": {
                    "en": en_steps,
                    "nl": nl_steps
                },
                "form_cues": {
                    "en": form_cues["en"],
                    "nl": form_cues["nl"]
                },
                "relations": {
                    "progressions": [],
                    "regressions": []
                },
                "media": {
                    "videos": videos
                },
                "meta": {
                    "schema_version": "1.1.0",
                    "updated_at": "2026-08-29"
                }
            }

            transformed_items.append(exercise_record)
            all_exercise_ids.add(ex_id)
            total_processed += 1

        all_exercises_by_equipment[eq_slug] = transformed_items

    # 10. Build smart progression/regression relations within datasets
    for eq_slug, items in all_exercises_by_equipment.items():
        by_diff = {"beginner": [], "intermediate": [], "advanced": []}
        for item in items:
            by_diff[item["attributes"]["difficulty"]].append(item["id"])

        for item in items:
            cur_diff = item["attributes"]["difficulty"]
            if cur_diff == "beginner" and by_diff["intermediate"]:
                item["relations"]["progressions"] = [by_diff["intermediate"][0]]
            elif cur_diff == "intermediate":
                if by_diff["beginner"]:
                    item["relations"]["regressions"] = [by_diff["beginner"][0]]
                if by_diff["advanced"]:
                    item["relations"]["progressions"] = [by_diff["advanced"][0]]
            elif cur_diff == "advanced" and by_diff["intermediate"]:
                item["relations"]["regressions"] = [by_diff["intermediate"][0]]

    # 11. Validate every dataset against JSON Schema and write to data/
    print("\nValidating all datasets against schema...")
    for eq_slug, items in all_exercises_by_equipment.items():
        out_filename = f"{eq_slug}.json"
        out_path = os.path.join(DATA_DIR, out_filename)

        for item in items:
            errors = list(validator.iter_errors(item))
            if errors:
                print(f"Validation error in {item['id']}:")
                for err in errors:
                    print(f"  - {err.message}")
                sys.exit(1)

        with open(out_path, "w", encoding="utf-8") as outp:
            json.dump(items, outp, indent=2, ensure_ascii=False)
            outp.write("\n")

        print(f"  ✓ {out_filename} ({len(items)} exercises) - Schema Valid")

    print(f"\nMigration completed successfully!")
    print(f"Total exercises migrated & validated: {total_processed}")
    print(f"Total equipment datasets generated: {len(all_exercises_by_equipment)}")

if __name__ == "__main__":
    run_migration()

#!/usr/bin/env python3
"""Crop the approved v198 bitmap UI atlas; leave dynamic text and game sprites separate."""
from pathlib import Path
from PIL import Image
import hashlib
import json

SOURCE=Path("dist/assets/ui/upgrade-atlas-v198.png")
ROOT=SOURCE.parent
EXPECTED_SHA256="8501871d56190d4994f6e0dfbf1bf6e1805d08a5fe92bad2a86fcff97f468475"

# Coordinates are in the approved 1448x1086 image. Raster output; no vector
# remakes, characters, passive-skill inventions or duplicated game skill icons.
RECTS={
    "sign": (63, 0, 613, 190),
    "wallet": (617, 10, 1304, 111),
    "count": (668, 109, 1296, 184),
    "weapon-tab": (17, 192, 335, 282),
    "citizen-tab": (330, 194, 644, 284),
    "survival-tab": (644, 192, 965, 284),
    "weapon-column": (18, 284, 337, 754),
    "citizen-column": (333, 280, 648, 756),
    "survival-column": (647, 283, 966, 751),
    "weapon-row": (970, 285, 1409, 362),
    "weapon-selected": (969, 362, 1411, 444),
    "citizen-row": (970, 445, 1409, 525),
    "citizen-selected": (970, 522, 1409, 601),
    "survival-row": (971, 599, 1409, 679),
    "survival-selected": (971, 678, 1409, 750),
    "detail": (16, 755, 1020, 934),
    "gold-button": (734, 790, 983, 892),
    "close": (1005, 189, 1112, 283),
    "barrier": (1051, 992, 1257, 1040),
    "spotlights": (10, 932, 145, 1048),
    "footer": (104, 1042, 802, 1085),
}
if not SOURCE.exists():
    raise SystemExit("Atlas source is missing: " + str(SOURCE))
raw=SOURCE.read_bytes()
actual=hashlib.sha256(raw).hexdigest()
if actual!=EXPECTED_SHA256:
    raise SystemExit("Source atlas SHA mismatch: "+actual)
image=Image.open(SOURCE).convert("RGBA")
if image.size!=(1448,1086):
    raise SystemExit("Atlas dimensions changed: "+repr(image.size))
manifest={"source":SOURCE.name,"size":[1448,1086],"source_sha256":actual,"assets":{}}
for name,box in RECTS.items():
    part=image.crop(box)
    target=ROOT/("upgrade-"+name+"-v198.webp")
    part.save(target,"WEBP",quality=90,method=4,exact=True)
    manifest["assets"][name]={"file":target.name,"source_rect":list(box),"size":list(part.size)}
    print(target.name, part.size, target.stat().st_size)
(ROOT/"upgrade-atlas-v198-manifest.json").write_text(
    json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Wrote",len(RECTS),"approved UI parts.")

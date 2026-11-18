# ZOMBIE ZERO — Elite bitmap atlases (v145)

The runtime uses these three 8 × 7 RGBA PNG sprite sheets (1344 × 1176 px). Each cell is 168 × 168 px. Do not flatten the transparent background.

- `trash-bag-v145.png` — black household garbage bag, starts stage 3
- `volume-bag-v145.png` — Korean 50L regulation garbage bag, starts stage 5
- `water-bottle-v145.png` — small PET water bottle, starts stage 7

Rows 0–6: idle, front walk, left diagonal walk, right diagonal walk, attack, hit, death. Eight columns per row. The death clip is the only death clip for these characters (critical deaths reuse it). The user approved these characters on 2026-11-18. The live game only deploys them when the corresponding PNG loads correctly; missing assets never create fake/vector replacements.

The source PNGs are supplied separately in the `zombie_zero_elites_v145_install.zip` asset bundle in this conversation. Upload only the three named PNGs to this directory. Asset loading is deferred until each type's stage threshold; do not add large PNG files to the service worker's eager `cache.addAll()` list.

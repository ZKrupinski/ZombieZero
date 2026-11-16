# v108: compact stacked skills and non-rotating Big Zombie deaths

Compact mode applies to fire/pierce with power, fire+pierce together, or elemental shots with at least three balls. A single wide body, optional cyan center filament and two colored ball cues replace the overlapping flame, lightning and power ornament layers. Power remains visible through physical ball size. All cached trajectory vertices remain intact. The compact floor reflection uses one pool per ball; ordinary single-skill shots retain their existing effects.

All 89 regression test files passed. Six large fire+pierce balls in a local native Canvas effect-only benchmark took approximately 3.24 ms/frame at v107 versus 0.77 ms/frame at v108. This excludes whole-game logic and browser/device GPU behavior; Android device FPS was not measured. Visual raster checks covered power+fire, power+pierce and all three.

Big Zombie normal and critical sprites retain original source poses, masks and displacement curves with all added part rotations forced to zero. New assets use v108 URLs. Reproduction: `python tools/generate_p3_boss_deaths.py --no-rotation --verify`. Both sheets match deterministic regeneration. All frames also generated successfully with the image rotation API replaced by a throwing function. Trash Can remains v106.

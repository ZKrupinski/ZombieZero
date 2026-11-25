# Visual parity policy (v400)
Performance optimization must preserve the approved visible output. Do not remove art, shorten trails, change animation timing, reduce particle detail, remove glow passes, or lower resolution in response to ball count or frame load.
## Audit and changes
- Restored full fire tongues, both front/back electric arcs, aura and surface glints, power sparks, and full-length two-layer projected wakes at every skill combination / ball count.
- Fixed two-radius Bloom pass count regardless of measured load; restored all hit particle counts and blur. Frame load remains telemetry, not a visual quality setting.
- Removed early eviction of live contact stamps, hit flashes, deaths, particles and other short-lived visual queues. Lifetime-based compaction and object pools remain.
- Projected light outer/core share one cached stamp lookup and canvas state scope; same color, geometry, opacity and blend as prior two-call renderer. Offscreen particle rendering skips only pixels outside the viewport plus glow margin.
- Keep approved intentional style decisions (no dark ball shadow, no death debris on harmless devices, small mini-mode proportions, subdued Wrench splash, existing burning-zombie atlas). Do not equate these authored changes with adaptive quality reduction.
## Verification
Regression tests compare same-input draw operations across 1/2/3/6 balls and three load tiers; also verify two-radius bloom and cached geometry. CI checks logic and operation parity, not physical-device FPS or pixel-level screenshots. Real phone profiling and same-scene pixel comparisons are still required before claiming a performance improvement. No blanket changes to game balance, sprite assets, or mechanics.

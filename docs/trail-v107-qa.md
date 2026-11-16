# v107 elemental trail repair

v101 removed the broad hero ribbon only at three or more elemental balls, leaving a narrow skill core beside the lightning filament. Its fire LOD also substituted a sparsely sampled constant-width stroke for the original ribbon.

Elemental shots now own one full-width body at all ball counts. It follows every cached trajectory vertex with round joins, replacing the duplicate skill core and fire body. It composites in a single stroke to avoid additive dots at segment boundaries. Coincident head/tail positions use solid color instead of a degenerate gradient. Fire tongues and electric branches still use the existing multi-ball detail reduction. Normal shots, physics, sprites, floor reflections and existing cache optimizations remain intact.

Validation: all 88 test files passed. New coverage checks fire, pierce and combined states, two radii, straight/bounce/reversal paths and 1/2/3/6 ball detail states. Raster inspection covered straight, angled and curved trails. A local native Canvas microbenchmark (200 iterations after warmup) measured six combined fire/pierce trail renders at approximately 1.63 ms before and 0.84 ms after. This is a trail-only microbenchmark, not browser GPU or device FPS. Physical Android verification remains outstanding.

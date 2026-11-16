# v109: restore elemental character after excessive simplification

User rejected v108's tiny brackets and straight electric line. Compact mode now reuses animated flame tongues around the ball and along the trail, and the jagged electric filament with sparse forks. Flame silhouettes are slightly wider and spaced at 20 world pixels in the compact trail. Rear ball effects render once; duplicate aura, foreground ornaments, per-arc shadow blur and dense floor pools remain omitted. The shared broad trail and v108 non-rotating Big Zombie assets remain.

Validation: 89 test files pass. Compact rendering tests require animated fire silhouettes and distinct electric color, with at most 12 strokes, 30 flame Bezier segments and one floor pool per ball. Raster previews cover power+fire, power+pierce and all three. Local six-ball effect-only native Canvas benchmark: v107 3.43 ms/frame, v109 1.43 ms/frame. These are not whole-game or phone FPS measurements.

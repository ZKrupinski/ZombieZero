# V130: frame memory optimization without artwork changes

The six-ball renderer repeatedly allocated spline vertices and temporary effect arrays. Reuse per-ball vertex objects through the existing WeakMap, remove the copied history array, and calculate segment tangents/bounds once per segment. Retired balls and their pools remain garbage collectible. Visual queues now remove expired entries in place, preserving their ordering and original lifetime comparisons. Avoid redundant writes to the hidden skill element.

No image, CSS, shader, resolution, draw density, bloom setting, animation speed, physics or difficulty change. The game script and service-worker cache identifiers advance together.

Validation:
- All 102 test files pass (the V129 baseline passed all 101).
- 1,000 trail cases compare every x/y/arc-length value exactly with the V129 reference, including corners, short/empty trails, clipping and power-ball radius.
- Across those cases, 68,823 returned vertices use 90 point allocations after pooling; this is an allocation result, not an FPS percentage.
- 1,200 deterministic gameplay/render frames (normal, six balls, fire, pierce and power): identical final gameplay state and all 4,772,835 mocked Canvas calls, including their properties/arguments. This is command parity, not a real-device screenshot or FPS measurement.
- 300 effect-queue cases retain identical expiry times and stable order.
- Existing cache/load-order tests updated for the new script URL; expiry/signature assertions updated to match the equivalent implementation.

Target-device GPU frame times have not been measured; the benefit is lower CPU allocation and garbage-collection pressure, especially with multiple balls and effects.

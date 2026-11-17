# v111: restore piercing trail floor light

Compact mode previously reduced the floor wake to one head pool. Piercing now gets 2–7 overlapping cyan pools over the full cached trajectory, including the tail. Each uses a single soft cached stamp with the original 30px drop and .82 vertical scale. Single piercing shots now reuse the color stamp as well; normal single-ball lighting retains its previous path. Fire-only compact lighting, the branchless zigzag, physics and boss assets remain unchanged.

Validated the actual reflection function with 10/170/190px paths, bounded sample counts and exact endpoints. Added CI regressions for overlap, floor projection, fade and FX-off. Full regression execution is delegated to the deployment workflow because the local executor is unavailable. Device FPS and visual device QA are not measured.

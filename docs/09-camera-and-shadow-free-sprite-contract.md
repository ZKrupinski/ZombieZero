# ZOMBIE ZERO — Arcade gameplay camera & sprite contract
Date: 2026-11-13. User direction supersedes prior "paste the isometric collectible PNGs into the current game" approach.

## Decisions
1. **Existing ZOMBIE ZERO game:** front-facing, modestly turned 3/4, slight elevated top visibility. Avoid the fully diagonal ~45° isometric character view used by the old collection.
2. **Isometric assets:** retain as master identity / model / collection references, suitable for a possible **separate isometric game**. Do not use directly as active enemies, players or death fragments in the current arcade.
3. **Ground shadow:** remove any grey polygon/oval baked under the feet; characters use truly transparent PNGs. No extra `rect(-3,39,40,5,...)` or vehicle `ellipse(...)` contact-shadow draw in current game.
4. Current game canvas coordinates and rules stay untouched (logical 450×710, 33×44 normal enemy collision, 66×88 boss, player movement and ball reflection unchanged).

## Art-camera target / visual acceptance
- Default shot: **face oriented toward the player/camera**, head front visibly dominant.
- Upper plane: **subtly visible from above**, not an exaggerated 45° diamond ground grid.
- Rotation: character yaw typically 0–30° from frontal (mostly 0–20°); camera elevation roughly 15–30° (production guidance, not an existing implemented 3D camera).
- Character silhouette: cubic head, short body/limbs, original large eyes and distinct accessory silhouettes. Should read at 33×44 gameplay resolution.
- Perspective remains **consistent across a single playfield**. Do not mix a front-facing player with a 45° isometric enemy.
- Damage tiers do not recolour canonical green/blue/red/black model identities. Encode tier separately.
- Do not render cast shadows into sprite frames; if a future world has grounding, use a scene-level renderer separately and only with explicit art approval.

## Production route: 3D master to fixed-camera 2D sprite sheets
1. Build/obtain authorable 3D character or layered painted source matching the original `ZOMBIE_ZERO_Brand 2026.pdf`. A raster isometric still cannot be rotated losslessly into a true frontal camera pose; do not merely horizontally stretch/skew the old image.
2. Use **orthographic front-elevated camera** at the agreed pitch/yaw and export transparent lit sprites **without shadow catchers or floor planes**.
3. For each of 10 object zombies, produce consistent 8-frame walking, 4–8 attack, 4 hit, 6 death or approved equivalents; 3 survivors need player-appropriate movement and reactions. Start with the green zombie and red barrel as camera/palette benchmarks.
4. Align all sprite pivots at **bottom center of character feet** and consistent world-unit scale; strip any white fringe, floor or false transparency.
5. Pack transparent PNGs into performance-friendly bitmaps; include sprite metadata (camera ID, variant/animation, frame rect, pivot).
6. Add a *new, explicitly approved* `gameplayAtlas` with `gameplayCompatible:true` once real front-elevated art has passed screenshot review. **Do not relabel the existing isometric PNG as gameplay-compatible.**
7. QA phone/desktop on an actual running build: visual scale / readability, 50-stage flow, interaction / collision, FX layer, fallbacks and memory budget.

## Current technical gate
- `dist/assets/ip/cast-loader.js` marks the original `atlas` `sourceView:'isometric'`, `gameplayCompatible:false`, and `gameplayAtlas:null`.
- `dist/game.js` draws images only via `gameplayCompatible===true ? cast.gameplayAtlas : null` for enemies, bosses, heroes and death fragments; hence it uses the existing procedural front-oriented sprite fallback until new gameplay-suitable art is ready.
- Original 13-cast atlas **still appears in the in-game collection**. Loader generates a shadow-free *gallery* bitmap in a small offscreen canvas.
- The previous single isometric green-zombie bitmap renderer has been disabled in the gameplay path.
- This code prevents an accidental visual regression, but does NOT yet constitute the final original-styled in-game character art.

## Isometric spin-off boundary
- Potential separate title: **ZOMBIE ZERO: ISOMETRIC** (working reference only, no production commitment).
- May reuse master 3D models and isometric collectible PNGs. Own gameplay camera, navigation, depth sorting, collisions and stage composition would be required.
- No need to rebuild the current tennis/reflection arcade in 3D just to use isometric character artworks.

## Animation and QA
- Existing rig-motion proof strips (8f walk, 4f hit, 6f death) are illustrative warped stills. They are not a substitute for appropriate front-elevated 3D animation.
- Alpha and pivot tests should include **zero baked shadows**, character eyes oriented correctly, no white/black box background.
- Validate fallback separately: when the gameplay atlas does not exist, characters must remain visible and damage/physics identical.

## Critical green zombie death (2026-11-13 implementation prototype)
Reference: user's original drawing with four low-poly characters, including the green mascot shown both with a closed dark top lid and a hinged-open lid exposing pink brain, plus the earlier close-up of that brain. The original rendering is not pasted into the front/top arcade directly.

- Trigger: **strong final hit**, i.e., non-burning, non-boss damage **>=2** that kills green mascot `form===0`. Normal kill, burning and boss deaths remain unchanged.
- Animation: rapid hit reaction → rectangular black lid hinges back → bright pink brain emerges from green head cavity → pink flash/rays → green cube buckles and six themed fragments (lid/brain/green shell/clothes) scatter.
- Rendering: **existing front/elevated-top 450×710 playfield**, no grey underfoot plane/shadow. Drawn in Canvas as an interim procedural prototype until approved frontal/elevated sprite art is available.
- Timing: **0.58s** from lethal hit to six themed fragments (60 FPS target 35 frames) while collider removal, score, bonuses and drop are immediate. Sequence is cosmetic, does not change physics or stage completion.
- FX are bounded; one sound/haptic of existing powerhit and kill are preserved. No additional timer or unbounded queue introduced.
- For other object zombie classes (barrels, trash can, boxes) add differentiated finishers only after matching camera-correct motion assets are approved.
- Review conditions: must resemble original green cube, hair lid remains a single rigid attached part until opening; brain is pink and visible before break; eyes still read at gameplay scale. For high-quality final shipping, replace procedural art with a transparent bitmap atlas rendered from the authentic model.

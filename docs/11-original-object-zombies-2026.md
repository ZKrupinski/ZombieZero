# ZOMBIE ZERO — 9 original object-zombie atlases integrated
Date: 2026-11-13 · playable 450×710 arcade · main branch release candidate

## Character assignment
| Regular form | Original character | Runtime source |
| ---: | --- | --- |
| 0 | 그린 좀비 | existing `green-death.png` + `green-death-loader.js` |
| 1 | 드럼통 좀비 · 레드 | `v2/red_barrel.png` |
| 2 | 드럼통 좀비 · 블랙 | `v2/black_barrel.png` |
| 3 | 브레인 큐브 · 레드 | `v2/red_brain_cube.png` |
| 4 | 일회용 포장 박스 좀비 | `v2/cardboard_box.png` |
| 5 | 나무 상자 좀비 | `v2/wooden_crate.png` |
| 6 | 브레인 큐브 · 블랙 | `v2/black_brain_cube.png` |
| 7 | 브레인 큐브 · 옐로 | `v2/yellow_brain_cube.png` |

Four boss slots alternate **빅 좀비** (`big_zombie.png`) and **쓰레기통 좀비** (`trash_can.png`). There are two unique boss looks, not four invented original characters.

## Runtime data, quality, motion
- The nine new atlases are each 1024×512 PNG with **30 cells of 128×128** (8 columns, 4 rows, 2 unused transparent slots).
- Source sheets were not uniform: red barrel and red brain cube generated in 8×4 layouts, while the other seven source sheets were 6×5. Frames were manually mapped into the **same 8×4 runtime order**.
- Each character has 8 front/down walking frames, 8 diagonal-left frames, 8 diagonal-right frames, two hurt key drawings, two normal-death key drawings and two critical-death key drawings.
- The death groups have **two authored drawings**, not 8 or 10; the renderer uses a simple timed crossfade and slight front/back perspective squash to keep the body volumetric. No sideways rotation.
- All nine images were cleaned of stray alpha speckles/background splatter, aligned into fixed transparent cells without separate floor/cast shadows, and palette-optimized for runtime. Original high quality 128 RGBA atlases and 270 individual PNGs are in the user-visible conversation ZIP.
- Existing physics hitboxes (33×44 regular, 66×88 boss), HP, scoring, 50-stage progression and endless rules remain unchanged.
- A bounded **0–6 pixel lane oscillation** for eligible nonboss enemies from stage 3 matches the actual left/right visual animation; the resulting `z.x` is the collider coordinate. Bosses and green mascot keep original lane movement.
- Hit reaction samples frames 24–25. Normal death 26–27. Strong lethal hit critical 28–29; bosses only use authored critical when final hit damage >=8. Original green mascot maintains its independently authored 8-normal/10-critical sequence.
- If image decoding fails or URL is missing, the older procedural Canvas zombie remains visible. No blank hitboxes.
- `dist/assets/ip/v2/object-zombies.js` is the animation loader. `cast-demo.js` presents nine reference-size animated cards inside the **running game**.
- Game QA entry point: `?demo=cast`; main gameplay entry point: `/`.
- Precache is version `zombie-zero-shell-v6-all-original-zombies`. Old cache is cleared by service-worker activation.

## Test and release status
- `node tools/test.cjs` validates PNG signature/IHDR, pixel alpha, chunk CRC, nine image paths, form + boss mapping, animation frames, score/fallback and offline precache.
- A successful GitHub Actions workflow is required before merge/deploy.
- Automated tests cannot replace direct device-based visual QA; pay particular attention to boss size, diagonal gait, animation similarity at small screen size and browser memory.

## Rights / design
Follow user-approved 2026 ZOMBIE ZERO original references; source deck includes NOVALIGHT / Artist Andante credits. These files are prototype game art derivatives and do not independently establish commercial ownership rights.

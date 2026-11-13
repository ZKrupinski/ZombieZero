# GREEN ZOMBIE — approved normal / critical death sprite export
Status: asset package V0.2, 2026-11-13. The full binary package was delivered as a ChatGPT conversation artifact; GitHub currently stores **procedural fallback logic, not these PNG binaries**.

## Approved visual rules
- Keep the **original toy-like bright green cubic head, flat charcoal flip-lid, pink pupils and tiny fangs**.
- The pink brain is **very small, soft, cute, playful**, only gently pops upward ("뿅"). Avoid big realistic brains, goo or gruesome gore.
- On **normal** and **critical** death, collapse along the **character's front/back axis** as viewed by the current **front-dominant elevated top-view** camera. No side flop or arbitrary 2D rotation.
- **Keep volume**: retain recognizable front/top/side thickness during the fall; do not turn the zombie into a flat 2D sticker.
- No drawn or baked ground shadows.

## Delivered asset package details
`ZOMBIE_ZERO_GREEN_DEATH_FINAL_V02.zip` contains the following outputs derived from the approved 2-row artwork `좀비_제로_죽음_애니메이션_스프라이트_시트.png`:

| Animation | frames | frame size | playback | valid atlas |
| --- | ---: | --- | --- | --- |
| `death_normal` | 8 | RGBA 128×128 | 65ms per frame, 520ms total | `atlases/death_normal_8f_128.png` |
| `death_critical` | 10 | RGBA 128×128 | 58ms per frame, 580ms total | `atlases/death_critical_10f_128.png` |

- Combined atlas: `atlases/green_death_combined_10x2_128.png` (1280×256); top row has 8 frames + 2 transparent empty cells, bottom row all 10 critical frames.
- Naming of separate frames: `frames/death_normal/death_normal_00.png` … `_07.png`; `frames/death_critical/death_critical_00.png` … `_09.png`.
- Common pivot: **(64, 120)**, i.e. bottom-centre.
- Pack also includes `manifest.json`, `QA_REPORT.json`, preview JPG + two loop GIFs.
- RGBA transparency / fixed frame dimensions / no edge clipping verified in export script.
- The approved image is a **2D sprite study, not a final 3D render**, and comparison in the real 33×44 enemy viewport remains a QA gate.

## Runtime integration contract (future binary import)
- Preserve critical death trigger: lethal physical non-burning hit of damage >=2 to green mascot form 0; normal death otherwise.
- Dequeue the active enemy from collision and award score immediately. Death playback is visual only.
- Render the PNG at the existing sprite's same pivot and scale; do not render both procedural fall and bitmap animation simultaneously.
- **Do not display isometric reference art as gameplay animation.**
- Use the `death_normal` and `death_critical` manifest frame durations as the animation timeline rather than re-timing physics.
- If the PNG fails to load, retain the existing procedural Canvas animation, which now uses smaller brain circles and a straight back-axis collapse.
- Keep the source artwork/master files outside the runtime `dist/` if full resolution is not needed in production.

## Why PNG upload is a separate gate
The current code review branch was updated with the matching cute/small brain prototype and non-sideways projected fall, but the PNG binary pack lives in the conversation artifact. The sprite export must be committed to GitHub in a dedicated follow-up binary import before declaring the final atlas *in-game*. Do not confuse the passing Node regression tests with live screenshot / GPU QA.

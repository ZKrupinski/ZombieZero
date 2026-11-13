# ZOMBIE ZERO · Original Art Direction Bible
Status: v0.1 · 2026-11-13 · Reference / production contract (NOT implemented art).
Scope: Existing ZombieZero web arcade first; expandable franchise identity second.

## 0. Official 2026 brand bible (higher priority)
The later user-supplied **ZOMBIE_ZERO_Brand 2026.pdf** (9 pages) supplies the official premise, 10 named object zombies, three survivors, ZIPPOP/NOVALIGHT/Artist Andante credits, and a game/keyring/ZOMBIE PIZZA/F&B collaboration roadmap. See `docs/08-brand-2026-alignment.md`. Where earlier speculative notes conflict, the PDF wins.

## 1. Source-of-truth hierarchy
1. User-supplied original reference: `zombie1.png` (single green zombie), `Zombie-_Panic_Appicon.png` (open lid/exposed pink brain), `ZZ_Cha_full.png` (ensemble lineup), `1-1.png` (ZOMBIE ZERO COLLECTION), `ZZ_BI.png` (full-colour logo), `zzㅋㅋ.png` / `Untitled-5.png` (historic lettering).
2. Supporting concepts: `KakaoTalk_20180405_111004013.jpg`, `2328.jpg`, `14679.jpg`, `29542440_1742091785850536_4969229517921792063_n.jpg`, `860868_483782228348171_490026625_o.jpg`, `09_Cooka_shot01.png`, `zombie.png`.
3. Motion reference: `ZombiePanic_1080.mp4` (30.08 s, 1080×1920, ~29.97fps).
4. Current executable: `dist/game.js`, `dist/style.css`, `dist/index.html`. The executable is *not* the visual source of truth for the renewal.

The supplied references are in the conversation, not yet Git-tracked in this PR; do not mark an art asset integrated until the PNG actually exists in `dist/` and is visible in a live build.

## 2. Canon visual rules
- Proportions: toy-like, cubic oversized head; very small torso/feet; short arms, expressive hands, large eyes and heavy individual eyebrows.
- IP original renders and collection art: 3/4 isometric-like view is approved as a reference. **The current 450×710 arcade instead requires a front-dominant, slightly elevated 3/4 top view** (not full isometric). See `docs/09-camera-and-shadow-free-sprite-contract.md`.
- Construction: low-poly planes with crisp flat-material boundaries; gentle 3D contact shading, *no thick black cartoon outline* on gameplay characters.
- Signature zombie: spring/lime green cube, flat near-black cap/hair that can hinge open to reveal pink brain, white oversized asymmetrical eyes with warm pink pupils, two front teeth, tiny pink nose, brow expression, short outstretched arms.
- Color language: recognizably separate **character identity** from **HP/rarity/skin tier**. Do not blindly tint the whole head by `TYPES[kind]`: the canonical green zombie must stay green.
- Canon ensembles from source lineup: large cyan block zombie, grey trash-can resident, green cube zombie, red barrel, black hazard barrel, red/black/yellow cube containers, cardboard box, wooden crate, three human protagonists; preserve unique accessory silhouettes.
- Protagonists: square faces, distinctive caps/hair/glasses and skull-emblem T-shirts; the original racket/vehicle gameplay can remain during the art swap.
- Logo: full-colour `ZZ_BI.png` as primary candidate; preserve comic dripping letterforms. Black-and-white logo is a secondary historic variation. Final UI use is bitmap PNG, not a reconstructed text/CSS or SVG approximation.
- Scene: stylized urban alley/road, strong top-down playability, industrial props, warm sparks and readable VFX. Original video is a guide for motion, pacing and mood, not proof that current game has the identical mechanics.
- FX may bloom/add strongly on impacts but must not bloom character faces, UI or the logo. Maintain clear collision read and mobile legibility.
- Final deliverables: rendered high-quality transparent PNG / sprite atlases from approved 3D or painted sources. Do not ship cut-up white-background concept sheets, unfinished vector UI characters or debug polygons as final assets.

## 3. Existing-game to canonical-IP mapping
| Existing object | Today | Art target | Engineering gate |
|---|---|---|---|
| Regular walkers | procedural 33×44 Canvas humanoids | faithful cubic green zombie | transparent atlases + stable collision box |
| Elite / bosses | 2× procedural Canvas | cyan giant, special containers and unique originals | silhouette + tier legibility + boss HP |
| HP tiers | green/blue/gold/purple/red head tint | identity colour remains unchanged; tier shown with accent/vignette/HUD | colourblind-friendly secondary indicator |
| Hero selection | procedural human sprites | original three mini human characters in caps/glasses/skull tees | readable UI at phone scale |
| Player car / racket | Canvas primitives | original sporty arcade car/racket design | no changes to physics/hit boxes |
| Game road | repeated coloured tiles | stylized 3D alley with readable playfield | high contrast behind projectiles |
| Logo and PWA icon | interim text / old Zombie Balls BI | ZOMBIE ZERO full-colour logo + original icon | new actual files, manifest, cache bump |
| FX | existing additive + bloom FX pass | vivid but separated impact FX | verify WebGL + fallback on phone |

## 4. Art production stages
**P0: provenance and master sources**
- Preserve reference bytes; hash files; record author/owner/right-to-use for each item. Never erase originals.
- Separate franchise/source art from game-generated temp art.
- Fix canonical size, perspective and colour on a green zombie 3/4 turnaround and a red drum/barrel; approve before batch production.

**P1: flagship character and art loading**
- Prepare green zombie bitmap idle, walk, hit, death at 60fps display speed; no alpha halos; foot anchor consistent.
- Implement asset renderer behind the existing `zombie()` logic and retain Canvas fallback until parity verified.
- Ensure damage, hit-stop, death particles and collision shapes are not bound to the visual silhouette.
- Build head-lid / brain-reveal as a signature reaction, not a permanent gore layer.

**P2: cast and backgrounds**
- Convert original cyan giant, trash can, drum, boxes, wooden crate, black hazard barrel and three humans one-by-one.
- Replace background with original-style 3D city alley, separate gameplay/value layers, keep bright projectiles clear.
- Replace title/PWA assets when approved original final binaries are in repo.

**P3: polish & release**
- Confirm 50-stage + endless progression, input, ball physics, emergency support, boss timing, storage and sound unchanged.
- QA on 450×710 logical board, mobile DPR, desktop, touch and keyboard, WebGL/Canvas FX fallback.
- Update cache key and compare screenshot/video evidence of old vs new. No claims of deployment without a successful Pages run and browser check.

## 5. Acceptance
- Review 3 side-by-side tests at minimum: green zombie reference vs in-game idle; full lineup vs codex silhouettes; `ZZ_BI.png` vs title.
- At gameplay scale, every character is identifiable without reading a name; no illegible tiny pupils/faces.
- Each PNG is truly transparent; no white/black rectangle, unintended holes or cut limbs.
- Canonical zombie colour and hinged-head/exposed-brain concept are maintained.
- All changes preserve game rules; fallback ensures missing assets do not blank the playfield.
- Character review is not equivalent to commercial-rights clearance.

## 6. Current verified technical baseline
At the time of this document, `README.md` reports an independent Zombie Balls v19 copy. The existing game uses 450×710 Canvas and procedural enemy/hero/environment art, and has a dedicated `dist/fx-renderer.js` additive/bloom pass. This document specifies a target; it **does not claim** those original PNGs or faithful 3D assets are already integrated.

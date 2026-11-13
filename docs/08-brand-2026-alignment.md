# ZOMBIE ZERO · Official 2026 brand source alignment

Source: user-supplied `ZOMBIE_ZERO_Brand 2026.pdf` (9 pages, 2026-11-13 upload).
This file is the current canonical **brand pitch reference** for this project. It supersedes speculative names and stories in earlier AI-generated project notes whenever they conflict.

## Brand identity
- Main title: **ZOMBIE ZERO**; deck header/co-brand: **ZIPPOP / ZOMBIE ZERO**.
- The deck identifies **NOVALIGHT / CHARACTER IP** and artist credit **Artist Andante**; cover includes "MOBILE GAME / KEYRING / ARTIST ANDANTE".
- Premise, p.1: "세상의 모든 사물이 좀비가 되었다."
- Core copy, p.2: **"WE MADE THEM. NOW THEY BITE BACK."**
- Canon story, p.2: "우리가 쓰고 버린 사물들이 좀비가 되어 돌아왔다. 환경을 오염시킨 물건들이 인간을 위협하고, 세 아이가 사물 좀비에 맞서 싸운다."
- Theme, p.2: **"우리가 버린 것이 우리를 위협한다."**
- Tone: punchy, comic and energetic, with environmental/discarded-object identity built into *all* enemy designs; do not reinterpret the project as generic human-undead horror.

## Canon character roster — 10 object zombies + 3 survivors
| ID | Official Korean label | Source page | Key art cue |
|---|---|---:|---|
| ZOMBIE / 01 | 빅 좀비 | 3 | large cyan jawed giant |
| ZOMBIE / 02 | 쓰레기통 좀비 | 3 | grey metal bin, purple hands |
| ZOMBIE / 03 | 그린 좀비 | 3 | green cube with black hinged hair/lid |
| ZOMBIE / 04 | 드럼통 좀비 · 레드 | 3 | red barrel |
| ZOMBIE / 05 | 드럼통 좀비 · 블랙 | 3 | black barrel with hazard mark |
| ZOMBIE / 06 | 브레인 큐브 · 레드 | 4 | red exposed-brain cube |
| ZOMBIE / 07 | 일회용 포장 박스 좀비 | 4 | cardboard packing box |
| ZOMBIE / 08 | 나무 상자 좀비 | 4 | wood crate bracing |
| ZOMBIE / 09 | 브레인 큐브 · 블랙 | 4 | black exposed-brain cube |
| ZOMBIE / 10 | 브레인 큐브 · 옐로 | 4 | yellow exposed-brain cube |
| SURVIVOR / 01 | 생존자 소년 | 5 | blue cap, racket |
| SURVIVOR / 02 | 금발 소녀 | 5 | blonde hair, pink top |
| SURVIVOR / 03 | 빨간 안경 소녀 | 5 | red glasses, orange hair |

Keep these labels in the brand-canon database; existing gameplay enemy roles ("워커", "스크리머" etc.) are current engineering aliases, not replacements for the officially labelled IP characters.

## Product & brand expansion supported by the PDF
- **p.6:** proposed **ZOMBIE ZERO mobile game** and **zombie collection keyrings**; they are described as being prepared, not confirmed released.
- **p.7:** **ZOMBIE PIZZA** described as "출시 예정", with black/red square and red/black triangular pizza/product variants. No launch date established by the document.
- **p.8:** partnerships in **F&B** (package/menu sets), **RETAIL** (keyrings and store promotions), **CAMPAIGNS** (shortform, in-store missions).
- **p.9:** licensing/contact and company references appear; do not republish personal contact/organizational address unnecessarily in game.

## Art rules derived from the PDF artwork
- Orthographic/isometric-like 3/4 toy character perspective, solid low-poly geometry, visible top and side planes.
- Expressive eyes and prop silhouettes matter more than material texture realism.
- Original green zombie remains green regardless of in-game health tier.
- Original protagonist clothing/accessories (cap, pink shirt, red glasses) must survive downscaling.
- For game implementation, render optimized transparent bitmaps; do not misrepresent early static art as full animated 3D source.
- Experimental games under the ZOMBIE ZERO master brand should retain the environmental/discarded-object premise.

## Rights and commercial-use gate
The deck states "**원천 IP ⓒ NOVALIGHT · Artist Andante**" (pp.3–4). This is an attribution within the supplied deck, *not* an independent chain-of-title verification.
Before product collaborations, paid distribution or merchandising, verify that the developer has the required copyright and trademark usage scope, including historical game assets, all art and logos. Internal integration is a production milestone, not an ownership determination.

## Current implementation, updated 2026-11-13 (second integration pass)
- The original ZOMBIE ZERO COLLECTION `1-1.png` has been cut into **13 separate transparent character PNGs** for QA. The PNGs and rig-motion proofs are provided in a separate conversation ZIP; not all high-resolution extracted assets are committed to GitHub.
- The game branch now embeds a **256×256 transparent PNG atlas** (4×4 cells, 64px each) across `dist/assets/ip/cast-data-[1-3].js`, assembled by `cast-loader.js`.
- **Camera correction (supersedes earlier implementation):** those original isometric renders remain in the gallery only. `dist/game.js` now gates all gameplay sprites behind `gameplayCompatible===true` and a separate `gameplayAtlas`. Existing Canvas actors and death pieces are the live visual fallback until new front-elevated sprite renders arrive.
- The in-game Help dialog retains the **13-character bitmap collection grid**. Its grey baked floor shadows are removed for gallery display. Original isometric object-death pieces are disabled in active gameplay to avoid mixed camera viewpoints.
- The preexisting `green-zombie.js` bitmap remains in the project archive but is **not active in gameplay**. The original procedural front-oriented Canvas renderer is used until front-elevated source art is ready.
- A **green-zombie 8-frame walk, 4-frame hit, 6-frame death rig-motion proof** has been exported in the downloadable QA pack. These are **shape warps of the source still**, not redrawn animation with independently articulated limbs; the game itself still uses existing bob/lean/hit/death transforms. This proof-of-concept animation is **not yet wired to the game's atlas animation loop**.
- Source `zombie1.png` and `1-1.png` remain user-provided attachments, not full-resolution master assets committed to this branch. Commercial usage rights require separate verification.
- GitHub Action regression checks cover the PNG data (including CRC/transparency), cast mappings, script load order and existing game mechanics. Physical phone and GPU visual QA remain outstanding.
- The changes remain in a **draft PR** and are **not live on GitHub Pages** until approved/merged/deployed.

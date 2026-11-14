# Stage environments v45 — 18 scenes

This branch extends the existing 8 illustrated 900×1420 portrait stage backgrounds to 18.
The original eight (`bg-01.webp` through `bg-08.webp`) are unchanged.

## Newly approved bitmap themes

| File | Theme | Floor material |
|---|---|---|
| bg-09.webp | 햇살 도심 대로 | asphalt, cracks, white road markings |
| bg-10.webp | 비 오는 네온 상점가 | wet reflective asphalt and puddles |
| bg-11.webp | 봄날 교외 공원 | grass, worn dirt, stones |
| bg-12.webp | 가을 캠퍼스 광장 | red brick paving and leaves |
| bg-13.webp | 사막 폐차장 | dry sandy soil, tire tracks |
| bg-14.webp | 눈 덮인 겨울 주택가 | snow, slush, ice |
| bg-15.webp | 해안 항구 창고 | worn dock concrete and drainage metal |
| bg-16.webp | 달빛 숲 캠핑장 | forest dirt, moss, roots, planks |
| bg-17.webp | 석양 고층 옥상 | concrete panels and hazard markings |
| bg-18.webp | 식생에 잠긴 폐허 쇼핑몰 | broken checker tiles, weeds |

## Asset integration status

All 10 900×1420 portrait WebP image payloads are now committed in the branch, stored as reversible plain-text base64 at `dist/assets/stages/bg-09.webp.b64` through `bg-18.webp.b64`. The game loader fetches each file and creates a native WebP image from the `data:image/webp;base64,` URL; there is no image re-encoding or vector substitution at runtime. The original eight `.webp` files remain unchanged.

Each of the 10 new base64 files was read back from GitHub and verified against the expected byte count and RIFF WebP signature. `dist/sw.js` precaches all 18 scene files, including new base64 payloads.

A separate user-facing ZIP containing conventional `bg-09.webp` through `bg-18.webp` assets and the 16:9 source illustrations is also provided in the ChatGPT conversation.

This approach preserves the pixel art exactly, despite the currently available GitHub connector not accepting binary uploads directly. Gameplay logic, damage, HP, collisions, balls, citizens, and difficulty remain unchanged.
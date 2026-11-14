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

The 10 original landscape source illustrations have been converted into 10 portrait WebP bitmaps (900×1420); these are currently provided as a separate ZIP in the ChatGPT conversation. **Those binary assets are not committed on this branch yet.** Do not merge or deploy this branch as a completed art integration until `bg-09.webp` .. `bg-18.webp` are uploaded under `dist/assets/stages/`.

The existing stage code has safe fallback behavior when images are missing, but new visuals cannot appear until the binaries are present. Once the assets have been committed, add the 10 files to the `FILES` precache array in `dist/sw.js` before release and run `node tools/test.cjs`.

Gameplay logic and collision coordinates remain unchanged.
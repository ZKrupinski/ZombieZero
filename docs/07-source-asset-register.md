# ZOMBIE ZERO · User-supplied source asset register
2026-11-13. The assets are provided in this ChatGPT conversation but are NOT currently committed to this repository by this document PR. The Git repository cannot magically fetch conversation attachments.

| Source file | Visible content / role | Source format | Integration status |
|---|---|---|---|
| `zombie1.png` | single green cubic zombie | 327×422 transparent PNG | reference only |
| `Zombie-_Panic_Appicon.png` | green head with open black cap and pink brain | 1024×1024 RGB PNG | reference only |
| `ZZ_Cha_full.png` | multiple original low-poly characters and human trio | 1873×257 transparent PNG | lineup reference only |
| `1-1.png` | ZOMBIE ZERO COLLECTION layout | 2000×1987 opaque PNG | lineup reference only |
| `ZZ_BI.png` | main two-colour/full-colour comic logo | 768×481 transparent PNG | primary logo candidate |
| `zzㅋㅋ.png` | dark-green logo variation | 339×139 transparent PNG | secondary logo reference |
| `Untitled-5.png` | black-and-white historical logo | 311×199 RGB PNG | historical logo reference |
| `zombie.png` | four-character model selection | 2000×1333 RGB PNG | model proportion reference |
| `KakaoTalk_20180405_111004013.jpg` | historical presentation/concept board | 960×720 JPEG | history reference |
| `2328.jpg` | stylised character concept boards | 960×720 JPEG | concept reference |
| `14679.jpg` | hand-drawn monochrome character sketches | 1477×1108 JPEG | concept reference |
| `29542440_1742091785850536_4969229517921792063_n.jpg` | cartoon developer/zombie work sketch | 960×957 JPEG | concept reference |
| `860868_483782228348171_490026625_o.jpg` | human/zombie gags and concept sketches | 1392×1149 JPEG | concept reference |
| `09_Cooka_shot01.png` | blocky human chef character | 502×336 PNG | character reference |
| `ZombiePanic_1080.mp4` | 30.08 s vertical arcade gameplay, 1080×1920 | H.264/AAC MP4 | gameplay/motion reference only |

## Implementation pilot (review branch 2026-11-13)
A transparent **96×128 PNG derivative** of `zombie1.png` is embedded as a data URI in `dist/assets/ip/green-zombie.js` and rendered by `dist/game.js` for normal form 0 when loaded. The original 327×422 PNG itself is still only attached to the conversation (not committed); the derivative is a first in-game still bitmap with subtle runtime movement, not a full sprite animation sheet.

## Record requirements for import
For each imported raster/video, store untouched master under a clearly labelled `assets-source/original-reference/` folder *after rights check*, with a `SHA256` inventory; derive transparent sprite layers under `dist/assets/ip/` only when cleaned and approved.

Never treat transparent reference PNG as an approved animation sheet. For gameplay use prepare separate idle/walk/hit/death sprite frames, named `<character>_<action>_<index>.png`, with consistent source scale/feet pivot and no white alpha fringe.

## Rights / provenance checklist (unverified)
- Identify credited artist(s), render/model creator(s), source project, and dates.
- Confirm permission to reuse/edit/license each reference across game, promotional art, stickers and physical goods.
- Where a historic logo/character belongs to third parties, secure written scope before commercial use.
- Mark **approval pending** rather than assigning ownership by assumption.

## Practical caveat
This is a **reference register**, not an import commit or in-game art replacement. Binary upload, texture cleanup, gameplay integration and on-device visual QA remain separate required steps.

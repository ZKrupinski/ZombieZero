#!/usr/bin/env python3
"""Generate P3 boss death sprites strictly from canonical HD source artwork.

Run: python tools/generate_p3_boss_deaths.py [--verify]
Emits 4 RGBA 12-frame strips (6144 x 512); requires Pillow.
"""
from __future__ import annotations
import argparse
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / 'dist/assets/ip/v2'
TARGET = SPRITES / 'p3-deaths'
CELL, COUNT, ORIGIN = 512, 12, (128, 116)
# Partition into coherent source-art sections (hat/lid, face, arms, body, feet).
# All regions are disjoint, so they cannot double-render overlapping alpha.
REGIONS = {
 'big_zombie': [
  (0,0,83,55),(83,0,173,55),(173,0,256,55),
  (0,55,49,120),(49,55,207,120),(207,55,256,120),
  (0,120,66,178),(66,120,132,178),(132,120,194,178),(194,120,256,178),
  (0,178,84,256),(84,178,171,256),(171,178,256,256)
 ],
 'trash_can': [
  (0,0,60,72),(60,0,196,72),(196,0,256,72),
  (0,72,49,132),(49,72,205,132),(205,72,256,132),
  (0,132,56,199),(56,132,133,199),(133,132,200,199),(200,132,256,199),
  (0,199,84,256),(84,199,169,256),(169,199,256,256)
 ],
}

def frame(atlas: Image.Image, i: int) -> Image.Image:
 x,y=(i%8)*256,(i//8)*256
 return atlas.crop((x,y,x+256,y+256))

def compose(atlas: Image.Image, identity: str, critical: bool) -> Image.Image:
 out=Image.new('RGBA',(CELL*COUNT,CELL),(0,0,0,0))
 initial=(0,24,28,29) if critical else (0,24,26,27)
 collapsed=frame(atlas,initial[-1])
 for f in range(COUNT):
  canvas=Image.new('RGBA',(CELL,CELL),(0,0,0,0))
  if f<4:
   # Original intact/hurt/death source frames: preserve their exact design.
   canvas.alpha_composite(frame(atlas,initial[f]),ORIGIN)
  else:
   t=((f-3)/(COUNT-4))**.83
   strength=1.36 if critical else 1.
   for i,(x0,y0,x1,y1) in enumerate(REGIONS[identity]):
    tile=collapsed.crop((x0,y0,x1,y1))
    if not tile.getbbox():continue
    cx,cy=(x0+x1)/2,(y0+y1)/2
    dx,dy=(cx-128)/128,(cy-135)/135
    if i==4:
     vx,vy=(5 if critical else 2)*t,-26*t
    else:
     vx=(dx*82+((i*11)%15-7))*strength*t
     vy=(dy*63+((i*7)%17-8)-17)*strength*t
    angle=(i%4-1.5)*(10 if critical else 7)*t
    spun=tile.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    ox=round(ORIGIN[0]+cx+vx-spun.width/2)
    oy=round(ORIGIN[1]+cy+vy-spun.height/2)
    canvas.alpha_composite(spun,(ox,oy))
   if critical and f>=6:
    # Tiny original-art splinters extend only the critical finale.
    for j in range(6):
     sx,sy=37+(j*35)%165,35+(j*31)%168
     chip=collapsed.crop((sx,sy,sx+11,sy+11))
     if not chip.getbbox():continue
     vx=(-1 if j%2 else 1)*(65+j*11)
     vy=(-57 if j%3 else 43)-j*4
     canvas.alpha_composite(chip,(round(ORIGIN[0]+sx+vx*t),
                                   round(ORIGIN[1]+sy+vy*t)))
  bb=canvas.getchannel('A').getbbox()
  if bb is None or bb[0]<=0 or bb[1]<=0 or bb[2]>=CELL or bb[3]>=CELL:
   raise ValueError(f'{identity} critical={critical} frame={f} clipped: {bb}')
  out.alpha_composite(canvas,(f*CELL,0))
 return out

def main()->None:
 parser=argparse.ArgumentParser()
 parser.add_argument('--verify',action='store_true')
 args=parser.parse_args()
 TARGET.mkdir(exist_ok=True)
 for key in REGIONS:
  source=SPRITES/f'{key}_hd.png'
  if not source.exists():raise FileNotFoundError(source)
  with Image.open(source) as input_file:
   if input_file.size!=(2048,1024):
    raise ValueError(f'Unexpected HD boss source: {source}: {input_file.size}')
   atlas=input_file.convert('RGBA')
  for kind in ('normal','critical'):
   target=TARGET/f'{key}-{kind}-v103.png'
   generated=compose(atlas,key,kind=='critical')
   if not args.verify:
    generated.save(target,'PNG',optimize=True,compress_level=9)
   elif not target.exists():raise FileNotFoundError(target)
   with Image.open(target) as actual:
    if actual.size!=(6144,512) or actual.mode!='RGBA':
     raise ValueError(f'Invalid P3 PNG: {target}')
   print(f'PASS {target.relative_to(ROOT)} {target.stat().st_size} bytes')

if __name__=='__main__':
 main()

#!/usr/bin/env python3
"""P3 v105 trash-can boss death, sourced ONLY from the approved 2048x1024 HD PNG.

Preserves the original character, face, purple hands, lid, soda and garbage.
No image generation, repainting, body masks, polygon dissection or strips.
A complete original source frame is the only rendered body in every cell.
"""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageChops

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/"dist/assets/ip/v2/trash_can_hd.png"
DEST=ROOT/"dist/assets/ip/v2/p3-deaths"
PREVIEW=ROOT/"docs/p3-v105-trash-can-original-preview.jpg"
CELL=512
TOTAL=12
PIVOT_X=256
FOOT_Y=360

# (source frame, horizontal drift, vertical drift, clockwise rotation).
# All original frames are whole bitmaps; the sprite never becomes new art.
# Large angular changes are reserved for the final fall, where small sprites
# need a readable silhouette. Distinct critical source poses reveal contents.
TRACKS={
 "normal":[
  (0,0,0,0),(24,0,-5,0),(25,2,-7,4),
  (26,0,-6,-5),(26,-3,-4,-13),(26,-7,0,-22),
  (26,-12,7,-30),(27,-9,11,-12),(27,-16,17,-27),
  (27,-23,23,-42),(27,-28,29,-57),(27,-30,30,-65)
 ],
 "critical":[
  (0,0,0,0),(24,0,-6,0),(28,1,-12,0),
  (28,3,-17,7),(28,-2,-19,-8),(28,-5,-14,-18),
  (29,-6,-11,-4),(29,-12,-5,-16),(29,-18,6,-30),
  (29,-24,15,-46),(29,-29,24,-62),(29,-32,29,-72)
 ]
}

def original(atlas,idx):
 assert 0<=idx<30
 x=(idx%8)*256;y=(idx//8)*256
 return atlas.crop((x,y,x+256,y+256))

def original_centered_bitmap(atlas,frame_index):
 src=original(atlas,frame_index)
 bbox=src.getchannel("A").getbbox()
 if not bbox:
  raise ValueError(f'Original HD frame {frame_index} lacks pixels')
 center=(bbox[0]+bbox[2])/2
 base=bbox[3]
 # Preserve the original source texels perfectly in unchanged frames;
 # adjust *placement* to prevent a 40+ px horizontal snap when pose changes.
 result=Image.new("RGBA",(CELL,CELL),(0,0,0,0))
 result.alpha_composite(src,(round(PIVOT_X-center),round(FOOT_Y-base)))
 return result

def render_cell(source_bitmap,dx,dy,rotation):
 # Full-image rigid translation / rotation; NEVER slice the eyes, can or lid.
 if abs(rotation)<.01:
  transformed=source_bitmap
 else:
  # Use a single affine rotation on the full original pose; no fragmentation.
  transformed=source_bitmap.rotate(
   -rotation,resample=Image.Resampling.BICUBIC,center=(PIVOT_X,FOOT_Y-96)
  )
 result=Image.new("RGBA",(CELL,CELL),(0,0,0,0))
 result.alpha_composite(transformed,(round(dx),round(dy)))
 bbox=result.getchannel("A").getbbox()
 if not bbox or bbox[0]<5 or bbox[1]<5 or bbox[2]>CELL-5 or bbox[3]>CELL-5:
  raise ValueError(f'Clipped image after pose transformation: {bbox}')
 return result

def make_strip(atlas,kind):
 strip=Image.new("RGBA",(CELL*TOTAL,CELL),(0,0,0,0))
 for n,(source,dx,dy,angle) in enumerate(TRACKS[kind]):
  tile=render_cell(original_centered_bitmap(atlas,source),dx,dy,angle)
  strip.alpha_composite(tile,(n*CELL,0))
 return strip

def preview(strips):
 thumb=292
 step_x=300
 step_y=324
 sheet=Image.new("RGB",(step_x*4,step_y*6),"#d9e5ec")
 d=ImageDraw.Draw(sheet)
 for row,kind in enumerate(["normal","critical"]):
  img=strips[kind]
  for n,(src,dx,dy,ang) in enumerate(TRACKS[kind]):
   frame=img.crop((n*CELL,0,(n+1)*CELL,CELL))
   # Crop scene around original dimensions, not 512px blank frame margins.
   crop=frame.crop((70,110,442,455)).resize((thumb,thumb),Image.Resampling.LANCZOS)
   bg=Image.new("RGBA",(thumb,thumb),"#e6edf2")
   bg.alpha_composite(crop)
   x=(n%4)*step_x+(step_x-thumb)//2
   y=(row*3+n//4)*step_y+22
   sheet.paste(bg.convert("RGB"),(x,y))
   d.text((x+7,y-18),f"ORIGINAL HD | {kind} | {n+1:02}/12 | src {src}",fill="#132838")
 PREVIEW.parent.mkdir(parents=True,exist_ok=True)
 sheet.save(PREVIEW,quality=93,optimize=True)

def verify(strip,other):
 if strip.size!=(CELL*TOTAL,CELL) or strip.mode!="RGBA":
  raise ValueError("Bad original-HD death strip size or alpha")
 delta=ImageChops.difference(strip,other)
 if delta.getbbox() or delta.convert("RGB").getbbox() or delta.getchannel("A").getbbox():
  raise ValueError("PNG differs from original-HD source reconstruction")

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument("--verify",action="store_true")
 args=parser.parse_args()
 with Image.open(SOURCE) as f:
  assert f.size==(2048,1024),f"Unexpected source resolution: {f.size}"
  assert f.mode=="RGBA",f"Original sprite must have true alpha: {f.mode}"
  atlas=f.copy()
 DEST.mkdir(parents=True,exist_ok=True)
 strips={}
 for kind in ["normal","critical"]:
  strip=make_strip(atlas,kind)
  path=DEST/f"trash_can-{kind}-v105.png"
  if not args.verify:
   strip.save(path,format="PNG",optimize=True,compress_level=9)
  if not path.exists():raise FileNotFoundError(path)
  with Image.open(path) as stored:
   verify(strip,stored.convert("RGBA"))
  strips[kind]=strip
  print(f"OK {path.relative_to(ROOT)} {path.stat().st_size} bytes")
 if not args.verify:preview(strips)
 print("OK: original HD face, body, lid, hands, feet and interior props preserved in every frame")

if __name__=="__main__":
 main()

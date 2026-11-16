#!/usr/bin/env python3
"""P3 v104: animate *original* HD death poses by anatomical component.

No generative repaint, grid chunks, palette shifts or invented faces.
12 frames per boss/mode; transparent 512px cells, original HD texels and alpha.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
import argparse

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "dist/assets/ip/v2"
OUT = ASSETS / "p3-deaths"
PREVIEW = ROOT / "docs"
CELL, COUNT, ORIGIN = 512, 12, (128, 104)
RESAMPLE = Image.Resampling.BICUBIC

# Precisely isolated ORIGINAL-HD details. Never cut the character into a
# rectangular grid, repaint the face, or separate its torso/legs as shards.
# The source frame's remaining pixel-perfect body is preserved as one piece.
MASKS={
 "big_zombie":{
  "normal": {},
  "critical":{"head":[
    (54,33),(86,13),(199,10),(222,49),(214,117),
    (160,137),(86,133),(54,92)
  ]}
 },
 "trash_can":{
  "normal":{"lid":[
    (58,72),(97,70),(167,73),(180,97),
    (179,139),(153,147),(72,148),(58,122)
  ]},
  "critical":{"lid":[
    (56,61),(96,57),(156,60),(181,79),
    (182,112),(151,124),(80,116),(55,97)
  ]}
 }
}
# Five explicitly animated beats: (horizontal, vertical, angle degrees).
# The normal giant falls as a complete body. The critical giant lifts its
# original intact head. The bin rotates and releases only its true lid.
MOTION={
 "big_zombie":{
  "normal":{
   "torso":[(0,0,0),(-1,3,-5),(-7,9,-13),(-16,23,-32),(-28,34,-61)]
  },
  "critical":{
   "torso":[(0,0,0),(2,-6,0),(9,-15,10),(15,-7,21),(21,24,31)],
   "head":[(0,0,0),(-6,-16,-9),(-23,-35,-27),(-45,-47,-58),(-62,-40,-87)]
  }
 },
 "trash_can":{
  "normal":{
   "torso":[(0,0,0),(-4,2,-4),(-9,10,-12),(-17,17,-23),(-20,21,-29)],
   "lid":[(0,0,0),(4,-6,11),(15,-18,42),(23,-5,85),(25,20,119)]
  },
  "critical":{
   "torso":[(0,0,0),(0,0,0),(-2,10,-4),(-11,18,-12),(-16,29,-24)],
   "lid":[(0,0,0),(11,-22,14),(27,-51,48),(55,-67,108),(80,-60,178)]
  }
 }
}

def atlas_frame(atlas, number):
 x,y = number%8*256, number//8*256
 return atlas.crop((x,y,x+256,y+256))

def pieces_from_source(src, key, kind):
 # An RGBA image is partitioned into complete semantic components; no
 # duplicate head pixels or rectangular image slices painted into the atlas.
 alpha = src.getchannel('A')
 assigned = Image.new('L',(256,256),0)
 result = {}
 for name, vertices in MASKS[key][kind].items():
  mask=Image.new('L',(256,256),0)
  ImageDraw.Draw(mask).polygon(vertices,fill=255)
  exclusive=ImageChops.subtract(mask,assigned)
  assigned=ImageChops.lighter(assigned, mask)
  layer=Image.new('RGBA',(256,256),(0,0,0,0))
  layer.paste(src,(0,0),exclusive)
  layer.putalpha(ImageChops.multiply(alpha,exclusive))
  if layer.getchannel('A').getbbox():result[name]=layer
 # Body is one coherent remainder. It includes no invented details, and no
 # pixel belonging to the exact HD source is dropped.
 rest=ImageChops.subtract(alpha,ImageChops.multiply(alpha,assigned))
 body=src.copy()
 body.putalpha(rest)
 if body.getchannel('A').getbbox():result['torso']=body
 # Validate losslessness at key pose before introducing any motion.
 reconstruction=Image.new('RGBA',(256,256),(0,0,0,0))
 for piece in result.values():reconstruction.alpha_composite(piece)
 err=ImageChops.difference(reconstruction,src)
 if err.convert('RGB').getbbox() or err.getchannel('A').getbbox():
  raise AssertionError(f'Source pixels changed for {key}/{kind}')
 return result

def curve(points,t):
 t=max(0.,min(1.,t))
 if t>=1:return points[-1]
 q=t*4
 i=min(3,int(q))
 a=q-i
 # smooth ease per beat keeps hold and impulse, less robotic than linear lerp
 a=a*a*(3-2*a)
 return tuple(points[i][k]*(1-a)+points[i+1][k]*a for k in range(3))

def transform_part(piece,canvas,dx,dy,angle):
 bbox=piece.getchannel('A').getbbox()
 if not bbox:return
 tile=piece.crop(bbox)
 rotated=tile.rotate(angle,resample=RESAMPLE,expand=True)
 mx=(bbox[0]+bbox[2])/2
 my=(bbox[1]+bbox[3])/2
 x=round(ORIGIN[0]+mx+dx-rotated.width/2)
 y=round(ORIGIN[1]+my+dy-rotated.height/2)
 canvas.alpha_composite(rotated,(x,y))

def compose(atlas,key,kind):
 critical=kind=='critical'
 source_frame=(28 if key=='big_zombie' and critical else 29) if critical else 27
 source=atlas_frame(atlas,source_frame)
 parts=pieces_from_source(source,key,kind)
 # Four living/impact key poses from authentic HD artwork.
 initial=([0,24,28] if key=='big_zombie' else [0,24,28,29]) if critical else [0,24,25,26,27]
 split_start=len(initial)
 # Keep the face mask always intact; no eyes/mouth subpieces.
 assert 'torso' in parts and (('head' in parts) if key=='big_zombie' and critical else True)
 result=Image.new('RGBA',(CELL*COUNT,CELL),(0,0,0,0))
 for f in range(COUNT):
  frame=Image.new('RGBA',(CELL,CELL),(0,0,0,0))
  if f<split_start:
   frame.alpha_composite(atlas_frame(atlas,initial[f]),ORIGIN)
  else:
   t=(f-split_start)/(COUNT-1-split_start)
   paths=MOTION[key][kind]
   # In front-to-back order, source artwork stays source-accurate.
   for name in ['torso','head','lid']:
    if name not in parts:continue
    dx,dy,rotation=curve(paths.get(name,[(0,0,0)]*5),t)
    transform_part(parts[name],frame,dx,dy,rotation)
  bounds=frame.getchannel('A').getbbox()
  if not bounds or min(bounds[:2])<3 or max(bounds[2:])>CELL-3:
   raise ValueError(f'{key}/{kind} frame {f} cropped: {bounds}')
  result.alpha_composite(frame,(f*CELL,0))
 return result

def make_preview(key,animations):
 w,h=4*260,6*290
 montage=Image.new('RGB',(w,h),'#d7e5e9')
 d=ImageDraw.Draw(montage)
 for idx,kind in enumerate(['normal','critical']):
  strip=animations[kind]
  for i in range(COUNT):
   tile=strip.crop((CELL*i,0,CELL*(i+1),CELL))
   thumb=tile.crop((48,30,464,446)).resize((250,250),Image.Resampling.LANCZOS)
   bg=Image.new('RGBA',(250,250),'#e7edef')
   bg.alpha_composite(thumb)
   x,y=(i%4)*260, (idx*3+i//4)*290+22
   montage.paste(bg.convert('RGB'),(x,y))
   d.text((x+5,y-18),f'{key}  {kind} / {i:02}',fill='#0a1b26')
 fname=PREVIEW/f'p3-v104-{key}-preview.jpg'
 montage.save(fname,quality=88,optimize=True)
 print(f'PREVIEW {fname.relative_to(ROOT)} {fname.stat().st_size} bytes')

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--verify',action='store_true')
 args=parser.parse_args()
 OUT.mkdir(parents=True,exist_ok=True)
 for key in ['big_zombie','trash_can']:
  src=ASSETS/f'{key}_hd.png'
  with Image.open(src) as img:
   if img.size!=(2048,1024):raise ValueError(f'Invalid HD atlas: {src}')
   atlas=img.convert('RGBA')
  animations={}
  for kind in ['normal','critical']:
   composed=compose(atlas,key,kind)
   dst=OUT/f'{key}-{kind}-v104.png'
   if not args.verify:composed.save(dst,'PNG',optimize=True,compress_level=9)
   with Image.open(dst) as check:
    if check.size!=(6144,512) or check.mode!='RGBA':
     raise ValueError(f'Invalid sprite sheet: {dst}')
    if args.verify:
     diff=ImageChops.difference(composed,check.convert('RGBA'))
     if diff.convert('RGB').getbbox() or diff.getchannel('A').getbbox():
      raise ValueError(f'Committed art changed or no longer matches original: {dst}')
   print(f'PASS {dst.relative_to(ROOT)} bytes={dst.stat().st_size}')
   animations[kind]=composed
  if not args.verify:make_preview(key,animations)
 print('All 4 P3 v104 original-HD anatomy-based sprite strips generated.')

if __name__=='__main__':
 main()

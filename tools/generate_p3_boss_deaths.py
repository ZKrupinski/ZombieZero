#!/usr/bin/env python3
"""P3 v104: animate *original* HD death poses by anatomical component.

No generative repaint, grid chunks, palette shifts or invented faces.
12 frames per boss/mode; transparent 512px cells, original HD texels and alpha.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFont
import math, argparse

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "dist/assets/ip/v2"
OUT = ASSETS / "p3-deaths"
PREVIEW = ROOT / "docs"
CELL, COUNT, ORIGIN = 512, 12, (128, 104)
RESAMPLE = Image.Resampling.BICUBIC

# Anatomical cutlines target the existing death-pose images (27 and 29).
# Head/face is one inviolable piece; barrel, lid and limbs have distinct motion.
# Polygons follow silhouette, joints and the character's *existing* seams.
MASKS = {
 "big_zombie": {
  "normal": {
   "cap": [(116,49),(172,48),(189,80),(169,91),(122,87)],
   "head": [(55,62),(85,42),(179,40),(214,65),(207,137),(72,154),(48,115)],
   "left_arm": [(15,98),(73,96),(86,165),(75,207),(15,207),(5,149)],
   "right_arm": [(192,103),(249,102),(256,153),(246,214),(196,203),(180,158)],
   "left_boot": [(61,175),(137,175),(140,255),(60,255)],
   "right_boot": [(137,179),(217,177),(215,255),(139,255)],
  },
  "critical": {
   "cap": [(123,2),(196,5),(213,68),(167,79),(122,60)],
   "head": [(52,31),(88,19),(210,18),(226,75),(197,144),(67,137),(46,89)],
   "left_arm": [(5,98),(74,88),(90,174),(65,216),(0,213)],
   "right_arm": [(196,97),(256,96),(256,220),(206,218),(185,166)],
   "left_boot": [(65,173),(137,173),(135,256),(63,256)],
   "right_boot": [(134,175),(204,170),(218,256),(137,256)],
  }
 },
 "trash_can": {
  "normal": {
   "lid": [(66,73),(112,55),(204,68),(215,139),(192,159),(72,142),(61,113)],
   "left_arm": [(6,146),(81,136),(101,200),(78,234),(5,228)],
   "right_arm": [(197,138),(255,137),(255,229),(197,230),(178,199)],
   "left_boot": [(72,188),(136,180),(141,256),(69,256)],
   "right_boot": [(135,183),(207,182),(215,256),(139,256)],
  },
  "critical": {
   "lid": [(47,47),(91,31),(225,29),(245,84),(224,128),(88,122),(48,108)],
   "contents": [(85,78),(168,80),(177,145),(90,157)],
   "left_arm": [(0,134),(74,135),(92,193),(74,233),(0,228)],
   "right_arm": [(198,135),(256,129),(256,228),(205,225),(180,186)],
   "left_boot": [(73,187),(132,180),(136,256),(65,256)],
   "right_boot": [(133,187),(216,182),(221,256),(135,256)],
  }
 }
}

# Art QA revision: the original face, thorax, legs and hidden joints MUST
# remain a single intact solid. Only fully readable exterior parts separate.
# This prevents wedge/strip fragments from crossing the original character.
for _kind in ['normal','critical']:
 MASKS['big_zombie'][_kind].pop('head')
 MASKS['big_zombie'][_kind].pop('left_boot')
 MASKS['big_zombie'][_kind].pop('right_boot')
 MASKS['trash_can'][_kind].pop('left_boot')
 MASKS['trash_can'][_kind].pop('right_boot')
MASKS['trash_can']['critical'].pop('contents')
MASKS['trash_can']['normal']['lid']=[
 (70,68),(113,61),(204,62),(213,112),(189,135),(75,130),(62,107)
]
MASKS['trash_can']['critical']['lid']=[
 (51,44),(92,29),(222,28),(240,68),(224,101),(95,103),(56,88)
]
MASKS['trash_can']['normal']['left_arm']=[
 (5,140),(79,137),(82,211),(70,229),(0,222)
]
MASKS['trash_can']['normal']['right_arm']=[
 (205,139),(256,136),(256,227),(205,224)
]
MASKS['trash_can']['critical']['left_arm']=[
 (0,135),(76,132),(77,215),(0,225)
]
MASKS['trash_can']['critical']['right_arm']=[
 (207,130),(256,128),(256,228),(208,222)
]

# Explicit motion paths, not scatter directions or a fragment grid.
# Each point is (x-offset, y-offset, rotation degrees) sampled at 5 beats.
# The main facial and body pixels stay intact throughout.
MOTION = {
 "big_zombie": {
  "normal": {
   "torso": [(0,0,0),(-3,4,-3),(-9,11,-7),(-15,21,-13),(-15,24,-14)],
   "head": [(0,0,0),(-5,-4,-6),(-14,-9,-14),(-20,2,-23),(-25,13,-33)],
   "cap": [(0,0,0),(1,-10,8),(7,-20,22),(12,-7,44),(17,14,66)],
   "left_arm": [(0,0,0),(-10,-2,-20),(-24,-14,-49),(-35,0,-78),(-37,24,-107)],
   "right_arm": [(0,0,0),(10,-8,17),(24,-10,46),(31,5,78),(36,23,103)],
   "left_boot": [(0,0,0),(-9,4,-5),(-19,11,-19),(-27,20,-39),(-29,28,-57)],
   "right_boot": [(0,0,0),(6,7,7),(13,15,18),(21,22,33),(25,29,52)]
  },
  "critical": {
   "torso": [(0,0,0),(2,-6,0),(9,-15,10),(15,-7,21),(21,24,31)],
   "head": [(0,0,0),(-6,-16,-9),(-23,-35,-27),(-45,-47,-58),(-62,-40,-87)],
   "cap": [(0,0,0),(13,-20,21),(28,-54,73),(58,-69,132),(76,-54,205)],
   "left_arm": [(0,0,0),(-14,-13,-23),(-39,-30,-66),(-69,-23,-109),(-83,9,-151)],
   "right_arm": [(0,0,0),(17,-15,19),(48,-39,58),(76,-24,109),(87,8,157)],
   "left_boot": [(0,0,0),(-8,-4,-8),(-29,-17,-37),(-57,7,-82),(-70,32,-124)],
   "right_boot": [(0,0,0),(8,-4,10),(32,-19,39),(54,5,78),(68,38,127)]
  }
 },
 "trash_can": {
  "normal": {
   "torso": [(0,0,0),(-4,2,-4),(-9,10,-12),(-17,17,-23),(-20,21,-29)],
   "lid": [(0,0,0),(4,-6,11),(15,-18,42),(23,-5,85),(25,20,119)],
   "left_arm": [(0,0,0),(-9,1,-14),(-21,-6,-36),(-29,8,-68),(-31,22,-93)],
   "right_arm": [(0,0,0),(10,-2,14),(22,-7,37),(33,8,67),(35,25,94)],
   "left_boot": [(0,0,0),(-5,1,-6),(-14,10,-22),(-24,19,-47),(-28,30,-69)],
   "right_boot": [(0,0,0),(5,3,7),(14,11,22),(26,20,44),(30,29,67)]
  },
  "critical": {
   "torso": [(0,0,0),(0,0,0),(-2,10,-4),(-11,18,-12),(-16,29,-24)],
   "lid": [(0,0,0),(11,-22,14),(27,-51,48),(55,-67,108),(80,-60,178)],
   "contents": [(0,0,0),(-5,-14,-6),(-11,-41,-29),(-18,-73,-68),(-26,-84,-117)],
   "left_arm": [(0,0,0),(-12,-6,-19),(-34,-23,-59),(-59,-27,-108),(-78,4,-156)],
   "right_arm": [(0,0,0),(14,-8,16),(35,-30,52),(58,-24,104),(73,9,155)],
   "left_boot": [(0,0,0),(-7,0,-9),(-19,-12,-33),(-40,2,-78),(-51,25,-122)],
   "right_boot": [(0,0,0),(7,0,9),(20,-13,35),(42,5,78),(55,30,117)]
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
 if err.getbbox():
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
 source_frame=29 if critical else 27
 source=atlas_frame(atlas,source_frame)
 parts=pieces_from_source(source,key,kind)
 # Four living/impact key poses from authentic HD artwork.
 initial=[0,24,28,29] if critical else [0,24,25,26,27]
 split_start=len(initial)
 # Keep the face mask always intact; no eyes/mouth subpieces.
 assert 'torso' in parts and ('cap' in parts if key=='big_zombie' else 'lid' in parts)
 result=Image.new('RGBA',(CELL*COUNT,CELL),(0,0,0,0))
 for f in range(COUNT):
  frame=Image.new('RGBA',(CELL,CELL),(0,0,0,0))
  if f<split_start:
   frame.alpha_composite(atlas_frame(atlas,initial[f]),ORIGIN)
  else:
   t=(f-split_start)/(COUNT-1-split_start)
   paths=MOTION[key][kind]
   # In front-to-back order, source artwork stays source-accurate.
   for name in ['left_boot','right_boot','torso','contents','left_arm','right_arm','head','lid','cap']:
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
   thumb=tile.resize((250,250),Image.Resampling.LANCZOS)
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
   print(f'PASS {dst.relative_to(ROOT)} bytes={dst.stat().st_size}')
   animations[kind]=composed
  if not args.verify:make_preview(key,animations)
 print('All 4 P3 v104 original-HD anatomy-based sprite strips generated.')

if __name__=='__main__':
 main()

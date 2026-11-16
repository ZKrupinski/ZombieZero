#!/usr/bin/env python3
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
root=Path(__file__).resolve().parent.parent
src=root/'dist/assets/ip/v2'
dst=root/'docs/p3-portraits-debug.jpg'
names=['big_zombie','trash_can']
indices=[0,24,25,26,27,28,29]
sheet=Image.new('RGB',(len(indices)*256,len(names)*284),'#cdd4dc')
d=ImageDraw.Draw(sheet)
for row,name in enumerate(names):
 atlas=Image.open(src/f'{name}_hd.png').convert('RGBA')
 for col,idx in enumerate(indices):
  tile=atlas.crop(((idx%8)*256,(idx//8)*256,(idx%8+1)*256,(idx//8+1)*256))
  solid=Image.new('RGBA',tile.size,'#dfedf0')
  solid.alpha_composite(tile)
  sheet.paste(solid.convert('RGB'),(col*256,row*284+24))
  alpha=tile.getchannel('A')
  box=alpha.getbbox()
  d.text((col*256+7,row*284+6),f'{name} / {idx} / {box}',fill='black')
sheet.save(dst,quality=85,optimize=True)
print(dst,dst.stat().st_size)

# Grid overlay for QA: accurately locate seams against the original pixels.
close=Image.new('RGB',(4*512,2*548),'#eef2f4')
d=ImageDraw.Draw(close)
for row,name in enumerate(names):
 atlas=Image.open(src/f'{name}_hd.png').convert('RGBA')
 for col,idx in enumerate([26,27,28,29]):
  cell=atlas.crop(((idx%8)*256,(idx//8)*256,(idx%8+1)*256,(idx//8+1)*256))
  tile=Image.new('RGBA',(256,256),'#ecf3f8')
  tile.alpha_composite(cell)
  tile=tile.resize((512,512),Image.Resampling.NEAREST).convert('RGB')
  xx,yy=col*512,row*548+25
  close.paste(tile,(xx,yy))
  for c in range(0,257,32):
   u=xx+c*2
   d.line((u,yy,u,yy+512),fill='#a9bec3',width=1)
   d.text((u+2,yy+2),str(c),fill='#45545d')
   v=yy+c*2
   d.line((xx,v,xx+512,v),fill='#a9bec3',width=1)
   d.text((xx+2,v+2),str(c),fill='#45545d')
  d.text((xx+10,yy-22),f'{name}: {idx}',fill='black')
dst=root/'docs/p3-original-grid-debug.jpg'
close.save(dst,quality=93,optimize=True)
print(dst,dst.stat().st_size)

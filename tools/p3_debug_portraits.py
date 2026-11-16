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

#!/usr/bin/env python3
"""Temporary original HD sprite alpha connected-component inspection."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=root/"dist/assets/ip/v2/trash_can_hd.png"
image=Image.open(source).convert("RGBA")
assert image.size==(2048,1024)
frames=[0,24,26,27,28,29]
out=Image.new("RGB",(3*560,2*590),"#eaf0f5")
drawer=ImageDraw.Draw(out)
stats=[]
for index,k in enumerate(frames):
 x=(k%8)*256;y=(k//8)*256
 tile=image.crop((x,y,x+256,y+256))
 aa=tile.getchannel("A")
 a=aa.load()
 visited=bytearray(256*256)
 regions=[]
 for yy in range(256):
  for xx in range(256):
   q=yy*256+xx
   if visited[q] or a[xx,yy]<50:continue
   stack=[q];visited[q]=1; pixels=[]
   while stack:
    v=stack.pop();pixels.append(v)
    vx=v%256;vy=v//256
    for sy in range(max(0,vy-1),min(256,vy+2)):
     for sx in range(max(0,vx-1),min(256,vx+2)):
      z=sy*256+sx
      if not visited[z] and a[sx,sy]>=50:visited[z]=1;stack.append(z)
   if len(pixels)>15:
    b=(min(p%256 for p in pixels),min(p//256 for p in pixels),
       max(p%256 for p in pixels)+1,max(p//256 for p in pixels)+1)
    regions.append((len(pixels),b))
 regions.sort(reverse=True)
 stats.append(f"frame {k}: regions >=16px: {regions[:20]}")
 bg=Image.new("RGBA",(256,256),"#e7eff4");bg.alpha_composite(tile)
 canvas=bg.convert("RGB").resize((512,512))
 draw=ImageDraw.Draw(canvas)
 colors=["#ed4500","#05a455","#155df0","#cf00cf","#ac8c0d"]
 for j,(area,b) in enumerate(regions[:8]):
  draw.rectangle(tuple(2*v for v in b),outline=colors[j%5],width=2)
  draw.text((2*b[0]+2,2*b[1]+4),f"{j}:{area}",fill=colors[j%5],stroke_width=1,stroke_fill="white")
 ix=(index%3)*560
 iy=(index//3)*590+30
 out.paste(canvas,(ix,iy))
 drawer.text((ix+5,iy-23),f"ORIGINAL HD frame {k}, source {image.size}",fill="black")
path=root/"docs/p3-v105-component-inspect.jpg"
out.save(path,quality=90,optimize=True)
stat=root/"docs/p3-v105-alpha-components.txt"
stat.write_text("\n".join(stats),encoding="utf-8")
print("\n".join(stats))

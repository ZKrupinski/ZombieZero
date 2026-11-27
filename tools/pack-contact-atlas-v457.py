"""Pack the exact approved v457 art into twelve isolated transparent frames.
No procedural redraw and no upscaling. Center with transparent padding.
"""
from pathlib import Path
from PIL import Image, ImageChops
import hashlib

SRC=Path("art-source/impact-bursts-v457-approved.png")
DST=Path("dist/assets/fx/impact-bursts-v457-approved.png")
CELL=384
def main():
    data=SRC.read_bytes()
    assert hashlib.sha1(b"blob "+str(len(data)).encode()+b"\x00"+data).hexdigest()=="5caa050ea68bb18c601a17684e16a845131dc6ab"
    with Image.open(SRC) as original:
        assert original.size==(1536,1024) and original.mode=="RGBA"
        im=original.convert("RGBA")
    atlas=Image.new("RGBA",(4*CELL,3*CELL))
    for i in range(12):
        x=i%4*384
        y=round(i//4*1024/3)
        y1=round((i//4+1)*1024/3)
        tile=im.crop((x,y,x+384,y1))
        # Remove only near-transparent dust and taper five outer source
        # pixels so adjacent cell remnants cannot produce a rectangular edge.
        alpha=tile.getchannel("A").point(lambda v:0 if v<=12 else round((v-12)*255/242) if v<254 else 255)
        w,h=tile.size
        edge=Image.new("L",(w,h))
        edge.putdata([min(255,round(min(xx,yy,w-1-xx,h-1-yy)*255/5))
                      for yy in range(h) for xx in range(w)])
        tile.putalpha(ImageChops.multiply(alpha,edge))
        bbox=tile.getchannel("A").getbbox()
        assert bbox
        tile=tile.crop(bbox)
        tile.thumbnail((320,320),Image.Resampling.LANCZOS)
        atlas.paste(tile,(i%4*CELL+(CELL-tile.width)//2,i//4*CELL+(CELL-tile.height)//2))
    for i in range(12):
        x,y=i%4*CELL,i//4*CELL
        box=atlas.crop((x,y,x+CELL,y+CELL)).getchannel("A").getbbox()
        assert box and min(box[:2])>=30 and max(box[2:])<=354
    atlas.save(DST,"PNG",optimize=True)
    print(f"V457 approved source packed: 12 x 384px, {DST.stat().st_size} bytes")
if __name__=="__main__":
    main()

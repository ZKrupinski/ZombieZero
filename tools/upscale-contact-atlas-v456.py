"""V456: reconstruct the approved 12 monochrome contact sprites at 4x.
No redraw, no new shapes. Resample premultiplied RGBA separately per cell
to preserve ink, transparency and halftone while reducing stair-step edges.
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops, ImageStat
ROOT=Path("dist/assets/fx")
SRC=ROOT/"impact-bursts-mono-v123.png"
DST=ROOT/"impact-bursts-mono-v456-hd.png"
CELL=64
SCALE=4
def main():
    with Image.open(SRC) as f: original=f.convert("RGBA")
    assert original.size==(256,192)
    atlas=Image.new("RGBA",(1024,768))
    for i in range(12):
        x,y=i%4*CELL,i//4*CELL
        tile=original.crop((x,y,x+CELL,y+CELL))
        # Premultiply before interpolation, so transparent RGB cannot
        # contaminate the outline. Smooth subpixel steps, not the whole art.
        premul=tile.convert("RGBa")
        enlarged=premul.resize((256,256),Image.Resampling.LANCZOS)
        # Pillow filters RGBa via individual bands (including alpha).
        bands=[band.filter(ImageFilter.GaussianBlur(.75)) for band in enlarged.split()]
        enlarged=Image.merge("RGBa",bands).convert("RGBA")
        assert enlarged.getchannel("A").getbbox()
        # Verify that the resampled shape still matches the source at its
        # original scale and that neutral monochrome ink stays neutral.
        back=enlarged.resize((64,64),Image.Resampling.LANCZOS)
        diff=ImageChops.difference(tile.getchannel("A"),back.getchannel("A"))
        assert ImageStat.Stat(diff).mean[0]<12,(i,ImageStat.Stat(diff).mean)
        r,g,b,a=enlarged.split()
        assert ImageChops.difference(r,g).getbbox() is None
        assert ImageChops.difference(g,b).getbbox() is None
        atlas.paste(enlarged,(x*SCALE,y*SCALE))
    atlas.save(DST,"PNG",optimize=True)
    assert DST.stat().st_size<600000
    print(f"V456: 12 original contact sprites, 64 to 256 px/cell; {DST.stat().st_size} bytes")
if __name__=="__main__":
    main()

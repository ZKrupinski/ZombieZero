"""V455: clean baked white/gray matte on the production death strips.
Offline only. Keep original images in Git, no generated replacement art.
Green has neutral checkerboard gaps; bag material is itself white; bosses
have a broad pale background. Use species-specific masks and per-cell bounds.
"""
from collections import deque
from pathlib import Path
import argparse, json, re
from PIL import Image, ImageDraw

ROOT=Path("dist/assets/ip/deaths-v307")
GEO=ROOT.parent/"death-strips-v307.js"
GREEN=[f"green-{kind}{hair}" for kind in ("normal","critical")
       for hair in ("","-chestnut","-blond","-red")]
TARGETS={**{name:"green" for name in GREEN},
         "volume_bag-death":"white_bag",
         "water_jug-death":"boss",
         "large_trash-death":"boss",
         "water_bottle-death":"bottle",
         "trash_bag-death":"dark_bag"}

def clean_frame(im, mode, frame):
    w,h=im.size
    pixels=list(im.getdata())
    n=w*h
    levels=[min(p[:3]) for p in pixels]
    spreads=[max(p[:3])-min(p[:3]) for p in pixels]
    alpha=[p[3] for p in pixels]
    def neighbors(i):
        x=i%w
        if x: yield i-1
        if x+1<w: yield i+1
        if i>=w: yield i-w
        if i+w<n: yield i+w
    def exposed(i):
        return any(alpha[j]<=12 for j in neighbors(i))
    def matte(i):
        if alpha[i]<=12: return False
        lo,sp,a=levels[i],spreads[i],alpha[i]
        if mode=="green": return lo>=150 and sp<=28
        if mode=="boss": return lo>=155 and sp<=40
        if mode=="white_bag": return lo>=145 and sp<=10 and (lo<=232 or a<225)
        if mode=="bottle": return lo>=140 and sp<=12
        return lo>=65 and sp<=7
    eligible=bytearray(matte(i) for i in range(n))
    # Identify flat neutral 3x3 patches: the baked checker cells have hard
    # rectangular plateaus, unlike shaded facets, eyes or colored splash.
    flat=bytearray(n)
    for y in range(1,h-1):
        for x in range(1,w-1):
            i=y*w+x
            if not eligible[i]: continue
            v=levels[i]
            area=(i-w-1,i-w,i-w+1,i-1,i,i+1,i+w-1,i+w,i+w+1)
            if all(eligible[j] and abs(levels[j]-v)<=7 for j in area):
                flat[i]=1
    visited=bytearray(n)
    removed=bytearray(n)
    for start in range(n):
        if not eligible[start] or visited[start]: continue
        visited[start]=1
        q=deque([start])
        comp=[]
        edge=[]
        gray=light=0
        flat_min,flat_max=255,0
        while q:
            i=q.popleft();comp.append(i)
            if exposed(i): edge.append(i)
            if flat[i]:
                v=levels[i]
                flat_min=min(flat_min,v);flat_max=max(flat_max,v)
                if v<235: gray+=1
                else: light+=1
            for j in neighbors(i):
                if eligible[j] and not visited[j]:
                    visited[j]=1;q.append(j)
        # White highlights inside the body are not connected to the exterior.
        # In the green explosion only, enclosed checker gaps are also valid
        # removal targets when BOTH flat contrasting matte tones are present.
        enclosed_checker=(mode=="green" and frame>=3 and not edge and
                          gray>=6 and light>=4 and flat_max-flat_min>=20)
        if enclosed_checker:
            for i in comp: removed[i]=1
            continue
        if not edge: continue
        if mode=="green":
            # Extend the previous 12px perimeter fix into exposed matte gaps.
            # Actual yellow/orange rays and green fragments cannot enter mask.
            if gray>=3 or len(comp)>=12:
                for i in comp: removed[i]=1
        elif mode=="boss":
            # Broad pale background on jug and big bag; never flood into
            # saturated blue water, purple fabric, or colored debris.
            if len(comp)>=20 and (gray>=3 or len(edge)>=5):
                for i in comp: removed[i]=1
        else:
            # White cloth and gray caps are actual art. Require flat matte
            # plateaus, and limit the pass to a narrow exterior band.
            if gray<3: continue
            limit=10 if mode=="white_bag" else 9 if mode=="bottle" else 7
            depth={i:0 for i in edge}
            queue=deque(edge)
            while queue:
                i=queue.popleft();d=depth[i]
                # Opaque pale artwork with no checker-like flat neighborhood
                # is not removed just for being near the silhouette.
                local_flat=flat[i] or any(flat[j] for j in neighbors(i))
                if local_flat or alpha[i]<205 or d<=1:
                    removed[i]=1
                if d>=limit: continue
                for j in neighbors(i):
                    if eligible[j] and j not in depth:
                        depth[j]=d+1;queue.append(j)
    # Clear diffuse low-alpha neutral fringe not attached to strong material.
    # Keep one antialiased pixel along a true opaque silhouette.
    for i in range(n):
        if removed[i] or not (12<alpha[i]<130): continue
        if not eligible[i]: continue
        if not any(alpha[j]>=190 and not removed[j] for j in neighbors(i)):
            removed[i]=1
    out=[]
    count=0
    for i,p in enumerate(pixels):
        if removed[i]:
            assert eligible[i] and p[3]>12
            out.append((p[0],p[1],p[2],0));count+=1
        else: out.append(p)
    result=Image.new("RGBA",im.size);result.putdata(out)
    return result,count

def clean_green_specks(im):
    """V458: remove residual tiny exposed matte components without eroding art."""
    w,h=im.size
    pixels=list(im.getdata())
    n=w*h
    alpha=[p[3] for p in pixels]
    def neighbors(i):
        x,y=i%w,i//w
        for yy in range(max(0,y-1),min(h,y+2)):
            for xx in range(max(0,x-1),min(w,x+2)):
                j=yy*w+xx
                if j!=i: yield j
    def pale(p):
        return p[3]>0 and min(p[:3])>=155 and max(p[:3])-min(p[:3])<=48
    mask=bytearray(pale(p) for p in pixels)
    visited=bytearray(n)
    remove=bytearray(n)
    # A diagonal connection counts, and even a one-pixel component is tested.
    # Only a small exposed neutral cluster is removed; enclosed eyes/teeth and
    # larger white highlights are outside this pass.
    limit=11 if w>=200 else 4
    for start in range(n):
        if not mask[start] or visited[start]: continue
        visited[start]=1
        queue=deque([start])
        comp=[]
        exposed=[]
        while queue:
            i=queue.popleft()
            comp.append(i)
            ns=list(neighbors(i))
            if any(alpha[j]<=12 for j in ns) or len(ns)<8:
                exposed.append(i)
            for j in ns:
                if mask[j] and not visited[j]:
                    visited[j]=1
                    queue.append(j)
        if len(comp)<=limit and exposed and len(exposed)*2>=len(comp):
            for i in comp:
                # Preserve an opaque white detail supported by surrounding art.
                ns=list(neighbors(i))
                solid=sum(alpha[j]>=220 and not mask[j] for j in ns)
                if alpha[i]<220 or solid<=3:
                    remove[i]=1
    # Faint, neutral, anti-aliased dots on the actual perimeter can belong to
    # a larger component. Remove only those lacking a nearby opaque white core.
    for i,p in enumerate(pixels):
        if not mask[i] or p[3]>=190: continue
        ns=list(neighbors(i))
        if not (len(ns)<8 or any(alpha[j]<=12 for j in ns)): continue
        if any(mask[j] and alpha[j]>=220 and not remove[j] for j in ns): continue
        remove[i]=1
    out=Image.new("RGBA",im.size)
    out.putdata([(p[0],p[1],p[2],0) if remove[i] else p for i,p in enumerate(pixels)])
    return out,sum(remove)

def verify_green_specks():
    img=Image.new("RGBA",(240,320),(0,0,0,0))
    d=ImageDraw.Draw(img)
    d.rectangle((40,40,100,100),fill=(43,158,62,255))
    d.rectangle((60,60,65,65),fill=(255,255,255,255))
    d.rectangle((41,41,45,45),fill=(250,230,205,255))
    d.point((39,55),fill=(240,241,240,255))
    d.point((38,56),fill=(208,212,211,170))
    d.point((32,32),fill=(220,220,220,255))
    d.point((31,31),fill=(180,181,180,12))
    d.point((120,120),fill=(255,205,35,255))
    fixed,count=clean_green_specks(img)
    assert count==4, count
    for xy in ((39,55),(38,56),(32,32),(31,31)):
        assert fixed.getpixel(xy)[3]==0
    for xy in ((62,62),(42,42),(40,55),(120,120)):
        assert fixed.getpixel(xy)==img.getpixel(xy)
    assert all(p==q or (p[:3]==q[:3] and q[3]==0)
               for p,q in zip(img.getdata(),fixed.getdata()))

def clean_green_fallbacks():
    # The actual loader can fall back to v95 normal/critical or hair sheets.
    for kind in ("normal","critical"):
        paths=[ROOT.parent/("green-death-"+kind+"-v95.png")]
        paths += [ROOT.parent/("green-death-"+kind+"-v95-"+hair+".webp")
                  for hair in ("chestnut","blond","red")]
        for path in paths:
            if not path.exists(): continue
            with Image.open(path) as source: im=source.convert("RGBA")
            if im.size!=(768,128): continue
            out=im.copy()
            total=0
            for f in range(8):
                frame=im.crop((f*96,0,(f+1)*96,128))
                fixed,changed=clean_green_specks(frame)
                out.paste(fixed,(f*96,0))
                total+=changed
            if total:
                if path.suffix==".webp": out.save(path,"WEBP",lossless=True,method=4,exact=True)
                else: out.save(path,"PNG")
            print(f"V458 fallback {path.name}: {total} pixels",flush=True)

def bump_green_cache():
    # These are build-output files; both Android and Pages run this same tool.
    loader=ROOT.parent/"green-death-loader.js"
    data=loader.read_text()
    data=data.replace("v=360-v455","v=360-v455-v458")
    data=data.replace("?v=112-sharp-alpha","?v=112-sharp-alpha-v458")
    data=data.replace("+'-v95-'+color+'.webp'","+'-v95-'+color+'.webp?v=458'")
    loader.write_text(data)
    index=Path("dist/index.html")
    data=index.read_text()
    data=re.sub(r'(green-death-loader\.js\?v=[^"]+)',r'\1-v458-specks',data)
    index.write_text(data)
    sw=Path("dist/sw.js")
    data=sw.read_text()
    data=re.sub(r"(const CACHE='[^']+)(')",r"\1-v458-specks\2",data,count=1)
    sw.write_text(data)

def verify():
    # Exterior checker, interior colored body, eye, yellow explosion ray.
    img=Image.new("RGBA",(64,64),(0,0,0,0))
    d=ImageDraw.Draw(img)
    d.rectangle((5,5,58,58),fill=(191,191,191,255))
    d.rectangle((10,10,53,53),fill=(63,156,35,255))
    d.rectangle((15,15,24,24),fill=(255,255,255,255))
    d.rectangle((30,30,39,39),fill=(190,190,190,255))
    d.rectangle((40,30,49,39),fill=(255,255,255,255))
    d.rectangle((5,27,9,30),fill=(255,219,35,255))
    out,_=clean_frame(img,"green",5)
    assert out.getpixel((5,5))[3]==0
    assert out.getpixel((33,33))[3]==0 and out.getpixel((45,33))[3]==0
    assert out.getpixel((19,19))==img.getpixel((19,19))
    assert out.getpixel((7,28))==img.getpixel((7,28))
    # White 50L fabric is not a neutral checker tile, and its white eye
    # is enclosed by the colored body. Both must be preserved.
    bag=Image.new("RGBA",(48,48),(0,0,0,0));d=ImageDraw.Draw(bag)
    d.rectangle((5,5,42,42),fill=(190,190,190,255))
    d.rectangle((10,10,37,37),fill=(211,216,233,255))
    d.rectangle((16,16,23,23),fill=(255,255,255,255))
    out,_=clean_frame(bag,"white_bag",0)
    assert out.getpixel((6,6))[3]==0
    assert out.getpixel((10,10))==bag.getpixel((10,10))
    assert out.getpixel((19,19))==bag.getpixel((19,19))
    jug=Image.new("RGBA",(48,48),(0,0,0,0));d=ImageDraw.Draw(jug)
    d.rectangle((4,4,43,43),fill=(200,216,228,255))
    d.rectangle((12,12,35,35),fill=(61,155,221,255))
    out,_=clean_frame(jug,"boss",0)
    assert out.getpixel((6,6))[3]==0
    assert out.getpixel((13,13))==jug.getpixel((13,13))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--preview",type=Path)
    args=parser.parse_args()
    verify()
    verify_green_specks()
    geometry=json.loads(re.search(r"const geometry=(\{.*?\});",GEO.read_text(),re.S).group(1))
    preview=[]
    for name,mode in TARGETS.items():
        path=ROOT/(name+".webp")
        with Image.open(path) as src: im=src.convert("RGBA")
        if mode=="green": fw,fh,count=240,320,8
        else: _,_,_,fw,fh,count=geometry[name]
        assert im.size==(fw*count,fh),(name,im.size,fw,fh,count)
        out=Image.new("RGBA",im.size)
        counts=[]
        for f in range(count):
            cell=im.crop((f*fw,0,(f+1)*fw,fh))
            fixed,changed=clean_frame(cell,mode,f)
            if mode=="green":
                fixed,extra=clean_green_specks(fixed)
                changed+=extra
                print(f"V458 {name} frame {f}: {extra} residual specks",flush=True)
            assert fixed.size==cell.size
            # The repair is alpha-only; no new pixels, poses, or RGB changes.
            assert all(p==q or (p[:3]==q[:3] and q[3]==0)
                       for p,q in zip(cell.getdata(),fixed.getdata()))
            out.paste(fixed,(f*fw,0));counts.append(changed)
        if sum(counts):
            out.save(path,"WEBP",lossless=True,method=4,exact=True)
        print(f"V455 {name}: removed {sum(counts)} additional matte pixels; frames {counts}",flush=True)
        if args.preview and name not in [n for n in GREEN if n.endswith(("-chestnut","-blond","-red"))]:
            preview.append((name,im,out,fw,fh,count))
    clean_green_fallbacks()
    bump_green_cache()
    if args.preview:
        tw,th=96,110
        sheet=Image.new("RGB",(tw*8, len(preview)*(th*2+28)),"#21354a")
        pen=ImageDraw.Draw(sheet)
        for row,(name,before,after,fw,fh,count) in enumerate(preview):
            top=row*(th*2+28)
            pen.text((4,top+2),name+" | before (top) / after (bottom)",fill="white")
            for k,strip in enumerate((before,after)):
                for f in range(count):
                    cell=strip.crop((f*fw,0,(f+1)*fw,fh))
                    cell.thumbnail((tw-4,th-4),Image.Resampling.LANCZOS)
                    sheet.paste(cell,(f*tw+(tw-cell.width)//2,top+22+k*th+(th-cell.height)//2),cell)
        args.preview.parent.mkdir(parents=True,exist_ok=True)
        sheet.save(args.preview)
    print("V455/V458 death matte verification passed",flush=True)

if __name__=="__main__":
    main()

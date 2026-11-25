"""V363: repair existing source pixels for three reported sprite defects.
Runs offline during Pages packaging; no AI art, new animation or scale change.
The repository retains the original approved source sheets.
"""
from pathlib import Path
from collections import deque
from statistics import median
import re
from PIL import Image

ROOT=Path("dist/assets/ip")
DEATH=ROOT/"deaths-v307"
GEO=ROOT/"death-strips-v307.js"

def rgba(p):
    with Image.open(p) as im:
        return im.convert("RGBA")

def crop_cell(sheet,i,w,h):
    return sheet.crop((i*w,0,(i+1)*w,h))

def padded_strip(name, frames, side, x0=0, y0=0, margin=8):
    # All frames share a crop and anchor. Do not rescale any source pixels.
    boxes=[im.getchannel("A").getbbox() for im in frames]
    assert all(boxes), (name,boxes)
    l=min(b[0] for b in boxes)-margin
    t=min(b[1] for b in boxes)-margin
    r=max(b[2] for b in boxes)+margin
    b=max(b[3] for b in boxes)+margin
    w,h=r-l,b-t
    out=Image.new("RGBA",(w*len(frames),h))
    for i,frame in enumerate(frames):
        cell=frame.crop((l,t,r,b))
        bounds=cell.getchannel("A").getbbox()
        assert bounds[0]>=margin and bounds[1]>=margin
        assert bounds[2]<=w-margin and bounds[3]<=h-margin
        out.paste(cell,(w*i,0))
    path=DEATH/(name+".webp")
    out.save(path,"WEBP",lossless=True,method=4,exact=True)
    saved=rgba(path)
    assert saved.size==out.size
    # Pillow/WebP may normalize RGB under fully transparent pixels only.
    for a,z in zip(out.getdata(),saved.getdata()):
        assert a[3]==z[3] and (not a[3] or a[:3]==z[:3]), name
    entry=[side,l+x0,t+y0,w,h,len(frames)]
    print("V363",name,"geometry",entry,"original art with",margin,"px clearance",flush=True)
    return entry

def repair_trash():
    # v106 was authored with full 512px cells and fixed foot anchor.
    source=rgba(ROOT/"v2/p3-deaths/trash_can-critical-v106.png")
    assert source.size==(6144,512)
    frames=[crop_cell(source,i,512,512) for i in range(12)]
    # The old V307 crop can cut soft alpha; use the union of *all*
    # original frames, not just solid pixels, and add transparent margin.
    for i,cell in enumerate(frames):
        box=cell.getchannel("A").getbbox()
        assert box and box[1]>0 and box[3]<512,(i,box)
    return padded_strip("trash_can-critical",frames,512)

def near_color(a,b):
    return a[3]>=18 and b[3]>=18 and max(abs(a[k]-b[k]) for k in range(3))<=22

def repair_bottle():
    raw=rgba(ROOT/"v2/elites/water-bottle-v145.png")
    assert raw.size==(1344,1176)
    old=rgba(DEATH/"water_bottle-death.webp")
    assert old.size==(155*8,131)
    cells=[crop_cell(old,i,155,131) for i in range(8)]
    # The original last row is 168px per cell. Previous HIT-row bodies
    # end above this 32px band (see original cap regression test).
    # Recover original cap/droplet pixels across the old crop boundaries.
    W,H=1344,200
    src=raw.crop((0,976,W,1176))
    pixels=list(src.getdata())
    owner=[-1]*(W*H)
    distance=[10**6]*(W*H)
    q=deque()
    # Match existing V307 pixels to the original sheet. Seed the flood
    # only with matching source pixels, never with an adjacent sprite.
    match_counts=[]
    for f,cell in enumerate(cells):
        cp=list(cell.getdata())
        match=solid=0
        for y in range(131):
            for x in range(155):
                a=cp[y*155+x]
                if a[3]<64: continue
                solid+=1
                pos=(y+32)*W+f*168+13+x
                if near_color(a,pixels[pos]):
                    match+=1
                    if owner[pos]<0:
                        owner[pos]=f;distance[pos]=0;q.append(pos)
        match_counts.append((match,solid))
    # Registration is a prerequisite: never substitute unrelated pixels.
    print("V363 bottle source registration",match_counts,flush=True)
    assert all(total and matched/total>=0.65 for matched,total in match_counts), match_counts
    # Propagate ownership only through actual original opaque components,
    # max 32px from a trusted pixel. This reattaches caps and crossing drops.
    while q:
        k=q.popleft()
        if distance[k]>=32: continue
        x,y=k%W,k//W
        for yy in range(max(0,y-1),min(H,y+2)):
            for xx in range(max(0,x-1),min(W,x+2)):
                j=yy*W+xx
                if owner[j]>=0 or pixels[j][3]<12: continue
                f=owner[k]
                if xx<f*168-24 or xx>=(f+1)*168+24: continue
                owner[j]=f;distance[j]=distance[k]+1;q.append(j)
    # Recover detached blue water droplets in the old left/right margins
    # only if they are within 12px of a trusted same-frame component.
    # Do not bring in unrelated hit-row fragments.
    seen=bytearray(W*H)
    for k,a in enumerate(pixels):
        if seen[k] or owner[k]>=0 or a[3]<18: continue
        seen[k]=1; group=[k]; adjacent={}
        for j in group:
            x,y=j%W,j//W
            for yy in range(max(0,y-1),min(H,y+2)):
                for xx in range(max(0,x-1),min(W,x+2)):
                    u=yy*W+xx
                    if owner[u]>=0: adjacent[owner[u]]=adjacent.get(owner[u],0)+1
                    elif not seen[u] and pixels[u][3]>=18:
                        seen[u]=1;group.append(u)
        if adjacent:
            f=max(adjacent,key=adjacent.get)
        else:
            # Only blue disconnected droplets, near an already assigned
            # same-frame water component. Never duplicate a full cap/face.
            if not 3<=len(group)<=260: continue
            blue=sum(pixels[j][2]>pixels[j][0]+15 and pixels[j][2]>=pixels[j][1] for j in group)
            if blue<len(group)*0.65: continue
            gx=round(sum(j%W for j in group)/len(group))
            gy=round(sum(j//W for j in group)/len(group))
            if gy<32: continue
            for yy in range(max(32,gy-12),min(H,gy+13)):
                for xx in range(max(0,gx-12),min(W,gx+13)):
                    u=yy*W+xx
                    if owner[u]>=0 and distance[u]<=16:
                        f0=owner[u]
                        adjacent[f0]=adjacent.get(f0,0)+1
            if not adjacent: continue
            f=max(adjacent,key=adjacent.get)
        if not all(f*168-24<=j%W<(f+1)*168+24 for j in group): continue
        if len(group)>1200: continue
        for j in group: owner[j]=f
    # Preserve every already-visible V307 source pixel. Extend the frame
    # on a padded canvas; add recovered pixels only beyond the old crop.
    fixed=[]; added=[]
    for f,cell in enumerate(cells):
        im=Image.new("RGBA",(216,200))
        im.paste(cell,(37,32))
        p=im.load(); n=top=side=0
        for y in range(H):
            for x in range(max(0,f*168-24),min(W,(f+1)*168+24)):
                j=y*W+x
                if owner[j]!=f or pixels[j][3]==0: continue
                lx=x-f*168+24
                if 37<=lx<192 and 32<=y<163: continue
                p[lx,y]=pixels[j]; n+=1
                top+=y<32; side+=lx<37 or lx>=192
        # Retain all existing nontransparent pixels and old alignment.
        assert im.crop((37,32,192,163)).tobytes()==cell.tobytes()
        fixed.append(im);added.append((n,top,side))
    print("V363 bottle recovered actual pixels (total,top,side)",added,flush=True)
    # If the source does not contain recoverable art, do not claim that a
    # transparent margin by itself repairs a severed cap.
    assert sum(a[1] for a in added)>0, "No original cap pixels recovered"
    assert sum(a[2] for a in added)>0, "No original side splash pixels recovered"
    return padded_strip("water_bottle-death",fixed,168,x0=-24,y0=-32)

def is_yellow(p):
    r,g,b,a=p
    return a>=230 and r>=110 and g>=65 and r>=g and g>=b+28 and r>=b+45

def is_pink(p):
    r,g,b,a=p
    return a>=180 and r>=105 and r>g+35 and b>g+10

def clean_yellow():
    path=ROOT/"v2/yellow_brain_cube.png"
    src=rgba(path)
    assert src.size==(1024,512)
    out=src.copy()
    counts=[]
    for frame in range(30):
        ox,oy=(frame%8)*128,(frame//8)*128
        cell=src.crop((ox,oy,ox+128,oy+128))
        data=list(cell.getdata()); dst=data.copy()
        # Locate only the exposed pink brain at the top of each original
        # pose. Never change facial features, legs, side bolts or alpha.
        pink=[(x,y) for y in range(2,60) for x in range(10,118)
              if is_pink(data[y*128+x])]
        if len(pink)<10: counts.append(0);continue
        bx0=min(x for x,y in pink);bx1=max(x for x,y in pink)
        by0=min(y for x,y in pink);by1=max(y for x,y in pink)
        n=0
        for y in range(max(3,by0-14),min(57,by1+10)):
            for x in range(max(3,bx0-32),min(125,bx1+33)):
                k=y*128+x; a=data[k]
                if a[3]<230 or is_pink(a): continue
                near=[data[(y+dy)*128+x+dx] for dy in (-1,0,1) for dx in (-1,0,1) if dx or dy]
                # Respect silhouettes and the crisp pink/yellow boundary.
                if any(p[3]<230 or is_pink(p) for p in near): continue
                if sum(is_yellow(p) for p in near)<6: continue
                neighbors=[data[(y+dy)*128+x+dx] for dy in range(-2,3) for dx in range(-2,3)
                           if (dx or dy) and is_yellow(data[(y+dy)*128+x+dx])]
                if len(neighbors)<15: continue
                m=tuple(int(median(p[c] for p in neighbors)) for c in range(3))
                # Avoid original bevel/rim edges: both sides of the outlier
                # must be populated by substantially the same yellow material.
                close=sum(max(abs(p[c]-m[c]) for c in range(3))<=22 for p in neighbors)
                if close<len(neighbors)*.7: continue
                if max(abs(a[c]-m[c]) for c in range(3))<14: continue
                if not is_yellow(a) and (sum(a[:3])>sum(m)+30 or sum(a[:3])<80): continue
                dst[k]=(*m,a[3]);n+=1
        counts.append(n)
        if n: out.paste(Image.new("RGBA",(128,128)),(ox,oy)); cell.putdata(dst);out.paste(cell,(ox,oy))
    assert out.getchannel("A").tobytes()==src.getchannel("A").tobytes()
    assert sum(counts)>0, "No yellow top-plane outliers detected"
    out.save(path,"PNG",optimize=True)
    assert rgba(path).tobytes()==out.tobytes()
    print("V363 yellow upper-plane speck removal",sum(counts),"pixels",counts,flush=True)

def main():
    trash=repair_trash()
    bottle=repair_bottle()
    clean_yellow()
    text=GEO.read_text(encoding="utf-8")
    for key,entry in (("trash_can-critical",trash),("water_bottle-death",bottle)):
        replacement='"'+key+'":['+", ".join(map(str,entry))+']'
        text,count=re.subn(r'"'+re.escape(key)+r'":\[[^\]]+\]',replacement,text)
        assert count==1,key
    GEO.write_text(text,encoding="utf-8")
    print("V363 sprite repair verification passed",flush=True)

if __name__=="__main__":
    main()

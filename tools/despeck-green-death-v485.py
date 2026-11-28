"""Final green death cleanup: isolated white dots and pale matte pinholes.
Operate once during packaging, after V484. Never resample artwork.
"""
from pathlib import Path
from collections import Counter
from statistics import median
from PIL import Image
import re
ROOT=Path('dist/assets/ip')

def clean(cell):
    w,h=cell.size; p=list(cell.getdata()); out=p.copy(); n=w*h
    scale=1 if w>=200 else .4
    tiny=max(2,round(12*scale*scale)); small=max(3,round(22*scale*scale))
    stats=Counter()
    def nb(i,r=1):
        x,y=i%w,i//w
        for yy in range(max(0,y-r),min(h,y+r+1)):
            for xx in range(max(0,x-r),min(w,x+r+1)):
                j=yy*w+xx
                if i!=j:yield j
    def bright(v):return min(v[:3])>=145 and max(v[:3])-min(v[:3])<=95 and max(v[:3])>=190
    def neutral(v):return min(v[:3])>=155 and max(v[:3])-min(v[:3])<=52
    def groups(mask):
        seen=bytearray(n)
        for i in range(n):
            if seen[i] or not mask[i]:continue
            seen[i]=1;g=[i]
            for j in g:
                for k in nb(j):
                    if mask[k] and not seen[k]:seen[k]=1;g.append(k)
            yield g
    # Remove tiny detached light-colored islands, including opaque dots.
    for g in groups(bytearray(v[3]>=8 for v in p)):
        if len(g)>tiny:continue
        strong=[p[i] for i in g if p[i][3]>=35]
        if strong and sum(bright(v) for v in strong)*2>=len(strong):
            for i in g:out[i]=(0,0,0,0)
            stats['detached']+=len(g)
    q=out.copy()
    # Small white clusters attached to material: sample the local color.
    # Preserve white eyes and teeth bordered by dark facial ink.
    for g in groups(bytearray(v[3]>=8 and neutral(v) for v in q)):
        if len(g)>small:continue
        gs=set(g); boundary={j for i in g for j in nb(i) if j not in gs}
        air=sum(q[j][3]<32 for j in boundary)
        dark=sum(q[j][3]>=180 and max(q[j][:3])<100 for j in boundary)
        if not air and dark>=max(2,len(boundary)//5):continue
        material=[q[j] for j in boundary if q[j][3]>=200 and not bright(q[j]) and max(q[j][:3])>=75]
        if len(material)<3:
            if air>=len(boundary)*.6 and len(g)<=tiny:
                for i in g:out[i]=(0,0,0,0)
                stats['edge_dot']+=len(g)
            continue
        m=tuple(round(median(v[c] for v in material)) for c in range(3))
        consistent=sum(max(abs(v[c]-m[c]) for c in range(3))<=42 for v in material)
        if consistent<len(material)*.7 or max(m)-min(m)<18:continue
        if not air and len(g)>max(2,tiny//2):continue
        if sum(m)>sum(q[g[0]][:3])-75:continue
        if any(v[0]>190 and v[1]>120 and v[0]>v[2]+45 for v in material):continue
        for i in g:
            r,gg,b,a=q[i];out[i]=(*m,a)
        stats['surface_dot']+=len(g)
    # Tiny cream sparks read as white dots at gameplay scale. Preserve
    # their silhouette but use warm yellow instead of nearly white RGB.
    for g in groups(bytearray(v[3]>=8 for v in out)):
        if len(g)>max(12,round(40*scale*scale)):continue
        vals=[out[i] for i in g if out[i][3]>=64]
        if not vals:continue
        warm=sum(v[0]>=180 and v[1]>=100 and v[0]>=v[2]+25 for v in vals)
        if warm<len(vals)*.55:continue
        for i in g:
            r,gg,b,a=out[i]
            if r>=190 and gg>=165 and b>=125 and r>=b:
                out[i]=(r,min(gg,214),min(b,95),a);stats['warm_spark']+=1
    assert all(a[3]>=b[3] for a,b in zip(p,out))
    result=Image.new('RGBA',cell.size);result.putdata(out);return result,stats

def sheet(im,fw,fh,cols,rows=1):
    assert im.size==(fw*cols,fh*rows),im.size
    out=Image.new('RGBA',im.size);total=Counter()
    for row in range(rows):
        for col in range(cols):
            x,y=col*fw,row*fh
            f,s=clean(im.crop((x,y,x+fw,y+fh)));out.paste(f,(x,y));total.update(s)
    return out,total

def repair(path,fw,fh,cols,rows=1):
    with Image.open(path) as src:im=src.convert('RGBA')
    fixed,stats=sheet(im,fw,fh,cols,rows)
    if sum(stats.values()):
        if path.suffix=='.webp':fixed.save(path,'WEBP',lossless=True,method=4,exact=True)
        else:fixed.save(path,'PNG')
        with Image.open(path) as check:
            assert check.size==im.size and check.convert('RGBA').getchannel('A').tobytes()==fixed.getchannel('A').tobytes()
    print('V485',path.name,dict(stats),flush=True)

def verify():
    from PIL import ImageDraw
    im=Image.new('RGBA',(240,320));d=ImageDraw.Draw(im)
    d.rectangle((30,30,100,100),fill=(45,130,30,255))
    d.rectangle((45,45,70,65),fill=(250,250,250,255))
    d.rectangle((42,75,65,85),fill=(20,15,18,255))
    d.rectangle((49,76,51,79),fill=(245,245,245,255))
    im.putpixel((80,80),(245,245,245,255));im.putpixel((20,20),(240,240,240,255))
    d.rectangle((140,140,148,148),fill=(255,200,30,255));im.putpixel((145,145),(255,250,230,255))
    fixed,s=clean(im)
    assert fixed.getpixel((20,20))[3]==0 and fixed.getpixel((80,80))==(45,130,30,255),s
    for xy in ((50,50),(50,77),(145,145)):
        assert fixed.getpixel(xy)==im.getpixel(xy),(xy,s)

def main():
    verify()
    for kind in ('normal','critical'):
        for hair in ('','-chestnut','-blond','-red'):
            repair(ROOT/'deaths-v307'/f'green-{kind}{hair}.webp',240,320,8)
            ext='webp' if hair else 'png'
            repair(ROOT/f'green-death-{kind}-v95{hair}.{ext}',96,128,8)
    loader=ROOT/'green-death-loader.js';s=loader.read_text();s=s.replace('-v484','-v484-v485');loader.write_text(s)
    for path,pattern in ((Path('dist/index.html'),r'(green-death-loader\.js\?v=[^\"]+)'),(Path('dist/sw.js'),r"(const CACHE='[^']+)")):
        s=path.read_text();s,n=re.subn(pattern,r'\1-v485-despeck',s,count=1);assert n==1;path.write_text(s)

if __name__=='__main__':main()

"""V484: remove remaining green death edge matte from actual release strips.

Run after the original V360/V455/V458 alpha repair, in both Pages and APK.
Preserve frame layout, opaque interior art and intentional warm explosion rays.
No runtime pixel work or new artwork.
"""
from pathlib import Path
from PIL import Image, ImageFilter
from collections import Counter
import re

ROOT=Path("dist/assets/ip")

def defringe(cell):
    w,h=cell.size
    p=list(cell.getdata()); out=p.copy()
    a=cell.getchannel('A')
    radius=2 if w>=200 else 1
    band=list(a.filter(ImageFilter.MinFilter(radius*2+1)).getdata())
    inner=list(a.filter(ImageFilter.MinFilter(3)).getdata())
    count=Counter()
    def pale(v):
        return min(v[:3])>=155 and max(v[:3])-min(v[:3])<=55
    def warm(v):
        return v[0]>=195 and v[1]>=110 and v[0]>=v[2]+40 and v[1]>=v[2]+22
    for i,v in enumerate(p):
        r,g,b,al=v
        if not al or band[i]>32: continue
        x,y=i%w,i//w
        reach=radius+2
        near=[]
        for yy in range(max(0,y-reach),min(h,y+reach+1)):
            for xx in range(max(0,x-reach),min(w,x+reach+1)):
                j=yy*w+xx; d=(xx-x)**2+(yy-y)**2
                if not d or d>reach*reach or p[j][3]<220: continue
                near.append((d,j))
        near.sort()
        white_core=any(d<=radius*radius+1 and inner[j]>=200 and pale(p[j]) for d,j in near)
        if pale(v) and al<=210 and not white_core and not any(d<=4 and warm(p[j]) for d,j in near):
            if not near:
                out[i]=(0,0,0,0);count['speck']+=1;continue
        if white_core or warm(v): continue
        solid=[(d,j) for d,j in near if inner[j]>=180 and not pale(p[j])]
        if not solid: solid=[(d,j) for d,j in near if not pale(p[j])]
        if not solid:
            if pale(v) and al<150 and not near:
                out[i]=(0,0,0,0);count['speck']+=1
            continue
        d0=solid[0][0]; best=None
        for d,j in solid:
            if d>d0+4: break
            base=p[j][:3]
            if sum(v[:3])-sum(base)<42: continue
            for matte in (190,220,245,255):
                dv=tuple(matte-c for c in base)
                norm=sum(c*c for c in dv)
                if norm<2500: continue
                mix=sum((v[k]-base[k])*dv[k] for k in range(3))/norm
                if not .20<=mix<=1.10: continue
                mix=min(1.,mix)
                err=max(abs(v[k]-(base[k]+mix*dv[k])) for k in range(3))
                if err>18: continue
                if max(v[:3])-min(v[:3])>max(base)-min(base)+12: continue
                rank=err+d*.7
                if best is None or rank<best[0]:best=(rank,base,mix)
        if best:
            _,base,mix=best
            coverage=round(al*(1-mix)) if al>=230 else al
            if coverage<14: out[i]=(0,0,0,0)
            else: out[i]=(*base,coverage)
            count['edge']+=1
        elif pale(v) and al<110 and not white_core and not any(d<=4 and warm(p[j]) for d,j in near):
            out[i]=(0,0,0,0);count['speck']+=1
    # Every changed pixel is in the narrow alpha boundary band. No new
    # coverage is introduced, and the original opaque interior is identical.
    assert all(before==after or (band[i]<=32 and after[3]<=before[3])
               for i,(before,after) in enumerate(zip(p,out)))
    result=Image.new('RGBA',cell.size);result.putdata(out)
    return result,count

def clean_sheet(im,fw,fh,cols,rows=1):
    assert im.size==(fw*cols,fh*rows),im.size
    out=Image.new('RGBA',im.size); stats=Counter()
    for row in range(rows):
        for col in range(cols):
            x,y=col*fw,row*fh
            cell=im.crop((x,y,x+fw,y+fh))
            fixed,n=defringe(cell);out.paste(fixed,(x,y));stats.update(n)
    return out,stats

def read(path):
    with Image.open(path) as im: return im.convert('RGBA')

def save(path,im):
    if path.suffix=='.webp':im.save(path,'WEBP',lossless=True,method=4,exact=True)
    else:im.save(path,'PNG')
    check=read(path)
    assert check.size==im.size
    assert check.getchannel('A').tobytes()==im.getchannel('A').tobytes()

def repair(path,fw,fh,cols,rows=1,base=None):
    im=read(path)
    fixed,stats=clean_sheet(im,fw,fh,cols,rows)
    if base is not None:
        assert fixed.size==base.size
        # The hair is drawn as a second layer; never draw it outside the
        # solid base. Otherwise two antialiased edges compound their alpha.
        pixels=list(fixed.getdata())
        alpha=list(base.getchannel('A').getdata())
        for i,(r,g,b,a) in enumerate(pixels):
            if a and alpha[i]<245:
                pixels[i]=(0,0,0,0);stats['overlay_mask']+=1
        fixed.putdata(pixels)
    if sum(stats.values()):save(path,fixed)
    print('V484',path.name,dict(stats),flush=True)
    return fixed

def verify():
    from PIL import ImageDraw
    im=Image.new('RGBA',(48,48))
    d=ImageDraw.Draw(im)
    d.rectangle((10,10,37,37),fill=(45,130,30,255))
    d.rectangle((17,17,25,25),fill=(250,250,250,255))
    im.putpixel((9,20),(150,193,142,180))
    im.putpixel((4,4),(220,220,220,90))
    im.putpixel((9,24),(255,215,30,255))
    fixed,stats=defringe(im)
    assert stats['edge']>0 and fixed.getpixel((9,20))[:3]==(45,130,30)
    assert fixed.getpixel((4,4))[3]==0
    for xy in [(20,20),(12,20),(9,24)]:
        assert fixed.getpixel(xy)==im.getpixel(xy)

def bump():
    path=ROOT/'green-death-loader.js';s=path.read_text()
    s=s.replace('v=360-v455-v458','v=360-v455-v458-v484')
    s=s.replace('?v=112-sharp-alpha-v458','?v=112-sharp-alpha-v458-v484')
    s=s.replace('.webp?v=458','.webp?v=458-v484')
    s=s.replace("image.src='assets/ip/green-death.png';","image.src='assets/ip/green-death.png?v=484';")
    path.write_text(s)
    path=Path('dist/index.html');s=path.read_text()
    s,n=re.subn(r'(green-death-loader\.js\?v=[^"]+)',r'\1-v484-defringe',s,count=1)
    assert n==1
    path.write_text(s)
    path=Path('dist/sw.js');s=path.read_text()
    s,n=re.subn(r"(const CACHE='[^']+)(')",r"\1-v484-defringe\2",s,count=1)
    assert n==1
    path.write_text(s)

def main():
    verify()
    for kind in ('normal','critical'):
        hd=ROOT/'deaths-v307'
        b=repair(hd/('green-'+kind+'.webp'),240,320,8)
        for hair in ('chestnut','blond','red'):
            repair(hd/('green-'+kind+'-'+hair+'.webp'),240,320,8,base=b)
        b=repair(ROOT/('green-death-'+kind+'-v95.png'),96,128,8)
        for hair in ('chestnut','blond','red'):
            repair(ROOT/('green-death-'+kind+'-v95-'+hair+'.webp'),96,128,8,base=b)
    repair(ROOT/'green-death.png',48,48,10,2)
    bump()
    print('V484 green death defringe: all active HD and fallback sheets checked',flush=True)

if __name__=='__main__':
    main()

"""Remove baked pale matte at the perimeter of the approved green death strips.
Run during release, never during gameplay. Keep original source art in Git.
"""
from pathlib import Path
from collections import deque
from PIL import Image

ROOT = Path("dist/assets/ip/deaths-v307")
NAMES = [f"green-{kind}{hair}.webp" for kind in ("normal", "critical")
         for hair in ("", "-chestnut", "-blond", "-red")]

def clean_frame(im):
    w, h = im.size
    data = bytearray(im.tobytes())
    original = bytes(data)
    # Only nearly neutral pale pixels may be matte. Never cross saturated
    # green/red/yellow material, dark hair, mouth, or colored explosion rays.
    # Seed from transparent pixels, including gaps between flying body parts.
    # Bound travel to 12 HD pixels so enclosed eyes/teeth stay intact.
    dist = bytearray([255]) * (w*h)
    q = deque()
    for p in range(w*h):
        if original[4*p+3] <= 12:
            dist[p] = 0
            q.append(p)
    changed = 0
    while q:
        p = q.popleft()
        depth = dist[p]
        if depth >= 12:
            continue
        x, y = p % w, p // w
        for n in (p-1 if x else -1, p+1 if x+1<w else -1,
                  p-w if y else -1, p+w if y+1<h else -1):
            if n < 0 or dist[n] != 255:
                continue
            i = 4*n
            r,g,b,a = original[i:i+4]
            if min(r,g,b) < 150 or max(r,g,b)-min(r,g,b) > 42:
                continue
            dist[n] = depth+1
            q.append(n)
            # White/gray checker and alpha fringe are unwanted transparency.
            # Keep RGB data intact; only remove exposed matte alpha.
            data[i+3] = 0
            changed += 1
    return Image.frombytes("RGBA", (w,h), bytes(data)), changed

def verify():
    im = Image.new("RGBA", (40,40), (0,0,0,0))
    for y in range(5,35):
        for x in range(5,35):
            im.putpixel((x,y), (225,225,225,255))
    for y in range(9,31):
        for x in range(9,31):
            im.putpixel((x,y), (70,140,40,255))
    for y in range(16,22):
        for x in range(15,25):
            im.putpixel((x,y), (255,255,255,255))
    im.putpixel((8,20), (255,220,36,255))
    out, n = clean_frame(im)
    assert n > 0 and out.getpixel((5,5))[3] == 0
    assert out.getpixel((17,18)) == im.getpixel((17,18))
    assert out.getpixel((8,20)) == im.getpixel((8,20))
    assert out.getpixel((10,20)) == im.getpixel((10,20))

def main():
    verify()
    for name in NAMES:
        path = ROOT/name
        with Image.open(path) as src:
            im = src.convert("RGBA")
        assert im.size == (1920,320), (name, im.size)
        result = Image.new("RGBA", im.size)
        counts = []
        for frame in range(8):
            cell = im.crop((frame*240,0,(frame+1)*240,320))
            clean, count = clean_frame(cell)
            counts.append(count)
            result.paste(clean,(frame*240,0))
        # No changes to original opaque colored art, frame timing, or size.
        before, after = im.tobytes(), result.tobytes()
        for i in range(0,len(before),4):
            if before[i:i+4] == after[i:i+4]:
                continue
            assert before[i:i+3] == after[i:i+3]
            r,g,b,a = before[i:i+4]
            assert min(r,g,b)>=150 and max(r,g,b)-min(r,g,b)<=42 and after[i+3]==0
        if name in ("green-normal.webp","green-critical.webp"):
            assert sum(counts)>0, f"No repairable perimeter on {name}"
        # Lossless encoding avoids introducing a new halo.
        result.save(path, "WEBP", lossless=True, method=4, exact=True)
        with Image.open(path) as check:
            assert check.size == im.size
        print(f"V360 {name}: removed pale fringe pixels {sum(counts)}; frames {counts}", flush=True)

if __name__ == "__main__":
    main()

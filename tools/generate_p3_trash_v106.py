#!/usr/bin/env python3
"""P3 v106 — source-faithful trash-can death sprites, with clean frame cutting.

Only ORIGINAL trash_can_hd.png is used. No redraw, piece masks, rotation,
resizing, tinting, or generated fragments. The single largest 8-connected
opaque object in each source atlas cell defines the intact original character.
Neighbor-cell bleed and isolated alpha specks are eliminated at build-time.

Two 12-frame 6144x512 RGBA PNG strips; the approved Big Zombie is untouched.
"""
from __future__ import annotations
import argparse
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ATLAS = ROOT / 'dist/assets/ip/v2/trash_can_hd.png'
OUTPUT = ROOT / 'dist/assets/ip/v2/p3-deaths'
PREVIEW = ROOT / 'docs/p3-v106-trash-can-preview.jpg'
SOURCE_CELL = 256
FRAME_SIZE = 512
FRAME_COUNT = 12
SCREEN_CX, FOOT_Y = 256, 360

# The frame index is one of the original 8x4 HD atlas images.
# Only light pixel-accurate shifts are applied, NEVER a rotation or scale.
# End poses settle in place instead of continuously spinning in mid-air.
POSES = {
    'normal': [
        (0, 0, 0), (24, 0, -7), (25, 0, -6), (26, 0, -8),
        (26, 0, -5), (26, 0, -2), (27, 0, -1), (27, 0, 0),
        (27, 0, 2), (27, 0, 2), (27, 0, 2), (27, 0, 2),
    ],
    'critical': [
        (0, 0, 0), (24, 0, -7), (28, 0, -11), (28, 0, -17),
        (28, 0, -11), (28, 0, -5), (29, 0, -3), (29, 0, 0),
        (29, 0, 2), (29, 0, 2), (29, 0, 2), (29, 0, 2),
    ],
}


def extract_original(atlas: Image.Image, index: int) -> Image.Image:
    """Cut a *single* 256x256 source cell at the exact 8-column boundary."""
    if index < 0 or index >= 32:
        raise ValueError(f'Invalid HD atlas frame index: {index}')
    left = (index % 8) * SOURCE_CELL
    top = (index // 8) * SOURCE_CELL
    return atlas.crop((left, top, left + SOURCE_CELL, top + SOURCE_CELL))


def isolate_character(original: Image.Image) -> Image.Image:
    """Remove extraneous neighboring-frame pieces without changing the body.

    The largest 8-connected alpha component is the actual intact source
    character. Restore its 2px anti-alias fringe directly from the original.
    No component is painted, warped, resized, or reinterpreted.
    """
    if original.size != (SOURCE_CELL, SOURCE_CELL) or original.mode != 'RGBA':
        raise ValueError('Unexpected source cell geometry or alpha mode')

    width = height = SOURCE_CELL
    pixels = original.tobytes()
    alpha = pixels[3::4]
    solid = bytearray(1 if a >= 40 else 0 for a in alpha)
    visited = bytearray(width * height)
    largest: list[int] = []

    for start in range(width * height):
        if not solid[start] or visited[start]:
            continue
        queue = deque([start])
        visited[start] = 1
        component: list[int] = []
        while queue:
            p = queue.pop()
            component.append(p)
            x, y = p % width, p // width
            for ny in range(max(0, y-1), min(height-1, y+1)+1):
                for nx in range(max(0, x-1), min(width-1, x+1)+1):
                    q = ny*width+nx
                    if solid[q] and not visited[q]:
                        visited[q] = 1
                        queue.append(q)
        if len(component) > len(largest):
            largest = component

    if len(largest) < 3500:
        raise ValueError(f'Canonical body unexpectedly fragmented: {len(largest)}')

    # Restore only the original anti-alias pixels within 2px of the main body;
    # never copy disconnected neighbor cells / white FX specks at sheet edges.
    keep = bytearray(width * height)
    for p in largest:
        x, y = p % width, p // width
        for yy in range(max(0, y-2), min(height-1, y+2)+1):
            for xx in range(max(0, x-2), min(width-1, x+2)+1):
                keep[yy*width+xx] = 1

    raw = bytearray(pixels)
    removed = 0
    for p in range(width * height):
        if not keep[p]:
            if raw[p*4+3]:
                removed += 1
            raw[p*4:p*4+4] = b'\x00\x00\x00\x00'
    result = Image.frombytes('RGBA', (width, height), bytes(raw))
    bounds = result.getchannel('A').getbbox()
    if bounds is None or bounds[0] < 2 or bounds[1] < 2 or bounds[2] > 254 or bounds[3] > 254:
        raise ValueError(f'Source cell contains clipped boundary pixels: {bounds}')
    # The visible kept body pixels have exactly the original RGBA samples.
    if any(raw[p*4:p*4+4] != pixels[p*4:p*4+4]
           for p in largest):
        raise AssertionError('Original zombie colors/alpha were modified')
    return result


def place_original(cut: Image.Image, dx: int, dy: int) -> Image.Image:
    """Uniform center/pivot for all poses, with integer-pixel translations."""
    bounds = cut.getchannel('A').getbbox()
    assert bounds is not None
    center_x = (bounds[0] + bounds[2]) / 2
    bottom_y = bounds[3]
    x = round(SCREEN_CX - center_x + dx)
    y = round(FOOT_Y - bottom_y + dy)
    frame = Image.new('RGBA', (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    frame.alpha_composite(cut, (x, y))
    region = frame.getchannel('A').getbbox()
    if region is None or region[0] < 3 or region[1] < 3 or region[2] > FRAME_SIZE-3 or region[3] > FRAME_SIZE-3:
        raise ValueError(f'Output frame clipped: {region}')
    return frame


def generate(atlas: Image.Image, kind: str) -> Image.Image:
    sheet = Image.new('RGBA', (FRAME_SIZE*FRAME_COUNT, FRAME_SIZE), (0, 0, 0, 0))
    cleaned = {}
    for number, (source_index, dx, dy) in enumerate(POSES[kind]):
        if source_index not in cleaned:
            cleaned[source_index] = isolate_character(extract_original(atlas, source_index))
        frame = place_original(cleaned[source_index], dx, dy)
        sheet.alpha_composite(frame, (number*FRAME_SIZE, 0))
    return sheet


def make_preview(animations: dict[str, Image.Image]) -> None:
    tile_width, tile_height = 300, 324
    board = Image.new('RGB', (tile_width*4, tile_height*6), '#dbe6ee')
    pen = ImageDraw.Draw(board)
    for row, kind in enumerate(('normal', 'critical')):
        for i, (src, _, _) in enumerate(POSES[kind]):
            tile = animations[kind].crop((i*FRAME_SIZE, 0, (i+1)*FRAME_SIZE, FRAME_SIZE))
            cropped = tile.crop((70, 105, 442, 450))
            thumb = cropped.resize((292, 292), Image.Resampling.LANCZOS)
            surface = Image.new('RGBA', (292,292), '#edf3f6')
            surface.alpha_composite(thumb)
            x = (i%4)*tile_width + 4
            y = (row*3+i//4)*tile_height + 22
            board.paste(surface.convert('RGB'), (x,y))
            pen.text((x+5, y-18), f'v106 {kind} {i+1:02}/12 | original #{src}', fill='#122c3b')
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    board.save(PREVIEW, quality=92, optimize=True)


def check_identical(generated: Image.Image, on_disk: Image.Image) -> None:
    if generated.mode != 'RGBA' or generated.size != (6144,512):
        raise ValueError('Unexpected generated texture geometry')
    if on_disk.mode != 'RGBA' or on_disk.size != generated.size:
        raise ValueError('Wrong committed RGBA texture')
    if generated.tobytes() != on_disk.tobytes():
        raise ValueError('Committed PNG differs from pixel-exact source regeneration')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    with Image.open(ATLAS) as f:
        if f.size != (2048, 1024) or f.mode != 'RGBA':
            raise ValueError('Missing or damaged original high-resolution source')
        atlas = f.copy()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    strips = {}
    for kind in ('normal', 'critical'):
        sheet = generate(atlas, kind)
        filename = OUTPUT / f'trash_can-{kind}-v106.png'
        if not args.verify:
            sheet.save(filename, 'PNG', optimize=True, compress_level=9)
        if not filename.exists():
            raise FileNotFoundError(filename)
        with Image.open(filename) as stored:
            check_identical(sheet, stored.convert('RGBA'))
        strips[kind] = sheet
        print(f'PASS {filename.relative_to(ROOT)}: {filename.stat().st_size} bytes')
    if not args.verify:
        make_preview(strips)
    print('PASS: clean 256px source-cell cutting, intact body alpha, zero spin, grounded 12-frame strips')


if __name__ == '__main__':
    main()

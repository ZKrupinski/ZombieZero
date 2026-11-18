"""Rectify the ORIGINAL winter-stage bitmap (900x1420), never a screenshot.

The authored scene has converging rails and perspective floor slabs.  This is
an offline Pillow resampling pass: no runtime Canvas transform, no sprite/UI
changes, no additional network requests or frame-time work.
"""
from __future__ import annotations

import argparse
import base64
import io
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

WIDTH, HEIGHT = 900, 1420
ROAD_LEFT, ROAD_RIGHT = 72, 828
SOURCE = Path("dist/assets/stages/bg-14.webp")
OUTPUT = Path("dist/assets/stages/bg-14-v157-orthographic.webp")


def source_y(target_y: float) -> float:
    # Near the upper rim the camera foreshortens the pavement. The vertical
    # mapping corrects tile spacing while keeping sky/architecture unchanged.
    if target_y <= 112:
        return target_y
    t = min(1, max(0, (target_y - 112) / (HEIGHT - 112)))
    return 112 + (HEIGHT - 112) * (.64 * t + .36 * t * t)


def original_left(source_row: float) -> float:
    # Measured from the existing stage image: top ice rail x~145, lower
    # rail x~20. Opposing rail mirrors around the 450px arena center.
    t = min(1, max(0, (source_row - 92) / (HEIGHT - 92)))
    return 149 - 130 * t


def anchors(target_y: float) -> tuple[float, float, float]:
    sy = source_y(target_y)
    raw_left = original_left(sy)
    # Buildings and snowy skyline are not part of the playfield. Introduce
    # the rectification smoothly above the first visible upper wall.
    blend = min(1, max(0, target_y / 84))
    blend = blend * blend * (3 - 2 * blend)
    left = ROAD_LEFT + (raw_left - ROAD_LEFT) * blend
    return sy, left, WIDTH - left


def resample(image: Image.Image) -> Image.Image:
    assert image.size == (WIDTH, HEIGHT), f"wrong source: {image.size}"
    img = image.convert("RGB")
    mesh = []
    # Local bilinear quadrilaterals prevent one global warp from distorting
    # the upper sky and preserve exact, parallel x=72/828 arena borders.
    for y0 in range(0, HEIGHT, 16):
        y1 = min(HEIGHT, y0 + 16)
        sy0, l0, r0 = anchors(y0)
        sy1, l1, r1 = anchors(y1)
        for x0, x1, sx0a, sx0b, sx1a, sx1b in (
            (0, ROAD_LEFT, 0, l0, 0, l1),
            (ROAD_LEFT, ROAD_RIGHT, l0, r0, l1, r1),
            (ROAD_RIGHT, WIDTH, r0, WIDTH, r1, WIDTH),
        ):
            mesh.append(
                (
                    (x0, y0, x1, y1),
                    (sx0a, sy0, sx1a, sy1, sx1b, sy1, sx0b, sy0),
                )
            )
    return img.transform(
        (WIDTH, HEIGHT),
        Image.Transform.MESH,
        mesh,
        resample=Image.Resampling.BICUBIC,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--binary", action="store_true")
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    with Image.open(SOURCE) as image:
        image.load()
        corrected = resample(image)
    if not args.verify:
        corrected.save(OUTPUT, "WEBP", quality=84, method=6)
    with Image.open(OUTPUT) as verify:
        assert verify.size == (WIDTH, HEIGHT)
        if args.verify:
            difference = ImageChops.difference(verify.convert("RGB"), corrected)
            mean_error = ImageStat.Stat(difference).mean
            assert max(mean_error) < 5.5, (
                f"committed bitmap does not match source-derived rectification: {mean_error}"
            )
    print(
        f"ZZ_V157_DONE original={SOURCE} output={OUTPUT} "
        f"size={WIDTH}x{HEIGHT} bytes={OUTPUT.stat().st_size}",
        flush=True,
    )
    if args.preview:
        thumb = corrected.resize((450, 710), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        thumb.save(buf, "WEBP", quality=60, method=5)
        print("ZZ_V157_PREVIEW_START", flush=True)
        print(base64.b64encode(buf.getvalue()).decode("ascii"), flush=True)
        print("ZZ_V157_PREVIEW_END", flush=True)
    if args.binary:
        print("ZZ_V157_BINARY_START", flush=True)
        print(base64.b64encode(OUTPUT.read_bytes()).decode("ascii"), flush=True)
        print("ZZ_V157_BINARY_END", flush=True)


if __name__ == "__main__":
    main()

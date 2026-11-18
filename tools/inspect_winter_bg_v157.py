"""Inspect the exact active stage-14 source atlas, not screenshot composites."""
from __future__ import annotations
import base64
import io
from pathlib import Path
from PIL import Image

source = Path("dist/assets/stages/bg-14.webp")
with Image.open(source) as image:
    image.load()
    assert image.size == (900, 1420), f"expected 900x1420, got {image.size}"
    print(f"ZZ_STAGE14_SOURCE={source} SIZE={image.size[0]}x{image.size[1]}", flush=True)
    im = image.convert("RGB").resize((450, 710), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    im.save(buffer, format="WEBP", quality=55, method=5)
    print("ZZ_STAGE14_BASE64_START", flush=True)
    print(base64.b64encode(buffer.getvalue()).decode("ascii"), flush=True)
    print("ZZ_STAGE14_BASE64_END", flush=True)

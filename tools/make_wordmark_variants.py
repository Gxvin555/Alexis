"""Prepare Alexis brand assets from the supplied wordmark artwork.

Usage (needs Pillow):
    python3 tools/make_wordmark_variants.py "path/to/Alexis - Finance.png"

Writes, in assets/img/:
    alexis-wordmark.png        the supplied file, copied unchanged (light surfaces)
    alexis-wordmark-light.png  recoloured copy for dark surfaces
    favicon.png                the supplied dot, cropped and padded to a square

Rules from the Lucerna brand guide: recolour only, never redraw. Geometry is
kept pixel for pixel. Grey lettering becomes #e9edf4; the coloured dot keeps
its exact colour. If the artwork has an opaque white background, transparency
is recovered by un-blending each pixel from white, so edges stay smooth.
"""
import shutil
import sys
from pathlib import Path

from PIL import Image

LETTER_TARGET = (0xE9, 0xED, 0xF4)
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'img'


def saturation(r, g, b):
    hi, lo = max(r, g, b), min(r, g, b)
    return 0 if hi == 0 else (hi - lo) / hi


def unblend_from_white(px, fg):
    """Alpha for a pixel that is colour fg blended over white."""
    best = 0.0
    for c, f in zip(px, fg):
        if f < 255:
            best = max(best, (255 - c) / (255 - f))
    return max(0.0, min(1.0, best))


def main(src):
    src = Path(src)
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    pix = im.load()
    opaque_bg = pix[0, 0][3] == 255 and min(pix[0, 0][:3]) > 245

    # Find the dot: the strongly saturated pixels.
    dot = [(x, y) for y in range(h) for x in range(w)
           if pix[x, y][3] > 0 and saturation(*pix[x, y][:3]) > 0.25 and min(pix[x, y][:3]) < 245]
    if not dot:
        raise SystemExit('No coloured dot found; check the input file.')
    xs, ys = [p[0] for p in dot], [p[1] for p in dot]
    dot_box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
    # Representative dot colour (most common opaque dot pixel) and letter colour (darkest grey).
    from collections import Counter
    dot_rgb = Counter(pix[x, y][:3] for x, y in dot if pix[x, y][3] == 255).most_common(1)[0][0]
    greys = [pix[x, y][:3] for y in range(0, h, 2) for x in range(0, w, 2)
             if pix[x, y][3] > 200 and saturation(*pix[x, y][:3]) < 0.1 and max(pix[x, y][:3]) < 200]
    letter_rgb = min(greys, key=sum) if greys else (90, 90, 90)

    dark = Image.new('RGBA', (w, h))
    dp = dark.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            in_dot = dot_box[0] - 2 <= x < dot_box[2] + 2 and dot_box[1] - 2 <= y < dot_box[3] + 2
            if opaque_bg:
                a = round(255 * unblend_from_white((r, g, b), dot_rgb if in_dot else letter_rgb))
            if a == 0:
                dp[x, y] = (0, 0, 0, 0)
            elif in_dot:
                dp[x, y] = (*dot_rgb, a) if opaque_bg else (r, g, b, a)
            else:
                dp[x, y] = (*LETTER_TARGET, a)

    OUT.mkdir(parents=True, exist_ok=True)
    if src.resolve() != (OUT / 'alexis-wordmark.png').resolve():
        shutil.copyfile(src, OUT / 'alexis-wordmark.png')
    dark.save(OUT / 'alexis-wordmark-light.png', optimize=True)

    # Favicon: the dot itself, centred on a transparent square.
    crop = dark.crop(dot_box)
    side = max(crop.size)
    pad = round(side * 0.12)
    square = Image.new('RGBA', (side + 2 * pad, side + 2 * pad))
    square.paste(crop, (pad + (side - crop.size[0]) // 2, pad + (side - crop.size[1]) // 2))
    square.resize((64, 64), Image.LANCZOS).save(OUT / 'favicon.png', optimize=True)
    print(f'Dot colour #{dot_rgb[0]:02x}{dot_rgb[1]:02x}{dot_rgb[2]:02x}, '
          f'opaque background: {opaque_bg}. Wrote {OUT}.')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])

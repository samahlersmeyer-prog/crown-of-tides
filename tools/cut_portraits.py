#!/usr/bin/env python3
"""Cut a 3x2 grid of head-and-shoulders portraits on magenta into assets/portraits/<name>.png.

usage: cut_portraits.py <capture> <n1,n2,n3,n4,n5,n6>
Also: cut_portraits.py --from-sprite <sprite> <name> [head_fraction]  (crop a portrait from a body sprite)
"""
import os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets', 'portraits')
SIZE = 112  # drawn into a 56x56 box at 2x for crispness


def is_bg(r, g, b):
    return r > 150 and b > 150 and g < 110 and abs(r - b) < 90


def key(im):
    im = im.convert('RGBA'); px = im.load(); w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_bg(r, g, b): px[x, y] = (0, 0, 0, 0)
            elif r > g + 40 and b > g + 40:  # despill magenta fringe
                px[x, y] = (min(r, g + 40), g, min(b, g + 40), 255)
    return im


def fit(im, name):
    bb = im.getbbox()
    if not bb: print('empty', name); return
    im = im.crop(bb); w, h = im.size
    s = SIZE / max(w, h)
    im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(im, ((SIZE - im.width) // 2, SIZE - im.height), im)  # sit on the bottom edge
    os.makedirs(OUT, exist_ok=True); out.save(os.path.join(OUT, name + '.png')); print(name, bb)


def crop_border(im):
    im = im.convert('RGB'); w, h = im.size; px = im.load()
    cols = [x for x in range(w) if any(sum(px[x, y]) > 60 for y in range(0, h, 7))]
    rows = [y for y in range(h) if any(sum(px[x, y]) > 60 for x in range(0, w, 7))]
    return im.crop((cols[0], rows[0], cols[-1] + 1, rows[-1] + 1))


if sys.argv[1] == '--from-sprite':
    sp = Image.open(os.path.join(ROOT, 'assets', 'sprites', sys.argv[2] + '.png')).convert('RGBA')
    frac = float(sys.argv[4]) if len(sys.argv) > 4 else 0.42
    w, h = sp.size; bb = sp.getbbox(); top = bb[1]
    fit(sp.crop((0, top, w, top + int((bb[3] - top) * frac))), sys.argv[3])
else:
    im = key(crop_border(Image.open(sys.argv[1]))); names = sys.argv[2].split(',')
    w, h = im.size
    for i, n in enumerate(names):
        cx, cy = i % 3, i // 3
        fit(im.crop((cx * w // 3, cy * h // 2, (cx + 1) * w // 3, (cy + 1) * h // 2)), n)

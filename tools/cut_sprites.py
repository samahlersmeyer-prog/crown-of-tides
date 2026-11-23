#!/usr/bin/env python3
"""Cut characters painted on a magenta backdrop into transparent sprites.
Usage: cut_sprites.py <capture.jpg> <name1,name2,...> [height]
Figures are found left to right; each gets assets/sprites/<name>.png, feet at the bottom, scaled so the
tallest figure in the sheet is <height> px (default 96; the game draws them smaller)."""
import sys
from PIL import Image
src, names = sys.argv[1], sys.argv[2].split(',')
target = int(sys.argv[3]) if len(sys.argv) > 3 else 96
im = Image.open(src).convert('RGB'); w, h = im.size; px = im.load()
# crop away the black capture border
cols = [x for x in range(w) if sum(px[x, h // 2]) > 60 or sum(px[x, h // 3]) > 60]
rows = [y for y in range(h) if sum(px[w // 2, y]) > 60 or sum(px[w // 3, y]) > 60]
im = im.crop((cols[0], rows[0], cols[-1] + 1, rows[-1] + 1)); w, h = im.size; px = im.load()
def is_bg(r, g, b):
    return r > 150 and b > 150 and g < 110 and abs(r - b) < 90
alpha = Image.new('L', (w, h), 0); ap = alpha.load()
out = Image.new('RGBA', (w, h)); op = out.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if is_bg(r, g, b): continue
        # despill: pull magenta fringe back toward neutral
        m = min(r, b) - g
        if m > 30: r, b = r - m // 2, b - m // 2
        op[x, y] = (r, g, b, 255); ap[x, y] = 255
# remove specks: drop pixels with fewer than 3 opaque neighbours
for y in range(1, h - 1):
    for x in range(1, w - 1):
        if ap[x, y] and sum(1 for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)) if ap[x+dx, y+dy]) < 3:
            op[x, y] = (0, 0, 0, 0)
alpha = out.split()[3]; ap = alpha.load()
colsum = [sum(1 for y in range(h) if ap[x, y]) for x in range(w)]
segs, inside, start = [], False, 0
for x, v in enumerate(colsum + [0]):
    if v > 2 and not inside: inside, start = True, x
    elif v <= 2 and inside:
        inside = False
        if x - start > w * 0.03: segs.append((start, x))
if len(segs) != len(names):
    print('found', len(segs), 'figures, expected', len(names), segs); sys.exit(1)
boxes = []
for x0, x1 in segs:
    sub = out.crop((x0, 0, x1, h)); bb = sub.getbbox(); boxes.append((x0 + bb[0], bb[1], x0 + bb[2], bb[3]))
tallest = max(b[3] - b[1] for b in boxes); k = target / tallest
for name, b in zip(names, boxes):
    fig = out.crop(b); nw, nh = max(1, round(fig.width * k)), max(1, round(fig.height * k))
    fig = fig.resize((nw, nh), Image.LANCZOS)
    fig.save(f'/home/claude/crown-of-tides/assets/sprites/{name}.png'); print(name, fig.size)

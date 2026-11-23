#!/usr/bin/env python3
"""Turn a captured painting (screenshot of the image on a black backdrop) into a 320x200 game background.
Usage: import_bg.py <capture.jpg> <room>   -> assets/bg/<room>.jpg (+ a 640x400 copy in /home/claude/bgraw for checking)"""
import sys
from PIL import Image
src, room = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
w, h = im.size
px = im.load()
dark = lambda x: sum(px[x, h // 2]) < 30 and sum(px[x, h // 4]) < 30 and sum(px[x, 3 * h // 4]) < 30
x0 = next(x for x in range(w) if not dark(x))
x1 = next(x for x in range(w - 1, -1, -1) if not dark(x)) + 1
im = im.crop((x0, 0, x1, h))
cw, ch = im.size
if cw / ch > 1.6:
    nw = int(ch * 1.6); im = im.crop(((cw - nw) // 2, 0, (cw - nw) // 2 + nw, ch))
else:
    nh = int(cw / 1.6); im = im.crop((0, (ch - nh) // 2, cw, (ch - nh) // 2 + nh))
im.resize((640, 400), Image.LANCZOS).save(f'/home/claude/bgraw/{room}.png')
im.resize((320, 200), Image.LANCZOS).save(f'/home/claude/crown-of-tides/assets/bg/{room}.jpg', quality=93)
print(room, 'from', (x0, x1), '->', im.size)

// Crown of Tides — painterly textures and the VGA finish (per-scene 256-colour palette + ordered dither).
(function (root) {
  'use strict';

  // ---------- value noise ----------
  const PERM = new Uint8Array(512);
  (() => { const p = []; for (let i = 0; i < 256; i++) p[i] = i; let s = 1337; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
  const hash = (x, y) => PERM[(PERM[x & 255] + y) & 255] / 255;
  const fade = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct = 4) { let v = 0, amp = 0.5, f = 1, tot = 0; for (let i = 0; i < oct; i++) { v += noise(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2; } return v / tot; }

  const hex = h => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ---------- texture patterns: mottled two-colour surfaces with grain ----------
  const texCache = {};
  // kind: 'mottle' (default), 'sand', 'grass', 'rock', 'wood', 'water', 'foliage', 'stone'
  function texture(ctx, a, b, kind = 'mottle') {
    const key = a + b + kind;
    if (texCache[key]) return texCache[key];
    const S = 64, cv = mk(S, S), x = cv.getContext('2d'), img = x.createImageData(S, S), A = hex(a), B = hex(b);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      // tileable: sample noise on a torus-ish wrap by blending
      const tn = (fx, fy) => { const u = i / S, v = j / S; const n00 = fbm(fx * u, fy * v), n10 = fbm(fx * (u - 1), fy * v), n01 = fbm(fx * u, fy * (v - 1)), n11 = fbm(fx * (u - 1), fy * (v - 1)); return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v; };
      let t;
      if (kind === 'sand') t = tn(10, 10) * 0.7 + hash(i * 7, j * 13) * 0.3;
      else if (kind === 'grass') t = tn(8, 14) * 0.5 + (hash(i * 3, j * 11) > 0.7 ? 0.5 : 0) + ((j + Math.floor(hash(i, 3) * 6)) % 6 < 2 ? 0.2 : 0);
      else if (kind === 'rock') { const n = tn(5, 5), rdg = 1 - Math.abs(tn(9, 4) - 0.5) * 2; t = n * 0.7 + (rdg > 0.88 ? -0.35 : 0) + (tn(16, 16) > 0.62 ? 0.25 : 0) + hash(i * 5, j * 9) * 0.18; }
      else if (kind === 'wood') t = 0.5 + 0.5 * Math.sin((j + tn(4, 2) * 18) * 0.9) * 0.6 + hash(i * 2, j * 17) * 0.15;
      else if (kind === 'water') t = tn(4, 16) * 0.8 + (Math.sin(j * 0.8 + tn(8, 8) * 6) > 0.85 ? 0.4 : 0);
      else if (kind === 'foliage') t = (tn(12, 12) > 0.52 ? 0.85 : 0.2) + hash(i * 9, j * 5) * 0.25;
      else if (kind === 'stone') t = tn(8, 8) * 0.6 + (tn(20, 20) > 0.6 ? 0.25 : 0) + hash(i * 11, j * 3) * 0.25;
      else t = tn(6, 6) * 0.85 + hash(i * 13, j * 7) * 0.15;
      t = Math.max(0, Math.min(1, t));
      const c = mix(A, B, t), k = (j * S + i) * 4;
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return (texCache[key] = ctx.createPattern(cv, 'repeat'));
  }

  // ---------- the VGA finish ----------
  // Grain: a fixed per-pixel light variation so flat fills read as painted surfaces.
  let grain = null;
  function buildGrain() {
    grain = new Int8Array(320 * 200);
    for (let y = 0; y < 200; y++) for (let x = 0; x < 320; x++) grain[y * 320 + x] = Math.round((fbm(x / 7, y / 7, 3) - 0.5) * 12 + (hash(x * 31, y * 17) - 0.5) * 6);
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v / 16 - 0.5));

  // Median-cut palette from a frame: each scene gets its own 256 colours, like a 1992 VGA background.
  function medianCut(data, n) {
    const px = [];
    for (let i = 0; i < data.length; i += 16) px.push([data[i], data[i + 1], data[i + 2]]);
    let boxes = [px];
    while (boxes.length < n) {
      let bi = -1, best = -1, axis = 0;
      boxes.forEach((b, i) => {
        if (b.length < 2) return;
        for (let a = 0; a < 3; a++) { let lo = 255, hi = 0; for (const p of b) { if (p[a] < lo) lo = p[a]; if (p[a] > hi) hi = p[a]; } const r = (hi - lo) * Math.sqrt(b.length); if (r > best) { best = r; bi = i; axis = a; } }
      });
      if (bi < 0) break;
      const b = boxes[bi].sort((p, q) => p[axis] - q[axis]), mid = b.length >> 1;
      boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
    }
    return boxes.filter(b => b.length).map(b => { const s = [0, 0, 0]; for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return s.map(v => Math.round(v / b.length)); });
  }
  function buildLUT(pal) {
    const lut = new Uint8Array(32768);
    for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
      const R = r * 8 + 4, Gc = g * 8 + 4, B = b * 8 + 4; let bi = 0, bd = 1e9;
      for (let i = 0; i < pal.length; i++) { const p = pal[i], d = (p[0] - R) * (p[0] - R) * 3 + (p[1] - Gc) * (p[1] - Gc) * 4 + (p[2] - B) * (p[2] - B) * 2; if (d < bd) { bd = d; bi = i; } }
      lut[(r << 10) | (g << 5) | b] = bi;
    }
    return lut;
  }
  let palette = null, lut = null, palKey = null, pendingKey = null;
  // Call once per frame after drawing. key changes (room) rebuild the palette from the next frame.
  function finish(ctx, key, enabled = true) {
    if (!grain) buildGrain();
    const img = ctx.getImageData(0, 0, 320, 200), d = img.data;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) { const g = grain[p]; d[i] = d[i] + g; d[i + 1] = d[i + 1] + g; d[i + 2] = d[i + 2] + g; }
    if (enabled) {
      if (key !== palKey && key !== pendingKey) { pendingKey = key; palette = medianCut(d, 256); lut = buildLUT(palette); palKey = key; pendingKey = null; }
      for (let y = 0, i = 0; y < 200; y++) for (let x = 0; x < 320; x++, i += 4) {
        const t = BAYER[(y & 3) * 4 + (x & 3)] * 10;
        const r = Math.max(0, Math.min(255, d[i] + t)), g = Math.max(0, Math.min(255, d[i + 1] + t)), b = Math.max(0, Math.min(255, d[i + 2] + t));
        const c = palette[lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)]];
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  root.VGA = { noise, fbm, texture, finish, hex, mix };
})(this);

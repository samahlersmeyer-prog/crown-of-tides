// Crown of Tides — all scenes and sprites, painted with canvas primitives on a 320x200 VGA-style screen.
(function (root) {
  'use strict';

  // ---------- primitives ----------
  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); };
  // Smooth vertical gradient through the given colours (the VGA finish dithers it).
  const bands = (c, x, y, w, h, cols) => {
    if (cols.length === 1) return R(c, cols[0], x, y, w, h);
    const g = c.createLinearGradient(0, y, 0, y + h); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
    c.fillStyle = g; c.fillRect(x | 0, y | 0, w | 0, Math.ceil(h));
  };
  const poly = (c, col, pts) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); };
  const circ = (c, col, x, y, r) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const ell = (c, col, x, y, rx, ry) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  // Painted two-colour surface; kind picks the texture (sand, grass, rock, wood, water, stone...).
  const dith = (c, x, y, w, h, a, b, kind) => { c.fillStyle = window.VGA.texture(c, a, b, kind); c.fillRect(x, y, w, h); };
  const tex = (c, a, b, kind) => window.VGA.texture(c, a, b, kind);
  // Deterministic pseudo-random so scenery doesn't jitter between frames.
  const rnd = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // ---------- people ----------
  // Feet at (x,y). o: {skin, hair, top, legs, dress, h, cape, hat, robe, armor, veil, beard}
  // Pixel-art people: drawn once per pose onto a small sprite, shaded from the upper left,
  // outlined in near-black like the old Sierra sprites, then cached and mirrored for facing.
  const spriteCache = new Map();
  function buildSprite(o, frame, H) {
    const s = H / 30, W = Math.ceil(20 * s) + 6, Hc = Math.ceil(32 * s) + 4, ox = Math.floor(W / 2), oy = Hc - 2;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = Hc;
    const c = cv.getContext('2d');
    const r = (col, x0, y0, w, hh) => { c.fillStyle = col; c.fillRect(Math.round(ox + x0 * s), Math.round(oy - (y0 + hh) * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(hh * s))); };
    const px = (col, x0, y0) => { c.fillStyle = col; c.fillRect(Math.round(ox + x0 * s), Math.round(oy - y0 * s), 1, 1); };
    const ph = frame % 4, step = [0, 1.7, 0, -1.7][ph], lift = ph % 2 ? 0.8 : 0, sw = [0, 1, 0, -1][ph];
    const top = o.top, dk = v => shade(v, -38), lt = v => shade(v, 28);
    // cape behind everything
    if (o.cape) { c.fillStyle = dk(o.cape); c.beginPath(); c.moveTo(ox - 3.5 * s, oy - 22 * s); c.lineTo(ox + 2 * s, oy - 22 * s); c.lineTo(ox - (1 + sw) * s, oy - 2 * s); c.lineTo(ox - (7 + sw) * s, oy - 3 * s); c.fill(); r(o.cape, -5.5 - sw, 3, 2, 17); }
    // back arm
    r(dk(o.sleeve || top), -4.6 - sw, 12, 1.8, 8); r(dk(o.skin), -4.6 - sw * 1.2, 10.6, 1.8, 1.6);
    if (o.dress || o.robe) {
      const col = o.dress || o.robe, wide = o.robe ? 5 : 7;
      c.fillStyle = col; c.beginPath(); c.moveTo(ox - 3.5 * s, oy - 21 * s); c.lineTo(ox + 3.5 * s, oy - 21 * s); c.lineTo(ox + wide * s, oy); c.lineTo(ox - wide * s, oy); c.fill();
      c.fillStyle = lt(col); c.beginPath(); c.moveTo(ox - 3.5 * s, oy - 21 * s); c.lineTo(ox - 2 * s, oy - 21 * s); c.lineTo(ox - (wide - 2) * s, oy); c.lineTo(ox - wide * s, oy); c.fill();
      c.fillStyle = dk(col); c.beginPath(); c.moveTo(ox + 2.2 * s, oy - 21 * s); c.lineTo(ox + 3.5 * s, oy - 21 * s); c.lineTo(ox + wide * s, oy); c.lineTo(ox + (wide - 2.5) * s, oy); c.fill();
      for (const fx of [-1.5, 1]) r(shade(col, -20), fx + (fx > 0 ? sw * 0.3 : -sw * 0.3), 0.5, 0.6, 14);
      if (o.trim) r(o.trim, -wide, 0, wide * 2, 1.2);
      r(o.boots || '#2a1a10', 1 + step * 0.4, 0, 2.4, 0.9);
    } else {
      const boots = o.boots || '#3a2412';
      // back leg then front leg
      r(dk(o.legs), -2.6 - step, lift, 2.4, 10 - lift); r(dk(boots), -2.8 - step, lift, 3.2, 3);
      r(o.legs, -0.2 + step, 0, 2.4, 10); r(lt(o.legs), -0.2 + step, 3, 0.8, 7); r(boots, -0.4 + step, 0, 3.4, 3); r(lt(boots), -0.4 + step, 2.2, 3.4, 0.6);
    }
    // torso
    r(top, -3.5, 10, 7, 11); r(lt(top), -3.5, 11, 1.4, 10); r(dk(top), 2.1, 10, 1.4, 11); r(dk(top), -3.5, 10, 7, 0.8);
    if (o.armor) { r(o.armor, -3.2, 13, 6.4, 7); r(lt(o.armor), -2.6, 17, 2, 2.4); r(dk(o.armor), 1.6, 13, 1.6, 7); }
    if (o.belt) { r(o.belt, -3.5, 11, 7, 1.3); r(lt(o.belt), 0.2, 11.1, 1.2, 1.1); }
    // front arm
    r(o.sleeve || top, 2.6 + sw, 12, 1.9, 8); r(lt(o.sleeve || top), 2.6 + sw, 14, 0.7, 6); r(o.skin, 2.7 + sw * 1.2, 10.6, 1.8, 1.7);
    // neck + head
    r(dk(o.skin), -0.9, 20.8, 1.8, 1.6);
    r(o.skin, -2.4, 22, 5, 6.2); r(o.skin, -1.9, 21.6, 4, 7); r(lt(o.skin), -2.2, 25, 1, 2.5); r(dk(o.skin), 1.9, 22.2, 0.9, 5);
    r(o.skin, 2.5, 24, 0.9, 1.3); // nose
    // hair
    r(o.hair, -2.9, 26.6, 5.6, 2.4); r(lt(o.hair), -2.2, 28.2, 3, 0.7);
    if (o.longHair) { r(o.hair, -3.2, 20.5, 2.2, 7.5); r(dk(o.hair), -3.2, 20.5, 0.8, 7); }
    else r(o.hair, -2.9, 23.6, 1.6, 3.4);
    if (o.beard) { r(o.beard, -1.8, 21.4, 4.6, 3.2); r(lt(o.beard), -1, 22.6, 1.4, 1.4); }
    // face
    r('#f6f2ea', 0.9, 25, 1.3, 0.9); px('#1a1410', 1.8, 25.9);
    r(dk(o.skin), 1.0, 22.9, 1.4, 0.5);
    if (o.hat) o.hat(r);
    if (o.veil) { c.fillStyle = 'rgba(240,248,255,.7)'; c.fillRect(Math.round(ox - 3.6 * s), Math.round(oy - 29.5 * s), Math.round(7.4 * s), Math.round(14 * s)); }
    // sel-out: near-black outline around the silhouette
    const img = c.getImageData(0, 0, W, Hc), d = img.data, out = new Uint8ClampedArray(d);
    for (let y = 0; y < Hc; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (d[i + 3] > 40) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < Hc && d[(Y * W + X) * 4 + 3] > 140; });
      if (n) { out[i] = 24; out[i + 1] = 16; out[i + 2] = 12; out[i + 3] = 255; }
    }
    img.data.set(out); c.putImageData(img, 0, 0);
    return { cv, ox, oy };
  }
  // Painted sprites (assets/sprites/*.png, cut from AI-painted sheets) replace the pixel figures when loaded.
  const SPR = {};
  ['rowan_0', 'rowan_1', 'rowan_2', 'rowan_3', 'bram', 'nell', 'hester', 'marla', 'fennick', 'oracle', 'pim', 'fishmonger', 'baker', 'guard', 'bertha', 'orla', 'varrick', 'elowen_veil', 'elowen', 'weft', 'goat', 'chick', 'anvil', 'hound', 'hound_sleep', 'octopus', 'crab', 'raven', 'goggle', 'lugs', 'snoot', 'lick', 'grabby', 'nerissa', 'roc'].forEach(n => { if (typeof Image === 'undefined') return; const im = new Image(); im.src = 'assets/sprites/' + n + '.png'; SPR[n] = im; });
  const sprReady = n => SPR[n] && SPR[n].complete && SPR[n].naturalWidth > 0;
  function drawSprite(c, im, x, y, H, mirror) {
    const W = im.naturalWidth * H / im.naturalHeight, X = Math.round(x), Y = Math.round(y);
    ell(c, 'rgba(10,6,4,.32)', x, y, W * 0.38, H * 0.05);
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    if (mirror) { c.translate(X, 0); c.scale(-1, 1); c.drawImage(im, -W / 2, Y - H, W, H); } else c.drawImage(im, X - W / 2, Y - H, W, H);
    c.restore();
  }
  const creature = (c, n, x, y, H, mirror) => { if (!sprReady(n)) return false; drawSprite(c, SPR[n], x, y, H, mirror); return true; };
  function figure(c, x, y, o, frame = 0, dir = 1) {
    const H = Math.max(14, Math.round((o.h || 34) * 1.18)), f = frame % 4;
    if (o.sprite && sprReady(o.sprite)) return drawSprite(c, SPR[o.sprite], x, y, H * 1.08, dir < 0);
    const key = JSON.stringify(o, (k, v) => typeof v === 'function' ? v.toString() : v) + '|' + f + '|' + H;
    let sp = spriteCache.get(key);
    if (!sp) { sp = buildSprite(o, f, H); spriteCache.set(key, sp); if (spriteCache.size > 600) spriteCache.delete(spriteCache.keys().next().value); }
    const s = H / 30;
    ell(c, 'rgba(10,6,4,.32)', x, y, 6.5 * s, 1.8 * s);
    const X = Math.round(x), Y = Math.round(y);
    if (dir >= 0) c.drawImage(sp.cv, X - sp.ox, Y - sp.oy);
    else { c.save(); c.translate(X, 0); c.scale(-1, 1); c.drawImage(sp.cv, -sp.ox, Y - sp.oy); c.restore(); }
  }

  const HERO = { skin: '#e8b48a', hair: '#6b3f1d', top: '#2f6b3a', sleeve: '#efe6d0', legs: '#4a3a2a', belt: '#e2b23a', cape: '#8c1d26' };
  const player = (c, x, y, frame, dir, sc = 1) => {
    const n = frame === 0 ? 'rowan_0' : 'rowan_' + [1, 2, 3, 2][frame % 4];
    if (sprReady(n)) return drawSprite(c, SPR[n], x, y, 36 * sc * 1.18 * 1.1, dir < 0);
    figure(c, x, y, Object.assign({}, HERO, { h: 36 * sc }), frame, dir);
  };

  // ---------- shared scenery ----------
  function sky(c, cols, h) { bands(c, 0, 0, 320, h, cols); }
  function sun(c, x, y, r, col) { circ(c, col + '33', x, y, r + 6); circ(c, col + '66', x, y, r + 3); circ(c, col, x, y, r); }
  function clouds(c, t, y, col, seed) {
    const g = rnd(seed), warm = /255,2[0-3]\d,2[01]\d|255,220/.test(col);
    for (let i = 0; i < 4; i++) {
      const w = 34 + g() * 40, cx = ((g() * 360 + t * 2.5 * (0.5 + g())) % 420) - 50, cy = y + g() * 22;
      warm ? cloud(c, cx, cy, w, seed + i, '#fff2e0', '#f0c8b8', '#c89aa8') : cloud(c, cx, cy, w, seed + i);
    }
  }

  function sea(c, t, y, h, cols) {
    bands(c, 0, y, 320, h, cols);
    c.save(); c.globalAlpha = 0.3; c.fillStyle = tex(c, cols[0], shade(cols[cols.length - 1], 40), 'water'); c.translate(-(t * 4 % 64), 0); c.fillRect(0, y, 400, h); c.restore();
    for (let i = 0; i < 34; i++) {
      const yy = y + 2 + ((i * 7) % (h - 2)), xx = ((i * 53 + t * (6 + (i % 3) * 4)) % 360) - 20, a = 0.12 + (yy - y) / (h * 3);
      R(c, `rgba(255,255,255,${a})`, xx, yy, 5 + (i % 4) * 2, 1); R(c, `rgba(10,30,70,${a * 0.8})`, xx + 2, yy + 1, 4 + (i % 3) * 2, 1);
    }
  }

  function island(c, x, y, w, col) { poly(c, col, [x, y, x + w * 0.2, y - 6, x + w * 0.45, y - 9, x + w * 0.7, y - 5, x + w, y]); poly(c, shade(col, 14), [x + w * 0.18, y - 5, x + w * 0.45, y - 9, x + w * 0.5, y - 4]); haze(c, x + w / 2, y - 3, w * 0.6, 6, '230,225,240', 0.35); }
  function haze(c, x, y, rx, ry, rgb, a) { c.save(); c.translate(x, y); c.scale(1, ry / rx); const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore(); }
  function palm(c, x, y, h, t) { palm2(c, x, y, h, t, 1, (x * 7) | 0); }

  function grassTufts(c, y0, y1, col, seed, n = 30) { const g = rnd(seed); for (let i = 0; i < n; i++) { const x = g() * 320, y = y0 + g() * (y1 - y0); grassClump(c, x, y, 4, 4 + (y - y0) / (y1 - y0 + 1) * 4, [col, shade(col, 25), shade(col, -25)], seed * 31 + i); } }
  function stoneWall(c, x, y, w, h, base, line, seed) {
    c.fillStyle = tex(c, base, line, 'stone'); c.fillRect(x, y, w, h);
    const g = rnd(seed);
    for (let yy = y, row = 0; yy < y + h; yy += 10, row++) {
      for (let xx = x - (row % 2 ? 9 : 0); xx < x + w; xx += 18) {
        const sx = Math.max(x, xx), ex = Math.min(x + w, xx + 18), v = (g() - 0.5) * 28;
        R(c, v > 0 ? `rgba(255,240,220,${v / 160})` : `rgba(0,0,0,${-v / 140})`, sx + 1, yy + 1, ex - sx - 2, 8);
        R(c, 'rgba(255,245,230,.16)', sx + 1, yy + 1, ex - sx - 2, 1); R(c, 'rgba(0,0,0,.28)', sx + 1, yy + 8, ex - sx - 2, 1);
        R(c, line, xx, yy, 1, 10);
      }
      R(c, line, x, yy, w, 1);
    }
    for (let i = 0; i < w * h / 500; i++) { const mx = x + g() * w, my = y + g() * h; R(c, 'rgba(60,90,40,.25)', mx, my, 2 + g() * 3, 1); }
  }

  function torch(c, x, y, t) {
    R(c, '#4a3220', x - 1, y, 3, 10);
    const f = Math.sin(t * 13 + x) * 1.2;
    const tg = c.createRadialGradient(x, y - 3, 1, x, y - 3, 30 + f * 2); tg.addColorStop(0, 'rgba(255,190,90,.45)'); tg.addColorStop(1, 'rgba(255,140,40,0)'); c.fillStyle = tg; c.fillRect(x - 32, y - 35, 64, 64);
    poly(c, '#ff9a1f', [x - 3, y, x + 4, y, x + 1 + f, y - 9]);
    poly(c, '#ffe066', [x - 1, y, x + 2, y, x + 0.5, y - 5]);
  }
  function sparkle(c, x, y, t) { if (Math.sin(t * 4 + x) > 0.2) { R(c, '#fff8c0', x - 2, y, 5, 1); R(c, '#fff8c0', x, y - 2, 1, 5); } }

  // ---------- rooms ----------
  const rooms = {};

  rooms.beach = {
    bg(c, s, t) {
      // sky and sun
      bands(c, 0, 0, 320, 78, ['#2c4f9a', '#3f69b4', '#6a92cc', '#a9c0dc', '#e8d9bd', '#f6dfb0']);
      const sg = c.createRadialGradient(252, 30, 2, 252, 30, 70); sg.addColorStop(0, 'rgba(255,250,220,.95)'); sg.addColorStop(0.15, 'rgba(255,240,190,.55)'); sg.addColorStop(1, 'rgba(255,230,180,0)');
      c.fillStyle = sg; c.fillRect(150, 0, 170, 78); circ(c, '#fffbe8', 252, 30, 7);
      const drift = (t * 2) % 400;
      cloud(c, (60 + drift * 0.6) % 420 - 50, 30, 70, 11); cloud(c, (170 + drift * 0.4) % 420 - 50, 18, 46, 23); cloud(c, (300 + drift * 0.5) % 420 - 50, 44, 54, 37);
      // far islands in haze
      poly(c, '#7d86ad', [8, 76, 30, 66, 52, 62, 70, 66, 92, 76]); poly(c, '#8d93b4', [28, 70, 44, 64, 56, 66, 40, 72]);
      poly(c, '#8a80aa', [186, 76, 200, 70, 214, 67, 232, 70, 246, 76]); c.fillStyle = 'rgba(220,200,240,.35)'; c.fillRect(180, 64, 70, 12);
      // sea
      bands(c, 0, 76, 320, 42, ['#244f8c', '#2b62a0', '#3375b0', '#3e88bc', '#58a0c6']);
      c.save(); c.globalAlpha = 0.35; c.fillStyle = tex(c, '#2b62a0', '#6aa8d4', 'water'); c.fillRect(0, 76, 320, 42); c.restore();
      for (let i = 0; i < 40; i++) { const yy = 78 + (i * 7 % 38), w = 4 + (i % 5) * 3, xx = ((i * 61 + t * (6 + i % 4 * 3)) % 360) - 20; R(c, `rgba(255,255,255,${0.15 + (yy - 76) / 160})`, xx, yy, w, 1); }
      for (let i = 0; i < 26; i++) { const yy = 77 + i * 1.5, xx = 252 + Math.sin(i * 2.3 + t * 3) * (4 + i * 0.6); if (Math.sin(t * 5 + i) > -0.2) R(c, '#fff8d8', xx, yy, 2 + (i % 3), 1); }
      // surf and wet sand
      const surge = Math.sin(t * 1.2) * 2.5;
      bands(c, 0, 114, 320, 14, ['#c7a46a', '#b89458']);
      c.fillStyle = 'rgba(120,170,200,.35)'; c.fillRect(0, 114 + surge, 320, 5);
      c.fillStyle = 'rgba(255,255,255,.85)'; for (let x = 0; x < 320; x += 3) { const yy = 113 + surge + Math.sin(x / 7 + t * 1.6) * 1.6 + Math.sin(x / 23) * 1.2; c.fillRect(x, yy, 3, 2); if ((x / 3) % 4 === 0) c.fillRect(x + 1, yy + 3, 2, 1); }
      // dry sand with ripples and light
      c.fillStyle = tex(c, '#e2c48a', '#cfae72', 'sand'); c.fillRect(0, 124, 320, 76);
      const lg = c.createLinearGradient(0, 124, 0, 200); lg.addColorStop(0, 'rgba(255,240,200,.25)'); lg.addColorStop(1, 'rgba(90,60,30,.18)'); c.fillStyle = lg; c.fillRect(0, 124, 320, 76);
      c.strokeStyle = 'rgba(150,110,60,.35)'; c.lineWidth = 1;
      for (let i = 0; i < 18; i++) { const y0 = 130 + i * 3.8, x0 = (i * 47) % 300; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + 20, y0 - 2, x0 + 40 + (i % 3) * 10, y0 + 0.5); c.stroke(); }
      // footprints from the surf
      for (let i = 0; i < 9; i++) ell(c, 'rgba(140,100,55,.4)', 146 + i * 1.8 + (i % 2) * 3, 128 + i * 5.5, 1.6, 1);
      // rocks toward the cliffs (left), with weed and a pool
      rock(c, [0, 158, 0, 96, 14, 92, 30, 100, 36, 120, 28, 146, 12, 160], '#77716a');
      rock(c, [20, 128, 30, 108, 46, 110, 52, 128, 40, 134], '#857e74');
      c.strokeStyle = '#3e6a2e'; c.lineWidth = 1; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(4 + i * 4, 150 - i % 3); c.quadraticCurveTo(6 + i * 4, 156, 3 + i * 4, 160); c.stroke(); }
      ell(c, '#5e8aa4', 38, 140, 9, 2.5); ell(c, '#9cc4d8', 36, 139.5, 4, 1);
      // the wreck: hull, ribs, broken mast, torn sail
      litPoly(c, [22, 148, 30, 120, 52, 106, 84, 100, 116, 112, 112, 134, 104, 150], '#6a4a2e', '#4a321e', 'wood', 0.3, 0.55);
      c.strokeStyle = 'rgba(30,18,10,.6)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(26 + i, 146 - i * 6); c.quadraticCurveTo(70, 132 - i * 5, 112 - i * 0.5, 132 - i * 4); c.stroke(); }
      poly(c, '#1e140c', [58, 116, 82, 110, 86, 138, 62, 142]);
      c.strokeStyle = '#4a321e'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(62 + i * 7, 142); c.quadraticCurveTo(64 + i * 7, 122, 70 + i * 6, 112); c.stroke(); }
      c.lineWidth = 1;
      c.save(); c.translate(86, 108); c.rotate(-0.18); R(c, '#6a4a2e', -2, -58, 4, 58); R(c, '#8a6a44', -2, -58, 1, 58); R(c, '#5a3a22', -14, -46, 28, 3); c.restore();
      c.strokeStyle = 'rgba(60,40,24,.8)'; c.beginPath(); c.moveTo(78, 52); c.lineTo(40, 112); c.moveTo(84, 54); c.lineTo(118, 112); c.stroke();
      poly(c, '#e8dfc8', [92, 58, 116, 68, 112, 86, 100, 80, 94, 92]); poly(c, '#c8bea4', [96, 62, 110, 70, 106, 82, 100, 78]); poly(c, '#b0a68c', [100, 80, 112, 86, 104, 90]);
      // flotsam: barrel, crate, plank, rope
      ell(c, '#6a4428', 132, 140, 6, 7); R(c, '#3a2414', 126, 136, 12, 1.5); R(c, '#3a2414', 126, 143, 12, 1.5); ell(c, '#8a5e38', 130, 139, 2, 4);
      litPoly(c, [40, 152, 52, 150, 54, 160, 42, 162], '#8a6a42', '#6a4a2a', 'wood');
      R(c, '#7a5a38', 98, 152, 30, 3); R(c, '#9a7a50', 98, 152, 30, 1);
      c.strokeStyle = '#c8b080'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(118, 160, 6, 2.5, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(118, 160, 3.5, 1.4, 0, 0, 7); c.stroke(); c.lineWidth = 1;
      if (!s.flags.ring_taken) sparkle(c, 70, 136, t);
      // dunes, grass and palms (right)
      litPoly(c, [236, 124, 266, 106, 300, 100, 320, 102, 320, 146, 286, 140, 252, 134], '#dcbc80', '#c8a468', 'sand', 0.3, 0.3);
      for (let i = 0; i < 10; i++) grassClump(c, 248 + i * 8, 126 - (i % 4) * 4 - (i > 4 ? 8 : 0), 7, 9, ['#6f8f3a', '#86a64a', '#58762e'], 50 + i, Math.sin(t + i) * 1.5);
      palm2(c, 286, 148, 74, t, 1, 5);
      palm2(c, 248, 128, 46, t + 1, -0.8, 9);
      // gulls
      c.strokeStyle = '#f6f6f6'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const gx = (t * 10 + i * 90) % 360 - 20, gy = 52 + Math.sin(t * 0.8 + i) * 6 + i * 6, f = Math.sin(t * 6 + i) * 2; c.beginPath(); c.moveTo(gx - 4, gy - f); c.lineTo(gx, gy + 1); c.lineTo(gx + 4, gy - f); c.stroke(); }
      // a crab that minds its own business
      const cx = 214 + Math.sin(t * 0.7) * 18; ell(c, '#c8402e', cx, 150, 3.5, 2); R(c, '#a83020', cx - 5, 148, 2, 2); R(c, '#a83020', cx + 3, 148, 2, 2);
      // items
      if (!s.flags.bottle_taken) { c.save(); c.translate(198, 166); c.rotate(-0.25); R(c, '#1e5a36', -7, -3, 13, 6); R(c, '#2e7a4a', -7, -3, 13, 2); R(c, '#2e7a4a', 6, -2, 4, 3); R(c, '#a07040', 9, -2, 2, 3); R(c, '#f2ecd8', -4, -1, 6, 2); R(c, '#cfeedd', -6, -3, 3, 1); c.restore(); ell(c, 'rgba(120,80,40,.3)', 198, 170, 9, 2); }
      if (!s.flags.conch_taken) { ell(c, 'rgba(120,80,40,.3)', 261, 184, 9, 2); ell(c, '#d8848c', 261, 180, 8, 4.5); ell(c, '#f6c6c4', 259, 178.5, 5, 2.4); c.strokeStyle = '#a85a64'; c.beginPath(); c.arc(256, 180, 2.5, 0, 5); c.stroke(); poly(c, '#f8dcd8', [266, 177, 270, 179, 266, 183]); }
    },
    post(c, s, t) {
      // foreground framing: dark rocks and beach grass close to the viewer
      poly(c, '#2a2622', [0, 200, 0, 176, 10, 170, 24, 178, 34, 192, 40, 200]); poly(c, '#3e3830', [2, 178, 10, 172, 20, 178, 12, 182]);
      grassClump(c, 312, 200, 10, 16, ['#3e5a22', '#4e6e2a', '#2e4618'], 77, Math.sin(t * 1.3) * 2);
    }
  };

  rooms.cliffs = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 66, ['#2c4f9a', '#4670b8', '#7096cc', '#b0c4dc', '#ead8b8']);
      const sg = c.createRadialGradient(60, 34, 2, 60, 34, 60); sg.addColorStop(0, 'rgba(255,250,220,.9)'); sg.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = sg; c.fillRect(0, 0, 140, 66); circ(c, '#fffbe8', 60, 34, 6);
      clouds(c, t, 12, '#fff', 21);
      island(c, 100, 64, 50, '#8a74aa'); haze(c, 125, 58, 46, 10, '210,180,240', 0.5);
      island(c, 30, 64, 24, '#7d86ad');
      sea(c, t, 64, 136, ['#1f4a86', '#26568e', '#2c62a0', '#3370ac', '#3a7cb6', '#3a7cb6', '#3474ae']);
      // surf breaking on rocks far below
      for (let i = 0; i < 7; i++) { rock(c, [i * 11 - 4, 200, i * 11 + 2, 184 - (i % 3) * 4, i * 11 + 9, 182 - (i % 2) * 3, i * 11 + 14, 200], '#56524c'); }
      c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 12; i++) { const fx = i * 6 + Math.sin(t * 2 + i) * 2, fy = 182 + Math.sin(t * 3 + i * 2) * 3; c.fillRect(fx, fy, 3, 1); }
      // cliff-top meadow
      litPoly(c, [66, 200, 70, 150, 62, 140, 74, 134, 190, 130, 320, 128, 320, 200], '#6a8c3a', '#4e6e2a', 'grass', 0.3, 0.35);
      litPoly(c, [52, 200, 60, 144, 74, 146, 68, 200], '#6e685e', '#4a463e', 'rock', 0.2, 0.6);
      for (let i = 0; i < 26; i++) grassClump(c, 80 + (i * 37) % 236, 140 + (i * 13) % 54, 5, 5 + (i % 4), ['#86a64a', '#a0be5a', '#5e7e30'], 200 + i, Math.sin(t + i) * 1.2);
      for (let i = 0; i < 9; i++) { const fx = 96 + (i * 53) % 200, fy = 150 + (i * 29) % 40; circ(c, ['#f6f0d0', '#f0d040', '#e08ab0'][i % 3], fx, fy, 1.2); }
      // cliff face with strata
      litPoly(c, [176, 140, 186, 60, 210, 28, 260, 18, 320, 10, 320, 140], '#8e877a', '#5e584e', 'rock', 0.35, 0.55);
      c.strokeStyle = 'rgba(40,34,28,.35)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(190 + i * 4, 40 + i * 11); c.quadraticCurveTo(250, 30 + i * 12, 320, 22 + i * 13); c.stroke(); }
      c.strokeStyle = '#3e6a2e'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(200 + i * 18, 26 + i * 2); c.quadraticCurveTo(203 + i * 18, 40, 199 + i * 18, 52 + (i % 3) * 6); c.stroke(); }
      // carved door with lit runes
      const open = s.flags.door_open;
      litPoly(c, [194, 146, 194, 86, 225, 58, 256, 86, 256, 146], '#77705f', '#55503f', 'stone', 0.3, 0.5);
      poly(c, open ? '#06060a' : '#9a9282', [202, 146, 202, 90, 225, 68, 248, 90, 248, 146]);
      if (!open) { c.fillStyle = tex(c, '#a09888', '#7a7262', 'stone'); clipPoly(c, [203, 146, 203, 90, 225, 69, 247, 90, 247, 146], () => c.fillRect(200, 66, 50, 82)); R(c, '#5e584a', 224, 74, 2, 72); circ(c, '#26221c', 225, 106, 3); circ(c, '#5e584a', 225, 106, 4.5); }
      else { const dg = c.createLinearGradient(0, 70, 0, 146); dg.addColorStop(0, 'rgba(150,240,255,.15)'); dg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = dg; c.fillRect(202, 70, 46, 76); }
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.05 + i * 0.1125), nx = 225 - Math.cos(a) * 32, ny = 112 - Math.sin(a) * 46;
        if (open) { circ(c, 'rgba(150,240,255,.35)', nx, ny, 5); }
        circ(c, open ? '#bff6ff' : '#46423a', nx, ny, 2); R(c, open ? '#bff6ff' : '#46423a', nx + 1, ny - 6, 1, 6);
      }
      // gulls
      c.strokeStyle = '#ffffff'; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const gx = (t * 12 + i * 70) % 200, gy = 110 + Math.sin(t + i) * 8 + i * 12, f = Math.sin(t * 6 + i) * 2; c.beginPath(); c.moveTo(gx - 4, gy - f); c.lineTo(gx, gy + 2); c.lineTo(gx + 4, gy - f); c.stroke(); }
    },
    post(c, s, t) {
      grassClump(c, 300, 200, 12, 18, ['#3e5a22', '#4e6e2a', '#2e4618'], 91, Math.sin(t * 1.3) * 2);
      grassClump(c, 120, 200, 8, 12, ['#3e5a22', '#4e6e2a'], 92, Math.sin(t * 1.1) * 2);
    }
  };

  rooms.square = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 92, ['#2e52a0', '#4a72b8', '#7a9acc', '#b4c6dc', '#e2d6c0']);
      clouds(c, t, 10, '#fff', 33);
      // castle: cylindrical towers, curtain wall, crenellations
      const wallA = '#e6dfd0', wallB = '#bdb39f';
      litPoly(c, [196, 100, 196, 40, 320, 40, 320, 100], wallA, wallB, 'stone', 0.2, 0.35);
      for (let x = 196; x < 320; x += 10) { R(c, wallA, x, 33, 6, 7); R(c, wallB, x + 4, 33, 2, 7); }
      [[206, 8, 22], [262, 0, 26], [300, 14, 20]].forEach(([x, y, w]) => {
        c.fillStyle = tex(c, wallA, wallB, 'stone'); c.fillRect(x, y, w, 100 - y);
        const cg = c.createLinearGradient(x, 0, x + w, 0); cg.addColorStop(0, 'rgba(255,250,235,.35)'); cg.addColorStop(0.4, 'rgba(255,250,235,0)'); cg.addColorStop(1, 'rgba(40,30,50,.45)'); c.fillStyle = cg; c.fillRect(x, y, w, 100 - y);
        litPoly(c, [x - 3, y, x + w / 2, y - 22, x + w + 3, y], '#2f8a7a', '#1e5a50', 'wood', 0.3, 0.4);
        c.strokeStyle = 'rgba(10,40,36,.4)'; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x - 3 + k * 2, y - k * 5); c.lineTo(x + w + 3 - k * 2, y - k * 5); c.stroke(); }
        R(c, '#2a2a3a', x + w / 2 - 2, y + 14, 4, 8); R(c, '#e8c070', x + w / 2 - 1, y + 16, 2, 2);
        const wv = Math.sin(t * 3 + x) * 2;
        R(c, '#6b5a40', x + w / 2, y - 34, 1, 12); poly(c, '#3fae8f', [x + w / 2 + 1, y - 34, x + w / 2 + 12 + wv, y - 31, x + w / 2 + 1, y - 28]);
      });
      // gatehouse
      litPoly(c, [248, 150, 248, 58, 320, 58, 320, 150], '#cfc6b4', '#a89e8a', 'stone', 0.2, 0.45);
      poly(c, '#1a1612', [262, 150, 262, 92, 285, 76, 308, 92, 308, 150]);
      c.fillStyle = '#5a5248'; for (let x = 266; x < 308; x += 7) { c.fillRect(x, 84, 2, 66); c.fillRect(x, 84, 1, 66); } for (let y = 96; y < 150; y += 9) c.fillRect(262, y, 46, 2);
      for (let k = 0; k < 10; k++) { const a = Math.PI + k * Math.PI / 9; R(c, '#a89e8a', 285 + Math.cos(a) * 26, 92 + Math.sin(a) * 18, 4, 3); }
      // town wall behind houses
      litPoly(c, [0, 140, 0, 90, 250, 90, 250, 140], '#bcb09a', '#968a74', 'stone', 0.15, 0.3);
      // houses: plaster, timber frame, tiled roofs, flower boxes
      const house = (x, w, h, plaster, roof) => {
        const y0 = 140 - h;
        c.fillStyle = tex(c, plaster, shade(plaster, -22), 'mottle'); c.fillRect(x, y0, w, h);
        c.fillStyle = '#4a2e1a'; c.fillRect(x, y0, w, 2); c.fillRect(x, y0, 2, h); c.fillRect(x + w - 2, y0, 2, h); c.fillRect(x, y0 + h * 0.45, w, 2);
        c.strokeStyle = '#4a2e1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 2, y0 + h * 0.45); c.lineTo(x + w * 0.3, y0 + 2); c.moveTo(x + w - 2, y0 + h * 0.45); c.lineTo(x + w * 0.7, y0 + 2); c.stroke(); c.lineWidth = 1;
        litPoly(c, [x - 5, y0, x + w / 2, y0 - 22, x + w + 5, y0], roof, shade(roof, -35), 'wood', 0.25, 0.45);
        c.strokeStyle = 'rgba(40,10,0,.35)'; for (let k = 1; k < 5; k++) { const yy = y0 - k * 4.4, half = (w / 2 + 5) * (1 - k / 5); c.beginPath(); c.moveTo(x + w / 2 - half, yy); c.lineTo(x + w / 2 + half, yy); c.stroke(); }
        R(c, 'rgba(0,0,0,.2)', x, y0, w, 4);
      };
      house(10, 52, 70, '#eadcbc', '#a3462e'); house(64, 56, 60, '#dccaa4', '#8a3a28'); house(124, 64, 52, '#ece1c8', '#9c4a2a');
      const win = (x, y) => { R(c, '#4a2e1a', x - 1, y - 1, 14, 14); R(c, '#3a5a7a', x, y, 12, 12); R(c, '#9cc0dc', x + 1, y + 1, 4, 4); R(c, '#4a2e1a', x + 5, y, 2, 12); R(c, '#4a2e1a', x, y + 5, 12, 2); R(c, '#6a4a2a', x - 2, y + 12, 16, 3); for (let k = 0; k < 4; k++) circ(c, ['#e0405a', '#f0d040', '#f6f0f0', '#e0405a'][k], x + 1 + k * 3.5, y + 12, 1.6); };
      win(132, 96); win(160, 96); win(72, 96);
      // shop door + sign
      R(c, '#3a2214', 22, 92, 26, 48); c.fillStyle = tex(c, '#7a5030', '#5a3820', 'wood'); c.fillRect(24, 94, 22, 46); R(c, '#2a180c', 34, 94, 1, 46); circ(c, '#e2b23a', 42, 118, 1.5);
      R(c, '#5a3a22', 14, 72, 42, 13); R(c, '#e2b23a', 16, 74, 38, 9); R(c, '#fff3b0', 16, 74, 38, 2); c.fillStyle = '#4a2c18'; c.font = 'bold 7px Georgia, serif'; c.fillText('CURIOS', 20, 81.5);
      // inn door and sign
      R(c, '#3a2214', 98, 106, 20, 34); c.fillStyle = tex(c, '#6a4428', '#4a2c18', 'wood'); c.fillRect(100, 108, 16, 32); circ(c, '#e2b23a', 113, 124, 1.2);
      R(c, '#5a3a22', 104, 86, 1, 8); R(c, '#4a2c18', 95, 91, 26, 14); R(c, '#2f6b8a', 96, 92, 24, 12); poly(c, '#7a8a9a', [98, 100, 108, 94, 118, 100]); circ(c, '#f0c8a8', 108, 96, 1.5);
      // notice board
      R(c, '#4a2e1a', 66, 100, 2, 40); R(c, '#4a2e1a', 90, 100, 2, 40); c.fillStyle = tex(c, '#8a6040', '#6a4428', 'wood'); c.fillRect(64, 98, 30, 22);
      R(c, '#f4ead2', 68, 101, 22, 15); R(c, '#e8dcc0', 70, 103, 10, 12); c.fillStyle = '#7a1d1d'; c.fillRect(70, 104, 18, 2); c.fillStyle = '#555'; for (let i = 0; i < 4; i++) c.fillRect(70, 108 + i * 2, 16 - i * 3, 1); circ(c, '#8c1d26', 79, 101, 1);
      // bunting
      for (let k = 0; k < 2; k++) { const x0 = 10 + k * 120; c.strokeStyle = 'rgba(60,40,20,.6)'; c.beginPath(); c.moveTo(x0, 56); c.quadraticCurveTo(x0 + 60, 76, x0 + 120, 56); c.stroke(); for (let i = 0; i < 12; i++) { const x = x0 + i * 10, y = 56 + Math.sin(i / 11 * Math.PI) * 10; poly(c, ['#3fae8f', '#f0ece0', '#e2b23a'][i % 3], [x, y, x + 6, y, x + 3, y + 7]); poly(c, 'rgba(0,0,0,.18)', [x + 3, y, x + 6, y, x + 3, y + 7]); } }
      // cobbles, stone by stone
      c.fillStyle = tex(c, '#a8a092', '#847c6e', 'stone'); c.fillRect(0, 140, 320, 60);
      const g = rnd(71);
      for (let y = 142, row = 0; y < 200; y += 6 + row * 0.3, row++) for (let x = -(row % 2) * 6; x < 320; x += 12 + row * 0.4) {
        const w = 10 + row * 0.4, hh = 4 + row * 0.25, v = (g() - 0.5) * 30;
        ell(c, `rgb(${150 + v | 0},${142 + v | 0},${128 + v | 0})`, x + w / 2, y + hh / 2, w / 2 - 0.6, hh / 2);
        R(c, 'rgba(255,250,235,.25)', x + 2, y, w - 4, 1);
      }
      c.fillStyle = 'rgba(30,20,10,.15)'; c.fillRect(0, 140, 320, 6);
      // fountain: carved stone, dolphin, sparkling water
      ell(c, 'rgba(0,0,0,.25)', 162, 150, 38, 7);
      litPoly(c, [124, 146, 130, 136, 190, 136, 196, 146, 190, 154, 130, 154], '#b8b0a2', '#8a8274', 'stone', 0.35, 0.45);
      ell(c, '#c8c0b2', 160, 138, 34, 7); ell(c, '#2f78ac', 160, 139, 30, 5.5); ell(c, '#58a0cc', 156, 138, 18, 3);
      for (let i = 0; i < 8; i++) sparkle(c, 136 + i * 7, 138 + (i % 2) * 2, t + i);
      litPoly(c, [155, 138, 155, 116, 165, 116, 165, 138], '#c0b8aa', '#908878', 'stone');
      poly(c, '#8eaec4', [150, 120, 160, 112, 170, 110, 174, 102, 166, 106, 160, 108, 152, 106, 148, 112]); poly(c, '#b8d4e4', [152, 114, 160, 110, 166, 108, 158, 112]); R(c, '#1a2a3a', 167, 105, 1, 1);
      c.fillStyle = 'rgba(200,235,255,.85)'; for (let i = 0; i < 10; i++) { const p = (t * 1.8 + i / 10) % 1; c.fillRect(172 - p * 16 + Math.sin(i) * 3, 104 + p * p * 34, 1, 2); }
      // lamp post + barrels
      R(c, '#2a2a2e', 228, 102, 2, 48); R(c, '#2a2a2e', 224, 98, 10, 5); R(c, '#e8c070', 226, 92, 6, 6); circ(c, 'rgba(255,220,140,.2)', 229, 95, 8);
      ell(c, '#6a4428', 214, 142, 6, 8); R(c, '#3a2414', 208, 137, 12, 1.5); R(c, '#3a2414', 208, 146, 12, 1.5); ell(c, '#8a5e38', 212, 141, 2, 5);
      // a cat on the wall
      const tail = Math.sin(t * 2) * 2; ell(c, '#3a3a3a', 186, 88, 5, 3); circ(c, '#3a3a3a', 191, 85, 2.6); poly(c, '#3a3a3a', [189.5, 83, 190, 80, 191.5, 83]); poly(c, '#3a3a3a', [191.5, 83, 192.5, 80, 193, 83.5]); c.strokeStyle = '#3a3a3a'; c.beginPath(); c.moveTo(181, 88); c.quadraticCurveTo(177, 92 + tail, 179, 96); c.stroke();
    },
    actors: s => [
      { y: 160, d: c => figure(c, 268, 160, { sprite: 'guard', skin: '#dba882', hair: '#2a1d12', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', hat: r => { r('#9aa7a8', -3, 27, 6, 3); } }, 0, 1) },
      { y: 160, d: c => figure(c, 304, 160, { sprite: 'guard', skin: '#b9845e', hair: '#1a120c', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', hat: r => { r('#9aa7a8', -3, 27, 6, 3); } }, 0, -1) },
      { y: 159, d: c => { R(c, '#5a4a30', 280, 92, 1, 68); poly(c, '#cfd6d8', [279, 92, 280.5, 84, 282, 92]); R(c, '#5a4a30', 316, 92, 1, 68); poly(c, '#cfd6d8', [315, 92, 316.5, 84, 318, 92]); } }
    ],
    post(c, s, t) { R(c, 'rgba(30,20,10,.0)', 0, 0, 0, 0); }
  };

  rooms.shop = {
    bg(c, s, t) {
      boards(c, 0, 0, 320, 160, '#6a4a34', '#4a3020');
      R(c, '#3a2414', 0, 0, 320, 8); R(c, '#2e1c10', 0, 8, 320, 2);
      // net + lamp
      c.strokeStyle = 'rgba(210,190,150,.5)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(190 + i * 6, 10); c.lineTo(200 + i * 4, 60); c.stroke(); }
      const sw = Math.sin(t) * 2; R(c, '#222', 160 + sw, 10, 1, 12); circ(c, 'rgba(255,200,90,.2)', 160 + sw, 26, 20); R(c, '#e2b23a', 156 + sw, 22, 8, 8); R(c, '#fff3b0', 158 + sw, 24, 4, 4);
      // shelves
      for (let i = 0; i < 3; i++) R(c, '#3a2414', 60, 46 + i * 24, 120, 3);
      const g = rnd(5), cols = ['#3fae8f', '#e79aa0', '#e2b23a', '#7a9ac8', '#c86a3a', '#e8e0cc', '#8c1d26'];
      for (let row = 0; row < 3; row++) for (let x = 64; x < 174;) { const w = 6 + g() * 10, h = 6 + g() * 12; R(c, cols[(g() * cols.length) | 0], x, 46 + row * 24 - h, w, h); x += w + 3; }
      R(c, '#2e7a4a', 70, 66, 18, 8); poly(c, '#e8e0cc', [74, 72, 82, 72, 78, 67]); // ship in a bottle
      // stuffed fish
      R(c, '#6b4428', 248, 28, 54, 28); poly(c, '#7a9ac8', [256, 42, 284, 34, 296, 42, 284, 50]); poly(c, '#5f7fae', [256, 42, 250, 34, 250, 50]); circ(c, '#fff', 290, 40, 2); R(c, '#000', 290, 40, 1, 1);
      // door
      R(c, '#2e1c10', 8, 76, 40, 84); R(c, '#f0d8a0', 12, 80, 32, 80); c.fillStyle = 'rgba(255,230,170,.18)'; poly(c, 'rgba(255,230,170,.15)', [12, 160, 44, 160, 90, 200, 0, 200]);
      // floor
      planks(c, 0, 160, 320, 40, '#7a5236', '#55372a');
      // ship's wheel
      c.strokeStyle = '#7a5230'; c.lineWidth = 2; c.beginPath(); c.arc(110, 132, 14, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(110, 132); c.lineTo(110 + Math.cos(a) * 18, 132 + Math.sin(a) * 18); c.stroke(); }
    },
    actors: () => [{ y: 120, d: c => { if (window.Art.hasPainting && window.Art.hasPainting('shop')) { c.save(); c.beginPath(); c.rect(0, 0, 320, 117); c.clip(); figure(c, 250, 142, { sprite: 'bram', h: 38, skin: '#e3b08c', hair: '#d8d8d8', beard: '#e4e4e4', top: '#3d5a8a', legs: '#333', hat: r => { r('#8c1d26', -3, 28, 6, 2.5); } }, 0, -1); c.restore(); } else { figure(c, 214, 128, { h: 32, skin: '#e3b08c', hair: '#d8d8d8', beard: '#e4e4e4', top: '#3d5a8a', legs: '#333', hat: r => { r('#8c1d26', -3, 28, 6, 2.5); } }, 0, -1); R(c, '#5a3a22', 140, 120, 166, 38); R(c, '#7a5230', 136, 116, 174, 6); } } }]
  };

  rooms.docks = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 66, ['#3a4a96', '#5a5ca6', '#8a6ea8', '#c88890', '#eea67a', '#f6cf96']);
      const sg = c.createRadialGradient(240, 52, 3, 240, 52, 90); sg.addColorStop(0, 'rgba(255,236,180,.95)'); sg.addColorStop(0.2, 'rgba(255,200,140,.45)'); sg.addColorStop(1, 'rgba(255,170,120,0)'); c.fillStyle = sg; c.fillRect(120, 0, 200, 66); circ(c, '#fff4d0', 240, 52, 9);
      clouds(c, t, 14, 'rgba(255,220,200,.6)', 51);
      island(c, 180, 64, 70, '#7a5a98'); haze(c, 215, 56, 56, 12, '230,190,230', 0.45);
      R(c, '#e8e0d0', 96, 40, 6, 24); R(c, '#8c1d26', 96, 46, 6, 3); R(c, '#8c1d26', 96, 54, 6, 3); R(c, '#2a2a3a', 95, 36, 8, 4); poly(c, '#4a5a7a', [80, 64, 90, 60, 108, 60, 116, 64]);
      if (s.flags.lit) { circ(c, 'rgba(255,240,160,.35)', 99, 38, 8); poly(c, 'rgba(255,240,170,' + (0.18 + Math.sin(t * 2) * 0.1) + ')', [99, 38, 99 + Math.cos(t) * 90, 30, 99 + Math.cos(t) * 90, 46]); circ(c, '#fff6c0', 99, 38, 2.5); }
      sea(c, t, 64, 136, ['#34528e', '#3c5c98', '#4466a2', '#4c70aa', '#527ab2', '#527ab2']);
      for (let i = 0; i < 30; i++) { const yy = 66 + i * 2.2, w = 30 - i * 0.6, xx = 240 - w / 2 + Math.sin(t * 2 + i * 1.7) * 6; if (Math.sin(t * 4 + i) > -0.3) R(c, `rgba(255,${210 + i},${150 + i * 2},${0.55 - i * 0.012})`, xx, yy, w * (0.3 + (i % 3) * 0.2), 1); }
      // pier: posts, boards in perspective
      for (let x = 2; x < 200; x += 24) { litPoly(c, [x, 200, x, 140, x + 6, 140, x + 6, 200], '#4a3420', '#2e1e10', 'wood', 0.3, 0.5); R(c, 'rgba(20,40,60,.4)', x, 186, 6, 14); }
      c.save(); c.beginPath(); c.rect(0, 146, 200, 48); c.clip(); planks(c, 0, 146, 200, 48, '#8a6a46', '#5e4428'); c.restore();
      R(c, '#3e2a18', 0, 192, 200, 4); litPoly(c, [196, 200, 196, 138, 203, 138, 203, 200], '#4a3420', '#2e1e10', 'wood');
      R(c, 'rgba(0,0,0,.25)', 0, 146, 200, 2);
      // crates, barrel, nets, rope
      litPoly(c, [18, 146, 18, 120, 44, 120, 44, 146], '#a07a4a', '#7a5a34', 'wood', 0.35, 0.45); c.strokeStyle = '#5a3a22'; c.strokeRect(18.5, 120.5, 25, 25); c.beginPath(); c.moveTo(18, 120); c.lineTo(44, 146); c.stroke();
      litPoly(c, [44, 146, 44, 130, 62, 130, 62, 146], '#9a7448', '#74542e', 'wood', 0.35, 0.45);
      ell(c, '#6a4428', 72, 138, 7, 9); R(c, '#3a2414', 65, 133, 14, 1.5); R(c, '#3a2414', 65, 143, 14, 1.5); ell(c, '#8a5e38', 70, 137, 2, 6);
      c.strokeStyle = 'rgba(200,180,130,.6)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(118 + i * 4, 112); c.lineTo(114 + i * 5, 146); c.stroke(); } for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(114, 118 + i * 6); c.lineTo(146, 116 + i * 6); c.stroke(); }
      R(c, '#4a3420', 112, 108, 38, 3);
      c.strokeStyle = '#d8c08a'; c.lineWidth = 2; c.beginPath(); c.ellipse(86, 156, 9, 3.5, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(86, 156, 5, 2, 0, 0, 7); c.stroke(); c.lineWidth = 1;
      // the ferry
      const bob = Math.sin(t * 1.6) * 1.5;
      ell(c, 'rgba(10,20,40,.35)', 258, 175 + bob, 58, 5);
      litPoly(c, [204, 150 + bob, 314, 150 + bob, 302, 172 + bob, 216, 172 + bob], '#7a4428', '#4a2412', 'wood', 0.35, 0.55);
      for (let k = 0; k < 4; k++) R(c, 'rgba(20,8,0,.35)', 208 + k * 2, 154 + k * 4 + bob, 100 - k * 4, 1);
      R(c, '#efe6d0', 206, 150 + bob, 106, 2); R(c, '#c8bea4', 206, 152 + bob, 106, 1);
      R(c, '#5a3a22', 254, 72 + bob, 3, 80); R(c, '#7a5a3a', 254, 72 + bob, 1, 80); R(c, '#5a3a22', 240, 136 + bob, 50, 2);
      poly(c, '#f2e8cc', [257, 76 + bob, 300, 138 + bob, 257, 138 + bob]); poly(c, '#d8cca8', [257, 76 + bob, 276, 106 + bob, 257, 116 + bob]); poly(c, 'rgba(255,220,170,.35)', [262, 90 + bob, 296, 136 + bob, 280, 136 + bob]);
      R(c, '#c8a878', 268, 110 + bob, 10, 10); R(c, '#a88858', 268, 110 + bob, 10, 1); R(c, '#a88858', 268, 115 + bob, 10, 1);
      c.strokeStyle = 'rgba(60,40,20,.7)'; c.beginPath(); c.moveTo(256, 74 + bob); c.lineTo(212, 150 + bob); c.moveTo(256, 74 + bob); c.lineTo(308, 150 + bob); c.stroke();
      c.strokeStyle = '#ffffff'; for (let i = 0; i < 3; i++) { const gx = (t * 9 + i * 110) % 360 - 20, gy = 30 + Math.sin(t + i) * 5 + i * 9, f = Math.sin(t * 6 + i) * 2; c.beginPath(); c.moveTo(gx - 4, gy - f); c.lineTo(gx, gy + 1); c.lineTo(gx + 4, gy - f); c.stroke(); }
    },
    actors: () => [{ y: 150, d: c => figure(c, 200, 150, { sprite: 'nell', skin: '#c9906a', hair: '#a8a8a8', longHair: true, top: '#c8a43a', legs: '#3a3a44', hat: r => { r('#c8a43a', -4, 28, 8, 1.5); r('#c8a43a', -2.5, 29, 5, 2); } }, 0, -1) }],
    post(c, s, t) { litPoly(c, [300, 200, 300, 160, 310, 160, 310, 200], '#3a2818', '#22160a', 'wood'); c.strokeStyle = '#c8b080'; c.lineWidth = 2; c.beginPath(); c.moveTo(310, 172); c.quadraticCurveTo(316, 190, 320, 186); c.stroke(); c.lineWidth = 1; }
  };

  rooms.mistshore = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 146, ['#2a2048', '#3a2e5a', '#4e406c', '#66587e', '#847494']);
      const mg = c.createRadialGradient(80, 40, 2, 80, 40, 60); mg.addColorStop(0, 'rgba(230,220,255,.6)'); mg.addColorStop(1, 'rgba(200,190,240,0)'); c.fillStyle = mg; c.fillRect(0, 0, 180, 110); circ(c, '#ecE6ff'.toLowerCase(), 80, 40, 7);
      // layered misty forest
      [['#3a3058', 112, 0.55], ['#2e264a', 124, 0.75], ['#221c38', 138, 1]].forEach(([col, base, k], li) => {
        const g = rnd(11 + li);
        for (let x = -10; x < 330; x += 18 + g() * 14) { const h = (30 + g() * 40) * k; poly(c, col, [x, base, x + 9, base - h, x + 18, base]); poly(c, shade(col, 10), [x + 5, base - h * 0.5, x + 9, base - h, x + 9, base - h * 0.4]); }
        R(c, col, 0, base, 320, 4); haze(c, 160, base - 4, 220, 10, '200,190,230', 0.25);
      });
      // grotto mouth carved with eyes
      litPoly(c, [116, 142, 122, 80, 160, 54, 198, 80, 204, 142], '#5a546a', '#3a3448', 'rock', 0.3, 0.55);
      poly(c, '#07060c', [132, 142, 136, 90, 160, 72, 184, 90, 188, 142]);
      const gg = c.createRadialGradient(160, 140, 4, 160, 140, 50); gg.addColorStop(0, 'rgba(80,220,255,.25)'); gg.addColorStop(1, 'rgba(80,220,255,0)'); c.fillStyle = gg; c.fillRect(132, 90, 56, 52);
      [[140, 84], [180, 84], [160, 64]].forEach(([x, y]) => { ell(c, '#d8d0f0', x, y, 4.5, 2.4); circ(c, '#3a2e58', x, y, 1.3); R(c, '#2a2240', x - 5, y - 3, 10, 1); });
      c.strokeStyle = '#3e5a3a'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(124 + i * 12, 82 - Math.abs(i - 3) * 6); c.quadraticCurveTo(126 + i * 12, 94, 122 + i * 12, 104 + (i % 3) * 5); c.stroke(); }
      // boggy ground
      c.fillStyle = tex(c, '#3e4e3c', '#2a362a', 'grass'); c.fillRect(0, 140, 320, 60);
      [[90, 186, 26, 5], [200, 154, 30, 4], [30, 150, 20, 3]].forEach(([x, y, rx, ry]) => { ell(c, '#24303a', x, y, rx, ry); ell(c, 'rgba(160,150,200,.35)', x - rx * 0.3, y - 0.5, rx * 0.4, ry * 0.4); });
      for (let i = 0; i < 18; i++) grassClump(c, (i * 41) % 310 + 6, 148 + (i * 17) % 48, 5, 7, ['#4e6e4e', '#5e7e5a', '#3a5a3a'], 300 + i, Math.sin(t * 0.8 + i));
      for (let i = 0; i < 5; i++) { const x = 230 + i * 14; R(c, '#5a4a2a', x, 150 - i % 2 * 4, 1, 14); ell(c, '#6a4a2a', x, 149 - i % 2 * 4, 1.5, 3); }
      // glowcaps
      const pulse = 0.5 + Math.sin(t * 2) * 0.2;
      const gl = c.createRadialGradient(60, 176, 2, 60, 176, 30); gl.addColorStop(0, `rgba(140,255,170,${0.4 * pulse})`); gl.addColorStop(1, 'rgba(140,255,170,0)'); c.fillStyle = gl; c.fillRect(28, 146, 64, 60);
      const caps = s.inv.includes('glowcap') || s.flags.got_thread ? [[46, 178], [60, 172], [74, 180]] : [[46, 178], [56, 170], [64, 176], [74, 180]];
      caps.forEach(([x, y]) => { R(c, '#d8f0d0', x - 1, y - 4, 3, 6); R(c, '#a8c8a0', x + 1, y - 4, 1, 6); ell(c, '#6af090', x, y - 5, 5, 3); ell(c, '#d0ffe0', x - 1.5, y - 6.2, 2, 1); for (let k = 0; k < 3; k++) circ(c, '#fff', x - 2 + k * 2, y - 5, 0.4); });
      // boat on the dark water
      const bob = Math.sin(t * 1.6) * 1;
      c.fillStyle = tex(c, '#46507a', '#323a5c', 'water'); c.fillRect(220, 182, 100, 18);
      litPoly(c, [234, 178 + bob, 320, 178 + bob, 320, 196 + bob, 244, 196 + bob], '#6a3a22', '#3a1a0a', 'wood'); R(c, '#e8e0cc', 236, 178 + bob, 84, 2);
    },
    post(c, s, t) {
      for (let i = 0; i < 5; i++) { const x = ((t * (5 + i * 3) + i * 90) % 520) - 160; haze(c, x, 122 + i * 16, 130, 12, '220,210,245', 0.22); }
      const wy = 106 + Math.sin(t * 2.2) * 6, wx = 248 + Math.sin(t * 1.3) * 8;
      haze(c, wx, wy, 20, 20, '120,180,255', 0.45); circ(c, 'rgba(170,215,255,.7)', wx, wy, 5); circ(c, '#f0f8ff', wx, wy, 2.5);
      if (!(window.Art.hasPainting && window.Art.hasPainting('mistshore'))) { poly(c, '#120e1e', [0, 200, 0, 130, 8, 126, 14, 140, 20, 200]); for (let k = 0; k < 4; k++) { c.strokeStyle = '#1a1428'; c.beginPath(); c.moveTo(10, 130 + k * 8); c.lineTo(26 + k * 3, 120 + k * 10); c.stroke(); } }
    }
  };

  rooms.oracle = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 152, ['#141024', '#1c1630', '#241c3c', '#2c2448', '#342a52']);
      for (let i = 0; i < 14; i++) { const x = i * 24 + (i % 3) * 4, h = 10 + (i * 17 % 26); poly(c, '#0e0b1a', [x, 0, x + 6, h, x + 12, 0]); }
      c.save(); c.globalAlpha = 0.5; c.fillStyle = tex(c, '#342a52', '#141024', 'rock'); c.fillRect(0, 0, 320, 152); c.restore();
      litPoly(c, [0, 152, 0, 60, 30, 90, 40, 152], '#2a2240', '#120e20', 'rock'); litPoly(c, [320, 152, 320, 50, 286, 96, 276, 152], '#2a2240', '#120e20', 'rock');
      c.fillStyle = tex(c, '#3a3058', '#221a38', 'rock'); c.fillRect(0, 152, 320, 48);
      [[60, 152, 10, 40], [84, 152, 6, 22], [250, 152, 12, 46], [276, 152, 7, 26], [30, 152, 5, 18]].forEach(([x, y, w, h]) => litPoly(c, [x - w, y, x, y - h, x + w, y], '#4a3e68', '#1a1428', 'rock', 0.35, 0.5));
      [[46, 120], [292, 110], [70, 60], [244, 50]].forEach(([x, y], i) => { const p = 0.6 + Math.sin(t * 2 + i) * 0.3; haze(c, x, y, 16, 16, '120,200,255', 0.35 * p); poly(c, '#7ad8ff', [x - 4, y + 6, x - 1, y - 8, x + 2, y + 6]); poly(c, '#c8f0ff', [x - 1, y - 8, x + 2, y + 6, x + 6, y + 4, x + 3, y - 4]); });
      // pool
      const g = 0.6 + Math.sin(t * 1.5) * 0.2;
      circ(c, `rgba(80,220,255,${0.12 * g})`, 160, 145, 70);
      ell(c, '#1d6f8a', 160, 145, 60, 9); ell(c, '#38b8d8', 160, 145, 54, 7);
      for (let i = 0; i < 5; i++) { const p = (t * 0.5 + i / 5) % 1; c.strokeStyle = `rgba(200,250,255,${1 - p})`; c.beginPath(); c.ellipse(160, 145, p * 50, p * 6, 0, 0, 7); c.stroke(); }
      // candles
      [[96, 150], [224, 150], [84, 156], [236, 156]].forEach(([x, y]) => { R(c, '#e8e0cc', x, y - 8, 3, 8); poly(c, '#ffb040', [x - 1, y - 8, x + 4, y - 8, x + 1.5, y - 13 + Math.sin(t * 9 + x)]); circ(c, 'rgba(255,180,80,.15)', x + 1, y - 10, 8); });
    },
    actors: () => [{ y: 113, d: c => figure(c, 160, 113, { sprite: 'oracle', skin: '#c8a090', hair: '#e8e8f0', longHair: true, top: '#5a3a7a', robe: '#4a2e6a', trim: '#e2b23a', legs: '#4a2e6a', h: 28 }, 0, 1) }]
  };

  rooms.tunnel = {
    bg(c, s, t) {
      stoneWall(c, 0, 0, 320, 150, '#3e3a36', '#2a2724', 77);
      c.fillStyle = tex(c, '#3e3a34', '#1e1c1a', 'rock'); c.fillRect(0, 150, 320, 50);
      // timbers
      [40, 140, 230].forEach(x => { R(c, '#4a3420', x, 40, 8, 112); R(c, '#4a3420', x - 10, 36, 30, 6); });
      // stairs up
      for (let i = 0; i < 8; i++) R(c, i % 2 ? '#5a554e' : '#66615a', 258 + i * 2, 150 - i * 12, 50 - i * 2, 12);
      R(c, '#110f0d', 270, 50, 40, 12);
      // scrawl
      c.fillStyle = '#8a857b'; c.font = '7px monospace'; c.fillText('GRUMBO WOZ ERE', 98, 92); c.fillText('no he woznt', 104, 102);
      // chasm
      poly(c, '#000', [120, 176, 136, 170, 160, 172, 180, 178, 166, 186, 140, 188]);
      R(c, '#d8f0d0', 200, 156, 1, 1);
    },
    post(c, s, t) {
      // darkness everywhere except around the glowcap Rowan carries
      const g = c.createRadialGradient(s.x, s.y - 16, 10, s.x, s.y - 16, 110 + Math.sin(t * 2) * 4);
      const pt = window.Art.hasPainting && window.Art.hasPainting('tunnel'); g.addColorStop(0, 'rgba(60,255,120,0.06)'); g.addColorStop(0.5, `rgba(0,10,4,${pt ? 0.3 : 0.55})`); g.addColorStop(1, `rgba(0,0,0,${pt ? 0.75 : 0.94})`);
      c.fillStyle = g; c.fillRect(0, 0, 320, 200);
    }
  };

  rooms.cellar = {
    bg(c, s, t) {
      stoneWall(c, 0, 0, 320, 154, '#6a6258', '#4e4840', 91);
      // arches
      [[60, 30], [200, 30]].forEach(([x, y]) => { c.strokeStyle = '#4e4840'; c.lineWidth = 6; c.beginPath(); c.arc(x + 40, y + 40, 40, Math.PI, 0); c.stroke(); });
      castleFloor(c);
      // barrels
      [[26, 114], [54, 114], [40, 92]].forEach(([x, y]) => { c.fillStyle = tex(c, '#7a5030', '#4a2c18', 'wood'); c.beginPath(); c.ellipse(x + 12, y + 18, 13, 18, 0, 0, 7); c.fill(); const bg = c.createLinearGradient(x, 0, x + 25, 0); bg.addColorStop(0, 'rgba(255,220,180,.25)'); bg.addColorStop(0.5, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = bg; c.beginPath(); c.ellipse(x + 12, y + 18, 13, 18, 0, 0, 7); c.fill(); R(c, '#2e2a26', x, y + 8, 25, 2); R(c, '#2e2a26', x, y + 26, 25, 2); R(c, '#6a6460', x + 2, y + 8, 6, 1); ell(c, '#8a5e38', x + 12, y + 18, 5, 8); circ(c, '#3a2414', x + 12, y + 18, 1.5); });
      // loose stone
      R(c, s.flags.coin_found ? '#1a1612' : '#7a7266', 138, 90, 18, 12);
      if (!s.flags.coin_found) { R(c, '#a09888', 138, 90, 18, 1); R(c, '#3a342c', 155, 90, 1, 12); }
      // stairs up
      for (let i = 0; i < 9; i++) R(c, i % 2 ? '#7a7266' : '#857c70', 280 + i * 3, 150 - i * 13, 40, 13);
      torch(c, 120, 60, t); torch(c, 250, 60, t);
      // stool + mug
      R(c, '#5a3a22', 226, 146, 22, 4); R(c, '#4a2c18', 228, 150, 3, 12); R(c, '#4a2c18', 244, 150, 3, 12); R(c, '#8a8a8a', 254, 156, 5, 6);
    },
    actors: (s, t) => [{ y: 160, d: c => {
      figure(c, 281, 160, { sprite: 'guard', skin: '#dba882', hair: '#4a2c18', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', h: 30 }, 0, -1);
      if (!s.flags.got_keys) { c.strokeStyle = '#a8a8a8'; c.lineWidth = 1.5; c.beginPath(); c.arc(284, 145, 3.5, 0, 7); c.stroke(); R(c, '#c99a22', 283, 147, 1.5, 5); R(c, '#1a1a22', 286, 147, 1.5, 5); }
      c.fillStyle = '#e8e8f0'; c.font = '8px monospace'; const z = (t * 0.8) % 1; c.globalAlpha = 1 - z; c.fillText('z', 246 + z * 6, 124 - z * 14); c.fillText('Z', 252 + z * 8, 116 - z * 14); c.globalAlpha = 1;
    } }]
  };

  rooms.hall = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 160, ['#3a3050', '#463a5c', '#524468', '#5c4e72']);
      c.save(); c.globalAlpha = 0.35; c.fillStyle = tex(c, '#5c4e72', '#2e2440', 'stone'); c.fillRect(0, 0, 320, 160); c.restore();
      // stained glass with sunset light
      poly(c, '#2a2238', [130, 10, 160, 0, 190, 10, 190, 60, 130, 60]);
      const cols = ['#e2b23a', '#c8402e', '#3fae8f', '#7a9ac8'];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) R(c, cols[(i + j) % 4], 134 + i * 14, 12 + j * 12, 12, 10);
      poly(c, 'rgba(255,200,120,.10)', [130, 60, 190, 60, 250, 160, 70, 160]);
      // columns
      [20, 70, 250, 300].forEach(x => { const cg = c.createLinearGradient(x - 7, 0, x + 7, 0); cg.addColorStop(0, '#b8b0a0'); cg.addColorStop(0.3, '#f6f0e4'); cg.addColorStop(1, '#8a8274'); c.fillStyle = cg; c.fillRect(x - 7, 20, 14, 140); for (let k = -5; k <= 5; k += 3) R(c, 'rgba(0,0,0,.1)', x + k, 22, 1, 136); litPoly(c, [x - 10, 22, x - 10, 16, x + 10, 16, x + 10, 22], '#f0e8d8', '#a8a090', 'stone'); litPoly(c, [x - 10, 160, x - 10, 154, x + 10, 154, x + 10, 160], '#f0e8d8', '#a8a090', 'stone'); });
      // banners
      [44, 276].forEach(x => { const w = Math.sin(t * 1.5 + x) * 1; poly(c, '#2f8a7a', [x - 9, 20, x + 9, 20, x + 9 + w, 80, x + w, 72, x - 9 + w, 80]); circ(c, '#e2b23a', x + w * 0.5, 44, 4); });
      // altar, lilies, cake
      R(c, '#e8e0d0', 112, 74, 96, 16); R(c, '#c8c0b0', 112, 86, 96, 4);
      for (let i = 0; i < 8; i++) { R(c, '#3a7a3a', 114 + i * 12, 66, 1, 8); ell(c, '#fafaf0', 114 + i * 12, 65, 3, 2); }
      R(c, '#f6eee0', 196, 54, 14, 20); R(c, '#f6eee0', 199, 46, 8, 8); R(c, '#e79aa0', 196, 62, 14, 1); poly(c, '#3fae8f', [199, 46, 203, 40, 207, 46]);
      // floor
      for (let y = 160, row = 0; y < 200; y += 6 + row, row++) for (let x = -16; x < 336; x += 16 + row * 2) { const lightT = ((x / 16 | 0) + row) % 2; R(c, lightT ? '#e2dacb' : '#3a3050', x - row * 3, y, 16 + row * 2, 6 + row); R(c, lightT ? 'rgba(255,255,255,.25)' : 'rgba(120,110,160,.25)', x - row * 3, y, 16 + row * 2, 1); }
      { const fg = c.createLinearGradient(0, 160, 0, 200); fg.addColorStop(0, 'rgba(20,10,30,.35)'); fg.addColorStop(1, 'rgba(20,10,30,0)'); c.fillStyle = fg; c.fillRect(0, 160, 320, 40); }
      R(c, '#8c1d26', 120, 152, 80, 48); R(c, '#e2b23a', 120, 152, 2, 48); R(c, '#e2b23a', 198, 152, 2, 48);
      // pews with guests
      [[16, 0], [276, 1]].forEach(([x]) => { R(c, '#5a3a22', x, 134, 30, 14); for (let i = 0; i < 3; i++) { circ(c, ['#e3b08c', '#b9845e', '#dba882'][i], x + 6 + i * 9, 128, 3); R(c, ['#7a9ac8', '#c86a3a', '#e8e0cc'][i], x + 3 + i * 9, 131, 6, 4); } });
      torch(c, 100, 50, t); torch(c, 220, 50, t);
    },
    actors: s => [
      { y: 152, d: c => { figure(c, 139, 152, VARRICK, 0, 1); circ(c, '#120818', 139, 126, 1.8); circ(c, 'rgba(120,60,160,.5)', 139, 126, 3); } },
      { y: 152, d: c => figure(c, 179, 152, { sprite: s.flags.trust ? 'elowen' : 'elowen_veil', skin: '#f0c8a8', hair: '#c8862e', longHair: true, top: '#3fae8f', dress: '#3fae8f', trim: '#e2b23a', legs: '#3fae8f', veil: !s.flags.trust, hat: r => { r('#e2b23a', -2.5, 28.5, 5, 1.2); } }, 0, -1) },
      { y: 162, d: c => figure(c, 240, 162, { sprite: 'orla', skin: '#d8a888', hair: '#9a9a9a', top: '#2f6b5a', armor: '#b8c4c6', legs: '#4a4a52', cape: '#2f8a7a' }, 0, -1) }
    ]
  };



  // Floor of boards in perspective, each board its own tint, seams staggered.
  function planks(c, x, y, w, h, a, b) {
    c.fillStyle = tex(c, a, b, 'wood'); c.fillRect(x, y, w, h);
    const g = rnd((y * 13 + w) | 0);
    for (let yy = y, k = 0; yy < y + h; k++) {
      const bh = 3 + (yy - y) / h * 6;
      R(c, `rgba(${g() > 0.5 ? '255,230,190' : '20,10,0'},${g() * 0.12})`, x, yy, w, bh);
      R(c, 'rgba(20,10,4,.45)', x, yy + bh - 1, w, 1); R(c, 'rgba(255,230,190,.12)', x, yy, w, 1);
      for (let sx = x + g() * 60; sx < x + w; sx += 50 + g() * 40) R(c, 'rgba(20,10,4,.4)', sx, yy, 1, bh);
      yy += bh;
    }
  }
  // Wall of vertical boards.
  function boards(c, x, y, w, h, a, b) {
    c.save(); c.translate(x, y); c.rotate(Math.PI / 2); c.fillStyle = tex(c, a, b, 'wood'); c.fillRect(0, -w, h, w); c.restore();
    const g = rnd((x + h) | 0);
    for (let xx = x; xx < x + w; xx += 12) { R(c, `rgba(${g() > 0.5 ? '255,230,190' : '20,10,0'},${g() * 0.1})`, xx, y, 12, h); R(c, 'rgba(20,10,4,.5)', xx + 11, y, 1, h); R(c, 'rgba(255,230,190,.1)', xx, y, 1, h); }
  }
  // Indoor light: warm pool of light, dark corners.
  function vignette(c, cx = 160, cy = 110, warm = '255,200,140') {
    const g = c.createRadialGradient(cx, cy, 30, cx, cy, 240); g.addColorStop(0, `rgba(${warm},.08)`); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = g; c.fillRect(0, 0, 320, 200);
  }


  // Living fire: many flickering tongues, hot core, glow and embers.
  function flame(c, x, y, w, h, t, seed = 1) {
    const g = c.createRadialGradient(x, y - h * 0.3, 2, x, y - h * 0.3, w * 1.6); g.addColorStop(0, 'rgba(255,190,90,.45)'); g.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = g; c.fillRect(x - w * 1.6, y - h * 1.9, w * 3.2, h * 2.4);
    const n = Math.max(4, Math.round(w / 3));
    [['#c8300a', 1], ['#ff7a1a', 0.8], ['#ffc040', 0.55], ['#fff2c0', 0.3]].forEach(([col, k]) => {
      c.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n - 0.5, bx = x + u * w * k, fl = Math.sin(t * (7 + i % 3) + i * 2.1 + seed) * 0.25 + 0.75, th = h * k * fl * (1 - Math.abs(u) * 1.2);
        c.beginPath(); c.moveTo(bx - w * k / n * 0.9, y); c.quadraticCurveTo(bx + Math.sin(t * 5 + i) * 2, y - th * 0.6, bx + Math.sin(t * 9 + i * 3) * 1.5, y - th); c.quadraticCurveTo(bx + w * k / n * 0.4, y - th * 0.5, bx + w * k / n * 0.9, y); c.fill();
      }
    });
    for (let i = 0; i < 4; i++) { const p = (t * 0.8 + i / 4) % 1; R(c, `rgba(255,${200 - p * 100},80,${1 - p})`, x + Math.sin(i * 7 + t) * w * 0.4, y - h * 0.4 - p * h * 1.4, 1, 1); }
    for (let i = 0; i < 5; i++) { R(c, '#3a1a0a', x - w * 0.45 + i * w * 0.22, y - 2, w * 0.2, 3); R(c, '#ff6a1a', x - w * 0.42 + i * w * 0.22, y - 2, w * 0.08, 1); }
  }

  // ---------- painting toolkit ----------
  const clipPoly = (c, pts, fn) => { c.save(); c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.clip(); fn(); c.restore(); };
  const texPoly = (c, pts, a, b, kind) => clipPoly(c, pts, () => { c.fillStyle = tex(c, a, b, kind); c.fillRect(0, 0, 320, 200); });
  // Lit shape: textured fill, light from upper left, shadow lower right.
  function litPoly(c, pts, a, b, kind, light = 0.35, dark = 0.45) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
    clipPoly(c, pts, () => {
      c.fillStyle = tex(c, a, b, kind); c.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(255,240,210,${light})`); g.addColorStop(0.45, 'rgba(255,240,210,0)'); g.addColorStop(0.6, 'rgba(10,6,20,0)'); g.addColorStop(1, `rgba(10,6,20,${dark})`);
      c.fillStyle = g; c.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    });
  }
  // Painted cumulus: shadowed base, lit puffs on top.
  function cloud(c, x, y, w, seed, lit = '#fbf6ee', mid = '#dfe2ec', dark = '#a9b2c8') {
    const g = rnd(seed), puffs = [];
    for (let i = 0; i < 9; i++) { const px = x + (g() - 0.5) * w, py = y - g() * w * 0.22, r = w * (0.12 + g() * 0.14); puffs.push([px, py, r]); }
    puffs.forEach(([px, py, r]) => ell(c, dark, px + r * 0.15, py + r * 0.25, r * 1.05, r * 0.7));
    puffs.forEach(([px, py, r]) => ell(c, mid, px, py, r, r * 0.78));
    puffs.forEach(([px, py, r]) => ell(c, lit, px - r * 0.22, py - r * 0.25, r * 0.7, r * 0.5));
    R(c, 'rgba(0,0,0,0)', 0, 0, 0, 0);
  }
  function grassClump(c, x, y, n, h, cols, seed, sway = 0) {
    const g = rnd(seed); c.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const bx = x + (g() - 0.5) * n * 1.6, bh = h * (0.5 + g() * 0.6), lean = (g() - 0.5) * 6 + sway;
      c.strokeStyle = cols[(g() * cols.length) | 0]; c.beginPath(); c.moveTo(bx, y); c.quadraticCurveTo(bx + lean * 0.3, y - bh * 0.6, bx + lean, y - bh); c.stroke();
    }
  }
  // Detailed palm: ringed, tapering, curving trunk and layered fronds made of leaflets.
  function palm2(c, x, y, h, t, lean = 1, seed = 3) {
    const segs = Math.floor(h / 4), pts = [];
    for (let i = 0; i <= segs; i++) { const k = i / segs; pts.push([x + Math.sin(k * 1.4) * h * 0.18 * lean, y - k * h]); }
    for (let i = 0; i < segs; i++) {
      const [ax, ay] = pts[i], w = 5.5 - i / segs * 2.5;
      R(c, i % 2 ? '#7a5634' : '#5e4026', ax - w / 2, ay - 4, w, 4.5); R(c, '#9a7448', ax - w / 2, ay - 4, 1.2, 4.5); R(c, '#3e2a18', ax + w / 2 - 1, ay - 4, 1, 4.5);
    }
    const [tx, ty] = pts[segs], g = rnd(seed), sway = Math.sin(t * 1.1) * 1.5;
    const fronds = [[-26, 10], [-20, -4], [-8, -12], [8, -12], [20, -4], [27, 10], [14, 16], [-14, 16], [0, -15]];
    fronds.forEach(([dx, dy], fi) => {
      const ex = tx + dx * 1.15 + sway, ey = ty + dy + Math.abs(dx) * 0.25, mx = tx + dx * 0.5, my = ty + dy - 8;
      for (let k = 0; k <= 12; k++) {
        const u = k / 12, bx = (1 - u) * (1 - u) * tx + 2 * (1 - u) * u * mx + u * u * ex, by = (1 - u) * (1 - u) * ty + 2 * (1 - u) * u * my + u * u * ey;
        const len = 7 * (1 - Math.abs(u - 0.35)), col = fi % 2 ? '#2f7a30' : '#3a8c38';
        c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - 2, by + len); c.stroke();
        c.strokeStyle = '#1e5a22'; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + 2.5, by + len * 0.9); c.stroke();
      }
      c.strokeStyle = '#5a7a2a'; c.lineWidth = 1; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
    });
    circ(c, '#5a4020', tx - 2, ty + 2, 2.5); circ(c, '#6a4a24', tx + 2, ty + 3, 2.5);
  }
  function rock(c, pts, base = '#7a7468') { litPoly(c, pts, shade(base, 18), shade(base, -50), 'rock', 0.45, 0.6); }

  // ---------- people used in several places ----------
  const VARRICK = { sprite: 'varrick', skin: '#d8c0a8', hair: '#111', top: '#1a1a22', legs: '#111', cape: '#3a1020', h: 38, beard: '#111' };
  const ELOWEN = { sprite: 'elowen', skin: '#f0c8a8', hair: '#c8862e', longHair: true, top: '#3fae8f', dress: '#3fae8f', trim: '#e2b23a', legs: '#3fae8f', hat: r => { r('#e2b23a', -2.5, 28.5, 5, 1.2); } };
  const gear = (c, x, y, r, teeth, ang, col, hub) => {
    c.save(); c.translate(x, y);
    ell(c, 'rgba(0,0,0,.3)', 2, 3, r * 1.15, r * 1.15);
    c.rotate(ang);
    const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, shade(col, 45)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -45));
    c.fillStyle = g;
    for (let i = 0; i < teeth; i++) { c.save(); c.rotate(i * Math.PI * 2 / teeth); c.fillRect(-r * 0.12, -r - r * 0.18, r * 0.24, r * 0.3); c.restore(); }
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.strokeStyle = shade(col, 55); c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r - 1, Math.PI * 1.0, Math.PI * 1.6); c.stroke();
    c.fillStyle = hub || 'rgba(20,10,0,.45)'; c.beginPath(); c.arc(0, 0, r * 0.55, 0, 7); c.fill();
    c.fillStyle = g; for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); c.fillRect(-r * 0.08, -r * 0.6, r * 0.16, r * 0.6); c.restore(); }
    circ(c, '#2a1d12', 0, 0, r * 0.16); circ(c, shade(col, 40), -r * 0.04, -r * 0.04, r * 0.06); c.restore();
  };

  rooms.lighthouse = {
    bg(c, s, t) {
      const lit = s.flags.lit;
      stoneWall(c, 0, 0, 320, 150, '#8a8478', '#6e685d', 13);
      // windows to the sea
      [[18, 30], [240, 30]].forEach(([x, y]) => { R(c, '#3a3530', x - 3, y - 3, 76, 56); bands(c, x, y, 70, 50, lit ? ['#2a3a6a', '#3a4a7a', '#5a5a8a', '#8a6a8a'] : ['#4a6aa8', '#6a8ac0', '#9ab0d0', '#d8c8b0']); R(c, '#3a3530', x + 34, y, 2, 50); R(c, '#3a3530', x, y + 24, 70, 2); });
      island(c, 30, 66, 30, '#6a5a8a'); island(c, 262, 66, 26, '#7a6aa0');
      // telescope
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(270, 150); c.lineTo(280, 110); c.lineTo(290, 150); c.stroke(); R(c, '#c99a22', 266, 100, 34, 6); R(c, '#e2b23a', 266, 100, 6, 6);
      // great lamp
      if (lit) { circ(c, 'rgba(255,230,140,.18)', 160, 80, 90); circ(c, 'rgba(255,240,170,.3)', 160, 80, 50); }
      R(c, '#5a4a2a', 124, 120, 72, 30); R(c, '#c99a22', 120, 118, 80, 5);
      poly(c, '#c99a22', [130, 40, 190, 40, 196, 118, 124, 118]);
      { const lg = c.createLinearGradient(132, 0, 188, 0); lg.addColorStop(0, lit ? '#fff8d0' : '#cfe4ec'); lg.addColorStop(0.5, lit ? '#ffe680' : '#8ab0c0'); lg.addColorStop(1, lit ? '#f0b040' : '#5a7a8a'); c.fillStyle = lg; c.fillRect(132, 44, 56, 72); }
      for (let i = 0; i < 7; i++) { R(c, lit ? 'rgba(255,255,230,.7)' : 'rgba(255,255,255,.45)', 132, 46 + i * 10, 56, 1.5); R(c, lit ? 'rgba(180,100,0,.35)' : 'rgba(20,40,60,.35)', 132, 52 + i * 10, 56, 1); }
      R(c, '#c99a22', 159, 44, 2, 72); R(c, 'rgba(255,255,255,.3)', 136, 44, 3, 72);
      R(c, '#c99a22', 128, 36, 64, 6); poly(c, '#8a6a2a', [134, 36, 160, 20, 186, 36]);
      if (lit) { c.fillStyle = 'rgba(255,250,210,.9)'; c.beginPath(); c.ellipse(160, 80, 10 + Math.sin(t * 6), 18, 0, 0, 7); c.fill(); }
      else { R(c, '#3a3530', 158, 74, 4, 14); }
      // floor grating and stairwell
      c.fillStyle = tex(c, '#4f4943', '#2e2a26', 'stone'); c.fillRect(0, 150, 320, 50);
      c.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 0; x < 320; x += 8) c.fillRect(x, 150, 1, 50); for (let y = 154; y < 200; y += 6) c.fillRect(0, y, 320, 1);
      c.fillStyle = 'rgba(255,240,220,.08)'; for (let x = 1; x < 320; x += 8) c.fillRect(x, 150, 1, 50);
      R(c, '#110f0d', 0, 130, 18, 70);
    },
    actors: () => [{ y: 170, d: c => figure(c, 215, 170, { sprite: 'hester', skin: '#d8a080', hair: '#b8b8b8', longHair: true, top: '#2a3a6a', dress: '#2a3a6a', trim: '#c99a22', legs: '#2a3a6a', hat: r => { r('#1a2440', -3.5, 28, 7, 2); r('#1a2440', -2.5, 29.5, 5, 2); } }, 0, -1) }]
  };

  rooms.clockharbor = {
    bg(c, s, t) {
      const run = s.flags.clock, a = run ? t : 0;
      sky(c, ['#5a6aa8', '#7a7ab0', '#a08aa8', '#d0a090', '#e8c098'], 140);
      clouds(c, run ? t : 0, 20, 'rgba(255,230,210,.6)', 61);
      // buildings
      const bld = (x, w, h, col, rf) => { litPoly(c, [x, 140, x, 140 - h, x + w, 140 - h, x + w, 140], col, shade(col, -35), 'stone', 0.3, 0.45); c.fillStyle = 'rgba(40,20,10,.18)'; for (let yy = 140 - h + 4; yy < 140; yy += 5) c.fillRect(x, yy, w, 1); litPoly(c, [x - 3, 140 - h, x - 3, 140 - h - 6, x + w + 3, 140 - h - 6, x + w + 3, 140 - h], rf, shade(rf, -30), 'wood'); for (let k = 0; k < Math.floor(w / 16); k++) { R(c, '#3a2a1a', x + 6 + k * 16, 140 - h + 10, 8, 10); R(c, '#e8b860', x + 7 + k * 16, 140 - h + 11, 6, 8); R(c, '#3a2a1a', x + 10 + k * 16, 140 - h + 10, 1, 10); } };
      bld(8, 80, 50, '#b0784a', '#6a3a22'); bld(170, 70, 70, '#a8885a', '#5a4a3a'); bld(240, 80, 56, '#9a6a4a', '#5a3a2a');
      [[190, 70], [262, 84], [30, 90]].forEach(([x, y], i) => { R(c, '#5a4a3a', x, y - 20, 8, 20); for (let k = 0; k < 3; k++) circ(c, 'rgba(200,200,200,.35)', x + 4 + (run ? Math.sin(t + k) * 3 : 0), y - 26 - k * 7 - (run ? (t * 6 % 7) : 0), 3 + k); });
      gear(c, 214, 96, 14, 10, a * 0.8, '#c99a22'); gear(c, 236, 112, 9, 8, -a * 1.2, '#b88a2a'); gear(c, 290, 110, 12, 9, a, '#c99a22');
      // workshop door (round)
      circ(c, '#4a2c18', 47, 120, 18); R(c, '#4a2c18', 29, 120, 36, 22); circ(c, '#6b4428', 47, 120, 15); R(c, '#6b4428', 32, 120, 30, 22); circ(c, '#e2b23a', 58, 128, 1.5);
      // clock tower
      litPoly(c, [118, 142, 118, 4, 162, 4, 162, 142], '#d0b892', '#9a825e', 'stone', 0.35, 0.5); litPoly(c, [114, 4, 140, -14, 166, 4], '#5a8a9a', '#3a5a6a', 'wood'); R(c, '#a8906a', 116, 60, 48, 3); R(c, '#a8906a', 116, 90, 48, 3);
      circ(c, '#e8e0cc', 140, 36, 19); circ(c, '#c99a22', 140, 36, 19); circ(c, '#f6eedc', 140, 36, 16);
      for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; R(c, '#3a2a1a', 140 + Math.cos(an) * 13 - 0.5, 36 + Math.sin(an) * 13 - 0.5, 1.5, 1.5); }
      const mn = run ? t * 0.3 : -0.1, hr = run ? t * 0.025 : -0.02;
      c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(140, 36); c.lineTo(140 + Math.sin(mn) * 13, 36 - Math.cos(mn) * 13); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.moveTo(140, 36); c.lineTo(140 + Math.sin(hr) * 8, 36 - Math.cos(hr) * 8); c.stroke();
      R(c, '#3a2a1a', 126, 96, 28, 46); R(c, '#5a3a22', 128, 98, 24, 44); R(c, run ? '#2a1a10' : '#1a120a', 140, 98, 12, 44);
      // ground and harbour
      c.fillStyle = tex(c, '#a8987c', '#7a6a52', 'stone'); c.fillRect(0, 140, 320, 60);
      { const g = rnd(81); for (let y = 142, row = 0; y < 200; y += 6 + row * 0.3, row++) for (let x = -(row % 2) * 6; x < 240; x += 12 + row * 0.4) { const v = (g() - 0.5) * 26; ell(c, `rgb(${156 + v | 0},${140 + v | 0},${112 + v | 0})`, x + 6, y + 2.5, 5, 2.4); R(c, 'rgba(255,245,220,.2)', x + 2, y, 8, 1); } }
      c.save(); c.beginPath(); c.rect(242, 140, 78, 60); c.clip(); sea(c, run ? t : 0, 140, 60, ['#3a6a9a', '#4276a4', '#4a82ae']); c.restore();
      R(c, '#5a4a3a', 238, 150, 6, 50);
      const bob = run ? Math.sin(t * 1.6) * 1.5 : 0;
      poly(c, '#6a3a22', [250, 170 + bob, 316, 170 + bob, 308, 188 + bob, 256, 188 + bob]); R(c, '#e8e0cc', 252, 170 + bob, 62, 2); R(c, '#5a3a22', 282, 110 + bob, 3, 60); poly(c, '#efe4c8', [285, 114 + bob, 310, 160 + bob, 285, 160 + bob]);
      // fish stall
      litPoly(c, [178, 148, 178, 132, 232, 132, 232, 148], '#8a6a46', '#5a3a22', 'wood'); R(c, '#5a3a22', 180, 114, 2, 20); R(c, '#5a3a22', 228, 114, 2, 20); poly(c, '#3fae8f', [176, 104, 234, 104, 238, 114, 172, 114]); poly(c, 'rgba(0,0,0,.2)', [205, 104, 234, 104, 238, 114, 205, 114]); for (let i = 0; i < 6; i++) { R(c, i % 2 ? '#f0ece0' : '#3fae8f', 172 + i * 11, 114, 11, 4); poly(c, i % 2 ? '#f0ece0' : '#3fae8f', [172 + i * 11, 118, 183 + i * 11, 118, 177.5 + i * 11, 121]); }
      for (let i = 0; i < 5; i++) ell(c, '#b8c8d0', 186 + i * 9, 130, 4, 1.6);
      // frozen flour / falling flour
      for (let i = 0; i < 14; i++) { const fy = run ? (110 + ((t * 20 + i * 7) % 40)) : 112 + (i * 5 % 22); R(c, '#f6f0e0', 84 + (i * 7 % 22), fy, 1, 1); }
    },
    actors: s => [
      { y: 156, d: c => figure(c, 92, 156, { sprite: 'baker', skin: '#e8b48a', hair: '#5a3a22', top: '#e8e0cc', dress: '#c86a3a', legs: '#c86a3a', hat: r => { r('#f6f0e0', -3, 28, 6, 3); } }, s.flags.clock ? Math.floor(Date.now() / 300) % 2 : 0, 1) },
      { y: 152, d: c => figure(c, 200, 152, { sprite: 'fishmonger', skin: '#d8a080', hair: '#2a1d12', top: '#4a6a8a', legs: '#3a3a44', beard: '#2a1d12' }, 0, -1) }
    ]
  };

  rooms.workshop = {
    bg(c, s, t) {
      boards(c, 0, 0, 320, 160, '#5c402a', '#3a2818');
      // wall of clocks, all ticking (Pim keeps his own)
      const g = rnd(31);
      for (let i = 0; i < 11; i++) {
        const x = 70 + g() * 230, y = 18 + g() * 60, r = 6 + g() * 8;
        circ(c, '#c99a22', x, y, r + 1.5); circ(c, '#f6eedc', x, y, r);
        const an = t * (0.5 + g()) + i;
        c.strokeStyle = '#1a1a1a'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(an) * r * 0.8, y - Math.cos(an) * r * 0.8); c.stroke();
      }
      gear(c, 290, 120, 16, 10, t, '#8a6a2a'); gear(c, 268, 140, 10, 8, -t * 1.6, '#a8822a');
      // bench
      R(c, '#6b4428', 56, 120, 108, 8); R(c, '#4a2c18', 60, 128, 6, 32); R(c, '#4a2c18', 152, 128, 6, 32);
      R(c, '#c99a22', 66, 108, 16, 12); circ(c, '#3fae8f', 74, 106, 4); R(c, '#e8e0cc', 92, 104, 20, 16); R(c, '#8c1d26', 120, 112, 24, 8);
      poly(c, '#7a9ac8', [96, 104, 100, 96, 104, 104]);
      if (!s.flags.got_rattler) { R(c, '#8c1d26', 120, 108, 22, 12); R(c, '#c99a22', 130, 100, 2, 8); circ(c, '#e2b23a', 125, 106, 3); circ(c, '#e2b23a', 137, 106, 3); R(c, '#f4ead2', 118, 122, 26, 6); c.fillStyle = '#8c1d26'; c.font = '5px monospace'; c.fillText('DO NOT WIND', 118, 127); }
      // forge glow
      R(c, '#3a2a1a', 230, 96, 40, 56); R(c, '#1a120a', 236, 110, 28, 26);
      flame(c, 250, 136, 22, 22, t, 3);
      // doors
      R(c, '#2e1c10', 8, 80, 40, 84); R(c, '#e8c898', 12, 84, 32, 80);
      R(c, '#2e1c10', 304, 100, 16, 64); R(c, 'rgba(255,150,60,.5)', 308, 104, 12, 60);
      planks(c, 0, 160, 320, 40, '#6a4a30', '#45301e');
    },
    actors: () => [{ y: 168, d: c => figure(c, 200, 168, { sprite: 'pim', h: 22, skin: '#e8b48a', hair: '#e8e8e8', beard: '#f0f0f0', top: '#8c1d26', legs: '#3a3a6a', hat: r => { r('#3a3a3a', -3, 25.5, 6, 1.6); r('#9fe0ff', -2.5, 25.6, 2, 1.4); r('#9fe0ff', 0.5, 25.6, 2, 1.4); } }, 0, -1) }]
  };

  rooms.clocktower = {
    bg(c, s, t) {
      const run = s.flags.clock, a = run ? t * 0.4 : 0;
      stoneWall(c, 0, 0, 320, 160, '#4a3e2c', '#2a2216', 131);
      [60, 260].forEach(x => litPoly(c, [x, 160, x, 0, x + 8, 0, x + 8, 160], '#5a4028', '#2e1e10', 'wood')); litPoly(c, [0, 26, 0, 20, 320, 20, 320, 26], '#5a4028', '#2e1e10', 'wood');
      // light from the clock face above
      poly(c, 'rgba(255,220,150,.07)', [130, 0, 190, 0, 230, 160, 90, 160]);
      gear(c, 160, 90, 48, 22, a, run ? '#c99a22' : '#9a7a3a');
      if (!run) for (let i = 0; i < 30; i++) R(c, '#c8b080', 120 + (i * 13 % 80), 60 + (i * 7 % 60), 2, 1);
      gear(c, 252, 48, 22, 12, -a * 2.2, '#b88a2a'); gear(c, 286, 80, 14, 9, a * 3.4, '#c99a22'); gear(c, 240, 86, 10, 8, a * 4, '#a8822a');
      // pendulum
      const sw = run ? Math.sin(t * 2.4) * 0.25 : 0;
      c.save(); c.translate(50, 30); c.rotate(sw); R(c, '#8a6a2a', -1, 0, 3, 100); circ(c, '#c99a22', 0, 106, 10); circ(c, '#e2b23a', -3, 103, 3); c.restore();
      planks(c, 0, 160, 320, 40, '#4a3a26', '#2a2016');
    }
  };

  rooms.sentbase = {
    bg(c, s, t) {
      sky(c, ['#3a5aa0', '#4a6aac', '#6a86bc', '#94a8cc', '#c4c8d4'], 120);
      clouds(c, t, 14, 'rgba(255,255,255,.7)', 71);
      sea(c, t, 100, 60, ['#2a5f9a', '#2f6aa6', '#3576b0', '#3c83ba']);
      // the spire
      litPoly(c, [80, 160, 110, 40, 140, 6, 160, 0, 182, 8, 212, 44, 240, 160], '#857e6c', '#4e4a40', 'rock', 0.4, 0.55);
      c.strokeStyle = 'rgba(30,26,20,.35)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(96 + i * 6, 150 - i * 16); c.lineTo(226 - i * 6, 150 - i * 16); c.stroke(); }
      c.fillStyle = '#4e4a40'; [[130, 30, 1, 40], [190, 50, 1, 60], [150, 90, 1, 30]].forEach(a => c.fillRect(...a));
      // stairs
      const stair = (x0, dir) => { for (let i = 0; i < 9; i++) { const y = 150 - i * 12, x = x0 + (i % 2 ? 10 : 0) * dir; R(c, '#9a9282', x, y, 22, 4); R(c, '#4e4a40', x, y + 4, 22, 2); } };
      stair(108, 1); stair(188, -1);
      // ground
      c.fillStyle = tex(c, '#8a8472', '#5e5a4e', 'rock'); c.fillRect(0, 152, 320, 48);
      for (let i = 0; i < 8; i++) rock(c, [i * 44, 200, i * 44 + 10, 186, i * 44 + 22, 200], '#6e6a5e');
      c.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 20; i++) c.fillRect((i * 17 + Math.sin(t + i) * 3) % 320, 152 + Math.sin(t * 2 + i) * 1.5, 4, 1);
      // sentinels
      const statue = (x, col, hi, sly) => {
        litPoly(c, [x - 4, 156, x - 4, 140, x + 54, 140, x + 54, 156], '#6e6a5e', '#3e3a32', 'stone'); R(c, hi, x - 4, 140, 58, 2);
        litPoly(c, [x + 10, 140, x + 10, 84, x + 40, 84, x + 40, 140], col, shade(col, -45), 'rock', 0.4, 0.55); litPoly(c, [x + 14, 86, x + 14, 66, x + 36, 66, x + 36, 86], col, shade(col, -45), 'rock', 0.45, 0.5); R(c, hi, x + 14, 66, 22, 2);
        c.strokeStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.moveTo(x + 25, 90); c.lineTo(x + 25, 138); c.moveTo(x + 12, 110); c.lineTo(x + 38, 110); c.stroke();
        R(c, '#111', x + 18, 74, 4, 2); R(c, '#111', x + 28, 74, 4, 2);
        if (sly) { R(c, '#111', x + 20, 80, 10, 1); R(c, '#111', x + 29, 79, 2, 1); } else R(c, '#111', x + 20, 80, 10, 1);
        R(c, col, x + 2, 90, 8, 40); R(c, col, x + 40, 90, 8, 40); R(c, hi, x + 22, 60, 6, 6);
        R(c, '#8a8478', x + 44, 60, 3, 80);
      };
      statue(40, '#9a968c', '#bab6ac', false); statue(230, '#3a3a40', '#5a5a64', true);
      R(c, '#c8b878', 146, 130, 28, 16); R(c, '#8a7a48', 148, 133, 24, 1); R(c, '#8a7a48', 148, 137, 20, 1); R(c, '#8a7a48', 148, 141, 22, 1);
      poly(c, '#6a3a22', [0, 182, 38, 182, 34, 196, 0, 196]); R(c, '#e8e0cc', 0, 182, 38, 2);
      poly(c, '#5e5a4e', [270, 190, 280, 172, 300, 170, 312, 190]);
      if (!s.flags.got_kelp) { c.strokeStyle = '#2f6a3a'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(280 + k * 6, 172); c.quadraticCurveTo(278 + k * 6 + Math.sin(t + k) * 2, 180, 282 + k * 6, 188); c.stroke(); } }
    }
  };

  rooms.aerie = {
    bg(c, s, t) {
      sky(c, ['#2a4a90', '#3a5aa0', '#5a7ab4', '#8aa4c8', '#bccce0'], 150);
      for (let i = 0; i < 5; i++) cloud(c, ((i * 100 + t * 4) % 440) - 60, 134 + (i % 2) * 6, 70, 500 + i);
      if (!s.flags.fed) { const rx = 160 + Math.cos(t * 0.5) * 110, ry = 34 + Math.sin(t) * 8, w = Math.sin(t * 3) * 6; poly(c, '#c8922a', [rx - 26, ry + w, rx, ry - 3, rx + 26, ry + w, rx, ry + 4]); R(c, '#a87420', rx - 2, ry - 3, 4, 9); }
      // summit
      litPoly(c, [0, 200, 0, 152, 40, 140, 120, 146, 200, 138, 280, 144, 320, 150, 320, 200], '#8a7e68', '#54483a', 'rock', 0.4, 0.45);
      for (let i = 0; i < 10; i++) grassClump(c, 20 + i * 30, 150 + (i % 3) * 8, 4, 5, ['#8a9a4a', '#6a7a3a'], 600 + i, Math.sin(t * 2 + i) * 2);
      R(c, '#110f0d', 0, 140, 18, 60);
      // nest
      ell(c, 'rgba(0,0,0,.3)', 217, 154, 68, 12); c.fillStyle = tex(c, '#7a5228', '#3e2410', 'wood'); c.beginPath(); c.ellipse(215, 148, 66, 16, 0, 0, 7); c.fill();
      for (let i = 0; i < 26; i++) { c.strokeStyle = i % 2 ? '#7a5228' : '#4a2e14'; c.lineWidth = 2; c.beginPath(); const y = 134 + (i % 6) * 4; c.moveTo(152 + (i * 13 % 40), y); c.lineTo(240 + (i * 17 % 40), y + (i % 3) - 1); c.stroke(); }
      if (!s.flags.feather_taken_never) { [[256, 136], [266, 132], [272, 138]].forEach(([x, y], i) => { if (i === 0 && s.inv.includes('feather')) return; c.save(); c.translate(x, y); c.rotate(-0.4 + i * 0.3); ell(c, '#ffd84a', 0, 0, 7, 2); R(c, '#fff6c0', -7, 0, 14, 0.6); c.restore(); }); }
      circ(c, 'rgba(255,220,100,.12)', 266, 136, 14);
    },
    actors: s => [
      { y: 140, d: c => {
        const fed = s.flags.fed, bob = fed ? Math.sin(Date.now() / 900) : Math.sin(Date.now() / 120) * 2;
        if (creature(c, 'chick', 236, 100 + bob, 36)) return;
        c.save(); c.translate(13, -20); circ(c, '#e8d8b0', 213, 112 + bob, 15); circ(c, '#f6ecd0', 209, 108 + bob, 8);
        circ(c, '#111', 208, 106 + bob, 1.6); circ(c, '#111', 218, 106 + bob, 1.6);
        if (fed) { R(c, '#111', 206, 106 + bob, 4, 1); R(c, '#111', 216, 106 + bob, 4, 1); poly(c, '#e2a23a', [210, 112 + bob, 216, 112 + bob, 213, 115 + bob]); }
        else poly(c, '#e2a23a', [208, 111 + bob, 218, 111 + bob, 213, 120 + bob]); c.restore();
      } },
      { y: 120, d: c => {
        if (!s.flags.fed) return;
        const PT = window.Art && window.Art.hasPainting && window.Art.hasPainting('aerie');
        if (creature(c, 'roc', PT ? 78 : 92, PT ? 152 : 130, PT ? 96 : 84, true)) return;
        ell(c, '#c8922a', 90, 90, 46, 26); ell(c, '#e2b23a', 84, 84, 30, 14);
        poly(c, '#a87420', [50, 90, 20, 60, 70, 76]); poly(c, '#a87420', [130, 86, 150, 116, 110, 104]);
        circ(c, '#d8a23a', 134, 58, 14); poly(c, '#e8c060', [146, 56, 164, 62, 146, 66]); circ(c, '#111', 138, 54, 2); circ(c, '#fff', 138.6, 53.4, 0.6);
        R(c, '#8a6a20', 80, 114, 3, 14); R(c, '#8a6a20', 96, 114, 3, 14);
      } }
    ]
  };

  rooms.reef = {
    bg(c, s, t) {
      sky(c, ['#3a8ac8', '#4a9ad0', '#6ab0d8', '#98c8e0', '#d0e4e8'], 64);
      sun(c, 270, 26, 9, '#fff6c8'); clouds(c, t, 16, 'rgba(255,255,255,.8)', 81);
      sea(c, t, 64, 86, ['#1aa0b8', '#22acc0', '#2ab8c4', '#40c4c8', '#5cd0cc']);
      c.fillStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < 4; i++) ell(c, 'rgba(255,190,200,.25)', 60 + i * 60, 108 + (i % 2) * 10, 16, 4);
      // big rock
      rock(c, [146, 132, 156, 104, 180, 96, 200, 104, 208, 132], '#8a7a72'); c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 8; i++) c.fillRect(146 + i * 8 + Math.sin(t * 2 + i) * 2, 131 + Math.sin(t * 3 + i), 4, 1);
      // sand
      c.fillStyle = tex(c, '#f6d4c4', '#dca898', 'sand'); c.fillRect(0, 140, 320, 60);
      { const lg = c.createLinearGradient(0, 140, 0, 200); lg.addColorStop(0, 'rgba(160,110,100,.25)'); lg.addColorStop(0.2, 'rgba(255,240,230,.15)'); lg.addColorStop(1, 'rgba(120,70,60,.15)'); c.fillStyle = lg; c.fillRect(0, 140, 320, 60); }
      c.fillStyle = 'rgba(255,255,255,.85)'; for (let x = 0; x < 320; x += 3) c.fillRect(x, 139 + Math.sin(x / 8 + t * 1.5) * 1.5 + Math.sin(x / 21) * 1, 3, 2);
      ell(c, '#40a0b0', 70, 178, 30, 8); ell(c, '#60c0c8', 68, 177, 24, 5); circ(c, '#ff8a6a', 60, 178, 2); circ(c, '#ffd84a', 78, 176, 1.5);
      palm(c, 22, 168, 80, t);
      [[110, 186], [140, 176], [200, 190]].forEach(([x, y]) => { poly(c, '#ff9aa8', [x, y, x + 3, y - 6, x + 6, y]); });
      const bob = Math.sin(t * 1.6) * 1;
      poly(c, '#6a3a22', [256, 172 + bob, 320, 172 + bob, 320, 192 + bob, 264, 192 + bob]); R(c, '#e8e0cc', 258, 172 + bob, 62, 2); R(c, '#5a3a22', 290, 116 + bob, 3, 56); poly(c, '#efe4c8', [293, 120 + bob, 316, 164 + bob, 293, 164 + bob]);
    },
    actors: (s, t) => wardenActors(s, t).concat(s.flags.summoned ? [{ y: 130, d: c => {
      const sw = Math.sin(Date.now() / 600) * 2;
      const PT = window.Art && window.Art.hasPainting && window.Art.hasPainting('reef');
      if (creature(c, 'nerissa', 180, (PT ? 122 : 134) + sw * 0.3, 52, false)) return;
      c.save(); if (PT) c.translate(-3, -12);
      poly(c, '#7ad0c8', [176, 122, 186, 122, 196 + sw, 132, 204 + sw, 126, 200 + sw, 136, 180, 132]);
      R(c, '#7ad0c8', 172, 112, 14, 12);
      R(c, '#d8b8a0', 172, 100, 12, 12); R(c, '#e8c8b0', 174, 88, 9, 10);
      R(c, '#2a6a8a', 170, 86, 13, 4); R(c, '#2a6a8a', 168, 88, 4, 22); R(c, '#2a6a8a', 182, 88, 3, 16);
      poly(c, '#ff8a9a', [172, 86, 174, 80, 177, 85, 179, 79, 182, 86]);
      R(c, '#111', 179, 92, 1, 1); c.restore();
    } }] : [])
  };

  // Tide Wardens: knee-high mer-imps, each with one enormous feature.
  const WARDEN_ART = [
    ['goggle', 116, 180, '#5ab8a8'], ['lugs', 147, 174, '#4aa8b8'], ['snoot', 177, 180, '#5ac0a0'], ['lick', 207, 174, '#4ab0c0'], ['grabby', 236, 182, '#58b0b0']
  ];
  function wardenActors(s, t) {
    return WARDEN_ART.filter(([id]) => !s.flags['w_' + id]).map(([id, x, y, col], i) => ({ y, d: c => {
      const hop = Math.abs(Math.sin(t * 3 + i * 1.3)) * 2, Y = y - hop;
      if (creature(c, id, x, Y, id === 'lugs' || id === 'grabby' ? 26 : 24, false)) return;
      ell(c, 'rgba(0,0,0,.25)', x, y, 7, 2);
      R(c, col, x - 5, Y - 14, 10, 12); R(c, shade(col, -30), x - 5, Y - 3, 3, 3); R(c, shade(col, -30), x + 2, Y - 3, 3, 3);
      circ(c, col, x, Y - 19, 6);
      poly(c, shade(col, 20), [x - 6, Y - 20, x - 11, Y - 26, x - 5, Y - 23]); poly(c, shade(col, 20), [x + 6, Y - 20, x + 11, Y - 26, x + 5, Y - 23]);
      for (let k = 0; k < 4; k++) R(c, '#2f7a40', x - 5 + k * 3, Y - 26 - (k % 2) * 2, 2, 5);
      if (id === 'goggle') { circ(c, '#fff', x, Y - 19, 5); circ(c, '#2a6aaa', x + Math.sin(t * 2) * 1.5, Y - 19, 2.6); circ(c, '#111', x + Math.sin(t * 2) * 1.5, Y - 19, 1.2); }
      else { R(c, '#111', x - 3, Y - 21, 1.5, 1.5); R(c, '#111', x + 2, Y - 21, 1.5, 1.5); }
      if (id === 'lugs') { ell(c, shade(col, 15), x - 11, Y - 20, 6, 8); ell(c, shade(col, 15), x + 11, Y - 20, 6, 8); ell(c, '#e8a0a0', x - 11, Y - 20, 3, 5); ell(c, '#e8a0a0', x + 11, Y - 20, 3, 5); }
      if (id === 'snoot') { ell(c, '#e89a8a', x + 1, Y - 16, 4, 6); R(c, '#a85a5a', x - 1, Y - 12, 1, 1); R(c, '#a85a5a', x + 2, Y - 12, 1, 1); }
      if (id === 'lick') { const L = 6 + Math.sin(t * 5) * 4; R(c, '#e86a8a', x - 1, Y - 15, 3, L); circ(c, '#e86a8a', x + 0.5, Y - 15 + L, 2); }
      if (id === 'grabby') { const w = Math.sin(t * 6) * 2; ell(c, shade(col, 15), x - 11, Y - 10 + w, 5, 4); ell(c, shade(col, 15), x + 11, Y - 10 - w, 5, 4); for (let k = 0; k < 3; k++) { R(c, shade(col, 15), x - 15 + k * 2, Y - 16 + w, 1.5, 4); R(c, shade(col, 15), x + 10 + k * 2, Y - 16 - w, 1.5, 4); } }
      else R(c, '#8a3a3a', x - 2, Y - 15, 4, 1);
    } }));
  }

  rooms.tower = {
    bg(c, s, t) {
      const dawn = s.won === 'long', beaten = s.flags.beaten;
      stoneWall(c, 0, 0, 320, 160, '#4a4450', '#36323c', 101);
      [[90, 24], [190, 24]].forEach(([x, y]) => {
        R(c, '#26222c', x - 3, y - 3, 46, 66);
        if (dawn) { bands(c, x, y, 40, 60, ['#f0c070', '#f6d890', '#fff0c0']); }
        else { bands(c, x, y, 40, 60, ['#1a1a2a', '#22223a', '#2a2a40']); if (Math.sin(t * 1.7) > 0.96) R(c, '#e8e8ff', x, y, 40, 60); }
        R(c, '#26222c', x + 19, y, 2, 60);
      });
      if (dawn) poly(c, 'rgba(255,220,140,.18)', [90, 84, 230, 84, 300, 160, 40, 160]);
      castleFloor(c);
      R(c, '#110f14', 0, 130, 18, 70);
      // bier with the king
      R(c, '#6a6474', 40, 140, 90, 18); R(c, '#8a8494', 38, 136, 94, 6);
      R(c, '#e8e0cc', 52, 128, 70, 9); R(c, '#3a4a8a', 64, 126, 52, 10); circ(c, '#f0d0b8', 56, 129, 5); R(c, '#e8e8e8', 54, 132, 7, 5); poly(c, '#e2b23a', [51, 124, 61, 124, 60, 120, 58, 123, 56, 119, 54, 123, 52, 120]);
      if (!dawn) { c.strokeStyle = 'rgba(140,80,200,.6)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(50, 132); for (let x = 50; x < 124; x += 8) c.lineTo(x, 124 + Math.sin(x / 6 + t * 3 + i) * 5 + i * 2); c.stroke(); } }
      // lectern + spellbook
      R(c, '#4a2c18', 150, 128, 10, 32); poly(c, '#5a3a22', [138, 120, 172, 116, 172, 128, 138, 130]); R(c, '#e8e0cc', 141, 114, 14, 10); R(c, '#d8d0bc', 155, 113, 14, 10); R(c, '#8c1d26', 154, 113, 2, 11);
      torch(c, 30, 70, t); torch(c, 290, 70, t);
    },
    actors: (s, t) => {
      const list = [];
      if (!s.flags.beaten) list.push({ y: 160, d: c => {
        c.save(); c.translate(26, 2); figure(c, 212, 160, VARRICK, 0, -1);
        const p = 0.6 + Math.sin(t * 6) * 0.3; circ(c, `rgba(140,60,200,${0.35 * p})`, 212, 133, 9); circ(c, '#200a30', 212, 134, 2);
        c.strokeStyle = `rgba(190,120,255,${p})`; c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(206, 126); let x = 206, y = 126; for (let k = 0; k < 5; k++) { x += -4 + Math.sin(t * 20 + k + i) * 4; y -= 4; c.lineTo(x, y); } c.stroke(); } c.restore();
      } });
      else list.push({ y: 180, d: c => { if (creature(c, 'crab', 234 + Math.sin(Date.now() / 300) * 3, 184, 13)) return; c.save(); c.translate(26, 0); ell(c, '#c8402e', 208, 178, 6, 3.5); R(c, '#a83020', 201, 176, 2, 2); R(c, '#a83020', 213, 176, 2, 2); circ(c, '#c8402e', 200, 174, 2); circ(c, '#c8402e', 216, 174, 2); R(c, '#111', 206, 175, 1, 1); R(c, '#111', 210, 175, 1, 1); c.restore(); } });
      list.push({ y: 160, d: c => {
        c.save(); c.translate(23, 2); figure(c, 261, 160, ELOWEN, 0, -1);
        if (!s.flags.beaten) { c.strokeStyle = `rgba(120,60,180,${0.6 + Math.sin(t * 8) * 0.2})`; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(250 + i * 4, 160); c.lineTo(250 + i * 4 + Math.sin(t * 9 + i), 124); c.stroke(); } R(c, 'rgba(60,20,90,.25)', 248, 124, 26, 36); }
        c.restore();
      } });
      return list;
    }
  };

  // ---------- expansion scenes ----------
  rooms.inn = {
    bg(c, s, t) {
      boards(c, 0, 0, 320, 156, '#5e3e28', '#3a2416');
      for (let x = 0; x < 320; x += 40) { R(c, '#2a180c', x, 0, 6, 156); R(c, '#4a2e1a', x, 0, 2, 156); }
      R(c, '#2e1c10', 0, 26, 320, 6);
      // fireplace
      R(c, '#6a6258', 18, 68, 68, 80); R(c, '#4e4840', 18, 64, 68, 6); R(c, '#110c08', 30, 96, 44, 52);
      flame(c, 52, 148, 36, 34, t, 1);
      R(c, '#5a3a22', 26, 40, 52, 22); poly(c, '#7a9ac8', [32, 52, 60, 44, 72, 52, 60, 58]); circ(c, '#fff', 68, 50, 1.5);
      // bar
      R(c, '#3a2414', 170, 40, 140, 4); R(c, '#3a2414', 170, 70, 140, 4);
      const g = rnd(9); for (let i = 0; i < 14; i++) { const x = 176 + i * 9; R(c, ['#2e7a4a', '#8c1d26', '#c99a22', '#5a3a7a'][(g() * 4) | 0], x, 26 + (i % 2) * 4, 5, 14 - (i % 2) * 4); R(c, '#e8e0cc', x + 1, 56, 5, 14); }
      // patrons' table
      R(c, '#6b4428', 150, 128, 60, 6); R(c, '#4a2c18', 156, 134, 4, 20); R(c, '#4a2c18', 200, 134, 4, 20);
      R(c, '#c8c0b0', 158, 120, 6, 8); R(c, '#c8c0b0', 190, 121, 6, 7);
      circ(c, '#c9906a', 166, 116, 5); R(c, '#4a6a8a', 160, 120, 12, 8);
      circ(c, '#d8a080', 200, 112, 5); R(c, '#8a4a2a', 194, 116, 12, 12); for (let i = 0; i < 4; i++) R(c, '#e8c890', 176 + i * 3, 124 - i * 2, 2, 4);
      planks(c, 0, 156, 320, 44, '#6a4a30', '#45301e');
      R(c, '#e8c898', 0, 130, 14, 70);
    },
    actors: () => [
      { y: 120, d: c => { c.save(); c.beginPath(); c.rect(0, 0, 320, 120); c.clip(); figure(c, 252, 146, { sprite: 'marla', h: 40, skin: '#e3b08c', hair: '#8a3a1a', longHair: true, top: '#7a2a2a', sleeve: '#e8e0cc', legs: '#333' }, 0, -1); c.restore(); } },
      { y: 168, d: c => { if (sprReady('fennick')) { figure(c, 64, 168, { sprite: 'fennick', h: 34 }, 0, 1); return; } figure(c, 64, 168, { h: 32, skin: '#f0c8a8', hair: '#c8a040', top: '#3a6a3a', legs: '#5a3a22', hat: r => { r('#8c1d26', -3.5, 27, 7, 2.5); r('#e2b23a', 2, 29, 1, 5); } }, 0, 1); ell(c, '#b8742a', 72, 152, 6, 4.5); R(c, '#8a5a2a', 74, 140, 2, 12); R(c, '#2a1a10', 70, 151, 3, 2); } }
    ]
  };

  rooms.mistwood = {
    bg(c, s, t) {
      sky(c, ['#2a2244', '#342a52', '#3e3260', '#4a3e6c'], 150);
      haze(c, 160, 70, 200, 60, '150,130,200', 0.35);
      [['#2e2448', 0.6, 31], ['#221a38', 0.85, 37]].forEach(([col, k, seed]) => { const g = rnd(seed); for (let x = -20; x < 340; x += 30 + g() * 20) { const w = 8 * k + g() * 6; litPoly(c, [x, 150, x + 2, 20 * k, x + w, 20 * k, x + w + 2, 150], col, shade(col, -20), 'wood', 0.15, 0.4); for (let b = 0; b < 3; b++) { const by = 40 + b * 25 + g() * 10; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x + w / 2, by); c.quadraticCurveTo(x + w / 2 + (g() - 0.5) * 30, by - 10, x + w / 2 + (g() - 0.5) * 40, by - 20); c.stroke(); } c.lineWidth = 1; for (let m = 0; m < 4; m++) { c.strokeStyle = 'rgba(80,110,70,.5)'; c.beginPath(); const mx = x + g() * w; c.moveTo(mx, 40 + g() * 60); c.lineTo(mx + 1, 60 + g() * 50); c.stroke(); } } });
      // the two web trees, gnarled
      litPoly(c, [96, 150, 100, 10, 118, 10, 122, 150], '#241a30', '#0e0a16', 'wood', 0.2, 0.5); litPoly(c, [206, 150, 210, 10, 228, 10, 232, 150], '#241a30', '#0e0a16', 'wood', 0.2, 0.5);
      [[110, 30], [218, 40]].forEach(([x, y]) => { ell(c, '#120c1c', x, y + 30, 5, 7); });
      c.strokeStyle = 'rgba(220,220,240,.55)'; c.lineWidth = 0.7;
      const cx = 162, cy = 80;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 54, cy + Math.sin(a) * 50); c.stroke(); }
      for (let r = 8; r < 54; r += 7) { c.beginPath(); for (let i = 0; i <= 12; i++) { const a = i * Math.PI / 6; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.93; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
      for (let i = 0; i < 18; i++) { const a = i * 1.7, r = 10 + (i * 13 % 44); if (Math.sin(t * 3 + i) > 0.3) R(c, '#e8f0ff', cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1); }
      if (s.flags.got_thread) { circ(c, 'rgba(140,255,160,.25)', cx, cy + 22, 14); ell(c, '#7dffa0', cx, cy + 20, 5, 3); }
      // ground
      c.fillStyle = tex(c, '#344232', '#1e281e', 'grass'); c.fillRect(0, 146, 320, 54);
      for (let i = 0; i < 6; i++) { const rx = 20 + i * 52; c.strokeStyle = '#1a1424'; c.lineWidth = 2; c.beginPath(); c.moveTo(rx, 150); c.quadraticCurveTo(rx + 10, 156 + (i % 2) * 4, rx + 24, 152); c.stroke(); } c.lineWidth = 1;
      grassTufts(c, 150, 196, '#4a6a4a', 17, 24);
      if (!s.flags.got_stink) { R(c, '#d8d0b0', 49, 168, 4, 14); ell(c, '#6a5a2a', 51, 168, 4, 5); R(c, '#3a3018', 49, 166, 1, 3); c.fillStyle = 'rgba(160,200,80,.4)'; for (let k = 0; k < 3; k++) c.fillRect(46 + k * 4 + Math.sin(t * 2 + k) * 2, 156 - ((t * 8 + k * 5) % 12), 1, 3); }
      for (let i = 0; i < 4; i++) ell(c, 'rgba(210,200,240,.10)', ((t * (5 + i * 2) + i * 100) % 440) - 60, 130 + i * 16, 110, 9);
      R(c, '#e8e0f0', 318, 140, 2, 50);
    },
    actors: (s, t) => [{ y: 92, d: c => {
      if (creature(c, 'weft', 160, 90 + Math.sin(t * 1.4) * 1.5, 40)) return;
      const bob = Math.sin(t * 1.4) * 1.5, x = 160, y = 62 + bob;
      c.strokeStyle = '#120c1e'; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const k = Math.sin(t * 2 + i) * 1.5; c.beginPath(); c.moveTo(x - 4, y + i * 3); c.lineTo(x - 14, y - 4 + i * 4 + k); c.lineTo(x - 18, y + 4 + i * 5); c.stroke(); c.beginPath(); c.moveTo(x + 4, y + i * 3); c.lineTo(x + 14, y - 4 + i * 4 - k); c.lineTo(x + 18, y + 4 + i * 5); c.stroke(); }
      ell(c, '#241a34', x, y + 8, 9, 10); circ(c, '#2e2244', x, y - 2, 6);
      R(c, '#f0f0f0', x - 6, y + 2, 12, 2); // lace collar
      for (let i = 0; i < 6; i++) circ(c, '#ff4a6a', x - 4 + (i % 3) * 4, y - 4 + Math.floor(i / 3) * 2, 0.9);
    } }]
  };

  rooms.gearworks = {
    bg(c, s, t) {
      const run = s.flags.clock;
      stoneWall(c, 0, 0, 320, 156, '#4a382a', '#241a12', 141);
      gear(c, 40, 50, 24, 12, run ? t * 0.6 : 0, '#7a5a2a'); gear(c, 80, 30, 14, 9, run ? -t : 0, '#8a6a2a');
      // great forge
      litPoly(c, [110, 152, 110, 30, 230, 30, 230, 152], '#6a5444', '#3a2c22', 'stone', 0.3, 0.5); R(c, '#7a6454', 110, 30, 120, 4); litPoly(c, [130, 30, 210, 30, 196, 0, 144, 0], '#4a3a30', '#2a1e16', 'stone');
      R(c, '#140c08', 128, 84, 84, 62); circ(c, '#140c08', 170, 84, 42);
      if (run) {
        flame(c, 170, 146, 76, 64, t, 7);
      } else { for (let i = 0; i < 10; i++) R(c, '#4a4440', 136 + i * 7, 140 - (i % 3), 6, 4); }
      // bellows
      poly(c, '#6b4428', [270, 122, 310, 116, 310, 150, 270, 144]); R(c, '#5a3a22', 300, 112, 4, 40);
      // anvil
      R(c, '#3a3a3e', 60, 136, 34, 8); R(c, '#2a2a2e', 70, 144, 14, 12);
      c.fillStyle = tex(c, '#4a3c30', '#26201a', 'stone'); c.fillRect(0, 156, 320, 44); c.fillStyle = 'rgba(0,0,0,.3)'; for (let x = 0; x < 320; x += 16) c.fillRect(x, 156, 1, 44); for (let y = 162; y < 200; y += 8) c.fillRect(0, y, 320, 1);
      R(c, '#c8a878', 0, 130, 14, 70);
    },
    actors: (s, t) => [{ y: 162, d: c => {
      const run = s.flags.clock, pump = run ? Math.sin(t * 3) * 3 : 0, x = 215, y = 158;
      if (creature(c, 'anvil', x, y + (run ? Math.abs(pump) * 0.3 : 0), 54)) return;
      R(c, '#8a6a2a', x - 9, y - 18, 6, 18); R(c, '#8a6a2a', x + 3, y - 18, 6, 18);
      R(c, '#c99a22', x - 13, y - 46, 26, 28); R(c, '#e2b23a', x - 13, y - 46, 26, 3); circ(c, run ? '#ff9a3a' : '#5a4a2a', x, y - 32, 5);
      R(c, '#b88a2a', x - 19, y - 44 + pump, 6, 20); R(c, '#b88a2a', x + 13, y - 44 - pump, 6, 20);
      R(c, '#c99a22', x - 8, y - 60, 16, 14); R(c, run ? '#9ff0ff' : '#3a4a5a', x - 5, y - 55, 4, 3); R(c, run ? '#9ff0ff' : '#3a4a5a', x + 1, y - 55, 4, 3);
      R(c, '#8a6a2a', x - 1, y - 66, 2, 6); circ(c, '#e2b23a', x, y - 67, 2);
    } }]
  };

  rooms.ledge = {
    bg(c, s, t) {
      sky(c, ['#2e52a0', '#3e62aa', '#5a7cb8', '#86a0c8', '#b4c4dc'], 200);
      for (let i = 0; i < 5; i++) ell(c, 'rgba(255,255,255,.8)', ((i * 90 + t * 6) % 420) - 50, 150 + i * 9, 50, 7);
      sea(c, t, 186, 14, ['#2a5f9a', '#2f6aa6']);
      // rock wall
      litPoly(c, [0, 0, 230, 0, 214, 30, 236, 70, 226, 110, 260, 140, 320, 150, 320, 164, 0, 164], '#847c6a', '#4e4a40', 'rock', 0.35, 0.55);
      cloud(c, 290, 60, 40, 401); cloud(c, 260, 110, 30, 402);
      c.fillStyle = '#4e4a40'; [[40, 20, 1, 60], [120, 50, 1, 70], [230, 10, 1, 50], [280, 70, 1, 60]].forEach(a => c.fillRect(...a));
      poly(c, '#5e5a4e', [190, 124, 236, 120, 244, 132, 186, 134]); // goat rock
      // the ledge
      litPoly(c, [30, 184, 30, 160, 290, 160, 290, 184], '#a09886', '#6e6858', 'rock', 0.3, 0.3); R(c, '#c0b8a4', 30, 160, 260, 2); R(c, '#3e3a32', 30, 182, 260, 3);
      litPoly(c, [30, 185, 290, 185, 270, 196, 50, 196], '#6a6458', '#3e3a32', 'rock');
      R(c, '#9a9282', 0, 150, 30, 40); R(c, '#9a9282', 290, 140, 30, 50);
      for (let i = 0; i < 5; i++) R(c, '#8a8274', 292 + i * 5, 140 - i * 10, 28 - i * 5, 6);
    },
    actors: (s, t) => [{ y: s.flags.goat ? 126 : 150, d: c => {
      const P = window.Art && window.Art.hasPainting && window.Art.hasPainting('ledge'), gx = s.flags.goat ? (P ? 205 : 214) : 204, gy = s.flags.goat ? (P ? 104 : 124) : (P ? 148 : 174), chew = Math.sin(t * 6) > 0 ? 1 : 0;
      if (creature(c, 'goat', gx, gy, 34, true)) return;
      ell(c, '#f0ece0', gx, gy - 12, 14, 8);
      R(c, '#e0dccc', gx - 11, gy - 6, 3, 8); R(c, '#e0dccc', gx - 4, gy - 6, 3, 8); R(c, '#e0dccc', gx + 4, gy - 6, 3, 8); R(c, '#e0dccc', gx + 10, gy - 6, 3, 8);
      ell(c, '#f0ece0', gx - 15, gy - 20, 6, 5); R(c, '#e0dccc', gx - 20, gy - 18 + chew, 6, 4);
      R(c, '#111', gx - 17, gy - 22, 1.5, 1.5); R(c, '#d8d0b8', gx - 18, gy - 14 + chew, 4, 4);
      c.strokeStyle = '#8a7a5a'; c.lineWidth = 2; c.beginPath(); c.arc(gx - 11, gy - 26, 5, Math.PI, Math.PI * 1.9); c.stroke();
      if (s.flags.goat) ell(c, '#c8862e', gx - 22, gy - 14, 3, 2);
    } }]
  };

  rooms.tidepools = {
    bg(c, s, t) {
      sky(c, ['#3a8ac8', '#4a9ad0', '#6ab0d8', '#98c8e0', '#d0e4e8'], 70);
      clouds(c, t, 18, 'rgba(255,255,255,.8)', 91);
      sea(c, t, 70, 76, ['#1aa0b8', '#22acc0', '#2ab8c4', '#40c4c8']);
      // coral arch
      litPoly(c, [200, 146, 210, 70, 240, 50, 280, 52, 304, 74, 312, 146, 290, 146, 286, 90, 264, 76, 236, 80, 222, 100, 222, 146], '#e08e8a', '#9a5050', 'rock', 0.4, 0.5);
      for (let i = 0; i < 6; i++) circ(c, ['#ffb0c0', '#ffd0a0', '#f080a0'][i % 3], 212 + i * 16, 60 + (i % 3) * 20, 2);
      if (Math.sin(t * 1.3) > 0.6) ell(c, 'rgba(255,255,255,.7)', 254, 140, 26, 5);
      c.fillStyle = tex(c, '#f6d4c4', '#dca898', 'sand'); c.fillRect(0, 144, 320, 56);
      c.fillStyle = 'rgba(255,255,255,.75)'; for (let x = 0; x < 320; x += 7) c.fillRect(x, 143 + Math.sin(x / 8 + t * 1.5) * 1.5, 5, 2);
      // pools
      ell(c, '#2a8aa0', 92, 177, 38, 12); ell(c, '#50c0c8', 90, 176, 32, 9);
      for (let i = 0; i < 6; i++) { circ(c, ['#ff8a6a', '#ffd84a', '#c86ac8'][i % 3], 70 + i * 8, 174 + (i % 2) * 4, 1.6); }
      poly(c, '#ff8a4a', [110, 172, 113, 168, 116, 172, 120, 173, 116, 175, 117, 180, 113, 177, 109, 180, 110, 175, 106, 173]);
      ell(c, '#3a9aa8', 30, 160, 18, 6); ell(c, '#5ac0c8', 30, 159, 14, 4);
      [[250, 186], [276, 176], [140, 190]].forEach(([x, y]) => poly(c, '#ff9aa8', [x, y, x + 3, y - 6, x + 6, y]));
    },
    actors: (s, t) => s.flags.octo ? [] : [{ y: 182, d: c => {
      if (creature(c, 'octopus', 210, 184 + Math.sin(t * 3), 14)) return;
      const w = Math.sin(t * 3); c.save(); c.translate(46, 0);
      ell(c, '#a86ac8', 164, 174, 7, 6); circ(c, '#fff', 161, 172, 1.6); circ(c, '#fff', 167, 172, 1.6); R(c, '#111', 161, 172, 1, 1); R(c, '#111', 167, 172, 1, 1);
      c.strokeStyle = '#a86ac8'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(158 + i * 3, 178); c.quadraticCurveTo(156 + i * 3 + w * 2, 183, 154 + i * 4, 182 + (i % 2) * 2); c.stroke(); } c.restore();
    } }]
  };

  const castleWall = (c, seed) => { stoneWall(c, 0, 0, 320, 156, '#5e5850', '#46423c', seed); };
  const castleFloor = c => { c.fillStyle = tex(c, '#58524a', '#2e2a26', 'stone'); c.fillRect(0, 156, 320, 44); const g = rnd(97); for (let y = 158, row = 0; y < 200; y += 6 + row, row++) for (let x = -(row % 2) * 12; x < 320; x += 24) { R(c, `rgba(${g() > 0.5 ? '255,240,220' : '0,0,0'},${g() * 0.12})`, x + 1, y + 1, 22, 5 + row); R(c, 'rgba(0,0,0,.4)', x, y, 1, 6 + row); R(c, 'rgba(255,240,220,.1)', x + 1, y + 1, 22, 1); } c.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 158, row = 0; y < 200; y += 6 + row, row++) c.fillRect(0, y, 320, 1); };
  const door = (c, x, y, w, h, col, open) => { litPoly(c, [x - 4, y + h, x - 4, y - 3, x + w / 2, y - 16, x + w + 4, y - 3, x + w + 4, y + h], '#6a6258', '#3a3630', 'stone'); if (open) R(c, '#0e0a06', x, y, w, h); else { c.fillStyle = tex(c, col, shade(col, -40), 'wood'); c.fillRect(x, y, w, h); for (let k = 1; k < 4; k++) R(c, 'rgba(0,0,0,.35)', x + k * w / 4, y, 1, h); R(c, '#2a2a2e', x, y + 10, w, 3); R(c, '#2a2a2e', x, y + h - 14, w, 3); R(c, 'rgba(255,255,255,.12)', x, y, 2, h); circ(c, '#c99a22', x + w - 6, y + h / 2, 2); circ(c, '#ffe080', x + w - 6.5, y + h / 2 - 0.5, 0.7); } };

  rooms.corridor = {
    bg(c, s, t) {
      castleWall(c, 111);
      door(c, 70, 82, 32, 72, '#6b4428', false);
      door(c, 180, 82, 32, 72, '#1a1a22', s.flags.unlocked);
      if (!s.flags.unlocked) { R(c, '#cfd6d8', 204, 116, 4, 6); }
      R(c, '#e8d8a8', 302, 96, 18, 64); c.fillStyle = 'rgba(255,230,170,.18)'; poly(c, 'rgba(255,230,170,.12)', [302, 160, 320, 160, 320, 200, 260, 200]);
      // tapestry
      R(c, '#2f8a7a', 120, 30, 46, 60); R(c, '#e2b23a', 120, 30, 46, 3); poly(c, '#e2b23a', [134, 50, 152, 50, 143, 70]);
      R(c, '#3a3a3e', 240, 96, 22, 50); circ(c, '#5a5a62', 251, 92, 7); R(c, '#9aa7a8', 244, 100, 14, 30); // armor stand
      torch(c, 40, 60, t); torch(c, 160, 100, t); torch(c, 280, 60, t);
      castleFloor(c);
      R(c, '#8c1d26', 20, 168, 280, 18); R(c, '#e2b23a', 20, 168, 280, 1); R(c, '#e2b23a', 20, 185, 280, 1);
      R(c, '#110f0d', 0, 130, 14, 70);
    },
    actors: (s, t) => [{ y: 176, d: c => {
      const asleep = s.flags.hound, x = 152, y = 176, br = asleep ? Math.sin(t * 1.5) * 1 : 0;
      if (creature(c, asleep ? 'hound_sleep' : 'hound', x, y + 2, asleep ? 24 : 34, false)) { if (asleep) { c.fillStyle = '#e8e8f0'; c.font = '8px monospace'; const z = (t * 0.6) % 1; c.globalAlpha = 1 - z; c.fillText('z', x + 6 + z * 4, y - 22 - z * 12); c.fillText('Z', x + 12 + z * 6, y - 30 - z * 12); c.globalAlpha = 1; } return; }
      ell(c, '#1a1a1e', x, y - 7 - br * 0.5, 22, 8 + br);
      ell(c, '#222226', x - 20, y - (asleep ? 6 : 14), 8, 6); poly(c, '#222226', [x - 24, y - (asleep ? 6 : 14), x - 34, y - (asleep ? 4 : 11), x - 24, y - (asleep ? 2 : 9)]);
      poly(c, '#1a1a1e', [x - 18, y - (asleep ? 11 : 19), x - 15, y - (asleep ? 17 : 25), x - 13, y - (asleep ? 11 : 19)]);
      R(c, '#c8c8c8', x - 16, y - (asleep ? 4 : 11), 6, 2);
      for (let i = 0; i < 3; i++) R(c, '#c8c8c8', x - 15 + i * 2, y - (asleep ? 5 : 12), 1, 2);
      if (asleep) { c.fillStyle = '#e8e8f0'; c.font = '8px monospace'; const z = (t * 0.6) % 1; c.globalAlpha = 1 - z; c.fillText('z', x - 24 + z * 4, y - 16 - z * 12); c.fillText('Z', x - 18 + z * 6, y - 24 - z * 12); c.globalAlpha = 1; }
      else { R(c, '#ff3a2a', x - 23, y - 16, 2, 2); const wag = Math.sin(t * 9) * 4; R(c, '#1a1a1e', x + 20, y - 10 + wag * 0.3, 8, 2); }
      if (!asleep) { R(c, '#1a1a1e', x - 16, y - 8, 3, 8); R(c, '#1a1a1e', x - 8, y - 8, 3, 8); R(c, '#1a1a1e', x + 10, y - 8, 3, 8); R(c, '#1a1a1e', x + 16, y - 8, 3, 8); }
    } }]
  };

  rooms.kitchen = {
    bg(c, s, t) {
      stoneWall(c, 0, 0, 320, 156, '#7a6e5e', '#5e5446', 121);
      for (let i = 0; i < 9; i++) { const x = 24 + i * 15; R(c, '#3a2a1a', x + 4, 22, 1, 10); circ(c, i % 2 ? '#c87a3a' : '#b8682a', x + 4, 40, 6); R(c, '#e8b878', x + 1, 38, 6, 2); }
      // hearth with boar on a spit
      R(c, '#4e4840', 228, 56, 86, 96); R(c, '#110c08', 238, 84, 66, 68);
      flame(c, 270, 152, 50, 28, t, 5);
      R(c, '#3a3a3e', 236, 112, 72, 2); ell(c, '#a8582a', 270, 112, 22, 9); ell(c, '#c8783a', 266, 108, 12, 4);
      // table + cake
      R(c, '#7a5230', 70, 140, 120, 6); R(c, '#5a3a22', 76, 146, 5, 12); R(c, '#5a3a22', 180, 146, 5, 12);
      [[98, 128, 46], [102, 118, 38], [106, 110, 30], [110, 104, 22]].forEach(([x, y, w]) => { R(c, '#f6eee0', x, y, w, 10); R(c, '#3fae8f', x, y, w, 2); });
      R(c, '#1a1a22', 118, 98, 3, 6); R(c, '#3fae8f', 124, 96, 3, 8); circ(c, '#f0c8a8', 125, 95, 1.5);
      ell(c, '#c8c0b0', 160, 136, 10, 4); ell(c, '#e8b878', 160, 134, 7, 2);
      R(c, '#3a2a1a', 20, 70, 50, 70); R(c, '#e8c898', 22, 72, 14, 66); // larder
      castleFloor(c);
      R(c, '#110f0d', 0, 130, 16, 70);
    },
    actors: () => [{ y: 170, d: c => figure(c, 220, 170, { sprite: 'bertha', h: 33, skin: '#f0c0a0', hair: '#d8d8d8', top: '#e8e0cc', dress: '#8a5a3a', trim: '#e8e0cc', legs: '#8a5a3a', hat: r => { r('#f6f0e0', -3.5, 27.5, 7, 3); } }, 0, -1) }]
  };

  rooms.study = {
    bg(c, s, t) {
      boards(c, 0, 0, 320, 160, '#3a2a3e', '#1a1220');
      // black curtains + window
      R(c, '#3a3a5a', 86, 24, 28, 60); R(c, '#0e0a14', 76, 20, 14, 80); R(c, '#0e0a14', 110, 20, 14, 80);
      // portrait of Varrick
      R(c, '#c99a22', 122, 22, 56, 66); R(c, '#2a1a2a', 126, 26, 48, 58); ell(c, '#d8c0a8', 150, 48, 9, 11); R(c, '#111', 141, 34, 18, 6); poly(c, '#e2b23a', [140, 36, 160, 36, 158, 28, 154, 33, 150, 26, 146, 33, 142, 28]); R(c, '#1a1a22', 136, 62, 28, 22); R(c, '#111', 145, 54, 10, 6);
      // bookshelves
      R(c, '#2a1a10', 228, 28, 84, 116); for (let r = 0; r < 4; r++) { R(c, '#1a100a', 230, 54 + r * 28, 80, 3); const g = rnd(40 + r); for (let x = 232; x < 306;) { const w = 4 + g() * 6; R(c, ['#5a1a2a', '#1a3a2a', '#3a2a5a', '#5a4a1a'][(g() * 4) | 0], x, 34 + r * 28, w, 20); x += w + 1; } }
      // desk
      R(c, '#3a2214', 128, 116, 94, 10); R(c, '#2a180e', 132, 126, 86, 28); R(c, '#4a2c18', 168, 132, 14, 6); circ(c, '#c99a22', 175, 135, 1.5);
      R(c, '#e8e0cc', 140, 108, 22, 8); R(c, '#d8d0bc', 146, 104, 18, 8); R(c, '#111', 196, 104, 3, 12); poly(c, '#e8e0cc', [199, 104, 206, 98, 200, 108]);
      if (s.flags.letter_found) R(c, '#1a100a', 166, 138, 18, 4);
      // raven perch
      R(c, '#3a2a1a', 50, 84, 2, 76); R(c, '#3a2a1a', 40, 84, 22, 3);
      const hop = Math.sin(t * 2) > 0.9 ? -2 : 0;
      ell(c, '#0e0e14', 52, 74 + hop, 7, 9); circ(c, '#0e0e14', 54, 64 + hop, 5); poly(c, '#3a3a40', [58, 64 + hop, 64, 66 + hop, 58, 67 + hop]); R(c, '#e8e8f0', 55, 62 + hop, 1, 1);
      // candle
      R(c, '#e8e0cc', 212, 100, 3, 10); poly(c, '#ffb040', [211, 100, 216, 100, 213.5, 94 + Math.sin(t * 9)]); circ(c, 'rgba(255,180,80,.15)', 213, 96, 12);
      bands(c, 0, 160, 320, 40, ['#2a1e24', '#30242a', '#362a30']);
      R(c, '#3a1020', 60, 166, 200, 26); R(c, '#e2b23a', 60, 166, 200, 1);
      R(c, '#110f0d', 0, 130, 16, 70);
    }
  };

  rooms.gallery = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 160, ['#3a3048', '#443854', '#4e4060', '#56486a']);
      c.save(); c.globalAlpha = 0.4; c.fillStyle = tex(c, '#6a5880', '#2a2238', 'mottle'); c.fillRect(0, 0, 320, 112); c.restore();
      boards(c, 0, 114, 320, 46, '#4a3428', '#2a1a12'); R(c, '#c99a22', 0, 112, 320, 2);
      // portraits
      const g = rnd(55);
      [[30, 36], [72, 30], [116, 36], [160, 30]].forEach(([x, y], i) => {
        R(c, '#c99a22', x, y, 38, 50); R(c, ['#2a3a5a', '#3a2a3a', '#2a3a2a', '#3a4a8a'][i], x + 3, y + 3, 32, 44);
        ell(c, '#e8c8a8', x + 19, y + 20, 7, 8); R(c, ['#5a3a1a', '#d8d8d8', '#8a5a2a', '#e8e8e8'][i], x + 12, y + 11, 14, 4);
        poly(c, '#e2b23a', [x + 12, y + 11, x + 26, y + 11, x + 24, y + 6, x + 19, y + 10, x + 14, y + 6]);
        R(c, ['#8c1d26', '#2f6b5a', '#5a3a7a', '#3a4a8a'][i], x + 9, y + 30, 20, 17);
        if (i === 3) { circ(c, '#f0c8a8', x + 28, y + 34, 3); R(c, '#c8862e', x + 25, y + 30, 6, 3); R(c, '#e8e8e8', x + 15, y + 26, 8, 6); }
      });
      // doors to the great hall
      R(c, '#2a1e14', 228, 54, 74, 106); poly(c, '#2a1e14', [228, 54, 265, 34, 302, 54]);
      R(c, '#6b4428', 234, 60, 30, 100); R(c, '#6b4428', 266, 60, 30, 100); R(c, '#e8d8a8', 264, 60, 2, 100);
      circ(c, '#c99a22', 258, 112, 2); circ(c, '#c99a22', 272, 112, 2);
      torch(c, 214, 70, t); torch(c, 314, 70, t);
      castleFloor(c);
      R(c, '#8c1d26', 0, 168, 320, 18); R(c, '#e2b23a', 0, 168, 320, 1); R(c, '#e2b23a', 0, 185, 320, 1);
      R(c, '#e8d8a8', 0, 120, 14, 40);
    },
    actors: () => [
      { y: 140, d: c => figure(c, 206, 140, { sprite: 'guard', skin: '#dba882', hair: '#2a1d12', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', hat: r => { r('#9aa7a8', -3, 27, 6, 3); } }, 0, 1) },
      { y: 142, d: c => figure(c, 294, 142, { sprite: 'guard', skin: '#b9845e', hair: '#1a120c', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', hat: r => { r('#9aa7a8', -3, 27, 6, 3); } }, 0, -1) }
    ]
  };

  // ---------- talker portraits (drawn into 56x56) ----------
  const P = {
    rowan: { bg: '#2f6b3a', skin: '#e8b48a', hair: '#6b3f1d', shirt: '#2f6b3a', collar: '#efe6d0' },
    bram: { bg: '#5a3a22', skin: '#e3b08c', hair: '#d8d8d8', beard: '#e4e4e4', shirt: '#3d5a8a', hat: '#8c1d26', squint: true },
    nell: { bg: '#4a6a8a', skin: '#c9906a', hair: '#a8a8a8', long: true, shirt: '#c8a43a', hat: '#c8a43a', pipe: true },
    oracle: { bg: '#241c3c', skin: '#c8a090', hair: '#e8e8f0', long: true, shirt: '#4a2e6a', blind: true },
    pim: { bg: '#5c402a', skin: '#e8b48a', hair: '#e8e8e8', beard: '#f0f0f0', shirt: '#8c1d26', goggles: true },
    hester: { bg: '#2a3a6a', skin: '#d8a080', hair: '#b8b8b8', long: true, shirt: '#2a3a6a', hat: '#1a2440' },
    fishmonger: { bg: '#a8885a', skin: '#d8a080', hair: '#2a1d12', beard: '#2a1d12', shirt: '#4a6a8a' },
    guard: { bg: '#2f8a7a', skin: '#dba882', hair: '#2a1d12', shirt: '#9aa7a8', helm: '#9aa7a8' },
    granite: { bg: '#5a5650', skin: '#9a968c', hair: '#9a968c', shirt: '#7a766c', stone: true },
    basalt: { bg: '#2a2a30', skin: '#3a3a40', hair: '#3a3a40', shirt: '#2a2a30', stone: true, sly: true },
    nerissa: { bg: '#1aa0b8', skin: '#e8c8b0', hair: '#2a6a8a', long: true, shirt: '#7ad0c8', coral: true },
    elowen: { bg: '#3fae8f', skin: '#f0c8a8', hair: '#c8862e', long: true, shirt: '#3fae8f', circlet: true },
    orla: { bg: '#2f6b5a', skin: '#d8a888', hair: '#9a9a9a', shirt: '#b8c4c6', scar: true },
    varrick: { bg: '#1a1020', skin: '#d8c0a8', hair: '#111', beard: '#111', shirt: '#1a1a22', pearl: true, sly: true },
    king: { bg: '#3a4a8a', skin: '#f0d0b8', hair: '#e8e8e8', beard: '#e8e8e8', shirt: '#3a4a8a', crown: true },
    marla: { bg: '#583622', skin: '#e3b08c', hair: '#8a3a1a', long: true, shirt: '#7a2a2a' },
    fennick: { bg: '#3a6a3a', skin: '#f0c8a8', hair: '#c8a040', shirt: '#3a6a3a', hat: '#8c1d26' },
    weft: { bg: '#2a2244', skin: '#2e2244', hair: '#241a34', shirt: '#f0f0f0', spider: true },
    anvil: { bg: '#32241a', skin: '#c99a22', hair: '#c99a22', shirt: '#b88a2a', robot: true },
    bertha: { bg: '#7a6e5e', skin: '#f0c0a0', hair: '#d8d8d8', shirt: '#8a5a3a', hat: '#f6f0e0' },
    goggle: { imp: 'eye' }, lugs: { imp: 'ears' }, snoot: { imp: 'nose' }, lick: { imp: 'tongue' }, grabby: { imp: 'hands' }
  };
  // Painted portraits (assets/portraits/<who>.png, 112x112) win over the code-drawn ones.
  const PORT = {};
  if (typeof Image !== 'undefined') Object.keys(P).forEach(w => { PORT[w] = new Image(); PORT[w].src = 'assets/portraits/' + w + '.png'; });
  function portrait(c, who) {
    if (!P[who]) return false;
    if (!PORT[who] && typeof Image !== 'undefined') { PORT[who] = new Image(); PORT[who].src = 'assets/portraits/' + who + '.png'; }
    const im = PORT[who], k = c.canvas ? c.canvas.width / 56 : 1;
    c.save(); c.scale(k, k);
    if (im && im.complete && im.naturalWidth) {
      const bg = P[who].bg || '#1aa0b8';
      bands(c, 0, 0, 56, 56, [shade(bg, 10), bg, shade(bg, -14), shade(bg, -28)]);
      c.imageSmoothingEnabled = true; c.drawImage(im, 0, 0, 56, 56);
    } else portraitCode(c, who);
    c.restore(); return true;
  }
  function portraitCode(c, who) {
    const o = P[who]; if (!o) return false;
    if (o.imp) {
      bands(c, 0, 0, 56, 56, ['#1aa0b8', '#22acc0', '#40c4c8']);
      const col = '#5ab8a8';
      R(c, col, 18, 42, 20, 14); circ(c, col, 28, 28, 15);
      poly(c, '#7ad0c0', [13, 26, 2, 12, 15, 20]); poly(c, '#7ad0c0', [43, 26, 54, 12, 41, 20]);
      for (let k = 0; k < 6; k++) R(c, '#2f7a40', 16 + k * 4, 8 - (k % 2) * 3, 3, 10);
      if (o.imp === 'eye') { circ(c, '#fff', 28, 27, 12); circ(c, '#2a6aaa', 28, 27, 6); circ(c, '#111', 28, 27, 3); R(c, '#fff', 25, 23, 2, 2); }
      else { R(c, '#111', 21, 24, 3, 3); R(c, '#111', 32, 24, 3, 3); }
      if (o.imp === 'ears') { ell(c, '#7ad0c0', 8, 30, 8, 14); ell(c, '#7ad0c0', 48, 30, 8, 14); ell(c, '#e8a0a0', 8, 30, 4, 9); ell(c, '#e8a0a0', 48, 30, 4, 9); }
      if (o.imp === 'nose') { ell(c, '#e89a8a', 28, 33, 7, 11); R(c, '#a85a5a', 24, 42, 2, 2); R(c, '#a85a5a', 30, 42, 2, 2); }
      if (o.imp === 'tongue') { R(c, '#e86a8a', 25, 34, 6, 20); circ(c, '#e86a8a', 28, 53, 4); }
      else if (o.imp !== 'nose') R(c, '#8a3a3a', 23, 36, 10, 2);
      if (o.imp === 'hands') { ell(c, '#7ad0c0', 8, 46, 8, 7); ell(c, '#7ad0c0', 48, 46, 8, 7); for (let k = 0; k < 3; k++) { R(c, '#7ad0c0', 2 + k * 4, 36, 3, 8); R(c, '#7ad0c0', 44 + k * 4, 36, 3, 8); } }
      return true;
    }
    bands(c, 0, 0, 56, 56, [o.bg, shade(o.bg, -12), shade(o.bg, -24)]);
    R(c, o.shirt, 8, 44, 40, 12); if (o.collar) poly(c, o.collar, [22, 44, 28, 52, 34, 44]);
    if (o.long) { R(c, o.hair, 13, 14, 30, 34); }
    R(c, o.skin, 24, 36, 8, 8);
    ell(c, o.skin, 28, 26, 12, 14);
    if (o.stone) { c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(20, 18, 1, 16); c.fillRect(34, 24, 1, 12); }
    // hair cap
    c.fillStyle = o.hair; c.beginPath(); c.ellipse(28, 17, 13, 8, 0, Math.PI, 0); c.fill(); R(c, o.hair, 15, 16, 4, 8); R(c, o.hair, 37, 16, 4, 8);
    if (o.beard) { c.fillStyle = o.beard; c.beginPath(); c.moveTo(17, 28); c.quadraticCurveTo(28, 52, 39, 28); c.lineTo(36, 30); c.quadraticCurveTo(28, 38, 20, 30); c.fill(); }
    // eyes
    if (o.blind) { R(c, '#e8e8f0', 21, 25, 5, 3); R(c, '#e8e8f0', 30, 25, 5, 3); }
    else if (o.squint) { R(c, '#111', 21, 26, 5, 1); R(c, '#111', 30, 26, 5, 1); }
    else { R(c, '#fff', 21, 24, 5, 3); R(c, '#fff', 30, 24, 5, 3); R(c, o.stone ? '#111' : '#2a3a5a', 23, 24, 2, 3); R(c, o.stone ? '#111' : '#2a3a5a', 32, 24, 2, 3); }
    R(c, shade(o.hair, -20), 20, 21, 6, 1.5); R(c, shade(o.hair, -20), 30, 21, 6, 1.5);
    if (o.sly) { R(c, '#111', 30, 20, 6, 1.5); }
    R(c, shade(o.skin, -25), 27, 27, 2, 5);
    if (!o.beard || o.pearl) { R(c, '#8a3a3a', 24, 34, 8, 1.5); if (o.sly) R(c, '#8a3a3a', 31, 33, 2, 1.5); }
    if (o.hat) { R(c, o.hat, 14, 9, 28, 6); R(c, o.hat, 18, 4, 20, 6); }
    if (o.helm) { R(c, o.helm, 14, 7, 28, 10); R(c, shade(o.helm, -20), 26, 15, 4, 8); }
    if (o.crown) poly(c, '#e2b23a', [16, 12, 40, 12, 40, 3, 35, 8, 31, 1, 28, 8, 25, 1, 21, 8, 16, 3]);
    if (o.circlet) { R(c, '#e2b23a', 16, 14, 24, 2); circ(c, '#3fae8f', 28, 15, 1.6); }
    if (o.coral) poly(c, '#ff8a9a', [16, 12, 19, 2, 23, 10, 28, 0, 33, 10, 37, 2, 40, 12]);
    if (o.goggles) { R(c, '#3a3a3a', 16, 15, 24, 3); circ(c, '#9fe0ff', 22, 16, 3.5); circ(c, '#9fe0ff', 34, 16, 3.5); }
    if (o.pipe) { R(c, '#4a2c18', 32, 34, 9, 2); R(c, '#4a2c18', 40, 31, 3, 4); }
    if (o.scar) R(c, '#a86a5a', 33, 22, 1, 9);
    if (o.pearl) { circ(c, '#200a30', 28, 47, 3); circ(c, 'rgba(160,80,220,.6)', 28, 47, 5); }
    if (o.spider) { bands(c, 0, 0, 56, 56, [o.bg, '#221a3a']); ell(c, '#2e2244', 28, 30, 18, 16); for (let i = 0; i < 8; i++) circ(c, '#ff4a6a', 18 + (i % 4) * 7, 22 + Math.floor(i / 4) * 6, 2); R(c, '#f0f0f0', 12, 44, 32, 4); R(c, '#e8e8e8', 16, 48, 4, 2); R(c, '#e8e8e8', 36, 48, 4, 2); poly(c, '#120c1e', [22, 38, 26, 44, 28, 38]); poly(c, '#120c1e', [30, 38, 32, 44, 36, 38]); }
    if (o.robot) { bands(c, 0, 0, 56, 56, [o.bg, '#2a1e16']); R(c, '#c99a22', 12, 10, 32, 34); R(c, '#e2b23a', 12, 10, 32, 3); R(c, '#9ff0ff', 18, 22, 7, 5); R(c, '#9ff0ff', 31, 22, 7, 5); for (let i = 0; i < 5; i++) R(c, '#5a4a2a', 18 + i * 4, 34, 2, 4); R(c, '#8a6a2a', 27, 2, 2, 8); circ(c, '#e2b23a', 28, 3, 2.5); R(c, '#b88a2a', 8, 44, 40, 12); circ(c, '#ff9a3a', 28, 50, 3); }
    return true;
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1, 7), 16); const cl = v => Math.max(0, Math.min(255, v));
    return '#' + [16, 8, 0].map(sh => cl(((n >> sh) & 255) + amt).toString(16).padStart(2, '0')).join('');
  }

  // ---------- the sea chart ----------
  const MAP_SPOTS = { crown: [104, 104, 34], mists: [222, 60, 26], clocks: [240, 146, 26], sentinels: [56, 44, 22], reef: [60, 160, 24] };
  function chart(c, s, t, here) {
    dith(c, 0, 0, 320, 200, '#e8d8b0', '#e0cea2');
    c.strokeStyle = '#8a6a3a'; c.lineWidth = 3; c.strokeRect(5, 5, 310, 190); c.lineWidth = 1; c.strokeRect(10, 10, 300, 180);
    c.fillStyle = 'rgba(80,120,160,.25)'; for (let i = 0; i < 40; i++) { const x = 20 + (i * 71 % 280), y = 20 + (i * 37 % 160); c.fillRect(x + Math.sin(t + i) * 2, y, 8, 1); }
    const isle = (k, draw) => { const [x, y] = MAP_SPOTS[k]; draw(x, y); };
    isle('crown', (x, y) => { ell(c, '#b8a070', x, y, 30, 18); ell(c, '#8aa060', x, y - 2, 24, 13); R(c, '#e8e0d0', x - 4, y - 14, 8, 10); poly(c, '#2f8a7a', [x - 6, y - 14, x, y - 22, x + 6, y - 14]); });
    isle('mists', (x, y) => { ell(c, '#8a7aa0', x, y, 22, 12); for (let i = 0; i < 3; i++) ell(c, 'rgba(200,180,230,.6)', x - 10 + i * 10, y - 6 + Math.sin(t + i) * 2, 12, 4); });
    isle('clocks', (x, y) => { ell(c, '#b09060', x, y, 22, 12); R(c, '#c8b08a', x - 3, y - 18, 6, 14); circ(c, '#f6eedc', x, y - 14, 3); gear(c, x + 10, y - 4, 4, 6, t, '#c99a22'); });
    isle('sentinels', (x, y) => { ell(c, '#8a8478', x, y + 6, 16, 7); poly(c, '#6a6458', [x - 8, y + 6, x, y - 18, x + 8, y + 6]); });
    isle('reef', (x, y) => { ell(c, '#f0c8b8', x, y, 20, 10); ell(c, '#40c4c8', x + 4, y, 8, 4); R(c, '#7a5a32', x - 10, y - 12, 2, 10); ell(c, '#2f7a30', x - 9, y - 13, 6, 2); });
    c.font = '9px Georgia, serif'; c.textAlign = 'center';
    for (const k in MAP_SPOTS) { const [x, y, r] = MAP_SPOTS[k]; c.fillStyle = k === here ? '#8c1d26' : '#3a2a1a'; c.fillText(window.Game.ISLES[k].name, x, y + r - 2); if (k === here) { c.strokeStyle = '#8c1d26'; c.setLineDash([3, 2]); c.beginPath(); c.arc(x, y, r - 4, 0, 7); c.stroke(); c.setLineDash([]); } }
    // compass rose
    const cx = 270, cy = 46; c.strokeStyle = '#8a6a3a'; c.beginPath(); c.arc(cx, cy, 18, 0, 7); c.stroke();
    poly(c, '#8c1d26', [cx, cy - 20, cx + 4, cy, cx - 4, cy]); poly(c, '#3a2a1a', [cx, cy + 20, cx + 4, cy, cx - 4, cy]); poly(c, '#3a2a1a', [cx - 20, cy, cx, cy - 3, cx, cy + 3]); poly(c, '#3a2a1a', [cx + 20, cy, cx, cy - 3, cx, cy + 3]);
    c.fillStyle = '#3a2a1a'; c.fillText('N', cx, cy - 22);
    c.font = 'italic 11px Georgia, serif'; c.fillText('The Tidewater Isles', 160, 24); c.textAlign = 'left';
  }

  // ---------- cinematics ----------
  const cine = {
    mirror(c, s, t) {
      bands(c, 0, 0, 320, 200, ['#1a1028', '#22142e', '#2a1a36', '#321e3e']);
      torch(c, 60, 70, t); torch(c, 260, 70, t);
      R(c, '#c99a22', 112, 24, 96, 132); R(c, '#8a6a2a', 116, 28, 88, 124);
      const g = 0.5 + Math.sin(t * 2) * 0.15;
      bands(c, 120, 32, 80, 116, ['#3a5a7a', '#4a6a8a', '#5a7a9a']);
      circ(c, `rgba(200,240,255,${0.2 * g})`, 160, 90, 50);
      // her face in the glass
      R(c, '#c8862e', 140, 58, 40, 60); ell(c, '#f0c8a8', 160, 82, 15, 19); c.fillStyle = '#c8862e'; c.beginPath(); c.ellipse(160, 68, 17, 10, 0, Math.PI, 0); c.fill();
      R(c, '#e2b23a', 144, 66, 32, 2); R(c, '#2a3a5a', 152, 80, 4, 3); R(c, '#2a3a5a', 164, 80, 4, 3); R(c, '#b8604a', 156, 92, 8, 2); R(c, '#3fae8f', 140, 100, 40, 18);
      c.fillStyle = `rgba(255,255,255,${0.12 + Math.sin(t * 3) * 0.05})`; c.fillRect(124, 36 + ((t * 30) % 110), 72, 3);
      for (let i = 0; i < 6; i++) circ(c, '#e2b23a', 114 + (i % 2) * 92, 34 + Math.floor(i / 2) * 56, 3);
      R(c, '#2a1a10', 0, 170, 320, 30); figure(c, 160, 196, Object.assign({}, HERO, { h: 34 }), 0, 1);
    },
    storm(c, s, t) {
      const flash = Math.sin(t * 2.3) > 0.97;
      bands(c, 0, 0, 320, 110, flash ? ['#a8a8c8', '#9898b8', '#8888a8'] : ['#141824', '#1a2030', '#20283a', '#263044']);
      for (let i = 0; i < 6; i++) ell(c, '#2a3040', ((i * 70 + t * 20) % 400) - 40, 20 + (i % 3) * 14, 50, 10);
      if (flash) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(220, 0); c.lineTo(210, 30); c.lineTo(224, 40); c.lineTo(206, 80); c.stroke(); }
      for (let y = 110; y < 200; y += 6) { const off = Math.sin(y / 10 + t * 3) * 10; bands(c, 0, y, 320, 6, [y % 12 ? '#1a3050' : '#203860']); c.fillStyle = 'rgba(255,255,255,.3)'; for (let x = 0; x < 320; x += 40) c.fillRect(x + off + (y * 3 % 40), y, 10, 1); }
      const roll = Math.sin(t * 1.6) * 0.2, by = 118 + Math.sin(t * 2) * 6;
      c.save(); c.translate(150, by); c.rotate(roll);
      poly(c, '#4b3220', [-50, 0, 50, 0, 38, 18, -40, 18]); R(c, '#6a4a2e', -2, -70, 4, 70); poly(c, '#d8d0bc', [2, -66, 34, -40, 2, -14]); poly(c, '#c8c0aa', [-2, -60, -30, -36, -2, -16]);
      R(c, '#8c1d26', 0, -78, 12, 5); c.restore();
      c.fillStyle = 'rgba(200,220,255,.35)'; for (let i = 0; i < 60; i++) c.fillRect((i * 53 + t * 300) % 320, (i * 37 + t * 500) % 200, 1, 6);
    }
  };

  // ---------- inventory icons (drawn into 24x24) ----------
  const items = {
    ring: c => { c.strokeStyle = '#e2b23a'; c.lineWidth = 3; c.beginPath(); c.arc(12, 14, 6, 0, 7); c.stroke(); R(c, '#c99a22', 8, 4, 8, 5); R(c, '#fff3b0', 10, 5, 2, 2); },
    bottle: c => { R(c, '#2e7a4a', 6, 8, 12, 14); R(c, '#2e7a4a', 9, 3, 6, 6); R(c, '#a0703a', 9, 1, 6, 3); R(c, '#f2ecd8', 9, 12, 6, 6); R(c, '#bfe6c8', 7, 9, 2, 10); },
    conch: c => { ell(c, '#e79aa0', 12, 13, 9, 7); ell(c, '#f6c6c4', 10, 12, 5, 3); poly(c, '#b9666e', [18, 9, 23, 12, 18, 17]); },
    token: c => { circ(c, '#c99a22', 12, 12, 9); circ(c, '#e2b23a', 12, 12, 7); poly(c, '#7a5a1a', [8, 15, 16, 15, 15, 17, 9, 17]); poly(c, '#7a5a1a', [12, 6, 12, 14, 16, 14]); },
    glowcap: c => { circ(c, 'rgba(140,255,160,.35)', 12, 10, 11); R(c, '#d8f0d0', 10, 10, 4, 11); ell(c, '#7dffa0', 12, 9, 9, 5); ell(c, '#c8ffd8', 9, 7, 3, 1.5); },
    whistle: c => { c.save(); c.translate(12, 12); c.rotate(-0.6); R(c, '#cfd6d8', -10, -2, 20, 5); R(c, '#ffffff', -10, -2, 20, 1); R(c, '#555', -4, -1, 2, 2); R(c, '#555', 0, -1, 2, 2); R(c, '#555', 4, -1, 2, 2); c.restore(); },
    oilcan: c => { R(c, '#c99a22', 5, 10, 12, 11); R(c, '#e2b23a', 5, 10, 3, 11); poly(c, '#c99a22', [17, 13, 23, 4, 23, 6, 18, 16]); R(c, '#8a6a2a', 9, 6, 4, 4); },
    lantern: c => { R(c, '#8a6a2a', 9, 1, 6, 3); R(c, '#c99a22', 6, 4, 12, 3); R(c, '#c99a22', 6, 19, 12, 3); R(c, '#c99a22', 6, 7, 2, 12); R(c, '#c99a22', 16, 7, 2, 12); circ(c, 'rgba(255,160,40,.5)', 12, 13, 6); poly(c, '#ff9a1f', [9, 18, 15, 18, 12, 9]); poly(c, '#ffe066', [10.5, 18, 13.5, 18, 12, 13]); },
    fish: c => { ell(c, '#b8c8d0', 11, 12, 8, 4); poly(c, '#98a8b0', [18, 12, 23, 7, 23, 17]); circ(c, '#111', 6, 11, 1); R(c, '#e8f0f4', 6, 13, 9, 1); },
    compass: c => { R(c, '#e8d8b0', 2, 4, 20, 16); R(c, '#c8b080', 2, 4, 3, 16); R(c, '#c8b080', 19, 4, 3, 16); ell(c, '#8aa060', 10, 11, 4, 3); ell(c, '#8a7aa0', 15, 8, 2, 1.5); circ(c, '#c99a22', 16, 15, 3.5); poly(c, '#8c1d26', [16, 12, 17, 15, 15, 15]); },
    feather: c => { c.save(); c.translate(12, 12); c.rotate(-0.8); circ(c, 'rgba(255,220,100,.4)', 0, 0, 10); ell(c, '#ffd84a', 0, 0, 10, 3.5); R(c, '#fff6c0', -11, -0.5, 22, 1); c.restore(); },
    mirror: c => { ell(c, '#e79aa0', 12, 13, 10, 9); ell(c, '#dfeff6', 12, 13, 7, 6); R(c, '#ffffff', 8, 9, 3, 2); for (let i = 0; i < 5; i++) R(c, '#b9666e', 4 + i * 4, 21, 2, 2); },
    emptylantern: c => { R(c, '#8a6a2a', 9, 1, 6, 3); R(c, '#c99a22', 6, 4, 12, 3); R(c, '#c99a22', 6, 19, 12, 3); R(c, '#c99a22', 6, 7, 2, 12); R(c, '#c99a22', 16, 7, 2, 12); R(c, 'rgba(180,200,210,.35)', 8, 7, 8, 12); },
    bun: c => { ell(c, '#c8863a', 12, 14, 9, 6); ell(c, '#e8a85a', 11, 12, 7, 4); R(c, '#fff3c0', 8, 10, 3, 1); R(c, '#fff3c0', 13, 9, 3, 1); },
    thread: c => { c.strokeStyle = '#e8f0ff'; c.lineWidth = 1; c.beginPath(); c.moveTo(3, 20); c.bezierCurveTo(8, 2, 14, 22, 21, 4); c.stroke(); circ(c, 'rgba(220,230,255,.4)', 12, 12, 8); },
    songsheet: c => { R(c, '#f4ead2', 4, 3, 16, 19); for (let i = 0; i < 4; i++) R(c, '#8a7a5a', 6, 7 + i * 4, 12, 0.7); circ(c, '#2a1a10', 9, 9, 1.4); circ(c, '#2a1a10', 14, 13, 1.4); circ(c, '#2a1a10', 11, 17, 1.4); R(c, '#2a1a10', 10, 5, 0.8, 4); R(c, '#2a1a10', 15, 9, 0.8, 4); },
    keys: c => { c.strokeStyle = '#8a8a8a'; c.lineWidth = 2; c.beginPath(); c.arc(9, 9, 6, 0, 7); c.stroke(); R(c, '#c99a22', 12, 12, 2, 10); R(c, '#c99a22', 14, 18, 3, 2); R(c, '#1a1a22', 16, 10, 2, 11); R(c, '#cfd6d8', 15, 8, 4, 3); R(c, '#1a1a22', 18, 18, 3, 2); },
    coin: c => { circ(c, '#a8822a', 12, 12, 8); circ(c, '#e2b23a', 12, 12, 6.5); circ(c, '#7a5a1a', 12, 11, 3); R(c, '#e2b23a', 10, 10, 1.5, 1.5); R(c, '#e2b23a', 13, 10, 1.5, 1.5); R(c, '#7a5a1a', 10, 14, 5, 1.5); },
    tabard: c => { poly(c, '#2f8a7a', [6, 3, 18, 3, 20, 22, 4, 22]); R(c, '#e2b23a', 6, 3, 12, 2); circ(c, '#e2b23a', 12, 12, 3); poly(c, '#2f8a7a', [10, 11, 14, 11, 12, 14]); },
    prism: c => { poly(c, 'rgba(220,240,255,.85)', [12, 2, 22, 20, 2, 20]); poly(c, 'rgba(255,255,255,.9)', [12, 5, 14, 18, 8, 18]); R(c, '#8a8a9a', 12, 4, 1, 16); ['#ff5a5a', '#ffd84a', '#5ae07a', '#5aa8ff'].forEach((col, k) => R(c, col, 17 + k, 10 + k * 2, 6, 1)); },
    rattler: c => { R(c, '#8c1d26', 4, 9, 16, 11); circ(c, '#e2b23a', 7, 8, 3); circ(c, '#e2b23a', 17, 8, 3); R(c, '#c99a22', 11, 3, 2, 6); R(c, '#f4ead2', 6, 13, 12, 4); R(c, '#8c1d26', 7, 14, 10, 1); },
    stinkhorn: c => { R(c, '#d8d0b0', 10, 9, 4, 13); ell(c, '#6a5a2a', 12, 8, 5, 6); c.fillStyle = '#9ac850'; [[4, 6], [19, 4], [5, 14], [19, 13]].forEach(([x, y]) => { c.fillRect(x, y, 1, 3); c.fillRect(x + 1, y - 1, 1, 2); }); },
    pickle: c => { c.save(); c.translate(12, 12); c.rotate(-0.6); ell(c, '#c83a1a', 0, 0, 9, 4); ell(c, '#e85a2a', -2, -1, 5, 2); for (let k = -6; k <= 6; k += 4) R(c, '#8a1a0a', k, 1, 1, 1); c.restore(); poly(c, '#ffb040', [18, 4, 21, 1, 20, 6]); },
    kelp: c => { c.strokeStyle = '#2f6a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(5, 22); c.bezierCurveTo(14, 16, 4, 10, 16, 2); c.stroke(); c.strokeStyle = '#4a8a4a'; c.lineWidth = 1; c.beginPath(); c.moveTo(6, 21); c.bezierCurveTo(14, 15, 5, 10, 16, 3); c.stroke(); R(c, '#bfe6f0', 18, 14, 2, 2); },
    letter: c => { R(c, '#f4ead2', 3, 5, 18, 14); poly(c, '#d8ccb0', [3, 5, 12, 13, 21, 5]); circ(c, '#8c1d26', 12, 13, 3); }
  };

  root.Art = { rooms, player, items, figure, portrait, chart, MAP_SPOTS, cine, vignette, flame, creature };
})(this);

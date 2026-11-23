// Crown of Tides — all scenes and sprites, painted with canvas primitives on a 320x200 VGA-style screen.
(function (root) {
  'use strict';

  // ---------- primitives ----------
  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); };
  const bands = (c, x, y, w, h, cols) => { const bh = h / cols.length; cols.forEach((col, i) => R(c, col, x, y + Math.floor(i * bh), w, Math.ceil(bh) + 1)); };
  const poly = (c, col, pts) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); };
  const circ = (c, col, x, y, r) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const ell = (c, col, x, y, rx, ry) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  const patCache = {};
  // Two-colour checkerboard: the classic 256-colour dither look.
  const dith = (c, x, y, w, h, a, b) => {
    const k = a + b;
    if (!patCache[k]) {
      const p = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
      p.width = p.height = 2; const pc = p.getContext('2d');
      R(pc, a, 0, 0, 2, 2); R(pc, b, 1, 0, 1, 1); R(pc, b, 0, 1, 1, 1);
      patCache[k] = c.createPattern(p, 'repeat');
    }
    c.fillStyle = patCache[k]; c.fillRect(x, y, w, h);
  };
  // Deterministic pseudo-random so scenery doesn't jitter between frames.
  const rnd = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // ---------- people ----------
  // Feet at (x,y). o: {skin, hair, top, legs, dress, h, cape, hat, robe, armor, veil, beard}
  function figure(c, x, y, o, frame = 0, dir = 1) {
    const h = o.h || 30, s = h / 30;
    const X = v => x + v * s * dir, Y = v => y - v * s;
    const r = (col, x0, y0, w, hh) => { const a = X(x0), b = X(x0 + w); R(c, col, Math.min(a, b), Y(y0 + hh), Math.abs(b - a), hh * s); };
    ell(c, 'rgba(0,0,0,.28)', x, y, 6 * s, 1.6 * s);
    if (o.cape) poly(c, o.cape, [X(-4), Y(22), X(4), Y(22), X(5 - 2 * dir * 0), Y(3), X(-6), Y(3)]);
    if (o.dress || o.robe) {
      const col = o.dress || o.robe;
      poly(c, col, [X(-3.5), Y(21), X(3.5), Y(21), X(o.robe ? 5 : 7), Y(0), X(o.robe ? -5 : -7), Y(0)]);
      if (o.trim) r(o.trim, -7, 0, 14, 1.2);
    } else {
      const l = frame % 2 ? 1.5 : 0;
      r(o.legs, -3 + l, 0, 2.5, 10); r(o.legs, 0.5 - l, 0, 2.5, 10);
      r(o.boots || '#3a2412', -3 + l, 0, 2.6, 3); r(o.boots || '#3a2412', 0.5 - l, 0, 2.6, 3);
    }
    r(o.top, -3.5, 10, 7, 11);
    if (o.armor) { r(o.armor, -3.5, 13, 7, 7); r('#ffffff55', -2.5, 18, 2, 2); }
    if (o.belt) r(o.belt, -3.5, 11, 7, 1.3);
    const sw = frame % 2 ? 1 : 0;
    r(o.sleeve || o.top, -5, 12 + sw, 1.6, 8); r(o.sleeve || o.top, 3.4, 12 - sw + 1, 1.6, 8);
    r(o.skin, -5, 11 + sw, 1.6, 1.6); r(o.skin, 3.4, 12 - sw, 1.6, 1.6);
    r(o.skin, -1, 21, 2, 1.5); // neck
    r(o.skin, -2.5, 22, 5, 6);
    r(o.hair, -2.8, 26.5, 5.6, 2.3);
    if (o.longHair) r(o.hair, -3, 21.5, 1.6, 6.5), r(o.hair, 1.4, 20.5, 1.6, 7);
    else r(o.hair, -2.8, 24, 1.2, 3);
    if (o.beard) r(o.beard, -2.4, 21.5, 4.8, 3);
    r('#111', 0.8, 25, 0.9, 0.9); // eye, on facing side
    if (o.hat) o.hat(r);
    if (o.veil) { c.fillStyle = 'rgba(240,248,255,.72)'; c.fillRect(Math.min(X(-3.5), X(3.5)), Y(29), 7 * s, 14 * s); }
  }

  const HERO = { skin: '#e8b48a', hair: '#6b3f1d', top: '#2f6b3a', sleeve: '#efe6d0', legs: '#4a3a2a', belt: '#e2b23a', cape: '#8c1d26' };
  const player = (c, x, y, frame, dir) => figure(c, x, y, HERO, frame, dir);

  // ---------- shared scenery ----------
  function sky(c, cols, h) { bands(c, 0, 0, 320, h, cols); }
  function sun(c, x, y, r, col) { circ(c, col + '33', x, y, r + 6); circ(c, col + '66', x, y, r + 3); circ(c, col, x, y, r); }
  function clouds(c, t, y, col, seed) {
    const g = rnd(seed);
    for (let i = 0; i < 5; i++) {
      const cx = ((g() * 360 + t * 3 * (0.5 + g())) % 380) - 30, cy = y + g() * 20, w = 20 + g() * 30;
      ell(c, col, cx, cy, w, 4); ell(c, col, cx + w * 0.3, cy - 3, w * 0.5, 4);
    }
  }
  function sea(c, t, y, h, cols) {
    bands(c, 0, y, 320, h, cols);
    c.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 26; i++) {
      const yy = y + 3 + ((i * 7) % h), xx = ((i * 53 + t * (8 + (i % 3) * 4)) % 340) - 20;
      c.fillRect(xx | 0, yy, 6 + (i % 4) * 2, 1);
    }
  }
  function island(c, x, y, w, col) { poly(c, col, [x, y, x + w * 0.2, y - 6, x + w * 0.45, y - 9, x + w * 0.7, y - 5, x + w, y]); }
  function palm(c, x, y, h, t) {
    for (let i = 0; i < h; i += 3) R(c, i % 6 ? '#7a5a32' : '#5e4424', x + Math.sin(i / h * 1.5) * 6, y - i, 3, 3);
    const tx = x + Math.sin(1.5) * 6, ty = y - h, sway = Math.sin(t * 1.2) * 1.5;
    [[-18, 4], [-12, -6], [0, -9], [12, -5], [18, 5], [8, 8], [-8, 8]].forEach(([dx, dy]) => {
      c.strokeStyle = '#2f7a30'; c.lineWidth = 3; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + dx * 0.5, ty + dy - 6, tx + dx + sway, ty + dy + 2); c.stroke();
    });
  }
  function grassTufts(c, y0, y1, col, seed, n = 30) { const g = rnd(seed); for (let i = 0; i < n; i++) { const x = g() * 320, y = y0 + g() * (y1 - y0); R(c, col, x, y, 1, 3); R(c, col, x + 2, y + 1, 1, 2); R(c, col, x - 2, y + 1, 1, 2); } }
  function stoneWall(c, x, y, w, h, base, line, seed) {
    R(c, base, x, y, w, h); const g = rnd(seed);
    c.fillStyle = line;
    for (let yy = y; yy < y + h; yy += 10) {
      c.fillRect(x, yy, w, 1);
      const off = ((yy - y) / 10) % 2 ? 9 : 0;
      for (let xx = x + off; xx < x + w; xx += 18) c.fillRect(xx, yy, 1, 10);
    }
    for (let i = 0; i < w * h / 400; i++) R(c, 'rgba(0,0,0,.12)', x + g() * w, y + g() * h, 3, 2);
  }
  function torch(c, x, y, t) {
    R(c, '#4a3220', x - 1, y, 3, 10);
    const f = Math.sin(t * 13 + x) * 1.2;
    circ(c, 'rgba(255,160,40,.18)', x, y - 2, 14 + f);
    poly(c, '#ff9a1f', [x - 3, y, x + 4, y, x + 1 + f, y - 9]);
    poly(c, '#ffe066', [x - 1, y, x + 2, y, x + 0.5, y - 5]);
  }
  function sparkle(c, x, y, t) { if (Math.sin(t * 4 + x) > 0.2) { R(c, '#fff8c0', x - 2, y, 5, 1); R(c, '#fff8c0', x, y - 2, 1, 5); } }

  // ---------- rooms ----------
  const rooms = {};

  rooms.beach = {
    bg(c, s, t) {
      sky(c, ['#3b5fa8', '#4c74b8', '#6189c4', '#7ea1cf', '#a3b9d8', '#d2c7c4', '#f0d2a8'], 72);
      sun(c, 250, 30, 9, '#fff1b8'); clouds(c, t, 18, 'rgba(255,255,255,.75)', 7);
      island(c, 30, 72, 60, '#6b7aa8'); island(c, 200, 72, 40, '#7f6aa0');
      sea(c, t, 72, 44, ['#2a5f9a', '#2f6aa6', '#3576b0', '#3c83ba', '#4a93c2']);
      const foam = Math.sin(t * 1.5) * 2;
      dith(c, 0, 114, 320, 86, '#e4c78f', '#d8b77c');
      R(c, '#c9a56a', 0, 114, 320, 3);
      c.fillStyle = 'rgba(255,255,255,.8)'; for (let x = 0; x < 320; x += 8) c.fillRect(x, 113 + foam + Math.sin(x / 9 + t) * 1.5, 6, 2);
      // rocks toward the cliffs
      poly(c, '#6e6a62', [0, 150, 0, 112, 18, 110, 26, 130, 14, 152]); poly(c, '#8a857b', [0, 120, 10, 114, 16, 124, 4, 132]);
      // wreck
      poly(c, '#4b3220', [20, 146, 30, 112, 70, 104, 116, 118, 108, 148]);
      for (let i = 0; i < 6; i++) R(c, '#5f402a', 30 + i * 3, 113 + i * 6, 76 - i * 2, 2);
      poly(c, '#2c1d12', [56, 120, 74, 116, 80, 140, 60, 144]); // hole in hull
      R(c, '#6a4a2e', 84, 52, 4, 60); // mast
      poly(c, '#e8e0cc', [88, 58, 112, 70, 90, 88]); poly(c, '#cfc6ae', [88, 58, 100, 64, 90, 72]);
      R(c, '#6a4a2e', 40, 146, 28, 3); R(c, '#5a3d24', 100, 150, 22, 3); R(c, '#6a4a2e', 128, 140, 14, 2);
      if (!s.flags.ring_taken) sparkle(c, 70, 136, t);
      // dunes and path east
      poly(c, '#d9b97a', [250, 116, 290, 104, 320, 106, 320, 140, 270, 132]);
      grassTufts(c, 104, 126, '#6f8f3a', 3, 18);
      palm(c, 296, 150, 70, t);
      if (!s.flags.bottle_taken) { R(c, '#2e7a4a', 193, 162, 12, 5); R(c, '#2e7a4a', 205, 163, 3, 3); R(c, '#bfe6c8', 195, 163, 4, 1); R(c, '#f2ecd8', 198, 164, 4, 2); }
      if (!s.flags.conch_taken) { ell(c, '#e79aa0', 261, 180, 8, 4); ell(c, '#f6c6c4', 259, 179, 4, 2); R(c, '#b9666e', 266, 178, 2, 4); }
    }
  };

  rooms.cliffs = {
    bg(c, s, t) {
      sky(c, ['#3d5ea8', '#5076bb', '#6c8ec8', '#93acd4', '#c4c8d4', '#e8cfa8'], 64);
      sun(c, 60, 34, 8, '#fff1b8'); clouds(c, t, 12, 'rgba(255,255,255,.7)', 21);
      island(c, 100, 64, 50, '#8a74aa'); c.fillStyle = 'rgba(200,170,230,.35)'; c.fillRect(92, 50, 66, 16);
      sea(c, t, 64, 136, ['#26568e', '#2a5f99', '#2f6aa4', '#3576ae', '#3a80b6', '#3a80b6', '#3576ae']);
      // surf on rocks far below
      for (let i = 0; i < 5; i++) { poly(c, '#4f4b46', [i * 14, 200, i * 14 + 6, 182 - i, i * 14 + 14, 200]); }
      // cliff top ground
      poly(c, '#4f6b2e', [62, 200, 66, 150, 60, 140, 72, 136, 320, 132, 320, 200]);
      dith(c, 72, 140, 248, 60, '#5f7f36', '#577530');
      poly(c, '#6f6a60', [56, 200, 62, 146, 72, 146, 66, 200]); // edge face
      grassTufts(c, 140, 196, '#87a64a', 11, 40);
      // cliff face
      poly(c, '#7b756a', [176, 140, 186, 60, 210, 28, 260, 18, 320, 10, 320, 140]);
      dith(c, 190, 30, 130, 108, '#837c70', '#776f63');
      c.fillStyle = '#5c564c'; [[200, 40, 1, 30], [290, 30, 1, 50], [270, 90, 1, 40], [306, 60, 1, 26]].forEach(a => c.fillRect(...a));
      // carved door
      const open = s.flags.door_open;
      poly(c, '#5f594f', [196, 144, 196, 86, 225, 60, 254, 86, 254, 144]);
      poly(c, open ? '#07070a' : '#8e877a', [202, 144, 202, 90, 225, 68, 248, 90, 248, 144]);
      if (!open) { R(c, '#6e685d', 224, 74, 2, 70); circ(c, '#2a2722', 225, 106, 3); }
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.05 + i * 0.1125), nx = 225 - Math.cos(a) * 32, ny = 112 - Math.sin(a) * 46;
        const lit = open || false;
        circ(c, lit ? '#9ff0ff' : '#4a463e', nx, ny, 2); R(c, lit ? '#9ff0ff' : '#4a463e', nx + 1, ny - 6, 1, 6);
      }
      if (open) { c.fillStyle = 'rgba(150,240,255,.12)'; c.fillRect(190, 56, 70, 90); }
      // gulls
      c.strokeStyle = '#ffffff'; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const gx = (t * 12 + i * 70) % 200, gy = 110 + Math.sin(t + i) * 8 + i * 12; c.beginPath(); c.moveTo(gx - 3, gy); c.lineTo(gx, gy + 2); c.lineTo(gx + 3, gy); c.stroke(); }
    }
  };

  rooms.square = {
    bg(c, s, t) {
      sky(c, ['#4466ad', '#5a7cbd', '#7b98cc', '#a4b6d6', '#d7cdbf'], 90);
      clouds(c, t, 10, 'rgba(255,255,255,.75)', 33);
      // castle
      const wall = '#e9e3d6', shade = '#c9c1b0', roof = '#2f8a7a';
      R(c, wall, 196, 40, 124, 60);
      for (let x = 196; x < 320; x += 10) R(c, wall, x, 34, 6, 6);
      [[206, 8, 22], [262, 0, 26], [300, 14, 20]].forEach(([x, y, w]) => {
        R(c, wall, x, y, w, 100 - y); R(c, shade, x + w - 5, y, 5, 100 - y);
        poly(c, roof, [x - 3, y, x + w / 2, y - 22, x + w + 3, y]);
        R(c, '#3a3a4a', x + w / 2 - 2, y + 14, 4, 7);
        const wv = Math.sin(t * 3 + x) * 2;
        R(c, '#6b5a40', x + w / 2, y - 34, 1, 12); poly(c, '#3fae8f', [x + w / 2 + 1, y - 34, x + w / 2 + 12 + wv, y - 31, x + w / 2 + 1, y - 28]);
      });
      // gate
      R(c, shade, 250, 60, 70, 90); poly(c, '#2a2520', [262, 150, 262, 92, 285, 76, 308, 92, 308, 150]);
      c.fillStyle = '#6b6258'; for (let x = 266; x < 308; x += 7) c.fillRect(x, 84, 2, 66); for (let y = 96; y < 150; y += 9) c.fillRect(262, y, 46, 2);
      // town wall behind the houses
      R(c, '#b9ad97', 0, 92, 250, 48); c.fillStyle = '#a3967f'; for (let x = 0; x < 250; x += 12) c.fillRect(x, 92, 1, 48); R(c, '#cfc4ad', 0, 88, 250, 4);
      // houses
      const house = (x, w, h, col, rf) => { R(c, col, x, 140 - h, w, h); poly(c, rf, [x - 4, 140 - h, x + w / 2, 140 - h - 20, x + w + 4, 140 - h]); c.fillStyle = '#5a3a22'; c.fillRect(x, 140 - h, w, 2); c.fillRect(x, 140 - h, 2, h); c.fillRect(x + w - 2, 140 - h, 2, h); };
      house(10, 52, 70, '#e8d9b8', '#a3462e'); house(64, 56, 60, '#dccaa4', '#8a3a28'); house(124, 64, 52, '#eadfc4', '#9c4a2a');
      // shop door + sign
      R(c, '#4a2c18', 22, 92, 26, 48); R(c, '#6b4428', 24, 94, 22, 46); circ(c, '#e2b23a', 42, 118, 1.5);
      R(c, '#7a5230', 14, 72, 42, 12); R(c, '#e2b23a', 16, 74, 38, 8); c.fillStyle = '#4a2c18'; c.font = '7px monospace'; c.fillText('CURIOS', 20, 81);
      [[72, 96], [132, 96], [160, 96]].forEach(([x, y]) => { R(c, '#3f5a7a', x, y, 12, 12); R(c, '#bcd2e6', x + 1, y + 1, 4, 4); });
      // notice board
      R(c, '#5a3a22', 66, 100, 2, 40); R(c, '#5a3a22', 90, 100, 2, 40); R(c, '#8a6040', 64, 98, 30, 22); R(c, '#f4ead2', 68, 101, 22, 15); c.fillStyle = '#7a1d1d'; c.fillRect(70, 104, 18, 2); c.fillStyle = '#555'; for (let i = 0; i < 4; i++) c.fillRect(70, 108 + i * 2, 16 - i * 3, 1);
      // bunting
      for (let k = 0; k < 2; k++) {
        const x0 = 10 + k * 120, x1 = x0 + 120;
        for (let i = 0; i < 12; i++) { const x = x0 + i * 10, y = 56 + Math.sin(i / 11 * Math.PI) * 10; poly(c, ['#3fae8f', '#e8e3d6', '#e2b23a'][i % 3], [x, y, x + 6, y, x + 3, y + 6]); }
      }
      // cobbles
      dith(c, 0, 140, 320, 60, '#a49d90', '#958e81');
      c.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 146; y < 200; y += 8) for (let x = (y / 8 % 2) * 6; x < 320; x += 12) c.fillRect(x, y, 10, 1);
      // fountain
      ell(c, '#8a8478', 160, 146, 36, 8); ell(c, '#b8b1a3', 160, 140, 36, 8); ell(c, '#3c86b8', 160, 140, 31, 6);
      for (let i = 0; i < 6; i++) sparkle(c, 140 + i * 8, 139 + (i % 2) * 2, t + i);
      R(c, '#b8b1a3', 156, 118, 8, 22); poly(c, '#9fb8c8', [152, 120, 168, 112, 172, 104, 160, 110, 150, 108]);
      c.fillStyle = 'rgba(180,220,255,.8)'; for (let i = 0; i < 6; i++) { const p = (t * 2 + i / 6) % 1; c.fillRect(172 - p * 14 + Math.sin(i) * 3, 104 + p * p * 34, 1, 2); }
    },
    actors: s => [
      { y: 160, d: c => figure(c, 268, 160, { skin: '#dba882', hair: '#2a1d12', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', hat: r => { r('#9aa7a8', -3, 27, 6, 3); } }, 0, 1) },
      { y: 160, d: c => figure(c, 304, 160, { skin: '#b9845e', hair: '#1a120c', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', hat: r => { r('#9aa7a8', -3, 27, 6, 3); } }, 0, -1) },
      { y: 159, d: c => { R(c, '#6b5a40', 280, 92, 1, 68); R(c, '#cfd6d8', 279, 88, 3, 5); R(c, '#6b5a40', 316, 92, 1, 68); R(c, '#cfd6d8', 315, 88, 3, 5); } }
    ]
  };

  rooms.shop = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 160, ['#4a3020', '#55372a', '#5e3f2e', '#684634', '#704c38']);
      c.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < 320; x += 16) c.fillRect(x, 0, 1, 160);
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
      bands(c, 0, 160, 320, 40, ['#5a3a22', '#62412a', '#6b4830', '#734e34']);
      c.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 166; y < 200; y += 7) c.fillRect(0, y, 320, 1);
      // ship's wheel
      c.strokeStyle = '#7a5230'; c.lineWidth = 2; c.beginPath(); c.arc(110, 132, 14, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(110, 132); c.lineTo(110 + Math.cos(a) * 18, 132 + Math.sin(a) * 18); c.stroke(); }
    },
    actors: () => [
      { y: 140, d: c => {
        figure(c, 214, 128, { h: 32, skin: '#e3b08c', hair: '#d8d8d8', beard: '#e4e4e4', top: '#3d5a8a', legs: '#333', hat: r => { r('#8c1d26', -3, 28, 6, 2.5); } }, 0, -1);
        R(c, '#5a3a22', 140, 120, 166, 38); R(c, '#7a5230', 136, 116, 174, 6); R(c, '#4a2c18', 140, 130, 166, 1);
        R(c, '#e2b23a', 260, 108, 10, 8); R(c, '#c99a22', 262, 104, 6, 4); // bell/box
        ell(c, '#e79aa0', 176, 114, 7, 3);
      } }
    ]
  };

  rooms.docks = {
    bg(c, s, t) {
      sky(c, ['#4a5ea6', '#6a6fb0', '#9a7fb0', '#d08f8f', '#f0b080', '#f6d29a'], 64);
      sun(c, 240, 50, 10, '#ffe0a0'); clouds(c, t, 16, 'rgba(255,220,200,.6)', 51);
      island(c, 180, 64, 70, '#8a6aa8'); c.fillStyle = 'rgba(210,180,240,.4)'; c.fillRect(170, 46, 90, 20);
      sea(c, t, 64, 136, ['#3a5f9e', '#3f68a6', '#4572ad', '#4b7cb4', '#5186bb', '#5186bb']);
      c.fillStyle = 'rgba(255,220,150,.35)'; for (let i = 0; i < 8; i++) c.fillRect(226 + Math.sin(t * 2 + i) * 6, 70 + i * 6, 28 - i * 2, 1);
      // pier
      for (let x = 0; x < 200; x += 24) { R(c, '#3e2a18', x + 4, 140, 5, 60); }
      R(c, '#7a5a3a', 0, 146, 200, 48); c.fillStyle = '#5e4428'; for (let x = 0; x < 200; x += 10) c.fillRect(x, 146, 1, 48);
      R(c, '#5e4428', 0, 192, 200, 4); R(c, '#4a3420', 196, 140, 6, 60);
      // crates, rope
      R(c, '#9a7448', 20, 120, 22, 26); R(c, '#7a5a3a', 20, 132, 22, 2); R(c, '#9a7448', 44, 130, 16, 16);
      c.strokeStyle = '#d8c08a'; c.lineWidth = 2; c.beginPath(); c.ellipse(80, 150, 8, 3, 0, 0, 7); c.stroke();
      // boat
      const bob = Math.sin(t * 1.6) * 1.5;
      poly(c, '#6a3a22', [204, 152 + bob, 312, 152 + bob, 300, 172 + bob, 214, 172 + bob]); R(c, '#e8e0cc', 206, 152 + bob, 104, 3);
      R(c, '#5a3a22', 254, 74 + bob, 3, 80); poly(c, '#efe4c8', [257, 78 + bob, 298, 140 + bob, 257, 140 + bob]); R(c, '#c8a878', 268, 110 + bob, 10, 10);
    },
    actors: () => [{ y: 166, d: c => figure(c, 181, 166, { skin: '#c9906a', hair: '#a8a8a8', longHair: true, top: '#c8a43a', legs: '#3a3a44', hat: r => { r('#c8a43a', -4, 28, 8, 1.5); r('#c8a43a', -2.5, 29, 5, 2); } }, 0, -1) }]
  };

  rooms.mistshore = {
    bg(c, s, t) {
      sky(c, ['#3a2e58', '#4a3a68', '#5c4a7a', '#70608a', '#8a7a9a'], 140);
      for (let i = 0; i < 9; i++) { const x = i * 40 - 10, h = 50 + (i * 37 % 40); poly(c, i % 2 ? '#2a2240' : '#30284a', [x, 140, x + 18, 140 - h, x + 36, 140]); R(c, '#20182e', x + 16, 130, 4, 12); }
      // grotto
      poly(c, '#4a4458', [118, 140, 124, 80, 160, 56, 196, 80, 202, 140]);
      poly(c, '#0c0a14', [132, 140, 136, 90, 160, 72, 184, 90, 188, 140]);
      [[140, 84], [180, 84], [160, 64]].forEach(([x, y]) => { ell(c, '#c8c0e0', x, y, 4, 2); circ(c, '#3a2e58', x, y, 1); });
      // ground
      dith(c, 0, 140, 320, 60, '#3a4a3a', '#334233');
      grassTufts(c, 142, 196, '#5a7a5a', 9, 30);
      // glowcaps
      const pulse = 0.5 + Math.sin(t * 2) * 0.15;
      circ(c, `rgba(140,255,160,${0.18 * pulse})`, 60, 174, 24);
      const caps = s.inv.includes('glowcap') ? [[46, 178], [60, 172], [74, 180]] : [[46, 178], [56, 170], [64, 176], [74, 180]];
      caps.forEach(([x, y]) => { R(c, '#d8f0d0', x - 1, y - 4, 3, 6); ell(c, '#7dffa0', x, y - 5, 5, 3); ell(c, '#c8ffd8', x - 1, y - 6, 2, 1); });
      // boat
      const bob = Math.sin(t * 1.6) * 1;
      dith(c, 220, 182, 100, 18, '#46507a', '#3e4870');
      poly(c, '#6a3a22', [234, 178 + bob, 320, 178 + bob, 320, 196 + bob, 244, 196 + bob]); R(c, '#e8e0cc', 236, 178 + bob, 84, 2);
    },
    post(c, s, t) {
      // drifting mist
      for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(220,210,240,.10)'; const x = ((t * (6 + i * 3) + i * 90) % 480) - 160; ell(c, 'rgba(220,210,240,.12)', x, 120 + i * 18, 120, 10); }
      const wy = 106 + Math.sin(t * 2.2) * 6, wx = 248 + Math.sin(t * 1.3) * 8;
      circ(c, 'rgba(120,180,255,.18)', wx, wy, 14); circ(c, 'rgba(160,210,255,.5)', wx, wy, 6); circ(c, '#e8f4ff', wx, wy, 3);
    }
  };

  rooms.oracle = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 152, ['#141024', '#1c1630', '#241c3c', '#2c2448', '#342a52']);
      for (let i = 0; i < 14; i++) { const x = i * 24 + (i % 3) * 4, h = 10 + (i * 17 % 26); poly(c, '#0e0b1a', [x, 0, x + 6, h, x + 12, 0]); }
      poly(c, '#1a1530', [0, 152, 0, 60, 30, 90, 40, 152]); poly(c, '#1a1530', [320, 152, 320, 50, 286, 96, 276, 152]);
      bands(c, 0, 152, 320, 48, ['#2a2244', '#30284c', '#362e54']);
      // pool
      const g = 0.6 + Math.sin(t * 1.5) * 0.2;
      circ(c, `rgba(80,220,255,${0.12 * g})`, 160, 145, 70);
      ell(c, '#1d6f8a', 160, 145, 60, 9); ell(c, '#38b8d8', 160, 145, 54, 7);
      for (let i = 0; i < 5; i++) { const p = (t * 0.5 + i / 5) % 1; c.strokeStyle = `rgba(200,250,255,${1 - p})`; c.beginPath(); c.ellipse(160, 145, p * 50, p * 6, 0, 0, 7); c.stroke(); }
      // candles
      [[96, 150], [224, 150], [84, 156], [236, 156]].forEach(([x, y]) => { R(c, '#e8e0cc', x, y - 8, 3, 8); poly(c, '#ffb040', [x - 1, y - 8, x + 4, y - 8, x + 1.5, y - 13 + Math.sin(t * 9 + x)]); circ(c, 'rgba(255,180,80,.15)', x + 1, y - 10, 8); });
    },
    actors: () => [{ y: 136, d: c => figure(c, 160, 136, { skin: '#c8a090', hair: '#e8e8f0', longHair: true, top: '#5a3a7a', robe: '#4a2e6a', trim: '#e2b23a', legs: '#4a2e6a', h: 28 }, 0, 1) }]
  };

  rooms.tunnel = {
    bg(c, s, t) {
      stoneWall(c, 0, 0, 320, 150, '#3e3a36', '#2a2724', 77);
      bands(c, 0, 150, 320, 50, ['#2e2a26', '#34302b', '#3a3530']);
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
      g.addColorStop(0, 'rgba(60,255,120,0.05)'); g.addColorStop(0.5, 'rgba(0,10,4,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.94)');
      c.fillStyle = g; c.fillRect(0, 0, 320, 200);
    }
  };

  rooms.cellar = {
    bg(c, s, t) {
      stoneWall(c, 0, 0, 320, 154, '#6a6258', '#4e4840', 91);
      // arches
      [[60, 30], [200, 30]].forEach(([x, y]) => { c.strokeStyle = '#4e4840'; c.lineWidth = 6; c.beginPath(); c.arc(x + 40, y + 40, 40, Math.PI, 0); c.stroke(); });
      bands(c, 0, 154, 320, 46, ['#4a443c', '#524b42', '#5a5248']);
      // barrels
      [[26, 114], [54, 114], [40, 92]].forEach(([x, y]) => { ell(c, '#6b4428', x + 12, y + 18, 13, 18); R(c, '#2e2a26', x, y + 8, 25, 2); R(c, '#2e2a26', x, y + 26, 25, 2); ell(c, '#8a5e38', x + 12, y + 18, 6, 9); });
      // loose stone
      R(c, s.flags.letter_found ? '#1a1612' : '#7a7266', 138, 90, 18, 12);
      if (!s.flags.letter_found) { R(c, '#a09888', 138, 90, 18, 1); R(c, '#3a342c', 155, 90, 1, 12); }
      // stairs up
      for (let i = 0; i < 9; i++) R(c, i % 2 ? '#7a7266' : '#857c70', 280 + i * 3, 150 - i * 13, 40, 13);
      torch(c, 120, 60, t); torch(c, 250, 60, t);
      // stool + mug
      R(c, '#5a3a22', 226, 146, 22, 4); R(c, '#4a2c18', 228, 150, 3, 12); R(c, '#4a2c18', 244, 150, 3, 12); R(c, '#8a8a8a', 254, 156, 5, 6);
    },
    actors: (s, t) => [{ y: 160, d: c => {
      figure(c, 237, 160, { skin: '#dba882', hair: '#4a2c18', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', h: 26 }, 0, 1);
      c.fillStyle = '#e8e8f0'; c.font = '8px monospace'; const z = (t * 0.8) % 1; c.globalAlpha = 1 - z; c.fillText('z', 246 + z * 6, 124 - z * 14); c.fillText('Z', 252 + z * 8, 116 - z * 14); c.globalAlpha = 1;
    } }]
  };

  rooms.hall = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 160, ['#3a3050', '#463a5c', '#524468', '#5c4e72']);
      // stained glass with sunset light
      poly(c, '#2a2238', [130, 10, 160, 0, 190, 10, 190, 60, 130, 60]);
      const cols = ['#e2b23a', '#c8402e', '#3fae8f', '#7a9ac8'];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) R(c, cols[(i + j) % 4], 134 + i * 14, 12 + j * 12, 12, 10);
      poly(c, 'rgba(255,200,120,.10)', [130, 60, 190, 60, 250, 160, 70, 160]);
      // columns
      [20, 70, 250, 300].forEach(x => { R(c, '#d8d0c0', x - 7, 20, 14, 140); R(c, '#b8b0a0', x + 3, 20, 4, 140); R(c, '#e8e0d0', x - 10, 16, 20, 6); R(c, '#e8e0d0', x - 10, 154, 20, 6); });
      // banners
      [44, 276].forEach(x => { const w = Math.sin(t * 1.5 + x) * 1; poly(c, '#2f8a7a', [x - 9, 20, x + 9, 20, x + 9 + w, 80, x + w, 72, x - 9 + w, 80]); circ(c, '#e2b23a', x + w * 0.5, 44, 4); });
      // altar, lilies, cake
      R(c, '#e8e0d0', 112, 74, 96, 16); R(c, '#c8c0b0', 112, 86, 96, 4);
      for (let i = 0; i < 8; i++) { R(c, '#3a7a3a', 114 + i * 12, 66, 1, 8); ell(c, '#fafaf0', 114 + i * 12, 65, 3, 2); }
      R(c, '#f6eee0', 196, 54, 14, 20); R(c, '#f6eee0', 199, 46, 8, 8); R(c, '#e79aa0', 196, 62, 14, 1); poly(c, '#3fae8f', [199, 46, 203, 40, 207, 46]);
      // floor
      for (let y = 160; y < 200; y += 8) for (let x = 0; x < 320; x += 16) R(c, ((x / 16 + y / 8) % 2) ? '#d8d0c0' : '#3a3050', x + ((y - 160) / 8) * 2 - 8, y, 16, 8);
      R(c, '#8c1d26', 120, 152, 80, 48); R(c, '#e2b23a', 120, 152, 2, 48); R(c, '#e2b23a', 198, 152, 2, 48);
      // pews with guests
      [[16, 0], [276, 1]].forEach(([x]) => { R(c, '#5a3a22', x, 134, 30, 14); for (let i = 0; i < 3; i++) { circ(c, ['#e3b08c', '#b9845e', '#dba882'][i], x + 6 + i * 9, 128, 3); R(c, ['#7a9ac8', '#c86a3a', '#e8e0cc'][i], x + 3 + i * 9, 131, 6, 4); } });
      torch(c, 100, 50, t); torch(c, 220, 50, t);
    },
    actors: s => [
      { y: 152, d: c => figure(c, 139, 152, { skin: '#d8c0a8', hair: '#111', top: '#1a1a22', legs: '#111', cape: '#3a1020', h: 33, beard: '#111' }, 0, 1) },
      { y: 152, d: c => figure(c, 179, 152, { skin: '#f0c8a8', hair: '#c8862e', longHair: true, top: '#3fae8f', dress: '#3fae8f', trim: '#e2b23a', legs: '#3fae8f', veil: !s.flags.trust, hat: r => { r('#e2b23a', -2.5, 28.5, 5, 1.2); } }, 0, -1) },
      { y: 162, d: c => figure(c, 259, 162, { skin: '#d8a888', hair: '#9a9a9a', top: '#2f6b5a', armor: '#b8c4c6', legs: '#4a4a52', cape: '#2f8a7a' }, 0, -1) }
    ]
  };

  // ---------- inventory icons (drawn into 24x24) ----------
  const items = {
    ring: c => { c.strokeStyle = '#e2b23a'; c.lineWidth = 3; c.beginPath(); c.arc(12, 14, 6, 0, 7); c.stroke(); R(c, '#c99a22', 8, 4, 8, 5); R(c, '#fff3b0', 10, 5, 2, 2); },
    bottle: c => { R(c, '#2e7a4a', 6, 8, 12, 14); R(c, '#2e7a4a', 9, 3, 6, 6); R(c, '#a0703a', 9, 1, 6, 3); R(c, '#f2ecd8', 9, 12, 6, 6); R(c, '#bfe6c8', 7, 9, 2, 10); },
    conch: c => { ell(c, '#e79aa0', 12, 13, 9, 7); ell(c, '#f6c6c4', 10, 12, 5, 3); poly(c, '#b9666e', [18, 9, 23, 12, 18, 17]); },
    token: c => { circ(c, '#c99a22', 12, 12, 9); circ(c, '#e2b23a', 12, 12, 7); poly(c, '#7a5a1a', [8, 15, 16, 15, 15, 17, 9, 17]); poly(c, '#7a5a1a', [12, 6, 12, 14, 16, 14]); },
    glowcap: c => { circ(c, 'rgba(140,255,160,.35)', 12, 10, 11); R(c, '#d8f0d0', 10, 10, 4, 11); ell(c, '#7dffa0', 12, 9, 9, 5); ell(c, '#c8ffd8', 9, 7, 3, 1.5); },
    whistle: c => { c.save(); c.translate(12, 12); c.rotate(-0.6); R(c, '#cfd6d8', -10, -2, 20, 5); R(c, '#ffffff', -10, -2, 20, 1); R(c, '#555', -4, -1, 2, 2); R(c, '#555', 0, -1, 2, 2); R(c, '#555', 4, -1, 2, 2); c.restore(); },
    letter: c => { R(c, '#f4ead2', 3, 5, 18, 14); poly(c, '#d8ccb0', [3, 5, 12, 13, 21, 5]); circ(c, '#8c1d26', 12, 13, 3); }
  };

  root.Art = { rooms, player, items, figure };
})(this);

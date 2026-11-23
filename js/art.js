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
    const h = o.h || 34, s = h / 30;
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
  const player = (c, x, y, frame, dir, sc = 1) => figure(c, x, y, Object.assign({}, HERO, { h: 36 * sc }), frame, dir);

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
      // inn door and sign
      R(c, '#3a2214', 98, 106, 20, 34); R(c, '#5a3a22', 100, 108, 16, 32); circ(c, '#e2b23a', 113, 124, 1.2);
      R(c, '#5a3a22', 104, 86, 1, 8); R(c, '#2f6b8a', 96, 92, 24, 12); poly(c, '#7a8a9a', [98, 100, 108, 94, 118, 100]); circ(c, '#f0c8a8', 108, 96, 1.5);
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
      R(c, '#e8e0d0', 96, 40, 6, 24); R(c, '#8c1d26', 96, 46, 6, 3); R(c, '#8c1d26', 96, 54, 6, 3); R(c, '#3a3a4a', 95, 36, 8, 4); poly(c, '#5a6a8a', [80, 64, 90, 60, 108, 60, 116, 64]);
      if (s.flags.lit) { circ(c, 'rgba(255,240,160,.35)', 99, 38, 8); poly(c, 'rgba(255,240,170,' + (0.18 + Math.sin(t * 2) * 0.1) + ')', [99, 38, 99 + Math.cos(t) * 90, 30, 99 + Math.cos(t) * 90, 46]); circ(c, '#fff6c0', 99, 38, 2.5); }
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
      R(c, s.flags.coin_found ? '#1a1612' : '#7a7266', 138, 90, 18, 12);
      if (!s.flags.coin_found) { R(c, '#a09888', 138, 90, 18, 1); R(c, '#3a342c', 155, 90, 1, 12); }
      // stairs up
      for (let i = 0; i < 9; i++) R(c, i % 2 ? '#7a7266' : '#857c70', 280 + i * 3, 150 - i * 13, 40, 13);
      torch(c, 120, 60, t); torch(c, 250, 60, t);
      // stool + mug
      R(c, '#5a3a22', 226, 146, 22, 4); R(c, '#4a2c18', 228, 150, 3, 12); R(c, '#4a2c18', 244, 150, 3, 12); R(c, '#8a8a8a', 254, 156, 5, 6);
    },
    actors: (s, t) => [{ y: 160, d: c => {
      figure(c, 237, 160, { skin: '#dba882', hair: '#4a2c18', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', h: 30 }, 0, 1);
      if (!s.flags.got_keys) { c.strokeStyle = '#a8a8a8'; c.lineWidth = 1.5; c.beginPath(); c.arc(240, 143, 3.5, 0, 7); c.stroke(); R(c, '#c99a22', 239, 145, 1.5, 5); R(c, '#1a1a22', 242, 145, 1.5, 5); }
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
      { y: 152, d: c => { figure(c, 139, 152, VARRICK, 0, 1); circ(c, '#120818', 139, 126, 1.8); circ(c, 'rgba(120,60,160,.5)', 139, 126, 3); } },
      { y: 152, d: c => figure(c, 179, 152, { skin: '#f0c8a8', hair: '#c8862e', longHair: true, top: '#3fae8f', dress: '#3fae8f', trim: '#e2b23a', legs: '#3fae8f', veil: !s.flags.trust, hat: r => { r('#e2b23a', -2.5, 28.5, 5, 1.2); } }, 0, -1) },
      { y: 162, d: c => figure(c, 259, 162, { skin: '#d8a888', hair: '#9a9a9a', top: '#2f6b5a', armor: '#b8c4c6', legs: '#4a4a52', cape: '#2f8a7a' }, 0, -1) }
    ]
  };

  // ---------- people used in several places ----------
  const VARRICK = { skin: '#d8c0a8', hair: '#111', top: '#1a1a22', legs: '#111', cape: '#3a1020', h: 38, beard: '#111' };
  const ELOWEN = { skin: '#f0c8a8', hair: '#c8862e', longHair: true, top: '#3fae8f', dress: '#3fae8f', trim: '#e2b23a', legs: '#3fae8f', hat: r => { r('#e2b23a', -2.5, 28.5, 5, 1.2); } };
  const gear = (c, x, y, r, teeth, ang, col, hub) => {
    c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col;
    for (let i = 0; i < teeth; i++) { c.save(); c.rotate(i * Math.PI * 2 / teeth); c.fillRect(-r * 0.12, -r - r * 0.18, r * 0.24, r * 0.3); c.restore(); }
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.fillStyle = hub || 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(0, 0, r * 0.55, 0, 7); c.fill();
    c.fillStyle = col; for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); c.fillRect(-r * 0.08, -r * 0.6, r * 0.16, r * 0.6); c.restore(); }
    circ(c, '#2a1d12', 0, 0, r * 0.14); c.restore();
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
      for (let i = 0; i < 6; i++) R(c, lit ? '#fff6c0' : '#a8c4d0', 132 + i * 2, 44 + i * 12, 56 - i * 4 + i * 4, 9);
      for (let i = 0; i < 6; i++) R(c, lit ? 'rgba(255,200,80,.5)' : 'rgba(255,255,255,.25)', 132, 52 + i * 12, 56, 2);
      R(c, '#c99a22', 128, 36, 64, 6); poly(c, '#8a6a2a', [134, 36, 160, 20, 186, 36]);
      if (lit) { c.fillStyle = 'rgba(255,250,210,.9)'; c.beginPath(); c.ellipse(160, 80, 10 + Math.sin(t * 6), 18, 0, 0, 7); c.fill(); }
      else { R(c, '#3a3530', 158, 74, 4, 14); }
      // floor grating and stairwell
      bands(c, 0, 150, 320, 50, ['#3a3530', '#45403a', '#4f4943']);
      c.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 0; x < 320; x += 8) c.fillRect(x, 150, 1, 50); for (let y = 154; y < 200; y += 8) c.fillRect(0, y, 320, 1);
      R(c, '#110f0d', 0, 130, 18, 70);
    },
    actors: () => [{ y: 162, d: c => figure(c, 220, 162, { skin: '#d8a080', hair: '#b8b8b8', longHair: true, top: '#2a3a6a', dress: '#2a3a6a', trim: '#c99a22', legs: '#2a3a6a', hat: r => { r('#1a2440', -3.5, 28, 7, 2); r('#1a2440', -2.5, 29.5, 5, 2); } }, 0, -1) }]
  };

  rooms.clockharbor = {
    bg(c, s, t) {
      const run = s.flags.clock, a = run ? t : 0;
      sky(c, ['#5a6aa8', '#7a7ab0', '#a08aa8', '#d0a090', '#e8c098'], 140);
      clouds(c, run ? t : 0, 20, 'rgba(255,230,210,.6)', 61);
      // buildings
      const bld = (x, w, h, col, rf) => { R(c, col, x, 140 - h, w, h); R(c, rf, x - 3, 140 - h - 6, w + 6, 6); R(c, 'rgba(0,0,0,.2)', x + w - 4, 140 - h, 4, h); };
      bld(8, 80, 50, '#b0784a', '#6a3a22'); bld(170, 70, 70, '#a8885a', '#5a4a3a'); bld(240, 80, 56, '#9a6a4a', '#5a3a2a');
      [[190, 70], [262, 84], [30, 90]].forEach(([x, y], i) => { R(c, '#5a4a3a', x, y - 20, 8, 20); for (let k = 0; k < 3; k++) circ(c, 'rgba(200,200,200,.35)', x + 4 + (run ? Math.sin(t + k) * 3 : 0), y - 26 - k * 7 - (run ? (t * 6 % 7) : 0), 3 + k); });
      gear(c, 214, 96, 14, 10, a * 0.8, '#c99a22'); gear(c, 236, 112, 9, 8, -a * 1.2, '#b88a2a'); gear(c, 290, 110, 12, 9, a, '#c99a22');
      // workshop door (round)
      circ(c, '#4a2c18', 47, 120, 18); R(c, '#4a2c18', 29, 120, 36, 22); circ(c, '#6b4428', 47, 120, 15); R(c, '#6b4428', 32, 120, 30, 22); circ(c, '#e2b23a', 58, 128, 1.5);
      // clock tower
      R(c, '#c8b08a', 118, 4, 44, 138); R(c, '#a8906a', 154, 4, 8, 138); poly(c, '#5a7a8a', [114, 4, 140, -14, 166, 4]);
      circ(c, '#e8e0cc', 140, 36, 19); circ(c, '#c99a22', 140, 36, 19); circ(c, '#f6eedc', 140, 36, 16);
      for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; R(c, '#3a2a1a', 140 + Math.cos(an) * 13 - 0.5, 36 + Math.sin(an) * 13 - 0.5, 1.5, 1.5); }
      const mn = run ? t * 0.3 : -0.1, hr = run ? t * 0.025 : -0.02;
      c.strokeStyle = '#1a1a1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(140, 36); c.lineTo(140 + Math.sin(mn) * 13, 36 - Math.cos(mn) * 13); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.moveTo(140, 36); c.lineTo(140 + Math.sin(hr) * 8, 36 - Math.cos(hr) * 8); c.stroke();
      R(c, '#3a2a1a', 126, 96, 28, 46); R(c, '#5a3a22', 128, 98, 24, 44); R(c, run ? '#2a1a10' : '#1a120a', 140, 98, 12, 44);
      // ground and harbour
      dith(c, 0, 140, 320, 60, '#9a8a70', '#8a7a62');
      c.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 146; y < 200; y += 8) for (let x = (y / 8 % 2) * 6; x < 240; x += 12) c.fillRect(x, y, 10, 1);
      sea(c, run ? t : 0, 150, 50, ['#3a6a9a', '#4276a4', '#4a82ae']); R(c, '#9a8a70', 0, 150, 242, 50);
      R(c, '#5a4a3a', 238, 150, 6, 50);
      const bob = run ? Math.sin(t * 1.6) * 1.5 : 0;
      poly(c, '#6a3a22', [250, 170 + bob, 316, 170 + bob, 308, 188 + bob, 256, 188 + bob]); R(c, '#e8e0cc', 252, 170 + bob, 62, 2); R(c, '#5a3a22', 282, 110 + bob, 3, 60); poly(c, '#efe4c8', [285, 114 + bob, 310, 160 + bob, 285, 160 + bob]);
      // fish stall
      R(c, '#7a5a3a', 178, 132, 54, 16); poly(c, '#3fae8f', [176, 104, 234, 104, 238, 114, 172, 114]); for (let i = 0; i < 6; i++) R(c, i % 2 ? '#e8e3d6' : '#3fae8f', 172 + i * 11, 114, 11, 4);
      for (let i = 0; i < 5; i++) ell(c, '#b8c8d0', 186 + i * 9, 130, 4, 1.6);
      // frozen flour / falling flour
      for (let i = 0; i < 14; i++) { const fy = run ? (110 + ((t * 20 + i * 7) % 40)) : 112 + (i * 5 % 22); R(c, '#f6f0e0', 84 + (i * 7 % 22), fy, 1, 1); }
    },
    actors: s => [
      { y: 156, d: c => figure(c, 92, 156, { skin: '#e8b48a', hair: '#5a3a22', top: '#e8e0cc', dress: '#c86a3a', legs: '#c86a3a', hat: r => { r('#f6f0e0', -3, 28, 6, 3); } }, s.flags.clock ? Math.floor(Date.now() / 300) % 2 : 0, 1) },
      { y: 156, d: c => figure(c, 204, 156, { skin: '#d8a080', hair: '#2a1d12', top: '#4a6a8a', legs: '#3a3a44', beard: '#2a1d12' }, 0, -1) }
    ]
  };

  rooms.workshop = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 160, ['#3a2818', '#46301e', '#523824', '#5c402a']);
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
      poly(c, '#7a9ac8', [96, 104, 100, 96, 104, 104]); R(c, '#c99a22', 130, 100, 2, 12);
      // forge glow
      R(c, '#3a2a1a', 230, 96, 40, 56); R(c, '#1a120a', 236, 110, 28, 26);
      const f = 0.6 + Math.sin(t * 5) * 0.2; circ(c, `rgba(255,140,40,${0.3 * f})`, 250, 124, 26); poly(c, '#ff9a1f', [240, 136, 260, 136, 250 + Math.sin(t * 9) * 2, 114]); poly(c, '#ffe066', [245, 136, 255, 136, 250, 122]);
      // doors
      R(c, '#2e1c10', 8, 80, 40, 84); R(c, '#e8c898', 12, 84, 32, 80);
      R(c, '#2e1c10', 304, 100, 16, 64); R(c, 'rgba(255,150,60,.5)', 308, 104, 12, 60);
      bands(c, 0, 160, 320, 40, ['#4a3020', '#52382a', '#5a4030']);
      c.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 166; y < 200; y += 7) c.fillRect(0, y, 320, 1);
    },
    actors: () => [{ y: 168, d: c => figure(c, 200, 168, { h: 22, skin: '#e8b48a', hair: '#e8e8e8', beard: '#f0f0f0', top: '#8c1d26', legs: '#3a3a6a', hat: r => { r('#3a3a3a', -3, 25.5, 6, 1.6); r('#9fe0ff', -2.5, 25.6, 2, 1.4); r('#9fe0ff', 0.5, 25.6, 2, 1.4); } }, 0, -1) }]
  };

  rooms.clocktower = {
    bg(c, s, t) {
      const run = s.flags.clock, a = run ? t * 0.4 : 0;
      bands(c, 0, 0, 320, 160, ['#1e1810', '#2a2216', '#352a1c', '#3e3220']);
      [60, 260].forEach(x => R(c, '#4a3420', x, 0, 8, 160)); R(c, '#4a3420', 0, 20, 320, 6);
      // light from the clock face above
      poly(c, 'rgba(255,220,150,.07)', [130, 0, 190, 0, 230, 160, 90, 160]);
      gear(c, 160, 90, 48, 22, a, run ? '#c99a22' : '#9a7a3a');
      if (!run) for (let i = 0; i < 30; i++) R(c, '#c8b080', 120 + (i * 13 % 80), 60 + (i * 7 % 60), 2, 1);
      gear(c, 252, 48, 22, 12, -a * 2.2, '#b88a2a'); gear(c, 286, 80, 14, 9, a * 3.4, '#c99a22'); gear(c, 240, 86, 10, 8, a * 4, '#a8822a');
      // pendulum
      const sw = run ? Math.sin(t * 2.4) * 0.25 : 0;
      c.save(); c.translate(50, 30); c.rotate(sw); R(c, '#8a6a2a', -1, 0, 3, 100); circ(c, '#c99a22', 0, 106, 10); circ(c, '#e2b23a', -3, 103, 3); c.restore();
      bands(c, 0, 160, 320, 40, ['#2a2216', '#30281a', '#36301e']);
      c.fillStyle = 'rgba(0,0,0,.3)'; for (let x = 0; x < 320; x += 16) c.fillRect(x, 160, 1, 40);
    }
  };

  rooms.sentbase = {
    bg(c, s, t) {
      sky(c, ['#3a5aa0', '#4a6aac', '#6a86bc', '#94a8cc', '#c4c8d4'], 120);
      clouds(c, t, 14, 'rgba(255,255,255,.7)', 71);
      sea(c, t, 100, 60, ['#2a5f9a', '#2f6aa6', '#3576b0', '#3c83ba']);
      // the spire
      poly(c, '#6a6458', [80, 160, 110, 40, 140, 6, 160, 0, 182, 8, 212, 44, 240, 160]);
      dith(c, 120, 10, 80, 150, '#76705f', '#6a6458');
      c.fillStyle = '#4e4a40'; [[130, 30, 1, 40], [190, 50, 1, 60], [150, 90, 1, 30]].forEach(a => c.fillRect(...a));
      // stairs
      const stair = (x0, dir) => { for (let i = 0; i < 9; i++) { const y = 150 - i * 12, x = x0 + (i % 2 ? 10 : 0) * dir; R(c, '#9a9282', x, y, 22, 4); R(c, '#4e4a40', x, y + 4, 22, 2); } };
      stair(108, 1); stair(188, -1);
      // ground
      dith(c, 0, 152, 320, 48, '#7a7466', '#6e6858');
      for (let i = 0; i < 8; i++) poly(c, '#5e5a4e', [i * 44, 200, i * 44 + 10, 186, i * 44 + 22, 200]);
      // sentinels
      const statue = (x, col, hi, sly) => {
        R(c, '#5e5a4e', x - 4, 140, 58, 16); R(c, hi, x - 4, 140, 58, 2);
        R(c, col, x + 10, 84, 30, 56); R(c, col, x + 14, 66, 22, 20); R(c, hi, x + 14, 66, 22, 2);
        R(c, '#111', x + 18, 74, 4, 2); R(c, '#111', x + 28, 74, 4, 2);
        if (sly) { R(c, '#111', x + 20, 80, 10, 1); R(c, '#111', x + 29, 79, 2, 1); } else R(c, '#111', x + 20, 80, 10, 1);
        R(c, col, x + 2, 90, 8, 40); R(c, col, x + 40, 90, 8, 40); R(c, hi, x + 22, 60, 6, 6);
        R(c, '#8a8478', x + 44, 60, 3, 80);
      };
      statue(40, '#9a968c', '#bab6ac', false); statue(230, '#3a3a40', '#5a5a64', true);
      R(c, '#c8b878', 146, 130, 28, 16); R(c, '#8a7a48', 148, 133, 24, 1); R(c, '#8a7a48', 148, 137, 20, 1); R(c, '#8a7a48', 148, 141, 22, 1);
      poly(c, '#6a3a22', [0, 182, 38, 182, 34, 196, 0, 196]); R(c, '#e8e0cc', 0, 182, 38, 2);
    }
  };

  rooms.aerie = {
    bg(c, s, t) {
      sky(c, ['#2a4a90', '#3a5aa0', '#5a7ab4', '#8aa4c8', '#bccce0'], 150);
      for (let i = 0; i < 4; i++) ell(c, 'rgba(255,255,255,.85)', ((i * 110 + t * 4) % 420) - 50, 130 + i * 5, 60, 8);
      if (!s.flags.fed) { const rx = 160 + Math.cos(t * 0.5) * 110, ry = 34 + Math.sin(t) * 8, w = Math.sin(t * 3) * 6; poly(c, '#c8922a', [rx - 26, ry + w, rx, ry - 3, rx + 26, ry + w, rx, ry + 4]); R(c, '#a87420', rx - 2, ry - 3, 4, 9); }
      // summit
      poly(c, '#6a6050', [0, 200, 0, 152, 40, 140, 120, 146, 200, 138, 280, 144, 320, 150, 320, 200]);
      dith(c, 0, 152, 320, 48, '#766a58', '#6a604e');
      R(c, '#110f0d', 0, 140, 18, 60);
      // nest
      ell(c, '#5a3a1a', 215, 148, 66, 16);
      for (let i = 0; i < 26; i++) { c.strokeStyle = i % 2 ? '#7a5228' : '#4a2e14'; c.lineWidth = 2; c.beginPath(); const y = 134 + (i % 6) * 4; c.moveTo(152 + (i * 13 % 40), y); c.lineTo(240 + (i * 17 % 40), y + (i % 3) - 1); c.stroke(); }
      if (!s.flags.feather_taken_never) { [[256, 136], [266, 132], [272, 138]].forEach(([x, y], i) => { if (i === 0 && s.inv.includes('feather')) return; c.save(); c.translate(x, y); c.rotate(-0.4 + i * 0.3); ell(c, '#ffd84a', 0, 0, 7, 2); R(c, '#fff6c0', -7, 0, 14, 0.6); c.restore(); }); }
      circ(c, 'rgba(255,220,100,.12)', 266, 136, 14);
    },
    actors: s => [
      { y: 140, d: c => {
        const fed = s.flags.fed, bob = fed ? Math.sin(Date.now() / 900) : Math.sin(Date.now() / 120) * 2;
        circ(c, '#e8d8b0', 213, 112 + bob, 15); circ(c, '#f6ecd0', 209, 108 + bob, 8);
        circ(c, '#111', 208, 106 + bob, 1.6); circ(c, '#111', 218, 106 + bob, 1.6);
        if (fed) { R(c, '#111', 206, 106 + bob, 4, 1); R(c, '#111', 216, 106 + bob, 4, 1); poly(c, '#e2a23a', [210, 112 + bob, 216, 112 + bob, 213, 115 + bob]); }
        else poly(c, '#e2a23a', [208, 111 + bob, 218, 111 + bob, 213, 120 + bob]);
      } },
      { y: 120, d: c => {
        if (!s.flags.fed) return;
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
      poly(c, '#7a6a64', [146, 132, 156, 104, 180, 96, 200, 104, 208, 132]); poly(c, '#968680', [158, 106, 180, 98, 196, 106, 180, 112]);
      // sand
      dith(c, 0, 140, 320, 60, '#f0c8b8', '#e8b8a8');
      c.fillStyle = 'rgba(255,255,255,.75)'; for (let x = 0; x < 320; x += 7) c.fillRect(x, 139 + Math.sin(x / 8 + t * 1.5) * 1.5, 5, 2);
      ell(c, '#40a0b0', 70, 178, 30, 8); ell(c, '#60c0c8', 68, 177, 24, 5); circ(c, '#ff8a6a', 60, 178, 2); circ(c, '#ffd84a', 78, 176, 1.5);
      palm(c, 22, 168, 80, t);
      [[110, 186], [140, 176], [200, 190]].forEach(([x, y]) => { poly(c, '#ff9aa8', [x, y, x + 3, y - 6, x + 6, y]); });
      const bob = Math.sin(t * 1.6) * 1;
      poly(c, '#6a3a22', [256, 172 + bob, 320, 172 + bob, 320, 192 + bob, 264, 192 + bob]); R(c, '#e8e0cc', 258, 172 + bob, 62, 2); R(c, '#5a3a22', 290, 116 + bob, 3, 56); poly(c, '#efe4c8', [293, 120 + bob, 316, 164 + bob, 293, 164 + bob]);
    },
    actors: s => s.flags.summoned ? [{ y: 130, d: c => {
      const sw = Math.sin(Date.now() / 600) * 2;
      poly(c, '#7ad0c8', [176, 122, 186, 122, 196 + sw, 132, 204 + sw, 126, 200 + sw, 136, 180, 132]);
      R(c, '#7ad0c8', 172, 112, 14, 12);
      R(c, '#d8b8a0', 172, 100, 12, 12); R(c, '#e8c8b0', 174, 88, 9, 10);
      R(c, '#2a6a8a', 170, 86, 13, 4); R(c, '#2a6a8a', 168, 88, 4, 22); R(c, '#2a6a8a', 182, 88, 3, 16);
      poly(c, '#ff8a9a', [172, 86, 174, 80, 177, 85, 179, 79, 182, 86]);
      R(c, '#111', 179, 92, 1, 1);
    } }] : []
  };

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
      bands(c, 0, 160, 320, 40, ['#2e2a34', '#34303a', '#3a3640']);
      c.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 166; y < 200; y += 8) c.fillRect(0, y, 320, 1);
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
        figure(c, 212, 160, VARRICK, 0, -1);
        const p = 0.6 + Math.sin(t * 6) * 0.3; circ(c, `rgba(140,60,200,${0.35 * p})`, 212, 133, 9); circ(c, '#200a30', 212, 134, 2);
        c.strokeStyle = `rgba(190,120,255,${p})`; c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(206, 126); let x = 206, y = 126; for (let k = 0; k < 5; k++) { x += -4 + Math.sin(t * 20 + k + i) * 4; y -= 4; c.lineTo(x, y); } c.stroke(); }
      } });
      else list.push({ y: 180, d: c => { ell(c, '#c8402e', 208, 178, 6, 3.5); R(c, '#a83020', 201, 176, 2, 2); R(c, '#a83020', 213, 176, 2, 2); circ(c, '#c8402e', 200, 174, 2); circ(c, '#c8402e', 216, 174, 2); R(c, '#111', 206, 175, 1, 1); R(c, '#111', 210, 175, 1, 1); } });
      list.push({ y: 160, d: c => {
        figure(c, 261, 160, ELOWEN, 0, -1);
        if (!s.flags.beaten) { c.strokeStyle = `rgba(120,60,180,${0.6 + Math.sin(t * 8) * 0.2})`; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(250 + i * 4, 160); c.lineTo(250 + i * 4 + Math.sin(t * 9 + i), 124); c.stroke(); } R(c, 'rgba(60,20,90,.25)', 248, 124, 26, 36); }
      } });
      return list;
    }
  };

  // ---------- expansion scenes ----------
  rooms.inn = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 156, ['#3a2416', '#44291a', '#4e301e', '#583622']);
      for (let x = 0; x < 320; x += 40) R(c, '#2e1c10', x, 0, 6, 156);
      R(c, '#2e1c10', 0, 26, 320, 6);
      // fireplace
      R(c, '#6a6258', 18, 68, 68, 80); R(c, '#4e4840', 18, 64, 68, 6); R(c, '#110c08', 30, 96, 44, 52);
      const f = Math.sin(t * 7) * 2; circ(c, 'rgba(255,140,40,.25)', 52, 130, 30);
      poly(c, '#ff8a1f', [34, 148, 70, 148, 60 + f, 112, 52, 124, 44 - f, 110]); poly(c, '#ffe066', [42, 148, 62, 148, 52 + f, 126]);
      R(c, '#5a3a22', 26, 40, 52, 22); poly(c, '#7a9ac8', [32, 52, 60, 44, 72, 52, 60, 58]); circ(c, '#fff', 68, 50, 1.5);
      // bar
      R(c, '#3a2414', 170, 40, 140, 4); R(c, '#3a2414', 170, 70, 140, 4);
      const g = rnd(9); for (let i = 0; i < 14; i++) { const x = 176 + i * 9; R(c, ['#2e7a4a', '#8c1d26', '#c99a22', '#5a3a7a'][(g() * 4) | 0], x, 26 + (i % 2) * 4, 5, 14 - (i % 2) * 4); R(c, '#e8e0cc', x + 1, 56, 5, 14); }
      // patrons' table
      R(c, '#6b4428', 150, 128, 60, 6); R(c, '#4a2c18', 156, 134, 4, 20); R(c, '#4a2c18', 200, 134, 4, 20);
      R(c, '#c8c0b0', 158, 120, 6, 8); R(c, '#c8c0b0', 190, 121, 6, 7);
      circ(c, '#c9906a', 166, 116, 5); R(c, '#4a6a8a', 160, 120, 12, 8);
      circ(c, '#d8a080', 200, 112, 5); R(c, '#8a4a2a', 194, 116, 12, 12); for (let i = 0; i < 4; i++) R(c, '#e8c890', 176 + i * 3, 124 - i * 2, 2, 4);
      bands(c, 0, 156, 320, 44, ['#4a3020', '#52382a', '#5a4030']);
      c.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 162; y < 200; y += 7) c.fillRect(0, y, 320, 1);
      R(c, '#e8c898', 0, 130, 14, 70);
    },
    actors: () => [
      { y: 130, d: c => { figure(c, 238, 130, { h: 34, skin: '#e3b08c', hair: '#8a3a1a', longHair: true, top: '#7a2a2a', sleeve: '#e8e0cc', legs: '#333' }, 0, -1); R(c, '#5a3a22', 170, 118, 140, 38); R(c, '#7a5230', 166, 114, 148, 6); R(c, '#e8e0cc', 228, 116, 10, 3); } },
      { y: 158, d: c => { R(c, '#4a2c18', 104, 146, 18, 4); R(c, '#3a2414', 106, 150, 3, 8); R(c, '#3a2414', 118, 150, 3, 8);
        figure(c, 113, 158, { h: 32, skin: '#f0c8a8', hair: '#c8a040', top: '#3a6a3a', legs: '#5a3a22', hat: r => { r('#8c1d26', -3.5, 27, 7, 2.5); r('#e2b23a', 2, 29, 1, 5); } }, 0, 1);
        ell(c, '#b8742a', 124, 140, 7, 5); R(c, '#8a5a2a', 126, 126, 2, 12); R(c, '#2a1a10', 122, 139, 3, 2); } }
    ]
  };

  rooms.mistwood = {
    bg(c, s, t) {
      sky(c, ['#2a2244', '#342a52', '#3e3260', '#4a3e6c'], 150);
      for (let i = 0; i < 7; i++) { const x = i * 50 - 10; R(c, '#1a1428', x + 16, 30, 14, 120); poly(c, '#22183a', [x, 60, x + 23, 0, x + 46, 60]); poly(c, '#1e1634', [x - 6, 90, x + 23, 30, x + 52, 90]); }
      // the two web trees
      R(c, '#150f22', 100, 10, 16, 140); R(c, '#150f22', 210, 10, 16, 140);
      c.strokeStyle = 'rgba(220,220,240,.55)'; c.lineWidth = 0.7;
      const cx = 162, cy = 80;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 54, cy + Math.sin(a) * 50); c.stroke(); }
      for (let r = 8; r < 54; r += 7) { c.beginPath(); for (let i = 0; i <= 12; i++) { const a = i * Math.PI / 6; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.93; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
      for (let i = 0; i < 18; i++) { const a = i * 1.7, r = 10 + (i * 13 % 44); if (Math.sin(t * 3 + i) > 0.3) R(c, '#e8f0ff', cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1); }
      if (s.flags.got_thread) { circ(c, 'rgba(140,255,160,.25)', cx, cy + 22, 14); ell(c, '#7dffa0', cx, cy + 20, 5, 3); }
      // ground
      dith(c, 0, 146, 320, 54, '#2e3a2e', '#283428');
      grassTufts(c, 150, 196, '#4a6a4a', 17, 24);
      for (let i = 0; i < 4; i++) ell(c, 'rgba(210,200,240,.10)', ((t * (5 + i * 2) + i * 100) % 440) - 60, 130 + i * 16, 110, 9);
      R(c, '#e8e0f0', 318, 140, 2, 50);
    },
    actors: (s, t) => [{ y: 92, d: c => {
      const bob = Math.sin(t * 1.4) * 1.5, x = 166, y = 76 + bob;
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
      bands(c, 0, 0, 320, 156, ['#1e1612', '#281c16', '#32241a', '#3a2a1e']);
      for (let x = 0; x < 320; x += 32) R(c, '#2a1e16', x, 0, 4, 156);
      gear(c, 40, 50, 24, 12, run ? t * 0.6 : 0, '#7a5a2a'); gear(c, 80, 30, 14, 9, run ? -t : 0, '#8a6a2a');
      // great forge
      R(c, '#4a3a30', 110, 30, 120, 122); R(c, '#5a4a3e', 110, 30, 120, 6); poly(c, '#3a2e26', [130, 30, 210, 30, 196, 0, 144, 0]);
      R(c, '#140c08', 128, 84, 84, 62); circ(c, '#140c08', 170, 84, 42);
      if (run) {
        const f = 0.7 + Math.sin(t * 6) * 0.2;
        circ(c, `rgba(255,170,60,${0.35 * f})`, 170, 110, 70);
        poly(c, '#ff7a1a', [134, 146, 206, 146, 196, 100, 184, 112, 170, 78 + Math.sin(t * 8) * 4, 156, 112, 144, 100]);
        poly(c, '#ffd040', [146, 146, 194, 146, 182, 112, 170, 98, 158, 112]); poly(c, '#fff6d0', [160, 146, 180, 146, 170, 120]);
      } else { for (let i = 0; i < 10; i++) R(c, '#4a4440', 136 + i * 7, 140 - (i % 3), 6, 4); }
      // bellows
      poly(c, '#6b4428', [270, 122, 310, 116, 310, 150, 270, 144]); R(c, '#5a3a22', 300, 112, 4, 40);
      // anvil
      R(c, '#3a3a3e', 60, 136, 34, 8); R(c, '#2a2a2e', 70, 144, 14, 12);
      bands(c, 0, 156, 320, 44, ['#2a2018', '#30241c', '#362a20']);
      c.fillStyle = 'rgba(0,0,0,.3)'; for (let x = 0; x < 320; x += 16) c.fillRect(x, 156, 1, 44);
      R(c, '#c8a878', 0, 130, 14, 70);
    },
    actors: (s, t) => [{ y: 162, d: c => {
      const run = s.flags.clock, pump = run ? Math.sin(t * 3) * 3 : 0, x = 250, y = 162;
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
      poly(c, '#6a6458', [0, 0, 320, 0, 320, 164, 0, 164]);
      dith(c, 0, 0, 320, 160, '#746e60', '#6a6458');
      c.fillStyle = '#4e4a40'; [[40, 20, 1, 60], [120, 50, 1, 70], [230, 10, 1, 50], [280, 70, 1, 60]].forEach(a => c.fillRect(...a));
      poly(c, '#5e5a4e', [190, 124, 236, 120, 244, 132, 186, 134]); // goat rock
      // the ledge
      R(c, '#8a8274', 30, 160, 260, 24); R(c, '#9a9282', 30, 160, 260, 3); R(c, '#4e4a40', 30, 182, 260, 3);
      poly(c, '#6a6458', [30, 185, 290, 185, 270, 196, 50, 196]);
      R(c, '#9a9282', 0, 150, 30, 40); R(c, '#9a9282', 290, 140, 30, 50);
      for (let i = 0; i < 5; i++) R(c, '#8a8274', 292 + i * 5, 140 - i * 10, 28 - i * 5, 6);
    },
    actors: (s, t) => [{ y: s.flags.goat ? 126 : 176, d: c => {
      const gx = s.flags.goat ? 214 : 204, gy = s.flags.goat ? 124 : 174, chew = Math.sin(t * 6) > 0 ? 1 : 0;
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
      poly(c, '#c87a7a', [200, 146, 210, 70, 240, 50, 280, 52, 304, 74, 312, 146, 290, 146, 286, 90, 264, 76, 236, 80, 222, 100, 222, 146]);
      dith(c, 226, 54, 70, 20, '#d88a8a', '#c87a7a');
      if (Math.sin(t * 1.3) > 0.6) ell(c, 'rgba(255,255,255,.7)', 254, 140, 26, 5);
      dith(c, 0, 144, 320, 56, '#f0c8b8', '#e8b8a8');
      c.fillStyle = 'rgba(255,255,255,.75)'; for (let x = 0; x < 320; x += 7) c.fillRect(x, 143 + Math.sin(x / 8 + t * 1.5) * 1.5, 5, 2);
      // pools
      ell(c, '#2a8aa0', 92, 177, 38, 12); ell(c, '#50c0c8', 90, 176, 32, 9);
      for (let i = 0; i < 6; i++) { circ(c, ['#ff8a6a', '#ffd84a', '#c86ac8'][i % 3], 70 + i * 8, 174 + (i % 2) * 4, 1.6); }
      poly(c, '#ff8a4a', [110, 172, 113, 168, 116, 172, 120, 173, 116, 175, 117, 180, 113, 177, 109, 180, 110, 175, 106, 173]);
      ell(c, '#3a9aa8', 30, 160, 18, 6); ell(c, '#5ac0c8', 30, 159, 14, 4);
      [[250, 186], [276, 176], [140, 190]].forEach(([x, y]) => poly(c, '#ff9aa8', [x, y, x + 3, y - 6, x + 6, y]));
    },
    actors: (s, t) => s.flags.octo ? [] : [{ y: 182, d: c => {
      const w = Math.sin(t * 3);
      ell(c, '#a86ac8', 164, 174, 7, 6); circ(c, '#fff', 161, 172, 1.6); circ(c, '#fff', 167, 172, 1.6); R(c, '#111', 161, 172, 1, 1); R(c, '#111', 167, 172, 1, 1);
      c.strokeStyle = '#a86ac8'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(158 + i * 3, 178); c.quadraticCurveTo(156 + i * 3 + w * 2, 183, 154 + i * 4, 182 + (i % 2) * 2); c.stroke(); }
    } }]
  };

  const castleWall = (c, seed) => { stoneWall(c, 0, 0, 320, 156, '#5e5850', '#46423c', seed); };
  const castleFloor = c => { bands(c, 0, 156, 320, 44, ['#3e3a34', '#46423a', '#4e4a42']); c.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 162; y < 200; y += 8) for (let x = ((y / 8) % 2) * 10; x < 320; x += 20) c.fillRect(x, y, 1, 8); for (let y = 162; y < 200; y += 8) c.fillRect(0, y, 320, 1); };
  const door = (c, x, y, w, h, col, open) => { R(c, '#3a2a1a', x - 3, y - 3, w + 6, h + 3); poly(c, '#3a2a1a', [x - 3, y, x + w / 2, y - 14, x + w + 3, y]); R(c, open ? '#1a120a' : col, x, y, w, h); if (!open) { R(c, 'rgba(0,0,0,.25)', x + w / 2 - 1, y, 2, h); circ(c, '#c99a22', x + w - 6, y + h / 2, 2); } };

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
      const f = Math.sin(t * 7) * 2; circ(c, 'rgba(255,140,40,.25)', 270, 140, 36); poly(c, '#ff8a1f', [244, 152, 298, 152, 286 + f, 124, 270, 134, 256 - f, 122]); poly(c, '#ffe066', [256, 152, 286, 152, 270 + f, 134]);
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
    actors: () => [{ y: 164, d: c => figure(c, 200, 164, { h: 33, skin: '#f0c0a0', hair: '#d8d8d8', top: '#e8e0cc', dress: '#8a5a3a', trim: '#e8e0cc', legs: '#8a5a3a', hat: r => { r('#f6f0e0', -3.5, 27.5, 7, 3); } }, 0, -1) }]
  };

  rooms.study = {
    bg(c, s, t) {
      bands(c, 0, 0, 320, 160, ['#1a1420', '#22182a', '#2a1e32', '#30223a']);
      for (let x = 0; x < 320; x += 24) R(c, '#160f1c', x, 0, 3, 160);
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
      R(c, '#2a2238', 0, 112, 320, 4);
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
      { y: 162, d: c => figure(c, 222, 162, { skin: '#dba882', hair: '#2a1d12', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', hat: r => { r('#9aa7a8', -3, 27, 6, 3); } }, 0, 1) },
      { y: 162, d: c => figure(c, 308, 162, { skin: '#b9845e', hair: '#1a120c', top: '#2f8a7a', armor: '#9aa7a8', legs: '#4a4a52', hat: r => { r('#9aa7a8', -3, 27, 6, 3); } }, 0, -1) }
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
    bertha: { bg: '#7a6e5e', skin: '#f0c0a0', hair: '#d8d8d8', shirt: '#8a5a3a', hat: '#f6f0e0' }
  };
  function portrait(c, who) {
    const o = P[who]; if (!o) return false;
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
    letter: c => { R(c, '#f4ead2', 3, 5, 18, 14); poly(c, '#d8ccb0', [3, 5, 12, 13, 21, 5]); circ(c, '#8c1d26', 12, 13, 3); }
  };

  root.Art = { rooms, player, items, figure, portrait, chart, MAP_SPOTS, cine };
})(this);

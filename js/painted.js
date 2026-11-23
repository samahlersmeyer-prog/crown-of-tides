// Crown of Tides — painted backgrounds (assets/bg/*.jpg) and the live overlays drawn on top of them:
// pickups, things that change during play, light and weather. Falls back to the code-drawn scene if an image is missing.
(function (root) {
  'use strict';
  const A = root.Art;
  const NAMES = ['aerie', 'beach', 'cellar', 'cliffs', 'clockharbor', 'clocktower', 'corridor', 'docks', 'gallery', 'gearworks', 'hall', 'inn', 'kitchen', 'ledge', 'lighthouse', 'mistshore', 'mistwood', 'oracle', 'reef', 'sentbase', 'shop', 'square', 'study', 'tidepools', 'tower', 'tunnel', 'workshop', 'cine_mirror', 'cine_storm'];
  const IMG = {};
  NAMES.forEach(n => { const im = new Image(); im.src = 'assets/bg/' + n + '.jpg'; IMG[n] = im; });
  const ready = n => IMG[n] && IMG[n].complete && IMG[n].naturalWidth > 0;

  const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const circ = (c, col, x, y, r) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  const ell = (c, col, x, y, rx, ry) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); };
  const glow = (c, x, y, r, rgb, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
  const sparkle = (c, x, y, t) => { if (Math.sin(t * 4 + x) > 0.2) { R(c, '#fff8c0', x - 2, y, 5, 1); R(c, '#fff8c0', x, y - 2, 1, 5); } };
  const gulls = (c, t, y, n = 3) => { c.strokeStyle = '#f6f6f6'; c.lineWidth = 1; for (let i = 0; i < n; i++) { const gx = (t * 10 + i * 110) % 380 - 30, gy = y + Math.sin(t * 0.8 + i) * 6 + i * 7, f = Math.sin(t * 6 + i) * 2; c.beginPath(); c.moveTo(gx - 4, gy - f); c.lineTo(gx, gy + 1); c.lineTo(gx + 4, gy - f); c.stroke(); } };
  const boat = (c, x, y, t) => { const b = Math.sin(t * 1.6) * 1; ell(c, 'rgba(10,10,30,.35)', x + 28, y + 14 + b, 34, 3); c.fillStyle = '#6a3a22'; c.beginPath(); c.moveTo(x, y + b); c.lineTo(x + 58, y + b); c.lineTo(x + 50, y + 13 + b); c.lineTo(x + 8, y + 13 + b); c.fill(); R(c, '#efe6d0', x + 1, y + b, 56, 2); R(c, '#4a2412', x + 4, y + 7 + b, 50, 1); R(c, '#5a3a22', x + 28, y - 34 + b, 2, 34); c.fillStyle = '#efe4c8'; c.beginPath(); c.moveTo(x + 30, y - 32 + b); c.lineTo(x + 50, y - 3 + b); c.lineTo(x + 30, y - 3 + b); c.fill(); };

  const OVER = {
    beach: { over(c, s, t) {
      gulls(c, t, 40);
      if (!s.flags.ring_taken) sparkle(c, 74, 128, t);
      if (!s.flags.bottle_taken) { c.save(); c.translate(198, 166); c.rotate(-0.25); R(c, '#1e5a36', -7, -3, 13, 6); R(c, '#2e7a4a', -7, -3, 13, 2); R(c, '#2e7a4a', 6, -2, 4, 3); R(c, '#a07040', 9, -2, 2, 3); R(c, '#f2ecd8', -4, -1, 6, 2); R(c, '#cfeedd', -6, -3, 3, 1); c.restore(); ell(c, 'rgba(120,80,40,.3)', 198, 170, 9, 2); }
      if (!s.flags.conch_taken) { ell(c, 'rgba(120,80,40,.3)', 261, 184, 9, 2); ell(c, '#d8848c', 261, 180, 8, 4.5); ell(c, '#f6c6c4', 259, 178.5, 5, 2.4); c.strokeStyle = '#a85a64'; c.beginPath(); c.arc(256, 180, 2.5, 0, 5); c.stroke(); }
      const cx = 220 + Math.sin(t * 0.7) * 18; ell(c, '#c8402e', cx, 152, 3.5, 2); R(c, '#a83020', cx - 5, 150, 2, 2); R(c, '#a83020', cx + 3, 150, 2, 2);
    } },
    cliffs: { over(c, s, t) {
      gulls(c, t, 100, 2);
      if (s.flags.door_open) { c.fillStyle = '#07060a'; c.beginPath(); c.moveTo(232, 130); c.lineTo(232, 74); c.quadraticCurveTo(251, 52, 270, 74); c.lineTo(270, 130); c.fill(); glow(c, 251, 96, 40, '150,240,255', 0.25); }
    } },
    square: { over(c, s, t) {
      R(c, '#4a2e1a', 154, 128, 2, 30); R(c, '#4a2e1a', 176, 128, 2, 30); R(c, '#7a5232', 152, 118, 28, 20); R(c, '#f4ead2', 155, 120, 22, 15); R(c, '#7a1d1d', 157, 122, 18, 2); for (let i = 0; i < 4; i++) R(c, '#666', 157, 126 + i * 2, 16 - i * 3, 1);
      for (let i = 0; i < 6; i++) sparkle(c, 182 + i * 8, 150 + (i % 2) * 3, t + i);
    } },
    docks: { over(c, s, t) { if (s.flags.lit) { glow(c, 46, 50, 14, '255,240,170', 0.7); c.fillStyle = `rgba(255,240,170,${0.16 + Math.sin(t * 2) * 0.08})`; c.beginPath(); c.moveTo(46, 50); c.lineTo(46 + Math.cos(t) * 100, 42); c.lineTo(46 + Math.cos(t) * 100, 58); c.fill(); } gulls(c, t, 24, 2); } },
    lighthouse: { over(c, s, t) { if (s.flags.lit) { glow(c, 160, 60, 70, '255,230,140', 0.55); glow(c, 160, 60, 22, '255,255,220', 0.9); } } },
    mistshore: { over(c, s, t) { boat(c, 246, 182, t); } },
    mistwood: { over(c, s, t) { if (s.flags.got_thread) { glow(c, 160, 96, 18, '140,255,170', 0.5); ell(c, '#6af090', 160, 94, 5, 3); } } },
    workshop: { over(c, s, t) { if (!s.flags.got_rattler) { R(c, '#8c1d26', 140, 106, 20, 11); circ(c, '#e2b23a', 144, 105, 3); circ(c, '#e2b23a', 156, 105, 3); R(c, '#f4ead2', 138, 117, 24, 5); c.fillStyle = '#8c1d26'; c.font = '4px monospace'; c.fillText('DO NOT WIND', 139, 121); } } },
    gearworks: { over(c, s, t) { if (s.flags.clock) A.flame(c, 152, 124, 56, 42, t, 7); } },
    sentbase: { over(c, s, t) { boat(c, 22, 140, t); } },
    aerie: { over(c, s, t) { if (!s.inv.includes('feather')) { sparkle(c, 272, 88, t); glow(c, 270, 88, 10, '255,220,100', 0.4); } } },
    tidepools: { over(c, s, t) { if (!s.flags.got_glass) { sparkle(c, 108, 186, t); ell(c, '#6ad0a0', 108, 187, 3, 1.6); } } },
    cellar: { over(c, s, t) { if (s.flags.coin_found) R(c, '#120e0a', 190, 70, 14, 9); } },
    study: { over(c, s, t) { const hop = Math.sin(t * 2) > 0.9 ? -2 : 0; ell(c, '#0e0e14', 70, 58 + hop, 6, 8); circ(c, '#0e0e14', 72, 49 + hop, 4.5); c.fillStyle = '#3a3a40'; c.beginPath(); c.moveTo(76, 49 + hop); c.lineTo(81, 51 + hop); c.lineTo(76, 52 + hop); c.fill(); R(c, '#e8e8f0', 73, 47 + hop, 1, 1); } },
    tower: { over(c, s, t) { if (s.won === 'long') { const g = c.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, 'rgba(255,210,130,.35)'); g.addColorStop(1, 'rgba(255,190,120,.12)'); c.fillStyle = g; c.fillRect(0, 0, 320, 200); } else if (Math.sin(t * 1.7) > 0.97) c.fillStyle = 'rgba(220,230,255,.18)', c.fillRect(0, 0, 320, 200); } }
  };

  // Painted scene, with its overlay. Returns false if the painting isn't loaded (caller draws the code scene).
  function drawRoom(c, room, s, t) {
    if (!ready(room)) return false;
    c.drawImage(IMG[room], 0, 0, 320, 200);
    if (OVER[room]) OVER[room].over(c, s, t);
    return true;
  }
  const cine = {
    mirror(c, s, t) { if (!ready('cine_mirror')) return A.cineCode.mirror(c, s, t); c.drawImage(IMG.cine_mirror, 0, 0, 320, 200); glow(c, 160, 90, 60, '200,240,255', 0.12 + Math.sin(t * 2) * 0.05); },
    storm(c, s, t) { if (!ready('cine_storm')) return A.cineCode.storm(c, s, t); const shake = Math.sin(t * 1.6) * 1.5; c.drawImage(IMG.cine_storm, 0, shake, 320, 200); if (Math.sin(t * 2.3) > 0.96) { c.fillStyle = 'rgba(230,230,255,.35)'; c.fillRect(0, 0, 320, 200); } c.fillStyle = 'rgba(200,220,255,.35)'; for (let i = 0; i < 70; i++) c.fillRect((i * 53 + t * 300) % 320, (i * 37 + t * 500) % 200, 1, 6); }
  };
  A.cineCode = Object.assign({}, A.cine);
  Object.assign(A.cine, cine);
  A.drawRoom = drawRoom;
  A.hasPainting = ready;
})(this);
